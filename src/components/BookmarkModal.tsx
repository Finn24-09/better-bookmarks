import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Bookmark, BookmarkFormData } from "../types/bookmark";
import { bookmarkService } from "../services/bookmarkService";
import { validateUrl, sanitizeText, validateTag } from "../utils/security";
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

  // Get just the background color for the tag dot in suggestions
  const getTagDotColor = (tag: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-cyan-500",
    ];

    // Generate a hash from the tag name to get consistent colors (same logic as getTagColor)
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      const char = tag.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  };
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"below" | "above">(
    "below"
  );
  const [maxVisibleTags, setMaxVisibleTags] = useState(8);

  useEffect(() => {
    if (bookmark) {
      setFormData({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || "",
        tags: bookmark.tags, // tags are already strings
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
      } catch (err) {
        // Silently handle tag loading errors
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
            tag.toLowerCase().includes(tagInput.toLowerCase()) &&
            !formData.tags.includes(tag)
        )
        .sort((a, b) => a.localeCompare(b))
        .slice(0, maxVisibleTags);
      setFilteredTags(filtered);
    } else {
      // Show recent tags when input is empty
      const recentTags = availableTags
        .filter((tag) => !formData.tags.includes(tag))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, maxVisibleTags);
      setFilteredTags(recentTags);
    }
  }, [tagInput, availableTags, formData.tags, maxVisibleTags]);

  useEffect(() => {
    setShowTagSuggestions(tagInputFocused && filteredTags.length > 0);
  }, [tagInputFocused, filteredTags]);

  // Calculate dropdown position and max visible tags based on available space
  const calculateDropdownPosition = (inputElement: HTMLElement) => {
    const rect = inputElement.getBoundingClientRect();
    const modalElement = inputElement.closest(".card");

    if (!modalElement) return;

    const modalRect = modalElement.getBoundingClientRect();
    const tagItemHeight = 40; // Approximate height of each tag item (py-2 + content)
    const dropdownPadding = 8; // Padding and border

    // Calculate available space below and above within modal boundaries
    const spaceBelow = modalRect.bottom - rect.bottom - dropdownPadding;
    const spaceAbove = rect.top - modalRect.top - dropdownPadding;

    // Determine position and calculate max tags that can fit
    if (spaceBelow >= spaceAbove) {
      setDropdownPosition("below");
      const maxTagsBelow = Math.floor(spaceBelow / tagItemHeight);
      setMaxVisibleTags(Math.max(1, Math.min(maxTagsBelow, 8)));
    } else {
      setDropdownPosition("above");
      const maxTagsAbove = Math.floor(spaceAbove / tagItemHeight);
      setMaxVisibleTags(Math.max(1, Math.min(maxTagsAbove, 8)));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate title
    const sanitizedTitle = sanitizeText(formData.title, 200);
    if (!sanitizedTitle) {
      newErrors.title = "Title is required";
    } else if (sanitizedTitle.length > 200) {
      newErrors.title = "Title is too long (max 200 characters)";
    }

    // Validate URL
    const urlValidation = validateUrl(formData.url);
    if (!urlValidation.isValid) {
      newErrors.url = urlValidation.error || "Invalid URL";
    }

    // Validate description
    const sanitizedDescription = sanitizeText(formData.description || "", 1000);
    if (formData.description && sanitizedDescription.length > 1000) {
      newErrors.description = "Description is too long (max 1000 characters)";
    }

    // Validate tags
    for (const tag of formData.tags) {
      const tagValidation = validateTag(tag);
      if (!tagValidation.isValid) {
        newErrors.tags = `Invalid tag "${tag}": ${tagValidation.error}`;
        break;
      }
    }

    // Check tag limit
    if (formData.tags.length > 20) {
      newErrors.tags = "Too many tags (max 20)";
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
    } catch {
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
        <div className="relative inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform card shadow-xl rounded-2xl z-10">
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
            <div className="relative">
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
                    onFocus={(e) => {
                      setTagInputFocused(true);
                      calculateDropdownPosition(e.target as HTMLElement);
                    }}
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
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowTagSuggestions(false)}
                    />

                    {/* Dropdown positioned to avoid overflow */}
                    <div
                      className={clsx(
                        "absolute z-30 w-full rounded-lg shadow-2xl max-h-48 overflow-hidden",
                        dropdownPosition === "below"
                          ? "top-full mt-1"
                          : "bottom-full mb-1"
                      )}
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        border: "1px solid",
                      }}
                    >
                      <div className="overflow-y-auto max-h-48">
                        {filteredTags.map((tag, index) => (
                          <button
                            key={`tag-${index}-${tag}`}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="w-full px-3 py-2 text-left flex items-center justify-between transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg hover:opacity-80"
                            style={{
                              color: "var(--text-primary)",
                              backgroundColor: "transparent",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <span
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${getTagDotColor(
                                  tag
                                )}`}
                              />
                              <span className="text-sm font-medium truncate">
                                {tag}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(
                        tag
                      )}`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
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
