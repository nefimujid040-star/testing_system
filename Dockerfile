# ── Stage 1: Build frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json .
RUN npm install --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# ── Stage 2: Install backend dependencies ─────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /build
COPY backend/package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY backend/ .

# ── Stage 3: Final image (node + nginx + supervisord) ──────────────────
FROM node:20-alpine

RUN apk add --no-cache nginx supervisor ttf-dejavu && \
    mkdir -p /app/fonts && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans.ttf /app/fonts/ && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf /app/fonts/ && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Backend
WORKDIR /app
COPY --from=backend-builder /build/node_modules ./node_modules
COPY --from=backend-builder /build/src ./src
COPY --from=backend-builder /build/package.json .

# Frontend static files
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# Nginx site config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Supervisord config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
