# Better Bookmarks

A modern, secure bookmark manager built with React, TypeScript, and Firebase. Organize, search, and manage your bookmarks with ease, featuring advanced thumbnail caching and a beautiful user interface.

![Better Bookmarks](src/assets/logo_128x128.png)

## ✨ Features

- 🔐 **Secure Authentication** - Firebase Authentication with email/password
- 📚 **Smart Organization** - Tag-based categorization and advanced search
- 🖼️ **Intelligent Thumbnails** - Automatic screenshot generation with smart caching
- 🌙 **Dark/Light Theme** - Beautiful UI with theme switching
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- ⚡ **Real-time Sync** - Cloud-based storage with Firebase Firestore
- 🔍 **Advanced Search** - Search by title, URL, description, and tags
- 📄 **Pagination** - Efficient browsing of large bookmark collections
- 🎯 **Smart Filtering** - Filter by tags and sort by various criteria
- 💾 **Offline Support** - Local caching for better performance

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Finn24-09/better-bookmarks.git
   cd better-bookmarks
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=your-actual-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-actual-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-actual-sender-id
   VITE_FIREBASE_APP_ID=your-actual-app-id
   ```

4. **Set up Firebase (see detailed instructions below)**

5. **Start the development server:**

   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🔧 Firebase Setup

### Complete Firebase Integration Guide

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

**Quick Setup Summary:**

1. **Create Firebase Project:**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one

2. **Enable Services:**

   - **Authentication:** Enable Email/Password sign-in
   - **Firestore Database:** Create database in production mode
   - **Storage:** Enable Firebase Storage

3. **Configure Security Rules:**

   - Copy rules from [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
   - Apply to both Firestore and Storage

4. **Get Configuration:**
   - Project Settings → General → Your apps
   - Copy Firebase config to `.env` file

### Database Structure

The application uses two main Firestore collections:

- **`bookmarks`** - User bookmarks with metadata
- **`thumbnail_metadata`** - Shared thumbnail cache with deduplication

### Storage Structure

- **`/thumbnails/`** - Cached website screenshots and favicons

## 🏗️ Project Structure

```
better-bookmarks/
├── public/                 # Static assets
│   ├── favicon-16x16.png  # App favicons
│   ├── favicon-32x32.png
│   └── favicon.png
├── src/
│   ├── assets/            # Logo assets
│   ├── components/        # React components
│   │   ├── BookmarkApp.tsx
│   │   ├── BookmarkCard.tsx
│   │   ├── BookmarkModal.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Business logic
│   │   ├── bookmarkService.ts
│   │   └── enhancedThumbnailService.ts
│   ├── types/             # TypeScript definitions
│   └── config/            # Configuration files
├── FIREBASE_SETUP.md      # Detailed Firebase setup
└── README.md             # This file
```

## 🎨 Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage)
- **State Management:** React Context API
- **Icons:** Lucide React
- **Development:** ESLint, TypeScript

## 🔐 Security Features

- ✅ **User Isolation:** Each user can only access their own bookmarks
- ✅ **Thumbnail Security:** Users can only access thumbnails for URLs they bookmark
- ✅ **Authentication Required:** All operations require user authentication
- ✅ **Data Validation:** Comprehensive validation of uploads and metadata
- ✅ **File Type Restrictions:** Only image files allowed in storage
- ✅ **Size Limits:** 5MB maximum file size for thumbnails
- ✅ **Secure by Default:** All other access is denied

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

1. **Install Firebase CLI:**

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**

   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting:**

   ```bash
   firebase init hosting
   ```

4. **Deploy:**
   ```bash
   firebase deploy
   ```

### Deploy to Other Platforms

The built files in the `dist/` folder can be deployed to any static hosting service:

- **Vercel:** Connect your GitHub repository
- **Netlify:** Drag and drop the `dist` folder
- **GitHub Pages:** Use GitHub Actions for automatic deployment

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## 📱 Features in Detail

### Smart Thumbnail System

- **Automatic Screenshots:** Generates thumbnails for bookmarked websites
- **Intelligent Caching:** Multi-level caching (browser → Firebase → API)
- **Deduplication:** Shared thumbnails between users for efficiency
- **Fallback Support:** Graceful fallback to favicons when screenshots fail

### Advanced Search & Filtering

- **Full-text Search:** Search across titles, URLs, and descriptions
- **Tag Filtering:** Filter bookmarks by tags
- **Sorting Options:** Sort by date, title, or URL
- **Real-time Results:** Instant search results as you type

### User Experience

- **Responsive Design:** Works on all screen sizes
- **Dark/Light Theme:** Automatic theme detection with manual override
- **Toast Notifications:** User-friendly feedback for all actions
- **Loading States:** Smooth loading indicators
- **Error Handling:** Graceful error handling with helpful messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed setup instructions
2. Ensure all environment variables are correctly set
3. Verify Firebase services are enabled and configured
4. Check the browser console for error messages

## 🙏 Acknowledgments

- Firebase for providing excellent backend services
- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Lucide for the beautiful icons

---
