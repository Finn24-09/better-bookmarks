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
      await updateDoc(docRef, {
        accessCount: (await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', thumbnailId)))).docs[0]?.data()?.accessCount + 1 || 1,
        lastAccessedAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error updating access stats:', error);
      // Don't throw error for stats update failure
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
        return {
          thumbnail: cachedThumbnail,
          type: 'screenshot', // We don't store type in cache, assume screenshot
          source: 'browser-cache'
        };
      }

      // Generate URL hash for Firebase Storage lookup
      const urlHash = await this.generateUrlHash(url);

      // Check if thumbnail exists in Firebase Storage
      const existingThumbnail = await this.checkThumbnailExists(urlHash);
      if (existingThumbnail) {
        // Update access statistics
        if (existingThumbnail.id) {
          await this.updateAccessStats(existingThumbnail.id);
        }

        // Cache locally for faster future access
        this.cacheThumbnailLocally(url, existingThumbnail.storageUrl);

        return {
          thumbnail: existingThumbnail.storageUrl,
          type: existingThumbnail.type,
          source: `firebase-storage-${existingThumbnail.source}`
        };
      }

      // Thumbnail doesn't exist, generate new one using original service
      const thumbnailResult = await thumbnailService.generateThumbnail(url, options);

      // If we got a thumbnail, upload it to Firebase Storage
      if (thumbnailResult.thumbnail) {
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
            source: `firebase-uploaded-${thumbnailResult.source}`
          };
        } catch (uploadError) {
          console.error('Error uploading to Firebase Storage, using original thumbnail:', uploadError);
          
          // Cache the original thumbnail locally as fallback
          this.cacheThumbnailLocally(url, thumbnailResult.thumbnail);
          
          return thumbnailResult;
        }
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
   * Clean up old thumbnails (can be called periodically)
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
            console.error('Error deleting old thumbnail:', deleteError);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old thumbnails:', error);
    }
  }

  /**
   * Get thumbnail statistics for the current user
   */
  async getThumbnailStats(): Promise<{
    totalThumbnails: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    try {
      const userId = this.getCurrentUserId();
      const metadataRef = collection(db, this.COLLECTION_NAME);
      const q = query(metadataRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const stats = {
        totalThumbnails: querySnapshot.size,
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
      console.error('Error getting thumbnail stats:', error);
      return {
        totalThumbnails: 0,
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
