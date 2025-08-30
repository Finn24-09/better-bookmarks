/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validate and sanitize URL input
 */
export const validateUrl = (url: string): { isValid: boolean; sanitizedUrl?: string; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  // Remove leading/trailing whitespace
  const trimmedUrl = url.trim();
  
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  // Check for basic URL structure
  if (!trimmedUrl.includes('.') || trimmedUrl.length < 4) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  try {
    // Add protocol if missing
    let normalizedUrl = trimmedUrl;
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL structure
    const urlObj = new URL(normalizedUrl);
    
    // Security checks
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Prevent localhost/private IP access in production
    if (import.meta.env.PROD) {
      const hostname = urlObj.hostname.toLowerCase();
      
      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return { isValid: false, error: 'Localhost URLs are not allowed' };
      }
      
      // Block private IP ranges
      const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
      if (privateIpRegex.test(hostname)) {
        return { isValid: false, error: 'Private IP addresses are not allowed' };
      }
    }

    // Limit URL length
    if (normalizedUrl.length > 2048) {
      return { isValid: false, error: 'URL is too long (max 2048 characters)' };
    }

    return { isValid: true, sanitizedUrl: normalizedUrl };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (text: string, maxLength: number = 1000): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .slice(0, maxLength)
    // Remove potential HTML/script tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script content
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
};

/**
 * Validate tag input
 */
export const validateTag = (tag: string): { isValid: boolean; sanitizedTag?: string; error?: string } => {
  if (!tag || typeof tag !== 'string') {
    return { isValid: false, error: 'Tag cannot be empty' };
  }

  const sanitized = sanitizeText(tag, 50).toLowerCase();
  
  if (!sanitized) {
    return { isValid: false, error: 'Tag cannot be empty after sanitization' };
  }

  if (sanitized.length < 1) {
    return { isValid: false, error: 'Tag is too short' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, error: 'Tag is too long (max 50 characters)' };
  }

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-z0-9_-]+$/.test(sanitized)) {
    return { isValid: false, error: 'Tag can only contain letters, numbers, hyphens, and underscores' };
  }

  return { isValid: true, sanitizedTag: sanitized };
};

/**
 * Rate limiting utility
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing attempts for this key
    const keyAttempts = this.attempts.get(key) || [];
    
    // Filter out attempts outside the window
    const recentAttempts = keyAttempts.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com",
  'img-src': "'self' data: https: blob:",
  'connect-src': "'self' https://*.googleapis.com https://*.firebaseapp.com https://www.google.com",
  'frame-src': "'none'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'"
};

/**
 * Validate Firebase configuration
 */
export const validateFirebaseConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  for (const envVar of requiredEnvVars) {
    const value = import.meta.env[envVar];
    if (!value || value === 'your-actual-api-key' || value.includes('your-project-id')) {
      errors.push(`${envVar} is not properly configured`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Secure random string generation
 */
export const generateSecureId = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
