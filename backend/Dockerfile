# ────────────────────────────────────────────────
# Stage 1: Build
# ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client (must run after prisma/ is copied)
RUN npx prisma generate

# Compile TypeScript → JavaScript
RUN npm run build

# ────────────────────────────────────────────────
# Stage 2: Production runtime
# Only copy the compiled output — no dev deps
# ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Run DB migrations then start the server
# The migration step ensures schema is up-to-date on every deploy
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

EXPOSE 4000
