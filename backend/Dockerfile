FROM oven/bun:1.2.14-alpine as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S runtimeg
RUN adduser -S runtimeu -u 1001

# Create data directory and set permissions
# RUN mkdir -p /data && chown -R runtimeu:runtimeg /data

# Change ownership of the app directory to the runtime user
RUN chown -R runtimeu:runtimeg /app
USER runtimeu

# Expose port
EXPOSE 33000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run --bun fetch http://localhost:33000/health || exit 1

# Start the application
CMD ["bun", "run", "index.ts"]