/**
 * Centralized error handling utility
 * Provides consistent error handling and user-friendly error messages
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: string;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly details?: string;
  public readonly isUserFacing: boolean;

  constructor(message: string, code?: string, details?: string, isUserFacing: boolean = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.isUserFacing = isUserFacing;
  }
}

/**
 * Error categories for better error handling
 */
export const ErrorCategory = {
  AUTHENTICATION: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  STORAGE: 'storage',
  UNKNOWN: 'unknown'
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

/**
 * Maps Firebase error codes to user-friendly messages
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email address already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
  
  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This resource already exists.',
  'resource-exhausted': 'Service is temporarily unavailable. Please try again later.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'unavailable': 'Service is temporarily unavailable. Please try again later.',
  
  // Storage errors
  'storage/unauthorized': 'You do not have permission to access this file.',
  'storage/canceled': 'File upload was canceled.',
  'storage/unknown': 'An unknown error occurred during file operation.',
  'storage/object-not-found': 'The requested file was not found.',
  'storage/bucket-not-found': 'Storage bucket not found.',
  'storage/project-not-found': 'Project not found.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/unauthenticated': 'Please sign in to access this file.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple attempts. Please try again.',
  'storage/invalid-checksum': 'File upload failed due to data corruption. Please try again.',
};

/**
 * Maps error categories to user-friendly messages
 */
const CATEGORY_ERROR_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.AUTHENTICATION]: 'Authentication failed. Please sign in again.',
  [ErrorCategory.NETWORK]: 'Network error. Please check your connection and try again.',
  [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
  [ErrorCategory.PERMISSION]: 'You do not have permission to perform this action.',
  [ErrorCategory.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait a moment before trying again.',
  [ErrorCategory.STORAGE]: 'File operation failed. Please try again.',
  [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Determines error category based on error code or message
 */
export function categorizeError(error: any): ErrorCategory {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.startsWith('auth/')) return ErrorCategory.AUTHENTICATION;
  if (code.startsWith('storage/')) return ErrorCategory.STORAGE;
  if (code === 'permission-denied') return ErrorCategory.PERMISSION;
  if (code === 'not-found') return ErrorCategory.NOT_FOUND;
  if (code === 'resource-exhausted') return ErrorCategory.RATE_LIMIT;
  if (code.includes('network') || message.includes('network')) return ErrorCategory.NETWORK;
  if (message.includes('validation') || message.includes('invalid')) return ErrorCategory.VALIDATION;
  if (message.includes('rate limit') || message.includes('too many')) return ErrorCategory.RATE_LIMIT;

  return ErrorCategory.UNKNOWN;
}

/**
 * Converts any error to a user-friendly message
 */
export function getErrorMessage(error: any): string {
  // If it's already an AppError with a user-facing message, use it
  if (error instanceof AppError && error.isUserFacing) {
    return error.message;
  }

  // Check for Firebase error codes
  const code = error?.code;
  if (code && FIREBASE_ERROR_MESSAGES[code]) {
    return FIREBASE_ERROR_MESSAGES[code];
  }

  // Check for specific error messages
  const message = error?.message || '';
  
  // Handle common validation errors
  if (message.includes('Invalid URL')) {
    return 'Please enter a valid URL.';
  }
  if (message.includes('Title is required')) {
    return 'Please enter a title for your bookmark.';
  }
  if (message.includes('Too many tags')) {
    return 'You can add a maximum of 20 tags per bookmark.';
  }
  if (message.includes('rate limit') || message.includes('Too many')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  // Use category-based fallback
  const category = categorizeError(error);
  return CATEGORY_ERROR_MESSAGES[category];
}

/**
 * Creates a standardized error object
 */
export function createError(
  message: string,
  _category: ErrorCategory = ErrorCategory.UNKNOWN,
  code?: string,
  details?: string
): AppError {
  return new AppError(message, code, details, true);
}

/**
 * Handles errors consistently across the application
 * Returns a user-friendly error message
 */
export function handleError(error: any, _context?: string): string {
  const userMessage = getErrorMessage(error);
  
  // In development, you might want to log more details
  // but we're removing console logging as requested
  
  return userMessage;
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      const userMessage = handleError(error, context);
      throw new AppError(userMessage, error?.code, context);
    }
  };
}

/**
 * Validates that a value is not null or undefined
 */
export function assertExists<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw createError(message, ErrorCategory.VALIDATION);
  }
  return value;
}

/**
 * Validates user authentication
 */
export function assertAuthenticated(user: any): void {
  if (!user) {
    throw createError(
      'You must be signed in to perform this action.',
      ErrorCategory.AUTHENTICATION,
      'auth/unauthenticated'
    );
  }
}
