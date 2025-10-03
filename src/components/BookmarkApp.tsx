import React, { useState, useCallback, useMemo } from "react";
import { useToast } from "../hooks/useToast";
import { Header } from "./Header";
import { BookmarkFilters } from "./BookmarkFilters";
import { BookmarkCard } from "./BookmarkCard";
import { BookmarkModal } from "./BookmarkModal";
import { Pagination } from "./Pagination";
import { LoadingState } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { useBookmarks } from "../hooks/useBookmarks";
import { bookmarkService } from "../services/bookmarkService";
import { Watermark } from "./Watermark";
import type {
  Bookmark,
  BookmarkFormData,
  BookmarkFilters as FilterType,
  SortOption,
} from "../types/bookmark";

const ITEMS_PER_PAGE = 12;

export const BookmarkApp: React.FC = () => {
  const { showToast } = useToast();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<"AND" | "OR">("OR");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Create filters object
  const filters: FilterType = useMemo(
    () => ({
      search: searchQuery,
      tags: selectedTags,
      tagFilterMode,
      sortBy,
    }),
    [searchQuery, selectedTags, tagFilterMode, sortBy]
  );

  // Load bookmarks with current filters and pagination
  const { bookmarks, loading, error, pagination, refreshBookmarks } =
    useBookmarks(filters, currentPage, ITEMS_PER_PAGE);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, tagFilterMode, sortBy]);

  // Modal handlers
  const handleAddBookmark = useCallback(() => {
    setEditingBookmark(null);
    setIsModalOpen(true);
  }, []);

  const handleEditBookmark = useCallback((bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingBookmark(null);
    setModalLoading(false);
  }, []);

  const handleSubmitBookmark = useCallback(
    async (formData: BookmarkFormData) => {
      try {
        setModalLoading(true);

        if (editingBookmark) {
          await bookmarkService.updateBookmark(editingBookmark.id, formData);
          showToast("success", "Bookmark updated successfully!");
        } else {
          await bookmarkService.createBookmark(formData);
          showToast("success", "Bookmark added successfully!");
        }

        await refreshBookmarks();
        setRefreshTrigger((prev) => prev + 1);
        handleCloseModal();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
        showToast("error", message);
      } finally {
        setModalLoading(false);
      }
    },
    [editingBookmark, showToast, refreshBookmarks, handleCloseModal]
  );

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: "Delete Bookmark",
        message:
          "Are you sure you want to delete this bookmark? This action cannot be undone.",
        onConfirm: async () => {
          try {
            await bookmarkService.deleteBookmark(id);
            showToast("success", "Bookmark deleted successfully!");
            await refreshBookmarks();
            setRefreshTrigger((prev) => prev + 1);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to delete bookmark";
            showToast("error", message);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    },
    [showToast, refreshBookmarks]
  );

  const handleRegenerateThumbnail = useCallback(
    async (id: string) => {
      try {
        await bookmarkService.regenerateThumbnail(id);
        showToast("success", "Thumbnail regenerated successfully!");

        // Force a complete refresh from Firebase
        await refreshBookmarks();
        setRefreshTrigger((prev) => prev + 1);

        // Force page to re-render by updating current page
        setCurrentPage((prev) => prev);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to regenerate thumbnail";
        showToast("error", message);
      }
    },
    [showToast, refreshBookmarks]
  );

  // Search handler with debouncing
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Filter handlers
  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  const handleTagFilterModeChange = useCallback((mode: "AND" | "OR") => {
    setTagFilterMode(mode);
  }, []);

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Determine what to show in the main content area
  const renderMainContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={refreshBookmarks} className="btn-primary">
            Try Again
          </button>
        </div>
      );
    }

    if (bookmarks.length === 0) {
      const hasFilters =
        searchQuery || selectedTags.length > 0 || sortBy !== "newest";
      return (
        <EmptyState
          type={hasFilters ? "no-results" : "no-bookmarks"}
          onAddBookmark={hasFilters ? undefined : handleAddBookmark}
        />
      );
    }

    return (
      <>
        {/* Bookmarks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="h-full">
              <BookmarkCard
                bookmark={bookmark}
                onEdit={handleEditBookmark}
                onDelete={handleDeleteBookmark}
                onRegenerateThumbnail={handleRegenerateThumbnail}
              />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      </>
    );
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onAddBookmark={handleAddBookmark}
      />

      {/* Filters */}
      <BookmarkFilters
        selectedTags={selectedTags}
        tagFilterMode={tagFilterMode}
        sortBy={sortBy}
        onTagsChange={handleTagsChange}
        onTagFilterModeChange={handleTagFilterModeChange}
        onSortChange={handleSortChange}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>

      {/* Modal */}
      <BookmarkModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitBookmark}
        bookmark={editingBookmark}
        loading={modalLoading}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Watermark */}
      <Watermark
        version={__APP_VERSION__}
        githubUrl="https://github.com/Finn24-09/better-bookmarks"
      />
    </div>
  );
};
