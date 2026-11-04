# ────────────────────────────────────────────────
# Stage 1: Build
# Use Node 20 Alpine for a small image
# ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first — Docker caches this layer
# so we only re-install dependencies when package.json changes
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle (outputs to /app/dist)
RUN npm run build

# ────────────────────────────────────────────────
# Stage 2: Serve with Nginx
# A tiny Nginx image serves the static build
# ────────────────────────────────────────────────
FROM nginx:alpine

# Copy the built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config (handles SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
