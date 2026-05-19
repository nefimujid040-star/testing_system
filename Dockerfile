FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ttf-dejavu && \
    mkdir -p /app/fonts && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans.ttf /app/fonts/ && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf /app/fonts/

COPY backend/package.json .
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ .
COPY frontend/ ./public/

EXPOSE 3001
CMD ["node", "src/index.js"]
