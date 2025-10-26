import React, { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import type { SortOption } from "../types/bookmark";
import { bookmarkService } from "../services/bookmarkService";
import clsx from "clsx";

interface BookmarkFiltersProps {
  selectedTags: string[];
  tagFilterMode: "AND" | "OR";
  sortBy: SortOption;
  onTagsChange: (tags: string[]) => void;
  onTagFilterModeChange: (mode: "AND" | "OR") => void;
  onSortChange: (sort: SortOption) => void;
  refreshTrigger?: number;
}

export const BookmarkFilters: React.FC<BookmarkFiltersProps> = ({
  selectedTags,
  tagFilterMode,
  sortBy,
  onTagsChange,
  onTagFilterModeChange,
  onSortChange,
  refreshTrigger,
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Generate a consistent color for each tag based on its name (same as BookmarkCard)
  const getTagColor = (tag: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    ];

    // Generate a hash from the tag name to get consistent colors
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      const char = tag.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await bookmarkService.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        // Silently handle tag loading errors
      }
    };

    // Only load tags if we don't have them yet or if explicitly refreshed
    if (availableTags.length === 0 || (refreshTrigger && refreshTrigger > 0)) {
      loadTags();
    }
  }, [refreshTrigger, availableTags.length]);

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((tag) => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearAllFilters = () => {
    onTagsChange([]);
    onSortChange("newest");
  };

  const hasActiveFilters = selectedTags.length > 0 || sortBy !== "newest";

  return (
    <div className="filter-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200",
              showFilters
                ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
                {selectedTags.length + (sortBy !== "newest" ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: "var(--filter-text)" }}
            >
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="input-field py-1 text-sm min-w-0 w-32 sm:w-auto"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
            <div className="space-y-4">
              {/* Tags Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Filter by Tags
                  </h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Tag Filter Mode Toggle */}
                {selectedTags.length > 1 && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Show bookmarks with:
                      </span>
                      <div
                        className="flex rounded-lg p-1"
                        style={{ backgroundColor: "var(--bg-primary)" }}
                      >
                        <button
                          onClick={() => onTagFilterModeChange("AND")}
                          className={clsx(
                            "px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200",
                            tagFilterMode === "AND"
                              ? "shadow-sm"
                              : "hover:opacity-80"
                          )}
                          style={
                            tagFilterMode === "AND"
                              ? {
                                  backgroundColor: "var(--bg-secondary)",
                                  color: "var(--text-primary)",
                                }
                              : { color: "var(--text-secondary)" }
                          }
                        >
                          ALL tags
                        </button>
                        <button
                          onClick={() => onTagFilterModeChange("OR")}
                          className={clsx(
                            "px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200",
                            tagFilterMode === "OR"
                              ? "shadow-sm"
                              : "hover:opacity-80"
                          )}
                          style={
                            tagFilterMode === "OR"
                              ? {
                                  backgroundColor: "var(--bg-secondary)",
                                  color: "var(--text-primary)",
                                }
                              : { color: "var(--text-secondary)" }
                          }
                        >
                          ANY tag
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {availableTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={clsx(
                            "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200",
                            isSelected
                              ? getTagColor(tag)
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          )}
                        >
                          {tag}
                          {isSelected && <X className="ml-1 h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No tags available. Add some bookmarks with tags to see them
                    here.
                  </p>
                )}
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Active filters:</span>
                  {selectedTags.length > 0 && (
                    <span>
                      {selectedTags.length} tag
                      {selectedTags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {sortBy !== "newest" && (
                    <span>Sort: {sortBy.replace("-", " ")}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
