#!/bin/sh

# Exit on any error
set -e

# Function to replace environment variables in JavaScript files
replace_env_vars() {
    echo "Injecting environment variables into application..."
    
    # Find all JavaScript files in the build directory
    find /usr/share/nginx/html -name "*.js" -type f | while read -r file; do
        echo "Processing file: $file"
        
        # Replace environment variable placeholders with actual values
        # VITE environment variables
        if [ -n "$VITE_SCREENSHOT_API_URL" ]; then
            sed -i "s|VITE_SCREENSHOT_API_URL_PLACEHOLDER|$VITE_SCREENSHOT_API_URL|g" "$file"
        fi
        
        if [ -n "$VITE_SCREENSHOT_API_KEY" ]; then
            sed -i "s|VITE_SCREENSHOT_API_KEY_PLACEHOLDER|$VITE_SCREENSHOT_API_KEY|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_API_KEY" ]; then
            sed -i "s|VITE_FIREBASE_API_KEY_PLACEHOLDER|$VITE_FIREBASE_API_KEY|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
            sed -i "s|VITE_FIREBASE_AUTH_DOMAIN_PLACEHOLDER|$VITE_FIREBASE_AUTH_DOMAIN|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_PROJECT_ID" ]; then
            sed -i "s|VITE_FIREBASE_PROJECT_ID_PLACEHOLDER|$VITE_FIREBASE_PROJECT_ID|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_STORAGE_BUCKET" ]; then
            sed -i "s|VITE_FIREBASE_STORAGE_BUCKET_PLACEHOLDER|$VITE_FIREBASE_STORAGE_BUCKET|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_MESSAGING_SENDER_ID" ]; then
            sed -i "s|VITE_FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER|$VITE_FIREBASE_MESSAGING_SENDER_ID|g" "$file"
        fi
        
        if [ -n "$VITE_FIREBASE_APP_ID" ]; then
            sed -i "s|VITE_FIREBASE_APP_ID_PLACEHOLDER|$VITE_FIREBASE_APP_ID|g" "$file"
        fi
    done
    
    echo "Environment variable injection completed."
}

# Create runtime environment configuration
create_runtime_config() {
    echo "Creating runtime configuration..."
    
    # Create a runtime config file that can be loaded by the application
    cat > /usr/share/nginx/html/runtime-config.js << EOF
window.runtimeConfig = {
    VITE_SCREENSHOT_API_URL: "${VITE_SCREENSHOT_API_URL:-}",
    VITE_SCREENSHOT_API_KEY: "${VITE_SCREENSHOT_API_KEY:-}",
    VITE_FIREBASE_API_KEY: "${VITE_FIREBASE_API_KEY:-}",
    VITE_FIREBASE_AUTH_DOMAIN: "${VITE_FIREBASE_AUTH_DOMAIN:-}",
    VITE_FIREBASE_PROJECT_ID: "${VITE_FIREBASE_PROJECT_ID:-}",
    VITE_FIREBASE_STORAGE_BUCKET: "${VITE_FIREBASE_STORAGE_BUCKET:-}",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "${VITE_FIREBASE_MESSAGING_SENDER_ID:-}",
    VITE_FIREBASE_APP_ID: "${VITE_FIREBASE_APP_ID:-}"
};
EOF
    
    echo "Runtime configuration created."
}

# Validate required environment variables
validate_env() {
    echo "Validating environment variables..."
    
    # Check if critical Firebase variables are set
    if [ -z "$VITE_FIREBASE_API_KEY" ] || [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
        echo "WARNING: Critical Firebase environment variables are not set."
        echo "Please ensure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are configured."
    fi
    
    echo "Environment validation completed."
}

# Main execution
main() {
    echo "Starting Better Bookmarks application..."
    
    # Validate environment variables
    validate_env
    
    # Create runtime configuration
    create_runtime_config
    
    # Replace environment variables in built files (fallback method)
    replace_env_vars
    
    echo "Starting nginx..."
    
    # Start nginx in the foreground
    exec nginx -g "daemon off;"
}

# Run main function
main "$@"
