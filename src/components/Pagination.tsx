import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationInfo } from "../types/bookmark";
import clsx from "clsx";

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
      <div className="flex items-center justify-between">
        {/* Results info */}
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={clsx(
              "relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md",
              currentPage === 1
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={clsx(
              "ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md",
              currentPage === totalPages
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            Next
          </button>
        </div>

        <div className="hidden sm:block w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>

            <div>
              <nav
                className="isolate inline-flex rounded-md shadow-sm gap-2"
                aria-label="Pagination"
              >
                {/* Previous button */}
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={clsx(
                    "relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium",
                    currentPage === 1
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                      : "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Page numbers */}
                {visiblePages.map((page, index) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`dots-${index}`}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md"
                      >
                        ...
                      </span>
                    );
                  }

                  const pageNumber = page as number;
                  const isCurrentPage = pageNumber === currentPage;

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => onPageChange(pageNumber)}
                      className={clsx(
                        "relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md",
                        isCurrentPage
                          ? "z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-400"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {/* Next button */}
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    "relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium",
                    currentPage === totalPages
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                      : "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
