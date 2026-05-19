FROM node:20-alpine

RUN apk add --no-cache ttf-dejavu && \
    mkdir -p /app/fonts && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans.ttf /app/fonts/ && \
    cp /usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf /app/fonts/

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund --prefer-offline

COPY . .

EXPOSE 3001
CMD ["node", "src/index.js"]
