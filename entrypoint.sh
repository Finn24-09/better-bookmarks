#!/bin/sh

# Function to log messages with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if environment variable is set and not empty
check_env_var() {
    local var_name="$1"
    local var_value="$2"
    if [ -z "$var_value" ]; then
        log_message "WARNING: Environment variable $var_name is not set or empty"
        return 1
    fi
    return 0
}

log_message "Starting Better Bookmarks container..."
log_message "Checking environment configuration..."

# Check required Firebase environment variables
missing_vars=0
check_env_var "VITE_FIREBASE_API_KEY" "$VITE_FIREBASE_API_KEY" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_FIREBASE_AUTH_DOMAIN" "$VITE_FIREBASE_AUTH_DOMAIN" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_FIREBASE_PROJECT_ID" "$VITE_FIREBASE_PROJECT_ID" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_FIREBASE_STORAGE_BUCKET" "$VITE_FIREBASE_STORAGE_BUCKET" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_FIREBASE_MESSAGING_SENDER_ID" "$VITE_FIREBASE_MESSAGING_SENDER_ID" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_FIREBASE_APP_ID" "$VITE_FIREBASE_APP_ID" || missing_vars=$((missing_vars + 1))

# Check required Screenshot API environment variables
check_env_var "VITE_SCREENSHOT_API_URL" "$VITE_SCREENSHOT_API_URL" || missing_vars=$((missing_vars + 1))
check_env_var "VITE_SCREENSHOT_API_KEY" "$VITE_SCREENSHOT_API_KEY" || missing_vars=$((missing_vars + 1))

# Generate runtime configuration from environment variables
log_message "Generating runtime configuration..."
cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
  VITE_FIREBASE_API_KEY: "${VITE_FIREBASE_API_KEY}",
  VITE_FIREBASE_AUTH_DOMAIN: "${VITE_FIREBASE_AUTH_DOMAIN}",
  VITE_FIREBASE_PROJECT_ID: "${VITE_FIREBASE_PROJECT_ID}",
  VITE_FIREBASE_STORAGE_BUCKET: "${VITE_FIREBASE_STORAGE_BUCKET}",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "${VITE_FIREBASE_MESSAGING_SENDER_ID}",
  VITE_FIREBASE_APP_ID: "${VITE_FIREBASE_APP_ID}",
  VITE_SCREENSHOT_API_URL: "${VITE_SCREENSHOT_API_URL}",
  VITE_SCREENSHOT_API_KEY: "${VITE_SCREENSHOT_API_KEY}"
};

// Configuration status for application
window.ENV_STATUS = {
  hasFirebaseConfig: ${missing_vars} === 0,
  missingVarsCount: ${missing_vars},
  configurationComplete: ${missing_vars} === 0
};
EOF

# Log configuration status
if [ $missing_vars -eq 0 ]; then
    log_message "SUCCESS: All required environment variables are configured"
    log_message "INFO: Application will run with full functionality"
else
    log_message "ERROR: $missing_vars required environment variables are missing"
    log_message "ERROR: Application will run in degraded mode - features will be disabled"
    log_message "ERROR: Please check your .env file and ensure all required variables are set"
    log_message "ERROR: Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID, VITE_SCREENSHOT_API_URL, VITE_SCREENSHOT_API_KEY"
fi

log_message "Starting nginx web server..."

# Start nginx
exec nginx -g "daemon off;"
