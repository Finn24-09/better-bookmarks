import type { Bookmark } from '../types/bookmark';

// Characters that trigger formula execution in spreadsheet applications (OWASP CSV injection prevention)
const INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escapes a value for safe inclusion in a CSV cell.
 * - Neutralizes CSV injection (OWASP) by prepending a single quote to dangerous leading characters
 * - Wraps the value in double-quotes (RFC 4180)
 * - Escapes embedded double-quotes by doubling them (RFC 4180)
 */
function escapeCsvCell(value: string): string {
  let safe = value;
  if (INJECTION_PREFIXES.some((prefix) => safe.startsWith(prefix))) {
    safe = "'" + safe;
  }
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Formats a Date as an ISO 8601 string (e.g. "2024-06-15T10:30:00.000Z").
 */
function formatDate(date: Date): string {
  return date instanceof Date && !isNaN(date.getTime())
    ? date.toISOString()
    : '';
}

const CSV_HEADERS = [
  'ID',
  'Title',
  'URL',
  'Description',
  'Tags',
  'Favicon URL',
  'Thumbnail URL',
  'Created At',
  'Updated At',
];

/**
 * Converts an array of Bookmark objects into a RFC 4180-compliant CSV string.
 * Includes a UTF-8 BOM for correct rendering in Excel.
 */
function convertToCSV(bookmarks: Bookmark[]): string {
  const headerRow = CSV_HEADERS.map(escapeCsvCell).join(',');

  const dataRows = bookmarks.map((bookmark) => {
    const tags = Array.isArray(bookmark.tags) ? bookmark.tags.join('|') : '';
    return [
      bookmark.id,
      bookmark.title,
      bookmark.url,
      bookmark.description,
      tags,
      bookmark.favicon ?? '',
      bookmark.thumbnail ?? '',
      formatDate(bookmark.createdAt),
      formatDate(bookmark.updatedAt),
    ]
      .map(String)
      .map(escapeCsvCell)
      .join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens the file with correct encoding
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a browser file download for the given CSV content.
 * Revokes the object URL after the click to prevent memory leaks.
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the object URL to free memory
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename with today's date: bookmarks_YYYY-MM-DD.csv
 */
function buildFilename(): string {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return `bookmarks_${today}.csv`;
}

export const bookmarkExportService = {
  /**
   * Converts the provided bookmarks to a CSV file and triggers a browser download.
   * Handles zero bookmarks gracefully (exports only the header row).
   */
  exportBookmarksAsCSV(bookmarks: Bookmark[]): void {
    const csvContent = convertToCSV(bookmarks);
    const filename = buildFilename();
    downloadCSV(csvContent, filename);
  },
};
