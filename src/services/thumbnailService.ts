interface ThumbnailResult {
  thumbnail?: string;
  type: 'video' | 'screenshot' | 'favicon';
  source: string;
  isVideoThumbnail?: boolean;
  method?: string;
}

interface ApiThumbnailResponse {
  thumbnailUrl: string;
  isVideoThumbnail: boolean;
  processingTime: string;
  source: string;
  method: string;
}

interface ThumbnailOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  timeout?: number;
}

import { getEnvVarWithFallback } from '../utils/env';

class ThumbnailService {
  private screenshotApiUrl: string;
  private apiKey: string;

  constructor() {
    // These should be set via environment variables
    this.screenshotApiUrl = getEnvVarWithFallback('VITE_SCREENSHOT_API_URL', 'http://localhost:8080');
    this.apiKey = getEnvVarWithFallback('VITE_SCREENSHOT_API_KEY', '');
  }

  /**
   * Extract video thumbnail URL for supported platforms
   */
  private extractVideoThumbnail(url: string): { thumbnail?: string; platform?: string } {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // YouTube video detection
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          return {
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            platform: 'youtube'
          };
        }
      }
      
      // Vimeo video detection
      else if (domain.includes('vimeo.com')) {
        const videoId = this.extractVimeoVideoId(url);
        if (videoId) {
          return {
            thumbnail: `https://vumbnail.com/${videoId}.jpg`,
            platform: 'vimeo'
          };
        }
      }
      
      // Dailymotion video detection
      else if (domain.includes('dailymotion.com')) {
        const videoId = this.extractDailymotionVideoId(url);
        if (videoId) {
          return {
            thumbnail: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
            platform: 'dailymotion'
          };
        }
      }
      
      // Twitch video/stream detection - handled separately in generateThumbnail due to async API call
      else if (domain.includes('twitch.tv')) {
        // Return empty object to indicate Twitch URL detected but needs async handling
        return { platform: 'twitch' };
      }

      return {};
    } catch (error) {
      return {};
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractVimeoVideoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  private extractDailymotionVideoId(url: string): string | null {
    const match = url.match(/dailymotion\.com\/video\/([^_?]+)/);
    return match ? match[1] : null;
  }

  private extractTwitchChannel(url: string): string | null {
    const match = url.match(/twitch\.tv\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get Twitch user profile picture using Twitch API
   */
  private async getTwitchProfilePicture(channelName: string): Promise<string | null> {
    try {
      // Try multiple services for getting Twitch profile pictures
      const services = [
        `https://decapi.me/twitch/avatar/${channelName}`,
        `https://api.ivr.fi/v2/twitch/user?login=${channelName}`,
        `https://twitchtracker.com/api/channels/summary/${channelName}`
      ];
      
      // Try decapi.me first
      try {
        const response = await fetch(services[0]);
        if (response.ok) {
          const avatarUrl = await response.text();
          // Check if it's a valid image URL (not an error message)
          if (avatarUrl.startsWith('http') && !avatarUrl.includes('error')) {
            const isValid = await this.validateImageUrl(avatarUrl.trim());
            if (isValid) {
              return avatarUrl.trim();
            }
          }
        }
      } catch (error) {
        // Continue to next service
      }
      
      // Try ivr.fi API
      try {
        const response = await fetch(services[1]);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].logo) {
            const isValid = await this.validateImageUrl(data[0].logo);
            if (isValid) {
              return data[0].logo;
            }
          }
        }
      } catch (error) {
        // Continue to next approach
      }
      
      // Fallback: Use a constructed URL pattern that often works
      // Twitch profile pictures follow a pattern, though this is not guaranteed
      const constructedUrl = `https://static-cdn.jtvnw.net/jtv_user_pictures/${channelName}-profile_image-300x300.png`;
      try {
        const isValid = await this.validateImageUrl(constructedUrl);
        if (isValid) {
          return constructedUrl;
        }
      } catch (error) {
        // Continue to final fallback
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get favicon URL for a domain
   */
  private getFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Validate if an image URL is accessible
   */
  private async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && (contentType ? contentType.startsWith('image/') : false);
    } catch (error) {
      return false;
    }
  }

  /**
   * Take a screenshot using the screenshot API with intelligent video thumbnail detection
   */
  private async takeScreenshot(url: string, options: ThumbnailOptions = {}): Promise<ThumbnailResult> {
    const {
      width = 400,
      height = 300,
      format = 'jpeg',
      quality = 85,
      timeout = 15000
    } = options;

    if (!this.apiKey) {
      throw new Error('Screenshot API key not configured');
    }

    try {
      const response = await fetch(`${this.screenshotApiUrl}/api/v1/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          url,
          width,
          height,
          format,
          quality,
          timeout,
          fullPage: false,
          waitUntil: 'domcontentloaded',
          handleBanners: true,
          bannerTimeout: 5000,
          detectVideoThumbnails: true, // Enable intelligent video thumbnail detection
        }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot API error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      const isVideoThumbnail = response.headers.get('X-Is-Video-Thumbnail') === 'true';
      const videoDetectionMethod = response.headers.get('X-Video-Detection-Method');
      const screenshotFormat = response.headers.get('X-Screenshot-Format');

      // Check if response is JSON (thumbnail URL) or binary image data
      if (contentType?.includes('application/json')) {
        // API returned a JSON response with thumbnail URL
        const jsonResponse: ApiThumbnailResponse = await response.json();
        
        return {
          thumbnail: jsonResponse.thumbnailUrl,
          type: jsonResponse.isVideoThumbnail ? 'video' : 'screenshot',
          source: `api-${jsonResponse.source}`,
          isVideoThumbnail: jsonResponse.isVideoThumbnail,
          method: jsonResponse.method
        };
      } else {
        // API returned binary image data
        const imageBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        const dataUrl = `data:image/${format};base64,${base64}`;
        
        return {
          thumbnail: dataUrl,
          type: isVideoThumbnail ? 'video' : 'screenshot',
          source: `api-${screenshotFormat || 'screenshot'}`,
          isVideoThumbnail: isVideoThumbnail,
          method: videoDetectionMethod || 'screenshot'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate thumbnail for a bookmark URL with fallback strategy
   */
  async generateThumbnail(url: string, options: ThumbnailOptions = {}): Promise<ThumbnailResult> {
    try {
      // Step 1: Use the new API with intelligent video thumbnail detection first
      try {
        const apiResult = await this.takeScreenshot(url, options);
        return apiResult;
      } catch (screenshotError) {
        // API screenshot failed, continue with fallback methods
      }

      // Step 2: Handle Twitch URLs specifically (requires async call)
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        
        if (domain.includes('twitch.tv')) {
          const channelName = this.extractTwitchChannel(url);
          if (channelName) {
            const twitchProfilePicture = await this.getTwitchProfilePicture(channelName);
            if (twitchProfilePicture) {
              return {
                thumbnail: twitchProfilePicture,
                type: 'video',
                source: 'twitch-profile',
                isVideoThumbnail: true,
                method: 'profile-picture'
              };
            }
          }
        }
      } catch (twitchError) {
        // Twitch API failed, continue with other fallback methods
      }

      // Step 3: Try to extract video thumbnail using local methods as fallback
      const videoResult = this.extractVideoThumbnail(url);
      if (videoResult.thumbnail) {
        const isValid = await this.validateImageUrl(videoResult.thumbnail);
        if (isValid) {
          return {
            thumbnail: videoResult.thumbnail,
            type: 'video',
            source: videoResult.platform || 'unknown'
          };
        }
      }

      // Step 4: Fallback to favicon
      const faviconUrl = this.getFaviconUrl(url);
      if (faviconUrl) {
        const isValid = await this.validateImageUrl(faviconUrl);
        if (isValid) {
          return {
            thumbnail: faviconUrl,
            type: 'favicon',
            source: 'google-favicon'
          };
        }
      }

      // Step 5: No thumbnail available
      return {
        type: 'favicon',
        source: 'none'
      };

    } catch (error) {
      
      // Final fallback to favicon
      const faviconUrl = this.getFaviconUrl(url);
      return {
        thumbnail: faviconUrl || undefined,
        type: 'favicon',
        source: 'fallback'
      };
    }
  }

  /**
   * Check if the screenshot API is available
   */
  async isScreenshotApiAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.screenshotApiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration status
   */
  getConfiguration(): { apiUrl: string; hasApiKey: boolean; isConfigured: boolean } {
    return {
      apiUrl: this.screenshotApiUrl,
      hasApiKey: !!this.apiKey,
      isConfigured: !!this.screenshotApiUrl && !!this.apiKey
    };
  }
}

export const thumbnailService = new ThumbnailService();
export type { ThumbnailResult, ThumbnailOptions };
