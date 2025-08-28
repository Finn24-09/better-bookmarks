export interface BookmarkTag {
  id: string;
  name: string;
  color: string;
  usageCount?: number;
}

export interface Bookmark {
  id: string;
  userId: string; // Owner of the bookmark
  title: string;
  url: string;
  description: string;
  tags: string[];
  favicon?: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkFormData {
  title: string;
  url: string;
  description?: string;
  tags: string[];
}

export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export interface BookmarkFilters {
  search: string;
  tags: string[];
  tagFilterMode: 'AND' | 'OR';
  sortBy: SortOption;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
