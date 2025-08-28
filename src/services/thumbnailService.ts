interface ThumbnailResult {
  thumbnail?: string;
  type: 'video' | 'screenshot' | 'favicon';
  source: string;
}

interface ThumbnailOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  timeout?: number;
}

class ThumbnailService {
  private screenshotApiUrl: string;
  private apiKey: string;

  constructor() {
    // These should be set via environment variables
    this.screenshotApiUrl = import.meta.env.VITE_SCREENSHOT_API_URL || 'http://localhost:8080';
    this.apiKey = import.meta.env.VITE_SCREENSHOT_API_KEY || '';
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
      
      // Twitch video/stream detection
      else if (domain.includes('twitch.tv')) {
        const channelName = this.extractTwitchChannel(url);
        if (channelName) {
          return {
            thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${channelName}-640x360.jpg`,
            platform: 'twitch'
          };
        }
      }

      return {};
    } catch (error) {
      console.warn('Error extracting video thumbnail:', error);
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
   * Get favicon URL for a domain
   */
  private getFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (error) {
      console.warn('Error generating favicon URL:', error);
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
   * Take a screenshot using the screenshot API
   */
  private async takeScreenshot(url: string, options: ThumbnailOptions = {}): Promise<string> {
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot API error: ${response.status} ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      return `data:image/${format};base64,${base64}`;
    } catch (error) {
      console.error('Screenshot API error:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for a bookmark URL with fallback strategy
   */
  async generateThumbnail(url: string, options: ThumbnailOptions = {}): Promise<ThumbnailResult> {
    try {
      // Step 1: Try to extract video thumbnail
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

      // Step 2: Try to take a screenshot
      try {
        const screenshot = await this.takeScreenshot(url, options);
        return {
          thumbnail: screenshot,
          type: 'screenshot',
          source: 'screenshot-api'
        };
      } catch (screenshotError) {
        console.warn('Screenshot failed, falling back to favicon:', screenshotError);
      }

      // Step 3: Fallback to favicon
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

      // Step 4: No thumbnail available
      return {
        type: 'favicon',
        source: 'none'
      };

    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      
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
