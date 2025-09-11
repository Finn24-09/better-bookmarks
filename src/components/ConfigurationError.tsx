import React from "react";
import { getConfigStatus } from "../utils/env";

interface ConfigurationErrorProps {
  onRetry?: () => void;
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ onRetry }) => {
  const configStatus = getConfigStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Configuration Required
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Application configuration is incomplete.{" "}
            {configStatus.missingVarsCount} required environment variables are
            missing.
          </p>

          {/* Missing Variables Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Required Environment Variables:
            </h3>
            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <li>• VITE_FIREBASE_API_KEY</li>
              <li>• VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>• VITE_FIREBASE_PROJECT_ID</li>
              <li>• VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>• VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>• VITE_FIREBASE_APP_ID</li>
              <li>• VITE_SCREENSHOT_API_URL</li>
              <li>• VITE_SCREENSHOT_API_KEY</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 text-left">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              How to Fix:
            </h3>
            <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>1. Create or update your .env file</li>
              <li>2. Add all required environment variables</li>
              <li>3. Restart the Docker container</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Retry Configuration
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Check the container logs for more details
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationError;
