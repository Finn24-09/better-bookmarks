import React from "react";
import { ExternalLink } from "lucide-react";

interface WatermarkProps {
  version: string;
  githubUrl: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ version, githubUrl }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 z-10 pointer-events-none">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700 pointer-events-auto">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 pointer-events-auto"
          >
            <span>Better Bookmarks by Finn24-09</span>
            <ExternalLink size={12} />
          </a>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="font-mono">v{version}</span>
        </div>
      </div>
    </footer>
  );
};
