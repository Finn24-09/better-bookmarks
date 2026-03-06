# ---- Build stage ----
FROM node:20-alpine AS builder

# Set working dir
WORKDIR /app

# Install deps only when needed
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy source
COPY . .

# Build vite app
RUN npm run build


# ---- Production stage ----
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Set permissions for security (nginx runs as non-root by default on alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
