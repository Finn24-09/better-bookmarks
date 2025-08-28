# Firebase Firestore Database Setup

## Database Structure

### Collections

#### 1. `bookmarks` Collection

```
/bookmarks/{bookmarkId}
```

**Document Fields:**

- `userId` (string) - The UID of the user who owns this bookmark
- `title` (string) - The bookmark title
- `url` (string) - The bookmark URL
- `description` (string) - Optional description
- `tags` (array of strings) - Array of tag names
- `favicon` (string, optional) - URL to the favicon
- `thumbnail` (string, optional) - URL to the thumbnail image
- `createdAt` (timestamp) - When the bookmark was created
- `updatedAt` (timestamp) - When the bookmark was last updated

**Example Document:**

```json
{
  "userId": "abc123def456",
  "title": "Google",
  "url": "https://www.google.com",
  "description": "Search engine",
  "tags": ["search", "tools", "web"],
  "favicon": "https://www.google.com/favicon.ico",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

#### 2. `users` Collection (Optional - for user metadata)

```
/users/{userId}
```

**Document Fields:**

- `email` (string) - User's email address
- `createdAt` (timestamp) - When the user account was created
- `lastLoginAt` (timestamp) - Last login timestamp

## Security Rules

Copy and paste these rules into your Firebase Console under Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own bookmarks
    match /bookmarks/{bookmarkId} {
      allow read, write: if request.auth != null &&
                        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
                   request.auth.uid == request.resource.data.userId;
    }

    // Users can access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null &&
                        request.auth.uid == userId;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Indexes

Create these composite indexes in Firebase Console under Firestore Database > Indexes:

### 1. User Bookmarks Query Index

- **Collection ID:** `bookmarks`
- **Fields:**
  - `userId` (Ascending)
  - `createdAt` (Descending)

### 2. User Bookmarks with Tags Index

- **Collection ID:** `bookmarks`
- **Fields:**
  - `userId` (Ascending)
  - `tags` (Arrays)
  - `createdAt` (Descending)

### 3. User Bookmarks by Title Index

- **Collection ID:** `bookmarks`
- **Fields:**
  - `userId` (Ascending)
  - `title` (Ascending)

### 4. User Bookmarks by Title Descending Index

- **Collection ID:** `bookmarks`
- **Fields:**
  - `userId` (Ascending)
  - `title` (Descending)

## Setup Instructions

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Select your project** or create a new one
3. **Enable Firestore Database:**

   - Go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" initially
   - Select a location for your database

4. **Set up Security Rules:**

   - Go to "Firestore Database" > "Rules"
   - Replace the default rules with the rules provided above
   - Click "Publish"

5. **Update Environment Variables:**
   - Go to "Project Settings" > "General"
   - Scroll down to "Your apps" and select your web app
   - Copy the Firebase configuration
   - Update your `.env` file with the real values:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-actual-sender-id
VITE_FIREBASE_APP_ID=your-actual-app-id
```

## Security Features

✅ **User Isolation:** Each user can only access their own bookmarks
✅ **Authentication Required:** All operations require user authentication
✅ **Data Validation:** Security rules validate that userId matches authenticated user
✅ **No Cross-User Access:** Users cannot see or modify other users' data
✅ **Secure by Default:** All other access is denied

## Index Building and Temporary Solution

⚠️ **Important Note:** When you first start using the application, you may see an error about missing indexes. This is normal and expected.

### What's Happening

- Firebase automatically creates indexes when it detects complex queries
- The first time you create bookmarks, Firebase will start building the required indexes
- This process can take several minutes to complete
- During this time, the application uses client-side filtering and sorting

### Current Implementation

The application is designed to handle this gracefully:

- ✅ **Bookmarks can be created** immediately
- ✅ **Simple queries work** right away (basic user filtering)
- ✅ **Client-side filtering** handles search, tags, and sorting while indexes build
- ✅ **Automatic upgrade** to server-side queries once indexes are ready

### No Action Required

- The application will work immediately, even while indexes are building
- Performance will improve automatically once indexes are complete
- You don't need to manually create indexes - Firebase handles this automatically

## Data Privacy

- Each user's bookmarks are completely private
- No user can access another user's data
- All queries are automatically filtered by the authenticated user's ID
- The application enforces user isolation at both the client and server level
