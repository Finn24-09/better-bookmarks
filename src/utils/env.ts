// Environment variable utility for runtime configuration
declare global {
  interface Window {
    ENV?: {
      VITE_FIREBASE_API_KEY?: string;
      VITE_FIREBASE_AUTH_DOMAIN?: string;
      VITE_FIREBASE_PROJECT_ID?: string;
      VITE_FIREBASE_STORAGE_BUCKET?: string;
      VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
      VITE_FIREBASE_APP_ID?: string;
      VITE_SCREENSHOT_API_URL?: string;
      VITE_SCREENSHOT_API_KEY?: string;
    };
    ENV_STATUS?: {
      hasFirebaseConfig: boolean;
      missingVarsCount: number;
      configurationComplete: boolean;
    };
  }
}

/**
 * Get environment variable value from runtime config or build-time config
 * @param key Environment variable key
 * @returns Environment variable value
 */
export function getEnvVar(key: string): string | undefined {
  // First try to get from runtime config (window.ENV)
  if (typeof window !== 'undefined' && window.ENV && key in window.ENV) {
    const value = window.ENV[key as keyof typeof window.ENV];
    // Return undefined for empty strings to maintain consistency
    return value && value.trim() !== '' ? value : undefined;
  }
  
  // Fallback to build-time environment variables (for development)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key];
    return value && value.trim() !== '' ? value : undefined;
  }
  
  return undefined;
}

/**
 * Get environment variable value with fallback
 * @param key Environment variable key
 * @param fallback Fallback value if env var is not found
 * @returns Environment variable value or fallback
 */
export function getEnvVarWithFallback(key: string, fallback: string): string {
  return getEnvVar(key) || fallback;
}

/**
 * Check if Firebase configuration is available
 * @returns True if Firebase configuration is complete
 */
export function hasFirebaseConfig(): boolean {
  if (typeof window !== 'undefined' && window.ENV_STATUS) {
    return window.ENV_STATUS.hasFirebaseConfig;
  }
  
  // Fallback: check if all required Firebase vars are present
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  return requiredVars.every(key => {
    const value = getEnvVar(key);
    return value && value.trim() !== '';
  });
}

/**
 * Get configuration status information
 * @returns Configuration status object
 */
export function getConfigStatus(): {
  hasFirebaseConfig: boolean;
  missingVarsCount: number;
  configurationComplete: boolean;
} {
  if (typeof window !== 'undefined' && window.ENV_STATUS) {
    return window.ENV_STATUS;
  }
  
  // Fallback: calculate status
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missingCount = requiredVars.filter(key => !getEnvVar(key)).length;
  const hasConfig = missingCount === 0;
  
  return {
    hasFirebaseConfig: hasConfig,
    missingVarsCount: missingCount,
    configurationComplete: hasConfig
  };
}
