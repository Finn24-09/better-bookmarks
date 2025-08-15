import React from "react";
import { Bookmark, Search, Plus } from "lucide-react";

interface EmptyStateProps {
  type: "no-bookmarks" | "no-results";
  onAddBookmark?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onAddBookmark,
}) => {
  if (type === "no-bookmarks") {
    return (
      <div className="text-center py-12">
        <div
          className="mx-auto h-24 w-24 mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <Bookmark className="h-full w-full" />
        </div>
        <h3
          className="text-lg font-medium mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          No bookmarks yet
        </h3>
        <p
          className="mb-6 max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Start building your bookmark collection by adding your first bookmark.
          Save interesting articles, useful tools, and favorite websites all in
          one place.
        </p>
        {onAddBookmark && (
          <button
            onClick={onAddBookmark}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Bookmark</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div
        className="mx-auto h-24 w-24 mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        <Search className="h-full w-full" />
      </div>
      <h3
        className="text-lg font-medium mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        No bookmarks found
      </h3>
      <p
        className="mb-6 max-w-md mx-auto"
        style={{ color: "var(--text-secondary)" }}
      >
        We couldn't find any bookmarks matching your search criteria. Try
        adjusting your search terms or filters.
      </p>
      <div className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <p>• Check your spelling</p>
        <p>• Try different keywords</p>
        <p>• Remove some filters</p>
        <p>• Search for broader terms</p>
      </div>
    </div>
  );
};
