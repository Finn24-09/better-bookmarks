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

## 🐳 Docker Deployment

### Quick Start with Docker

The easiest way to deploy Better Bookmarks is using Docker. The application comes with a production-ready Docker setup that includes security best practices.

#### Prerequisites

- Docker and Docker Compose installed
- Firebase project configured (see Firebase Setup section)

#### Environment Setup

1. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables in `.env`:**

   ```env
   # Screenshot API Configuration
   VITE_SCREENSHOT_API_URL=http://localhost:8080
   VITE_SCREENSHOT_API_KEY=your-api-key-here

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-firebase-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789012345
   ```

#### Build and Run

1. **Using Docker Compose (Recommended):**

   ```bash
   # Build and start the application
   docker-compose up -d

   # View logs
   docker-compose logs -f

   # Stop the application
   docker-compose down
   ```

   The application will be available at `http://localhost:3000`

2. **Using Docker directly:**

   ```bash
   # Build the image
   docker build -t better-bookmarks .

   # Run the container
   docker run -d \
     --name better-bookmarks-app \
     -p 3000:8080 \
     --env-file .env \
     better-bookmarks
   ```

#### Production Deployment

For production environments, create a `docker-compose.prod.yml` file:

```yaml
version: "3.8"
services:
  better-bookmarks:
    image: better-bookmarks:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Deploy with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Docker Security Features

The Docker setup includes several security best practices:

- ✅ **Multi-stage build** - Reduces final image size and attack surface
- ✅ **Non-root user** - Application runs as unprivileged user
- ✅ **Read-only filesystem** - Container filesystem is read-only
- ✅ **Security headers** - Comprehensive HTTP security headers
- ✅ **Health checks** - Built-in health monitoring
- ✅ **Signal handling** - Proper signal handling with dumb-init
- ✅ **Minimal base image** - Alpine Linux for smaller attack surface
- ✅ **No new privileges** - Prevents privilege escalation
- ✅ **Resource limits** - CPU and memory constraints

### Environment Variables in Docker

All environment variables can be set through Docker environment variables:

```bash
# Example with all variables
docker run -d \
  --name better-bookmarks \
  -p 3000:8080 \
  -e VITE_FIREBASE_API_KEY="your-api-key" \
  -e VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com" \
  -e VITE_FIREBASE_PROJECT_ID="your-project-id" \
  -e VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  -e VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012" \
  -e VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef" \
  -e VITE_SCREENSHOT_API_URL="http://localhost:8080" \
  -e VITE_SCREENSHOT_API_KEY="your-screenshot-api-key" \
  better-bookmarks
```

### Health Monitoring

The Docker container includes health checks:

```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' better-bookmarks-app
```

The health endpoint is available at `/health` and returns a simple "healthy" response.

## 🚀 Traditional Deployment

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
- **Docker:** Use the provided Docker setup for containerized deployment

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
