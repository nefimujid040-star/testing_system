#!/bin/sh
set -e

DB_NAME="testing_system"

# Директория для lock-файла PostgreSQL
mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql

# Инициализация PostgreSQL при первом запуске
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[init] Initializing PostgreSQL..."
    mkdir -p "$PGDATA"
    chown postgres:postgres "$PGDATA"
    su postgres -c "initdb -D '$PGDATA' --auth=trust --no-locale --encoding=UTF8"

    su postgres -c "pg_ctl -D '$PGDATA' start -w -o '-h 127.0.0.1'"
    su postgres -c "createdb -h 127.0.0.1 '$DB_NAME'"
    su postgres -c "psql -h 127.0.0.1 -d '$DB_NAME' -f /app/init.sql"
    su postgres -c "pg_ctl -D '$PGDATA' stop -w"
    echo "[init] Done."
fi

export DATABASE_URL="${DATABASE_URL:-postgres://postgres@127.0.0.1/$DB_NAME}"
export JWT_SECRET="${JWT_SECRET:-change-this-secret-in-production}"
export PORT="${PORT:-3001}"

exec /usr/bin/supervisord -c /etc/supervisord.conf
