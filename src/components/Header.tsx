import React, { useState } from "react";
import { Search, Moon, Sun, Plus, LogOut, User } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import clsx from "clsx";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddBookmark: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onAddBookmark,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      showToast("success", "Successfully logged out!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      showToast("error", message);
    }
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 header-bg backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          {/* Top row: Logo, Title, and Actions */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(to bottom right, #3b82f6, #2563eb)",
                }}
              >
                <span className="text-white font-bold text-xs">B</span>
              </div>
              <h1
                className="text-lg font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Better Bookmarks
              </h1>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Add Bookmark Button */}
              <button
                onClick={onAddBookmark}
                className="btn-primary p-2"
                title="Add Bookmark"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={clsx(
                  "p-2 rounded-lg transition-colors duration-200",
                  "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                )}
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={clsx(
                    "p-2 rounded-lg transition-colors duration-200",
                    "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  )}
                  aria-label="User menu"
                >
                  <User className="h-4 w-4" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                        <p className="font-medium truncate">
                          {user?.email || "User"}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Search Bar */}
          <div className="pb-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-field pl-10 pr-4 text-base"
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(to bottom right, #3b82f6, #2563eb)",
              }}
            >
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Better Bookmarks
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookmarks, tags, or URLs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-field pl-10 pr-4"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Add Bookmark Button */}
            <button
              onClick={onAddBookmark}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Bookmark</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={clsx(
                "p-2 rounded-lg transition-colors duration-200",
                "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              )}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={clsx(
                  "p-2 rounded-lg transition-colors duration-200",
                  "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                )}
                aria-label="User menu"
              >
                <User className="h-5 w-5" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                      <p className="font-medium truncate">
                        {user?.email || "User"}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
