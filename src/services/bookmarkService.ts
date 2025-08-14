import type { Bookmark, BookmarkFormData, BookmarkTag, BookmarkFilters, SortOption } from "../types/bookmark";

const STORAGE_KEY = "better-bookmarks";
const TAGS_STORAGE_KEY = "better-bookmarks-tags";

// Predefined tag colors
const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e"
];

class BookmarkService {
  private getStoredBookmarks(): Bookmark[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const bookmarks = JSON.parse(stored);
      return bookmarks.map((bookmark: any) => ({
        ...bookmark,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
      }));
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      return [];
    }
  }

  private saveBookmarks(bookmarks: Bookmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error("Error saving bookmarks:", error);
      throw new Error("Failed to save bookmarks");
    }
  }

  private getStoredTags(): BookmarkTag[] {
    try {
      const stored = localStorage.getItem(TAGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading tags:", error);
      return [];
    }
  }

  private saveTags(tags: BookmarkTag[]): void {
    try {
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error("Error saving tags:", error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getRandomTagColor(): string {
    return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
  }

  private async fetchMetadata(url: string): Promise<{ title?: string; favicon?: string; thumbnail?: string }> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Extract video thumbnail for supported platforms
      let thumbnail: string | undefined;
      let title = `Page from ${domain}`;
      
      // YouTube video detection
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          title = 'YouTube Video';
        }
      }
      // Vimeo video detection
      else if (domain.includes('vimeo.com')) {
        const videoId = this.extractVimeoVideoId(url);
        if (videoId) {
          // For Vimeo, we'd need to make an API call to get the thumbnail
          // For now, we'll use a placeholder approach
          thumbnail = `https://vumbnail.com/${videoId}.jpg`;
          title = 'Vimeo Video';
        }
      }
      // Dailymotion video detection
      else if (domain.includes('dailymotion.com')) {
        const videoId = this.extractDailymotionVideoId(url);
        if (videoId) {
          thumbnail = `https://www.dailymotion.com/thumbnail/video/${videoId}`;
          title = 'Dailymotion Video';
        }
      }
      
      return {
        title,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        thumbnail
      };
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return {};
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractVimeoVideoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  private extractDailymotionVideoId(url: string): string | null {
    const match = url.match(/dailymotion\.com\/video\/([^_]+)/);
    return match ? match[1] : null;
  }

  private createOrGetTags(tagNames: string[]): BookmarkTag[] {
    const existingTags = this.getStoredTags();
    const tags: BookmarkTag[] = [];

    tagNames.forEach(tagName => {
      const trimmedName = tagName.trim().toLowerCase();
      if (!trimmedName) return;

      let existingTag = existingTags.find(tag => tag.name.toLowerCase() === trimmedName);
      
      if (!existingTag) {
        existingTag = {
          id: this.generateId(),
          name: trimmedName,
          color: this.getRandomTagColor()
        };
        existingTags.push(existingTag);
      }
      
      tags.push(existingTag);
    });

    this.saveTags(existingTags);
    return tags;
  }

  async createBookmark(formData: BookmarkFormData): Promise<Bookmark> {
    try {
      const bookmarks = this.getStoredBookmarks();
      
      // Check if URL already exists
      const existingBookmark = bookmarks.find(b => b.url === formData.url);
      if (existingBookmark) {
        throw new Error("Bookmark with this URL already exists");
      }

      const metadata = await this.fetchMetadata(formData.url);
      const tags = this.createOrGetTags(formData.tags);

      const newBookmark: Bookmark = {
        id: this.generateId(),
        title: formData.title || metadata.title || "Untitled",
        url: formData.url,
        description: formData.description,
        tags,
        favicon: metadata.favicon,
        thumbnail: metadata.thumbnail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      bookmarks.unshift(newBookmark); // Add to beginning
      this.saveBookmarks(bookmarks);
      
      return newBookmark;
    } catch (error) {
      console.error("Error creating bookmark:", error);
      throw error;
    }
  }

  async updateBookmark(id: string, formData: BookmarkFormData): Promise<Bookmark> {
    try {
      const bookmarks = this.getStoredBookmarks();
      const bookmarkIndex = bookmarks.findIndex(b => b.id === id);
      
      if (bookmarkIndex === -1) {
        throw new Error("Bookmark not found");
      }

      const tags = this.createOrGetTags(formData.tags);
      const updatedBookmark: Bookmark = {
        ...bookmarks[bookmarkIndex],
        title: formData.title,
        url: formData.url,
        description: formData.description,
        tags,
        updatedAt: new Date(),
      };

      bookmarks[bookmarkIndex] = updatedBookmark;
      this.saveBookmarks(bookmarks);
      
      return updatedBookmark;
    } catch (error) {
      console.error("Error updating bookmark:", error);
      throw error;
    }
  }

  async deleteBookmark(id: string): Promise<void> {
    try {
      const bookmarks = this.getStoredBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.id !== id);
      
      if (filteredBookmarks.length === bookmarks.length) {
        throw new Error("Bookmark not found");
      }

      this.saveBookmarks(filteredBookmarks);
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      throw error;
    }
  }

  private sortBookmarks(bookmarks: Bookmark[], sortBy: SortOption): Bookmark[] {
    return [...bookmarks].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }

  private filterBookmarks(bookmarks: Bookmark[], filters: BookmarkFilters): Bookmark[] {
    return bookmarks.filter(bookmark => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          bookmark.title.toLowerCase().includes(searchTerm) ||
          bookmark.url.toLowerCase().includes(searchTerm) ||
          (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm)) ||
          bookmark.tags.some(tag => tag.name.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) return false;
      }

      // Tag filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag =>
          bookmark.tags.some(bookmarkTag => bookmarkTag.name === filterTag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }

  async getBookmarks(
    filters: BookmarkFilters,
    page: number = 1,
    itemsPerPage: number = 12
  ): Promise<{ bookmarks: Bookmark[]; totalCount: number }> {
    try {
      const allBookmarks = this.getStoredBookmarks();
      const filteredBookmarks = this.filterBookmarks(allBookmarks, filters);
      const sortedBookmarks = this.sortBookmarks(filteredBookmarks, filters.sortBy);
      
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedBookmarks = sortedBookmarks.slice(startIndex, endIndex);

      return {
        bookmarks: paginatedBookmarks,
        totalCount: sortedBookmarks.length
      };
    } catch (error) {
      console.error("Error getting bookmarks:", error);
      throw error;
    }
  }

  async getAllTags(): Promise<BookmarkTag[]> {
    return this.getStoredTags();
  }

  async getBookmarkById(id: string): Promise<Bookmark | null> {
    try {
      const bookmarks = this.getStoredBookmarks();
      return bookmarks.find(b => b.id === id) || null;
    } catch (error) {
      console.error("Error getting bookmark:", error);
      return null;
    }
  }
}

export const bookmarkService = new BookmarkService();
