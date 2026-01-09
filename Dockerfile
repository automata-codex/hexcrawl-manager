# =============================================================================
# Build Stage - Compile TypeScript and build Astro app
# =============================================================================
FROM node:22-alpine AS builder

# Build arguments for private npm packages
ARG FONTAWESOME_NPM_AUTH_TOKEN
ENV FONTAWESOME_NPM_AUTH_TOKEN=${FONTAWESOME_NPM_AUTH_TOKEN}

# Build arguments for Clerk (needed at build time for SSR)
ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ENV PUBLIC_CLERK_PUBLISHABLE_KEY=${PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY}

# Set repository root for @achm/data package
ENV REPO_ROOT=/app

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/data/package.json ./packages/data/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/test-helpers/package.json ./packages/test-helpers/

# Install all dependencies
RUN npm ci

# Copy source code and data files
COPY . .

# Build packages and web app
RUN npm run build --workspace=@achm/web

# =============================================================================
# Production Stage - Minimal runtime image
# =============================================================================
FROM node:22-alpine

# Set repository root for @achm/data package
ENV REPO_ROOT=/app

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/web/.cache ./apps/web/.cache
COPY --from=builder /app/data ./data
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

# Create symlink for JSON schemas (needed by /gm-reference/schemas page)
RUN ln -s /app/packages/schemas/dist /app/apps/web/schemas

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "apps/web/dist/server/entry.mjs"]
