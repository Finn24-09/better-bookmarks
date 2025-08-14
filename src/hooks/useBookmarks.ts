import { useState, useEffect, useCallback } from "react";
import type { Bookmark, BookmarkFilters, PaginationInfo } from "../types/bookmark";
import { bookmarkService } from "../services/bookmarkService";

interface UseBookmarksResult {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  refreshBookmarks: () => Promise<void>;
}

export const useBookmarks = (
  filters: BookmarkFilters,
  currentPage: number = 1,
  itemsPerPage: number = 12
): UseBookmarksResult => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
  });

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await bookmarkService.getBookmarks(filters, currentPage, itemsPerPage);
      
      setBookmarks(result.bookmarks);
      setPagination({
        currentPage,
        totalPages: Math.ceil(result.totalCount / itemsPerPage),
        totalItems: result.totalCount,
        itemsPerPage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const refreshBookmarks = useCallback(async () => {
    await loadBookmarks();
  }, [loadBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    pagination,
    refreshBookmarks,
  };
};
