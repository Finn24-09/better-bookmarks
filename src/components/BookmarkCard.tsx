import React, { useState, useEffect } from "react";
import { ExternalLink, Edit, Trash2, Globe, MoreVertical } from "lucide-react";
import type { Bookmark } from "../types/bookmark";
import { enhancedThumbnailService } from "../services/enhancedThumbnailService";
import clsx from "clsx";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  onEdit,
  onDelete,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);

  // Generate a consistent color for each tag based on its name
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

  const handleImageLoad = () => {
    setImageLoading(false);
    // Track thumbnail access when image loads successfully
    if (bookmark.thumbnail && !imageError) {
      enhancedThumbnailService.trackThumbnailAccess(bookmark.url).catch(() => {
        // Silently handle tracking errors
      });
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Track thumbnail access when component mounts (for cached/immediate loads)
  useEffect(() => {
    if (bookmark.thumbnail) {
      enhancedThumbnailService.trackThumbnailAccess(bookmark.url).catch(() => {
        // Silently handle tracking errors
      });
    }
  }, [bookmark.url, bookmark.thumbnail]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getThumbnailSrc = () => {
    if (bookmark.thumbnail && !imageError) {
      return bookmark.thumbnail;
    }
    return bookmark.favicon;
  };

  const openBookmark = () => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="card group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col h-full">
      {/* Thumbnail/Favicon */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden flex-shrink-0">
        {getThumbnailSrc() && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            )}
            <img
              src={getThumbnailSrc()}
              alt={bookmark.title}
              className={clsx(
                "w-full h-full object-cover transition-opacity duration-200",
                imageLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Globe className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Desktop Hover Overlay */}
        <div className="hidden sm:flex absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={openBookmark}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
              title="Open bookmark"
            >
              <ExternalLink className="h-4 w-4 text-gray-700" />
            </button>
            <button
              onClick={() => onEdit(bookmark)}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
              title="Edit bookmark"
            >
              <Edit className="h-4 w-4 text-gray-700" />
            </button>
            <button
              onClick={() => onDelete(bookmark.id)}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
              title="Delete bookmark"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>

        {/* Mobile Actions Menu */}
        <div className="sm:hidden absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 bg-black bg-opacity-50 text-white rounded-full shadow-lg backdrop-blur-sm"
              title="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showActions && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />

                {/* Actions Menu */}
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      openBookmark();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open</span>
                  </button>
                  <button
                    onClick={() => {
                      onEdit(bookmark);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(bookmark.id);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 space-y-3">
          {/* Title */}
          <h3
            className="font-semibold line-clamp-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
            style={{ color: "var(--text-primary)" }}
            onClick={openBookmark}
            title={bookmark.title}
          >
            {bookmark.title}
          </h3>

          {/* Description - Fixed height container */}
          <div className="h-10">
            {bookmark.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {bookmark.description}
              </p>
            )}
          </div>

          {/* URL */}
          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
            {bookmark.url}
          </p>

          {/* Tags - Fixed height container */}
          <div className="h-6 mb-3">
            {bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bookmark.tags.map((tag, index) => (
                  <span
                    key={`${bookmark.id}-tag-${index}`}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(
                      tag
                    )}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Always at bottom */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span>Added {formatDate(bookmark.createdAt)}</span>
          {bookmark.updatedAt.getTime() !== bookmark.createdAt.getTime() && (
            <span>Updated {formatDate(bookmark.updatedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
