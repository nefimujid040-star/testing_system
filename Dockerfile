FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache font-dejavu && \
    mkdir -p /app/fonts && \
    find /usr/share/fonts -name "DejaVuSans.ttf"      -exec cp {} /app/fonts/ \; && \
    find /usr/share/fonts -name "DejaVuSans-Bold.ttf" -exec cp {} /app/fonts/ \;

COPY backend/package.json .
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ .
COPY frontend/ ./public/

EXPOSE 3001
CMD ["node", "src/index.js"]
