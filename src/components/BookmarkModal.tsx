import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import type {
  Bookmark,
  BookmarkFormData,
  BookmarkTag,
} from "../types/bookmark";
import { bookmarkService } from "../services/bookmarkService";
import clsx from "clsx";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookmarkFormData) => Promise<void>;
  bookmark?: Bookmark | null;
  loading?: boolean;
}

export const BookmarkModal: React.FC<BookmarkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bookmark,
  loading = false,
}) => {
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: "",
    url: "",
    description: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableTags, setAvailableTags] = useState<BookmarkTag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<BookmarkTag[]>([]);
  const [tagInputFocused, setTagInputFocused] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setFormData({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || "",
        tags: bookmark.tags.map((tag) => tag.name),
      });
    } else {
      setFormData({
        title: "",
        url: "",
        description: "",
        tags: [],
      });
    }
    setTagInput("");
    setErrors({});
    setShowTagSuggestions(false);
  }, [bookmark, isOpen]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await bookmarkService.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };

    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = availableTags
        .filter(
          (tag) =>
            tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !formData.tags.includes(tag.name)
        )
        .slice(0, 5); // Show max 5 suggestions
      setFilteredTags(filtered);
    } else {
      // Show recent tags when input is empty
      const recentTags = availableTags
        .filter((tag) => !formData.tags.includes(tag.name))
        .slice(0, 5);
      setFilteredTags(recentTags);
    }
  }, [tagInput, availableTags, formData.tags]);

  useEffect(() => {
    setShowTagSuggestions(tagInputFocused && filteredTags.length > 0);
  }, [tagInputFocused, filteredTags]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.url.trim()) {
      newErrors.url = "URL is required";
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const addTag = (tagName?: string) => {
    const trimmedTag = (tagName || tagInput).trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput("");
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-black bg-opacity-50 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform card shadow-xl rounded-2xl z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3
              className="text-lg font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {bookmark ? "Edit Bookmark" : "Add New Bookmark"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={clsx(
                  "input-field",
                  errors.title &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
                placeholder="Enter bookmark title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* URL */}
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                URL *
              </label>
              <input
                type="url"
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                className={clsx(
                  "input-field",
                  errors.url &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
                placeholder="https://example.com"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="input-field resize-none"
                placeholder="Optional description"
              />
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tags
              </label>
              <div className="relative">
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    onFocus={() => setTagInputFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setTagInputFocused(false), 200)
                    }
                    className="input-field flex-1"
                    placeholder="Add a tag"
                  />
                  <button
                    type="button"
                    onClick={() => addTag()}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Tag Suggestions Dropdown */}
                {showTagSuggestions && filteredTags.length > 0 && (
                  <div className="absolute z-20 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto top-full mt-1">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => addTag(tag.name)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <span>{bookmark ? "Update" : "Add"} Bookmark</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
