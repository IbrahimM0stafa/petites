# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Cache npm dependencies separately from source
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build for production
COPY . .
RUN npx ng build --configuration=production

# ── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app (Angular 19 outputs to dist/<name>/browser/)
COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
