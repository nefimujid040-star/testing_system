FROM node:20-alpine

RUN apk add --no-cache postgresql font-dejavu supervisor && \
    mkdir -p /app/fonts && \
    find /usr/share/fonts -name "DejaVuSans.ttf"      -exec cp {} /app/fonts/ \; && \
    find /usr/share/fonts -name "DejaVuSans-Bold.ttf" -exec cp {} /app/fonts/ \;

ENV PGDATA=/var/lib/postgresql/data

WORKDIR /app

COPY backend/package.json .
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ .
COPY frontend/ ./public/

COPY entrypoint.sh /entrypoint.sh
COPY supervisord.conf /etc/supervisord.conf
RUN chmod +x /entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]
