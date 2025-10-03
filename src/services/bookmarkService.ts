import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import { enhancedThumbnailService } from './enhancedThumbnailService';
import { validateUrl, sanitizeText, validateTag, rateLimiter } from '../utils/security';
import { cacheService } from './cacheService';
import { handleError, createError, ErrorCategory } from '../utils/errorHandler';
import type {
  Bookmark,
  BookmarkFormData,
  BookmarkFilters,
  PaginationInfo,
} from '../types/bookmark';

// Helper function to get current user ID
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw createError(
      'You must be signed in to perform this action.',
      ErrorCategory.AUTHENTICATION,
      'auth/unauthenticated'
    );
  }
  return user.uid;
};

// Helper function to convert Firestore document to Bookmark
const convertFirestoreToBookmark = (doc: QueryDocumentSnapshot<DocumentData>): Bookmark => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    title: data.title,
    url: data.url,
    description: data.description || '',
    tags: data.tags || [],
    favicon: data.favicon,
    thumbnail: data.thumbnail,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

// Helper function to convert Bookmark to Firestore data
const convertBookmarkToFirestore = (bookmark: Partial<Bookmark>) => {
  const data: any = { ...bookmark };
  if (data.createdAt instanceof Date) {
    data.createdAt = Timestamp.fromDate(data.createdAt);
  }
  if (data.updatedAt instanceof Date) {
    data.updatedAt = Timestamp.fromDate(data.updatedAt);
  }
  return data;
};


// Helper function to filter bookmarks by search query (client-side)
const filterBySearch = (bookmarks: Bookmark[], searchQuery: string): Bookmark[] => {
  if (!searchQuery.trim()) {
    return bookmarks;
  }

  const query = searchQuery.toLowerCase();
  return bookmarks.filter(
    (bookmark) =>
      bookmark.title.toLowerCase().includes(query) ||
      bookmark.description.toLowerCase().includes(query) ||
      bookmark.url.toLowerCase().includes(query) ||
      bookmark.tags.some((tag) => tag.toLowerCase().includes(query))
  );
};

// Helper function to generate thumbnail and favicon for a URL
const generateThumbnailData = async (url: string, isCreatingBookmark: boolean = false): Promise<{ thumbnail?: string; favicon?: string }> => {
  try {
    // Generate thumbnail using the enhanced thumbnail service with Firebase Storage
    // Skip access check when creating a new bookmark since it doesn't exist yet
    const thumbnailResult = await enhancedThumbnailService.generateThumbnail(url, {}, isCreatingBookmark);
    
    // Always generate a favicon URL as fallback
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    
    return {
      thumbnail: thumbnailResult.thumbnail,
      favicon: faviconUrl,
    };
  } catch (error) {
    // Fallback to just favicon if thumbnail generation fails
    try {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
      return {
        favicon: faviconUrl,
      };
    } catch (faviconError) {
      return {};
    }
  }
};

