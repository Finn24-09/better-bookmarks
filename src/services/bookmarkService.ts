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
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import { enhancedThumbnailService } from './enhancedThumbnailService';
import type {
  Bookmark,
  BookmarkFormData,
  BookmarkFilters,
  PaginationInfo,
  SortOption,
} from '../types/bookmark';

// Helper function to get current user ID
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to perform this action');
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

// Helper function to build Firestore query based on filters
const buildQuery = (
  filters: BookmarkFilters,
  pageSize: number,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
) => {
  const userId = getCurrentUserId();
  const bookmarksRef = collection(db, 'bookmarks');
  
  // Start with basic user filter
  let q = query(bookmarksRef, where('userId', '==', userId));

  // For now, only apply sorting without complex filters to avoid index issues
  // We'll handle filtering client-side until indexes are ready
  try {
    // Apply sorting - start with simple queries
    switch (filters.sortBy) {
      case 'newest':
        q = query(q, orderBy('createdAt', 'desc'));
        break;
      case 'oldest':
        q = query(q, orderBy('createdAt', 'asc'));
        break;
      case 'title-asc':
        q = query(q, orderBy('title', 'asc'));
        break;
      case 'title-desc':
        q = query(q, orderBy('title', 'desc'));
        break;
      default:
        q = query(q, orderBy('createdAt', 'desc'));
    }

    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize * 3)); // Get more docs for client-side filtering

  } catch (error) {
    // If sorting fails due to missing index, fall back to basic query
    console.warn('Falling back to basic query due to missing index:', error);
    q = query(bookmarksRef, where('userId', '==', userId), limit(pageSize * 3));
  }

  return q;
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
    console.warn('Error generating thumbnail with enhanced service:', error);
    
    // Fallback to just favicon if thumbnail generation fails
    try {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
      return {
        favicon: faviconUrl,
      };
    } catch (faviconError) {
      console.warn('Error generating favicon:', faviconError);
      return {};
    }
  }
};

class BookmarkService {
  async createBookmark(formData: BookmarkFormData): Promise<Bookmark> {
    const userId = getCurrentUserId();
    const now = new Date();

    // Generate thumbnail and favicon (skip access check since we're creating the bookmark)
    const thumbnailData = await generateThumbnailData(formData.url, true);

    const bookmarkData = {
      userId,
      title: formData.title,
      url: formData.url,
      description: formData.description || '',
      tags: formData.tags,
      favicon: thumbnailData.favicon,
      thumbnail: thumbnailData.thumbnail,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'bookmarks'), convertBookmarkToFirestore(bookmarkData));
      
      return {
        id: docRef.id,
        ...bookmarkData,
      };
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw new Error('Failed to create bookmark');
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

      // Check if URL changed to regenerate thumbnails
      const urlChanged = bookmarkData.url !== formData.url;
      let thumbnailData: { favicon?: string; thumbnail?: string };

      if (urlChanged) {
        // Regenerate thumbnails if URL changed (don't skip access check since bookmark exists)
        thumbnailData = await generateThumbnailData(formData.url, false);
      } else {
        // Keep existing thumbnails
        thumbnailData = {
          favicon: bookmarkData.favicon,
          thumbnail: bookmarkData.thumbnail,
        };
      }

      const updateData = {
        title: formData.title,
        url: formData.url,
        description: formData.description || '',
        tags: formData.tags,
        favicon: thumbnailData.favicon,
        thumbnail: thumbnailData.thumbnail,
        updatedAt: new Date(),
      };

      await updateDoc(bookmarkRef, convertBookmarkToFirestore(updateData));

      return {
        id,
        userId,
        ...updateData,
        createdAt: bookmarkData.createdAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error updating bookmark:', error);
      throw new Error('Failed to update bookmark');
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
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw new Error('Failed to delete bookmark');
    }
  }

  async getBookmarks(
    filters: BookmarkFilters,
    page: number = 1,
    pageSize: number = 12
  ): Promise<{ bookmarks: Bookmark[]; pagination: PaginationInfo }> {
    const userId = getCurrentUserId();
    
    try {
      // Use simple query while indexes are building
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(bookmarksRef, where('userId', '==', userId));
      
      const querySnapshot = await getDocs(q);
      let bookmarks = querySnapshot.docs.map(convertFirestoreToBookmark);

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
      console.error('Error fetching bookmarks:', error);
      throw new Error('Failed to fetch bookmarks');
    }
  }

  async getAllTags(): Promise<string[]> {
    const userId = getCurrentUserId();
    
    try {
      const q = query(collection(db, 'bookmarks'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const tagSet = new Set<string>();
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach((tag: string) => tagSet.add(tag));
        }
      });

      return Array.from(tagSet).sort();
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw new Error('Failed to fetch tags');
    }
  }

  async getBookmarkById(id: string): Promise<Bookmark | null> {
    const userId = getCurrentUserId();
    
    try {
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
      console.error('Error fetching bookmark:', error);
      throw new Error('Failed to fetch bookmark');
    }
  }

  // Helper method to check if URL already exists for the current user
  async urlExists(url: string, excludeId?: string): Promise<boolean> {
    const userId = getCurrentUserId();
    
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        where('url', '==', url)
      );
      const querySnapshot = await getDocs(q);
      
      if (excludeId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeId);
      }
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking URL existence:', error);
      return false;
    }
  }
}

export const bookmarkService = new BookmarkService();
