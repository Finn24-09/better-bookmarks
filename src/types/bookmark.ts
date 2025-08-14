export interface BookmarkTag {
  id: string;
  name: string;
  color: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: BookmarkTag[];
  thumbnail?: string;
  favicon?: string;
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
  sortBy: SortOption;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