class BookmarkService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BOOKMARKS_CACHE_KEY = 'user_bookmarks';
  private readonly TAGS_CACHE_KEY = 'user_tags';

  /**
   * Clear all bookmark-related caches
   */
  private clearBookmarkCaches(): void {
    const userId = getCurrentUserId();
    cacheService.remove(`${this.BOOKMARKS_CACHE_KEY}_${userId}`);
    cacheService.remove(`${this.TAGS_CACHE_KEY}_${userId}`);
  }

  /**
   * Get cached bookmarks or fetch from Firebase
   */
  private async getCachedBookmarks(): Promise<Bookmark[]> {
    const userId = getCurrentUserId();
    const cacheKey = `${this.BOOKMARKS_CACHE_KEY}_${userId}`;
    
    // Try memory cache first
    let bookmarks = cacheService.getMemory<Bookmark[]>(cacheKey);
    if (bookmarks) {
      return this.deserializeBookmarks(bookmarks);
    }

    // Try localStorage cache
    bookmarks = cacheService.getLocal<Bookmark[]>(cacheKey);
    if (bookmarks) {
      const deserializedBookmarks = this.deserializeBookmarks(bookmarks);
      // Also cache in memory for faster access
      cacheService.setMemory(cacheKey, deserializedBookmarks, this.CACHE_TTL);
      return deserializedBookmarks;
    }

    // Fetch from Firebase
    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(bookmarksRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    bookmarks = querySnapshot.docs.map(convertFirestoreToBookmark);

    // Cache the results
    cacheService.setMemory(cacheKey, bookmarks, this.CACHE_TTL);
    cacheService.setLocal(cacheKey, bookmarks, this.CACHE_TTL);

    return bookmarks;
  }

  /**
   * Deserialize cached bookmarks (convert date strings back to Date objects)
   */
  private deserializeBookmarks(bookmarks: any[]): Bookmark[] {
    return bookmarks.map(bookmark => ({
      ...bookmark,
      createdAt: typeof bookmark.createdAt === 'string' ? new Date(bookmark.createdAt) : bookmark.createdAt,
      updatedAt: typeof bookmark.updatedAt === 'string' ? new Date(bookmark.updatedAt) : bookmark.updatedAt
    }));
  }

  async createBookmark(formData: BookmarkFormData): Promise<Bookmark> {
    const userId = getCurrentUserId();
    
    // Rate limiting check
    if (!rateLimiter.isAllowed(`bookmark-create-${userId}`, 10, 60000)) {
      throw new Error('Too many bookmark creation attempts. Please wait a moment before trying again.');
    }

    // Validate and sanitize input data
    const urlValidation = validateUrl(formData.url);
    if (!urlValidation.isValid) {
      throw new Error(urlValidation.error || 'Invalid URL');
    }

    const sanitizedTitle = sanitizeText(formData.title, 200);
    if (!sanitizedTitle) {
      throw new Error('Title is required');
    }

    const sanitizedDescription = sanitizeText(formData.description || '', 1000);
    
    // Validate and sanitize tags
    const sanitizedTags: string[] = [];
    for (const tag of formData.tags) {
      const tagValidation = validateTag(tag);
      if (tagValidation.isValid && tagValidation.sanitizedTag) {
        sanitizedTags.push(tagValidation.sanitizedTag);
      }
    }

    if (sanitizedTags.length > 20) {
      throw new Error('Too many tags (maximum 20 allowed)');
    }

    const now = new Date();

    // Generate thumbnail and favicon (skip access check since we're creating the bookmark)
    const thumbnailData = await generateThumbnailData(urlValidation.sanitizedUrl!, true);

    const bookmarkData = {
      userId,
      title: sanitizedTitle,
      url: urlValidation.sanitizedUrl!,
      description: sanitizedDescription,
      tags: sanitizedTags,
      favicon: thumbnailData.favicon,
      thumbnail: thumbnailData.thumbnail,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'bookmarks'), convertBookmarkToFirestore(bookmarkData));
      
      // Clear caches after creating bookmark
      this.clearBookmarkCaches();
      
      return {
        id: docRef.id,
        ...bookmarkData,
      };
    } catch (error) {
      const userMessage = handleError(error, 'createBookmark');
      throw new Error(userMessage);
    }
  }

  async updateBookmark(id: string, formData: BookmarkFormData): Promise<Bookmark> {
    const userId = getCurrentUserId();
    const bookmarkRef = doc(db, 'bookmarks', id);

    try {
      // First, verify the bookmark belongs to the current user
      const bookmarkDoc = await getDoc(bookmarkRef);
      if (!bookmarkDoc.exists()) {
        throw new Error('Bookmark not found');
      }

      const bookmarkData = bookmarkDoc.data();
      if (bookmarkData.userId !== userId) {
        throw new Error('Unauthorized: You can only update your own bookmarks');
      }

      // Validate and sanitize input data
      const urlValidation = validateUrl(formData.url);
      if (!urlValidation.isValid) {
        throw new Error(urlValidation.error || 'Invalid URL');
      }

      const sanitizedTitle = sanitizeText(formData.title, 200);
      if (!sanitizedTitle) {
        throw new Error('Title is required');
      }

      const sanitizedDescription = sanitizeText(formData.description || '', 1000);
      
      // Validate and sanitize tags
      const sanitizedTags: string[] = [];
      for (const tag of formData.tags) {
        const tagValidation = validateTag(tag);
        if (tagValidation.isValid && tagValidation.sanitizedTag) {
          sanitizedTags.push(tagValidation.sanitizedTag);
        }
      }

      if (sanitizedTags.length > 20) {
        throw new Error('Too many tags (maximum 20 allowed)');
      }

      // Check if URL changed to regenerate thumbnails
      const urlChanged = bookmarkData.url !== urlValidation.sanitizedUrl;
      let thumbnailData: { favicon?: string; thumbnail?: string };

      if (urlChanged) {
        // Regenerate thumbnails if URL changed (don't skip access check since bookmark exists)
        thumbnailData = await generateThumbnailData(urlValidation.sanitizedUrl!, false);
      } else {
        // Keep existing thumbnails
        thumbnailData = {
          favicon: bookmarkData.favicon,
          thumbnail: bookmarkData.thumbnail,
        };
      }

      const updateData: any = {
        title: sanitizedTitle,
        url: urlValidation.sanitizedUrl!,
        description: sanitizedDescription,
        tags: sanitizedTags,
        updatedAt: new Date(),
      };

      // Only add favicon and thumbnail if they exist (Firebase doesn't allow undefined)
      if (thumbnailData.favicon) {
        updateData.favicon = thumbnailData.favicon;
      }
      if (thumbnailData.thumbnail) {
        updateData.thumbnail = thumbnailData.thumbnail;
      }

      await updateDoc(bookmarkRef, convertBookmarkToFirestore(updateData));

      // Clear caches after updating bookmark
      this.clearBookmarkCaches();

      return {
        id,
        userId,
        ...updateData,
        createdAt: bookmarkData.createdAt?.toDate() || new Date(),
      };
    } catch (error) {
      const userMessage = handleError(error, 'updateBookmark');
      throw new Error(userMessage);
    }
  }

  async deleteBookmark(id: string): Promise<void> {
    const userId = getCurrentUserId();
    const bookmarkRef = doc(db, 'bookmarks', id);

    try {
      // First, verify the bookmark belongs to the current user
      const bookmarkDoc = await getDoc(bookmarkRef);
      if (!bookmarkDoc.exists()) {
        throw new Error('Bookmark not found');
      }

      const bookmarkData = bookmarkDoc.data();
      if (bookmarkData.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own bookmarks');
      }

      await deleteDoc(bookmarkRef);
      
      // Clear caches after deleting bookmark
      this.clearBookmarkCaches();
    } catch (error) {
      const userMessage = handleError(error, 'deleteBookmark');
      throw new Error(userMessage);
    }
  }

  async getBookmarks(
    filters: BookmarkFilters,
    page: number = 1,
    pageSize: number = 12
  ): Promise<{ bookmarks: Bookmark[]; pagination: PaginationInfo }> {
    try {
      // Use cached bookmarks to avoid Firebase reads
      let bookmarks = await this.getCachedBookmarks();

      // Apply all filtering and sorting client-side for now
      
      // Apply search filtering
      if (filters.search) {
        bookmarks = filterBySearch(bookmarks, filters.search);
      }

      // Apply tag filtering
      if (filters.tags.length > 0) {
        if (filters.tagFilterMode === 'AND') {
          bookmarks = bookmarks.filter((bookmark) =>
            filters.tags.every((tag) => bookmark.tags.includes(tag))
          );
        } else {
          bookmarks = bookmarks.filter((bookmark) =>
            filters.tags.some((tag) => bookmark.tags.includes(tag))
          );
        }
      }

      // Apply sorting
      bookmarks.sort((a, b) => {
        switch (filters.sortBy) {
          case 'newest':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'oldest':
            return a.createdAt.getTime() - b.createdAt.getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          default:
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
      });

      // Calculate pagination
      const totalItems = bookmarks.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedBookmarks = bookmarks.slice(startIndex, endIndex);

      const pagination: PaginationInfo = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: pageSize,
      };

      return {
        bookmarks: paginatedBookmarks,
        pagination,
      };
    } catch (error) {
      const userMessage = handleError(error, 'getBookmarks');
      throw new Error(userMessage);
    }
  }

  async getAllTags(): Promise<string[]> {
    const userId = getCurrentUserId();
    const cacheKey = `${this.TAGS_CACHE_KEY}_${userId}`;
    
    try {
      // Try cache first
      let tags = cacheService.getMemory<string[]>(cacheKey);
      if (tags) {
        return tags;
      }

      tags = cacheService.getLocal<string[]>(cacheKey);
      if (tags) {
        cacheService.setMemory(cacheKey, tags, this.CACHE_TTL);
        return tags;
      }

      // Extract tags from cached bookmarks to avoid additional Firebase read
      const bookmarks = await this.getCachedBookmarks();
      const tagSet = new Set<string>();
      
      bookmarks.forEach((bookmark) => {
        if (bookmark.tags && Array.isArray(bookmark.tags)) {
          bookmark.tags.forEach((tag: string) => tagSet.add(tag));
        }
      });

      tags = Array.from(tagSet).sort();
      
      // Cache the results
      cacheService.setMemory(cacheKey, tags, this.CACHE_TTL);
      cacheService.setLocal(cacheKey, tags, this.CACHE_TTL);

      return tags;
    } catch (error) {
      const userMessage = handleError(error, 'getAllTags');
      throw new Error(userMessage);
    }
  }

  async getBookmarkById(id: string): Promise<Bookmark | null> {
    const userId = getCurrentUserId();
    
    try {
      // Try to find in cached bookmarks first
      const bookmarks = await this.getCachedBookmarks();
      const cachedBookmark = bookmarks.find(bookmark => bookmark.id === id);
      
      if (cachedBookmark) {
        return cachedBookmark;
      }
      
      // Fallback to Firebase if not in cache
      const bookmarkRef = doc(db, 'bookmarks', id);
      const bookmarkDoc = await getDoc(bookmarkRef);
      
      if (!bookmarkDoc.exists()) {
        return null;
      }

      const bookmarkData = bookmarkDoc.data();
      if (bookmarkData.userId !== userId) {
        throw new Error('Unauthorized: You can only access your own bookmarks');
      }

      return convertFirestoreToBookmark(bookmarkDoc as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      const userMessage = handleError(error, 'getBookmarkById');
      throw new Error(userMessage);
    }
  }

  // Helper method to check if URL already exists for the current user
  async urlExists(url: string, excludeId?: string): Promise<boolean> {
    try {
      // Use cached bookmarks to avoid Firebase read
      const bookmarks = await this.getCachedBookmarks();
      
      if (excludeId) {
        return bookmarks.some(bookmark => bookmark.url === url && bookmark.id !== excludeId);
      }
      
      return bookmarks.some(bookmark => bookmark.url === url);
    } catch (error) {
      // Silently fail for URL existence check to avoid blocking user actions
      return false;
    }
  }

  /**
   * Regenerate thumbnail for an existing bookmark
   * This creates a new thumbnail without replacing existing Firebase Storage images
   */
  async regenerateThumbnail(id: string): Promise<Bookmark> {
    const userId = getCurrentUserId();
    const bookmarkRef = doc(db, 'bookmarks', id);

    try {
      // First, verify the bookmark belongs to the current user
      const bookmarkDoc = await getDoc(bookmarkRef);
      if (!bookmarkDoc.exists()) {
        throw new Error('Bookmark not found');
      }

      const bookmarkData = bookmarkDoc.data();
      if (bookmarkData.userId !== userId) {
        throw new Error('Unauthorized: You can only regenerate thumbnails for your own bookmarks');
      }

      // Clear ALL caches before regeneration to ensure fresh data
      this.clearBookmarkCaches();
      
      // Also clear the local browser cache for this thumbnail
      const thumbnailCacheKey = `thumbnail_${bookmarkData.url}`;
      localStorage.removeItem(thumbnailCacheKey);

      // Regenerate the thumbnail using the enhanced service
      const thumbnailResult = await enhancedThumbnailService.regenerateThumbnail(bookmarkData.url, true);

      // Update the bookmark with the new thumbnail
      const updateData = {
        thumbnail: thumbnailResult.thumbnail,
        updatedAt: new Date(),
      };

      await updateDoc(bookmarkRef, convertBookmarkToFirestore(updateData));

      // Clear caches again after updating bookmark to force fresh fetch
      this.clearBookmarkCaches();

      return {
        id,
        userId,
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description || '',
        tags: bookmarkData.tags || [],
        favicon: bookmarkData.favicon,
        thumbnail: thumbnailResult.thumbnail,
        createdAt: bookmarkData.createdAt?.toDate() || new Date(),
        updatedAt: updateData.updatedAt,
      };
    } catch (error) {
      const userMessage = handleError(error, 'regenerateThumbnail');
      throw new Error(userMessage);
    }
  }
}

export const bookmarkService = new BookmarkService();
