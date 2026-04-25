FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ---

FROM node:18-alpine

WORKDIR /app

# Copy built app and production dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/lib/server/schema.sql ./build/server/chunks/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/gamelog.db

# Start the app
CMD ["node", "build"]
