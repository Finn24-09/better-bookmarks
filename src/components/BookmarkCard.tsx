import React, { useState } from "react";
import { ExternalLink, Edit, Trash2, Globe } from "lucide-react";
import type { Bookmark } from "../types/bookmark";
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

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

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

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
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
                {bookmark.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
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
