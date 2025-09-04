import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase';
import { thumbnailService } from './thumbnailService';
import type { ThumbnailResult, ThumbnailOptions } from './thumbnailService';

interface StoredThumbnail {
  id?: string;
  url: string;
  storageUrl: string;
  storagePath: string;
  type: 'video' | 'screenshot' | 'favicon';
  source: string;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  urlHash: string;
}

interface ThumbnailMetadata {
  url: string;
  type: 'video' | 'screenshot' | 'favicon';
  source: string;
  createdAt: string;
  urlHash: string;
  userId: string;
}

class EnhancedThumbnailService {
  private readonly STORAGE_PATH = 'thumbnails';
  private readonly COLLECTION_NAME = 'thumbnail_metadata';

  /**
   * Generate a hash for the URL to use as filename and for deduplication
   */
  private async generateUrlHash(url: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to access thumbnails');
    }
    return user.uid;
  }

  /**
   * Check if user has access to a URL (i.e., has a bookmark for it)
   */
  private async userHasAccessToUrl(url: string): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(
        bookmarksRef,
        where('userId', '==', userId),
        where('url', '==', url)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking URL access:', error);
      return false;
    }
  }

  /**
   * Check if thumbnail exists in Firebase Storage
   */
  private async checkThumbnailExists(urlHash: string): Promise<StoredThumbnail | null> {
    try {
      const metadataRef = collection(db, this.COLLECTION_NAME);
      const q = query(metadataRef, where('urlHash', '==', urlHash));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        url: data.url,
        storageUrl: data.storageUrl,
        storagePath: data.storagePath,
        type: data.type,
        source: data.source,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        accessCount: data.accessCount || 0,
        lastAccessedAt: data.lastAccessedAt?.toDate() || new Date(),
        urlHash: data.urlHash
      };
    } catch (error) {
      console.error('Error checking thumbnail existence:', error);
      return null;
    }
  }

  /**
   * Convert base64 data URL to blob
   */
  private dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Upload thumbnail to Firebase Storage
   */
  private async uploadThumbnailToStorage(
    thumbnail: string,
    urlHash: string,
    metadata: ThumbnailMetadata
  ): Promise<{ storageUrl: string; storagePath: string }> {
    try {
      // Create storage reference
      const fileName = `${urlHash}.jpg`;
      const storagePath = `${this.STORAGE_PATH}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Convert thumbnail to blob
      let blob: Blob;
      if (thumbnail.startsWith('data:')) {
        // Base64 data URL from screenshot API
        blob = this.dataURLToBlob(thumbnail);
      } else {
        // External URL (video thumbnails, favicons)
        const response = await fetch(thumbnail);
        blob = await response.blob();
      }

      // Upload with metadata
      const uploadMetadata = {
        customMetadata: {
          url: metadata.url,
          type: metadata.type,
          source: metadata.source,
          createdAt: metadata.createdAt,
          urlHash: metadata.urlHash,
          userId: metadata.userId
        }
      };

      await uploadBytes(storageRef, blob, uploadMetadata);
      const storageUrl = await getDownloadURL(storageRef);

      return { storageUrl, storagePath };
    } catch (error) {
      console.error('Error uploading thumbnail to storage:', error);
      throw error;
    }
  }

  /**
   * Store thumbnail metadata in Firestore
   */
  private async storeThumbnailMetadata(
    url: string,
    urlHash: string,
    storageUrl: string,
    storagePath: string,
    type: 'video' | 'screenshot' | 'favicon',
    source: string
  ): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const now = new Date();

      const metadataDoc = {
        url,
        urlHash,
        storageUrl,
        storagePath,
        type,
        source,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        accessCount: 1,
        lastAccessedAt: Timestamp.fromDate(now),
        userId
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), metadataDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error storing thumbnail metadata:', error);
      throw error;
    }
  }

  /**
   * Update access statistics for a thumbnail
   */
  private async updateAccessStats(thumbnailId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, thumbnailId);
      const docSnapshot = await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', thumbnailId)));
      const currentAccessCount = docSnapshot.docs[0]?.data()?.accessCount || 0;
      
      await updateDoc(docRef, {
        accessCount: currentAccessCount + 1,
        lastAccessedAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error updating access stats:', error);
      // Don't throw error for stats update failure
    }
  }

  /**
   * Track thumbnail access by URL - public method for external use
   */
  async trackThumbnailAccess(url: string): Promise<void> {
    try {
      // Check if user has access to this URL
      const hasAccess = await this.userHasAccessToUrl(url);
      if (!hasAccess) {
        return; // Silently return if user doesn't have access
      }

      // Generate URL hash to find the thumbnail metadata
      const urlHash = await this.generateUrlHash(url);
      
      // Find existing thumbnail metadata
      const existingThumbnail = await this.checkThumbnailExists(urlHash);
      if (existingThumbnail && existingThumbnail.id) {
        await this.updateAccessStats(existingThumbnail.id);
      }
    } catch (error) {
      console.error('Error tracking thumbnail access:', error);
      // Don't throw error for tracking failure
    }
  }

  /**
   * Cache thumbnail in browser's local storage
   */
  private cacheThumbnailLocally(url: string, thumbnailUrl: string): void {
    try {
      const cacheKey = `thumbnail_${url}`;
      const cacheData = {
        url: thumbnailUrl,
        timestamp: Date.now(),
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error caching thumbnail locally:', error);
      // Don't throw error for cache failure
    }
  }

  /**
   * Get cached thumbnail from browser's local storage
   */
  private getCachedThumbnail(url: string): string | null {
    try {
      const cacheKey = `thumbnail_${url}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expires) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.url;
    } catch (error) {
      console.warn('Error getting cached thumbnail:', error);
      return null;
    }
  }

  /**
   * Main method to generate thumbnail with Firebase Storage integration
   * Only stores screenshots (base64 data URLs) in Firebase Storage, uses direct links for video thumbnails and favicons
   */
  async generateThumbnail(url: string, options: ThumbnailOptions = {}, skipAccessCheck: boolean = false): Promise<ThumbnailResult> {
    try {
      // Check if user has access to this URL (skip during bookmark creation)
      if (!skipAccessCheck) {
        const hasAccess = await this.userHasAccessToUrl(url);
        if (!hasAccess) {
          throw new Error('Access denied: You must have a bookmark for this URL to access its thumbnail');
        }
      }

      // Check browser cache first
      const cachedThumbnail = this.getCachedThumbnail(url);
      if (cachedThumbnail) {
        // Don't assume type from cache, we need to determine it properly
        // For now, let's skip cache to ensure we get the correct type
        console.log('Found cached thumbnail, but skipping to ensure correct type determination');
      }

      // Generate URL hash for Firebase Storage lookup (only for screenshots)
      const urlHash = await this.generateUrlHash(url);

      // Check if screenshot exists in Firebase Storage
      const existingThumbnail = await this.checkThumbnailExists(urlHash);
      if (existingThumbnail && existingThumbnail.type === 'screenshot') {
        // Update access statistics
        if (existingThumbnail.id) {
          await this.updateAccessStats(existingThumbnail.id);
        }

        // Cache locally for faster future access
        this.cacheThumbnailLocally(url, existingThumbnail.storageUrl);

        return {
          thumbnail: existingThumbnail.storageUrl,
          type: existingThumbnail.type,
          source: `firebase-storage-${existingThumbnail.source}`,
          isVideoThumbnail: false, // Screenshots stored in Firebase are not video thumbnails
          method: 'firebase-cache'
        };
      }

      // Generate new thumbnail using updated service with intelligent detection
      const thumbnailResult = await thumbnailService.generateThumbnail(url, options);
      console.log('Generated thumbnail result:', {
        type: thumbnailResult.type,
        source: thumbnailResult.source,
        isVideoThumbnail: thumbnailResult.isVideoThumbnail,
        method: thumbnailResult.method,
        hasThumbnail: !!thumbnailResult.thumbnail,
        isDirectUrl: thumbnailResult.thumbnail && !thumbnailResult.thumbnail.startsWith('data:')
      });

      // Determine if this is a direct URL (video thumbnail, favicon) or base64 data (screenshot)
      const isDirectUrl = thumbnailResult.thumbnail && !thumbnailResult.thumbnail.startsWith('data:');
      
      // Only upload base64 screenshots to Firebase Storage, store direct URLs in Firestore only
      if (thumbnailResult.thumbnail && !isDirectUrl && thumbnailResult.type === 'screenshot') {
        try {
          const userId = this.getCurrentUserId();
          const metadata: ThumbnailMetadata = {
            url,
            type: thumbnailResult.type,
            source: thumbnailResult.source,
            createdAt: new Date().toISOString(),
            urlHash,
            userId
          };

          const { storageUrl, storagePath } = await this.uploadThumbnailToStorage(
            thumbnailResult.thumbnail,
            urlHash,
            metadata
          );

          // Store metadata in Firestore
          await this.storeThumbnailMetadata(
            url,
            urlHash,
            storageUrl,
            storagePath,
            thumbnailResult.type,
            thumbnailResult.source
          );

          // Cache the Firebase Storage URL locally
          this.cacheThumbnailLocally(url, storageUrl);

          return {
            thumbnail: storageUrl,
            type: thumbnailResult.type,
            source: `firebase-uploaded-${thumbnailResult.source}`,
            isVideoThumbnail: thumbnailResult.isVideoThumbnail,
            method: thumbnailResult.method
          };
        } catch (uploadError) {
          console.error('Error uploading screenshot to Firebase Storage, using original:', uploadError);
          
          // Cache the original screenshot locally as fallback
          this.cacheThumbnailLocally(url, thumbnailResult.thumbnail);
          
          return thumbnailResult;
        }
      }

      // For direct URLs (video thumbnails from API, favicons), store only the URL in Firestore
      // This saves Firebase Storage space and bandwidth
      if (thumbnailResult.thumbnail && isDirectUrl) {
        try {
          const userId = this.getCurrentUserId();
          
          // Store metadata in Firestore with the direct URL (no Firebase Storage upload)
          await this.storeThumbnailMetadata(
            url,
            urlHash,
            thumbnailResult.thumbnail, // Store the direct URL as storageUrl
            '', // No storage path since we're not uploading
            thumbnailResult.type,
            thumbnailResult.source
          );

          console.log('Stored direct URL in Firestore:', {
            url: thumbnailResult.thumbnail.substring(0, 100) + '...',
            type: thumbnailResult.type,
            source: thumbnailResult.source
          });
        } catch (metadataError) {
          console.warn('Error storing direct URL metadata, continuing with original result:', metadataError);
        }

        // Cache the direct link locally
        this.cacheThumbnailLocally(url, thumbnailResult.thumbnail);
      }

      return thumbnailResult;
    } catch (error) {
      console.error('Enhanced thumbnail generation failed:', error);
      
      // Fallback to original service if user has access or during bookmark creation
      try {
        if (skipAccessCheck) {
          return await thumbnailService.generateThumbnail(url, options);
        }
        
        const hasAccess = await this.userHasAccessToUrl(url);
        if (hasAccess) {
          return await thumbnailService.generateThumbnail(url, options);
        }
      } catch (fallbackError) {
        console.error('Fallback thumbnail generation failed:', fallbackError);
      }

      throw error;
    }
  }

  /**
   * Clean up old screenshots (can be called periodically)
   * Only cleans up screenshots since video thumbnails and favicons are not stored in Firebase
   */
  async cleanupOldThumbnails(olderThanDays: number = 30): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const metadataRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        metadataRef,
        where('userId', '==', userId),
        where('type', '==', 'screenshot'), // Only clean up screenshots
        where('lastAccessedAt', '<', Timestamp.fromDate(cutoffDate))
      );

      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        
        // Check if URL still has bookmarks
        const hasBookmarks = await this.userHasAccessToUrl(data.url);
        if (!hasBookmarks) {
          // Delete from storage and metadata
          try {
            // Note: You might want to implement storage deletion based on your needs
            // const storageRef = ref(storage, data.storagePath);
            // await deleteObject(storageRef);
            
            // Delete metadata
            await deleteDoc(doc.ref);
          } catch (deleteError) {
            console.error('Error deleting old screenshot:', deleteError);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old screenshots:', error);
    }
  }

  /**
   * Get screenshot statistics for the current user
   * Only tracks screenshots since video thumbnails and favicons are not stored in Firebase
   */
  async getThumbnailStats(): Promise<{
    totalScreenshots: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    try {
      const userId = this.getCurrentUserId();
      const metadataRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        metadataRef, 
        where('userId', '==', userId),
        where('type', '==', 'screenshot') // Only count screenshots
      );
      const querySnapshot = await getDocs(q);

      const stats = {
        totalScreenshots: querySnapshot.size,
        totalSize: 0,
        byType: {} as Record<string, number>
      };

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const type = data.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('Error getting screenshot stats:', error);
      return {
        totalScreenshots: 0,
        totalSize: 0,
        byType: {}
      };
    }
  }

  /**
   * Check if the enhanced service is properly configured
   */
  isConfigured(): boolean {
    try {
      return !!storage && !!db && !!auth.currentUser;
    } catch (error) {
      return false;
    }
  }
}

export const enhancedThumbnailService = new EnhancedThumbnailService();
export type { StoredThumbnail, ThumbnailMetadata };
