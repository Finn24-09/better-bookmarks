# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Better Bookmarks is a modern, secure bookmark manager built with React, TypeScript, and Firebase. It features intelligent thumbnail generation, tag-based organization, and a beautiful responsive UI with dark/light theme support.

**Key Technologies:**
- Frontend: React 19, TypeScript 5.8, Vite 7
- Styling: Tailwind CSS 4 with custom forms plugin
- Backend: Firebase (Authentication, Firestore, Storage)
- Deployment: Docker with nginx on Alpine Linux
- External: Better Bookmarks Scraper Service (separate repository for thumbnail generation)

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:5173

# Build & Preview
npm run build            # TypeScript compilation + Vite production build
npm run preview          # Preview production build locally

# Linting
npm run lint             # Run ESLint with TypeScript support

# Docker (Production)
docker-compose up -d     # Build and start containerized app
docker-compose logs -f   # View container logs
docker-compose down      # Stop and remove containers
```

## Architecture Overview

### Application Structure

```
src/
├── components/          # React components (UI layer)
├── contexts/           # React Context providers (AuthContext, ThemeContext, ToastContext)
├── hooks/              # Custom React hooks (useAuth, useBookmarks, useTheme, useToast)
├── services/           # Business logic and external integrations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (security, error handling, env)
└── config/             # Configuration (Firebase initialization)
```

### Core Architecture Patterns

**1. Context-Based State Management**

The app uses React Context API for global state:
- `AuthContext`: User authentication state and methods (login, register, logout, resetPassword)
- `ThemeContext`: Dark/light theme state with system detection
- `ToastContext`: Application-wide toast notifications

All contexts follow a standard pattern:
- `*ContextDefinition.tsx`: Exports the context object
- `*Context.tsx`: Provider implementation with state and logic
- `hooks/use*.ts`: Custom hook for consuming the context

**2. Service Layer Architecture**

Services encapsulate business logic and external API calls:

- **`bookmarkService.ts`**: Core bookmark CRUD operations
  - Multi-layer caching (memory + localStorage) with 5-minute TTL
  - User isolation: All queries scoped to `userId`
  - Client-side filtering/sorting for cached data
  - Automatic cache invalidation on mutations

- **`enhancedThumbnailService.ts`**: Advanced thumbnail management
  - Firebase Storage integration with deduplication
  - URL-based hashing (SHA-256) for efficient storage
  - Access control: Users can only access thumbnails for their bookmarks
  - Metadata tracking in `thumbnail_metadata` collection

- **`thumbnailService.ts`**: External API integration
  - Calls Better Bookmarks Scraper Service for screenshots
  - Video platform detection (YouTube, Vimeo, Dailymotion, Twitch)
  - Multi-level fallback: video thumbnails → screenshots → favicons

- **`cacheService.ts`**: Unified caching abstraction
  - Dual-layer: in-memory (Map) + localStorage
  - TTL-based expiration with automatic cleanup
  - Safe error handling for localStorage quota issues

**3. Firebase Data Model**

Two main Firestore collections:

- **`bookmarks`**: User-owned bookmarks
  ```typescript
  {
    userId: string,           // Owner isolation
    title: string,
    url: string,
    description: string,
    tags: string[],           // Array of tag names
    favicon?: string,         // Google favicon URL
    thumbnail?: string,       // Firebase Storage URL
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
  ```

- **`thumbnail_metadata`**: Shared thumbnail cache
  ```typescript
  {
    url: string,              // Original URL
    urlHash: string,          // SHA-256 hash (filename)
    storageUrl: string,       // Firebase Storage download URL
    storagePath: string,      // Storage path
    type: 'video' | 'screenshot' | 'favicon',
    source: string,           // Platform/service name
    userId: string,           // Uploader
    accessCount: number,      // Usage tracking
    lastAccessedAt: Timestamp
  }
  ```

**4. Security Architecture**

Security is enforced at multiple layers:

- **Input Validation** ([src/utils/security.ts](src/utils/security.ts)):
  - `validateUrl()`: Protocol whitelist (HTTP/HTTPS), private IP blocking, length limits
  - `sanitizeText()`: XSS protection via HTML entity encoding
  - `validateTag()`: Tag format and length validation
  - `rateLimiter`: Simple in-memory rate limiting

- **Firebase Security Rules**: User isolation enforced server-side (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))

- **Container Security** (Docker):
  - Read-only root filesystem with tmpfs mounts
  - Non-root user execution (nginx user)
  - Security headers in nginx.conf (CSP, HSTS, X-Frame-Options)

**5. Authentication Flow**

Protected routes use `<ProtectedRoute>` wrapper ([src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)):
- Checks `authContext.user` and `loading` state
- Redirects to `/login` if not authenticated
- Main app at `/` requires authentication

Authentication pages (`/login`, `/register`, `/forgot-password`) are public routes.

**6. Environment Configuration**

Runtime environment variables loaded via Vite:
- `VITE_SCREENSHOT_API_URL`: Scraper service endpoint
- `VITE_SCREENSHOT_API_KEY`: Scraper service API key
- `VITE_FIREBASE_*`: Firebase configuration (6 variables)

Configuration validation in [src/utils/env.ts](src/utils/env.ts) with graceful degradation.

## Critical Implementation Details

### Thumbnail Generation Flow

1. **Check Cache**: Memory → localStorage → Firebase Storage (via `thumbnail_metadata`)
2. **Generate New**:
   - Video URL? → Extract platform thumbnail (direct URL)
   - Otherwise → Call scraper API → Upload to Firebase Storage
   - Store metadata in `thumbnail_metadata` collection
3. **Access Control**: Verify user has a bookmark for the URL before serving cached thumbnails
4. **Fallback Chain**: Screenshot → Video thumbnail → Google favicon → Placeholder

### Bookmark Creation/Update

When creating or updating bookmarks:
1. Input validation and sanitization (URLs, text, tags)
2. Rate limiting check (10 requests per 60 seconds)
3. Thumbnail generation (pass `isCreatingBookmark: true` to skip access checks on create)
4. Firestore document write
5. Cache invalidation (both `user_bookmarks_*` and `user_tags_*`)

### Client-Side Filtering

The `bookmarkService.getBookmarks()` method fetches all user bookmarks once, then applies filtering/sorting/pagination in memory. This reduces Firebase reads dramatically:
- Search: Matches title, description, URL, or tags
- Tags: AND/OR mode filtering
- Sort: newest, oldest, title-asc, title-desc
- Pagination: Client-side slicing

### Error Handling

Centralized error handling in [src/utils/errorHandler.ts](src/utils/errorHandler.ts):
- `handleError()`: Converts Firebase errors to user-friendly messages
- `createError()`: Creates categorized errors (AUTHENTICATION, NETWORK, STORAGE, etc.)
- All service methods catch and transform errors before re-throwing

## External Dependencies

### Better Bookmarks Scraper Service

**Required for thumbnail generation.** Separate repository: [better-bookmarks-scraper](https://github.com/Finn24-09/better-bookmarks-scraper)

Configure via environment variables:
- `VITE_SCREENSHOT_API_URL`
- `VITE_SCREENSHOT_API_KEY`

The app gracefully degrades if the scraper service is unavailable (falls back to favicons).

### Firebase Setup

Comprehensive setup guide in [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Must configure:
1. Authentication (Email/Password provider)
2. Firestore Database (with security rules)
3. Storage (with security rules for `/thumbnails/` path)

## Common Gotchas

1. **Cache Invalidation**: Always call `this.clearBookmarkCaches()` after bookmark mutations (create, update, delete) to ensure UI consistency.

2. **Thumbnail Access Control**: When generating thumbnails for existing bookmarks, pass `isCreatingBookmark: false` (default). Only pass `true` during bookmark creation to skip the access check.

3. **Date Serialization**: Firestore Timestamps must be converted to/from JavaScript Dates. Helper functions in [src/services/bookmarkService.ts](src/services/bookmarkService.ts):
   - `convertFirestoreToBookmark()`: Timestamp → Date
   - `convertBookmarkToFirestore()`: Date → Timestamp

4. **Environment Variables**: All environment variables must be prefixed with `VITE_` to be available at runtime (Vite convention).

5. **Docker Entrypoint**: The [entrypoint.sh](entrypoint.sh) script injects runtime environment variables into the built app by replacing placeholders in JavaScript files. Build-time values are used as fallbacks.

6. **Firebase Initialization**: The app allows building with placeholder Firebase config ([src/config/firebase.ts](src/config/firebase.ts)) but shows a configuration error page at runtime if real credentials aren't provided.

7. **Mobile Menu Positioning**: Mobile action menus in BookmarkCard use `fixed` positioning (not `absolute`) to prevent being clipped by card overflow constraints. This ensures the entire menu is visible on mobile devices.

8. **Dark Mode Consistency**: The ThemeContext applies the `dark` class to the document root, triggering all `dark:` Tailwind variants. Always use Tailwind's dark mode classes (e.g., `text-gray-900 dark:text-gray-100`) rather than CSS variables for text colors to ensure proper dark mode support. CSS variables are used for backgrounds and borders defined in [src/index.css](src/index.css).

## Testing Notes

There are currently no automated tests in this repository. When adding tests:
- Mock Firebase services (auth, firestore, storage)
- Mock the scraper API calls
- Test cache behavior with time-based expiration
- Test security validation functions thoroughly
