# Система тестирования студентов

## Быстрый старт

```bash
cp .env.example .env
# Отредактируйте .env при необходимости
docker-compose up --build -d
```

Приложение будет доступно на http://localhost

**Данные по умолчанию для администратора:**
- Логин: `admin`
- Пароль: `admin123`

Смените пароль в настройках после первого входа.

## Структура проекта

```
├── backend/      Express API + PostgreSQL
├── frontend/     React SPA
└── docker-compose.yml
```

## Хостинг на VPS

1. Установите Docker и Docker Compose на сервер
2. Склонируйте репозиторий
3. Создайте `.env` с надёжными паролями
4. Настройте Nginx на хосте для проксирования на порт 80 с SSL (Let's Encrypt)
5. Запустите `docker-compose up -d`
