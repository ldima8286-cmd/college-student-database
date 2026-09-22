# База данных учащихся колледжа

Веб-приложение для учёта учащихся колледжа: ведение карточек студентов, управление академическими задолженностями, поиск и фильтрация, импорт/экспорт данных, авторизация с ролями, аудит действий администраторов, тёмная тема и установка как PWA-приложение.

**Статус:** дипломный проект, полный стек (React + TypeScript + Node.js/Express + SQLite/PostgreSQL).

## Бейджи

![CI](https://github.com/ldima8286-cmd/college-student-database/actions/workflows/ci.yml/badge.svg)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Yes-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

## Содержание

- [Демо](#демо)
- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [Скрипты](#скрипты)
- [База данных и миграции](#база-данных-и-миграции)
- [Docker (продакшен)](#docker-продакшен)
- [Деплой и CI/CD](#деплой-и-cicd)
- [API и документация](#api-и-документация)
- [Тестирование](#тестирование)
- [Доступ с телефона и PWA](#доступ-с-телефона-и-pwa)
- [Структура проекта](#структура-проекта)
- [Лицензия](#лицензия)

---

## Демо

| Ссылка | Описание |
|--------|----------|
| https://ldima8286-cmd.github.io/college-student-database/ | Статическая демо-версия (GitHub Pages, моковые данные) |

---

## Возможности

| Модуль | Описание |
|--------|----------|
| **CRUD студентов** | Добавление, просмотр, редактирование, удаление записей |
| **Управление задолженностями** | Добавление и снятие академической задолженности в один клик |
| **Поиск и фильтрация** | Поиск по ФИО, группе, специальности, email или телефону; фильтры по курсу и задолженности; сортировка с пагинацией |
| **Импорт/экспорт** | Экспорт в JSON/Excel, импорт из JSON, пакетное удаление и экспорт выбранных записей |
| **Авторизация** | Регистрация, вход по email/паролю, JWT access/refresh-токены, bcrypt-хеширование паролей, роли `admin` и `user` |
| **Профиль** | Смена пароля, аватар, контактные данные |
| **Аудит-лог** | Журнал действий администраторов с фильтрами (для роли `admin`) |
| **Статистика** | Дашборд с количественными показателями и графиками |
| **Тёмная тема** | Переключение между светлой и тёмной темами (в т.ч. по системным настройкам) |
| **PWA** | Установка на устройство, офлайн-режим через Service Worker |
| **Интеграции** | Вебхуки, email-уведомления (SMTP) |
| **Безопасность** | Helmet, rate-limiting, CORS, валидация входных данных (Zod), Swagger |
| **Адаптивный дизайн** | Корректное отображение на ПК, планшетах и смартфонах |

---

## Технологический стек

### Фронтенд

| Технология | Назначение |
|------------|------------|
| **React 18** | Библиотека для построения пользовательского интерфейса |
| **TypeScript 5** | Типизация кода |
| **Vite 6** | Сборщик проекта, dev-сервер, проксирование `/api` на бэкенд |
| **Tailwind CSS 3** | Утилитарная стилизация и CSS-переменные для тёмной темы |
| **Axios** | HTTP-клиент для запросов к API (JWT-интерцепторы, обработка 401) |
| **React Router 7** | Клиентская маршрутизация и защита маршрутов |
| **react-hot-toast** | Уведомления |
| **xlsx** | Импорт/экспорт таблиц Excel |
| **lucide-react** | Иконки |

### Бэкенд

| Технология | Назначение |
|------------|------------|
| **Node.js 20** | Среда выполнения |
| **Express 4** | REST API |
| **TypeScript 5** | Типизация серверного кода |
| **Drizzle ORM 0.45** | Работа с БД (SQLite и PostgreSQL) |
| **better-sqlite3** | Встраиваемая БД для локальной разработки |
| **JSON Web Token** | Access/refresh-токены авторизации |
| **bcryptjs** | Хеширование паролей |
| **Zod** | Валидация входных данных |
| **Winston** | Логирование (файлы `backend/logs/`) |
| **Helmet + express-rate-limit + CORS** | Безопасность HTTP |
| **Swagger UI** | Интерактивная документация API (`/api/docs`) |
| **Nodemailer** | Email-уведомления по SMTP |

### Инфраструктура

| Технология | Назначение |
|------------|------------|
| **Docker / Docker Compose** | Контейнеризация: backend, PostgreSQL, Nginx, Redis |
| **Nginx** | Раздача статики, проксирование `/api`, TLS, rate-limiting |
| **GitHub Actions** | CI и сборка Docker-образа в GHCR |
| **Vitest + Playwright** | Юнит/интеграционные тесты и e2e |
| **localhost.run** | Туннель для доступа с телефона по HTTPS |

---

## Требования

- Node.js 20 LTS (совместимо с 18+)
- npm 10+
- Docker Desktop (опционально, для продакшен-запуска)

---

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/ldima8286-cmd/college-student-database.git
cd college-student-database
```

### 2. Установка зависимостей

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Переменные окружения

Бэкенд работает без файла `.env` с настройками по умолчанию (SQLite, порт 5000). Для кастомизации:

```bash
cd backend
cp .env.example .env
```

### 4. Запуск в режиме разработки

В двух терминалах:

```bash
# Терминал 1 — бэкенд (http://localhost:5000)
cd backend
npm run dev

# Терминал 2 — фронтенд (http://localhost:3000)
cd frontend
npm run dev
```

Откройте http://localhost:3000. Vite проксирует запросы `/api` на бэкенд (порт 5000), отдельная настройка CORS при разработке не требуется.

Windows: можно использовать скрипт `start.bat` — он запустит оба сервера в отдельных окнах.

### Учётные данные по умолчанию

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@college.local` | `admin123` |
| Пользователь | `user@college.local` | `user123` |

> Пароли и email настраиваются через переменные окружения (см. таблицу ниже). Обязательно смените значения в продакшене.

---

## Конфигурация

Все переменные окружения бэкенда собраны в `backend/src/env.ts`. Значения по умолчанию покрывают локальную разработку.

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `5000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `DATABASE_URL` | `sqlite:./database.sqlite` | SQLite-файл или PostgreSQL URL (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | `dev-secret-change-in-production` | Секрет подписи access-токенов |
| `REFRESH_TOKEN_SECRET` | `refresh-secret-change-in-production` | Секрет подписи refresh-токенов |
| `ADMIN_EMAIL` | `admin@college.local` | Email администратора (создаётся при первом запуске) |
| `ADMIN_PASSWORD` | `admin123` | Пароль администратора |
| `USER_EMAIL` | `user@college.local` | Email пользователя |
| `USER_PASSWORD` | `user123` | Пароль пользователя |
| `CORS_ORIGIN` | `http://localhost:3000` | Разрешённый origin для CORS |
| `SENTRY_DSN` | *(пусто)* | DSN Sentry для мониторинга ошибок (опционально) |
| `SMTP_HOST` | *(пусто)* | SMTP-сервер для email-уведомлений |
| `SMTP_PORT` | `587` | Порт SMTP |
| `SMTP_USER` | *(пусто)* | Пользователь SMTP |
| `SMTP_PASS` | *(пусто)* | Пароль SMTP |
| `SMTP_FROM` | `noreply@college.local` | Отправитель писем |

---

## Скрипты

### Бэкенд (`backend/`)

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск в dev-режиме (hot-reload через `tsx watch`) |
| `npm run build` | Компиляция TypeScript в `dist/` |
| `npm start` | Запуск скомпилированного приложения (`node dist/index.js`) |
| `npm test` | Запуск тестов (Vitest) |
| `npm run test:coverage` | Тесты с отчётом о покрытии |
| `npm run db:generate` / `db:migrate` / `db:push` | Миграции PostgreSQL (Drizzle Kit) |
| `npm run db:generate:sqlite` / `db:migrate:sqlite` / `db:push:sqlite` | Миграции SQLite |
| `npm run db:studio` | Графический интерфейс Drizzle Studio |

### Фронтенд (`frontend/`)

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер Vite на http://localhost:3000 |
| `npm run build` | Проверка типов (`tsc`) + сборка продакшена в `dist/` |
| `npm run preview` | Локальный превью продакшен-сборки |
| `npm test` | Юнит-тесты (Vitest) |
| `npm run test:coverage` | Тесты с покрытием |
| `npm run e2e` | E2E-тесты (Playwright) |
| `npm run tunnel` | Публичный туннель через `localtunnel` |
| `npm run tunnel:lhr` | Публичный HTTPS-туннель через `localhost.run` |

---

## База данных и миграции

Поддерживаются два драйвера:

- **SQLite** (по умолчанию) — файл `backend/database.sqlite`, схема создаётся автоматически при старте.
- **PostgreSQL** — задаётся через `DATABASE_URL` (например, `postgresql://postgres:postgres@localhost:5432/student_db`).

Команды миграций:

```bash
cd backend

# PostgreSQL
npm run db:generate
npm run db:migrate

# SQLite
npm run db:generate:sqlite
npm run db:migrate:sqlite
```

Схема описана в `backend/src/schema.ts` (PostgreSQL) и `backend/src/schema.sqlite.ts`. Бэкенд сам создаёт недостающие таблицы при старте, миграции нужны для более сложных изменений схемы.

---

## Docker (продакшен)

### Docker Compose (полный стек)

```bash
docker compose up -d --build
```

Поднимаются:

| Сервис | Порт | Описание |
|--------|------|----------|
| `postgres` | 5432 | PostgreSQL 16 (том `pgdata`) |
| `backend` | 5000 | API (Node.js, production-сборка из `Dockerfile`) |
| `nginx` | 80/443 | Статика (`frontend/dist`) + проксирование `/api` |
| `redis` | 6379 | Redis 7 (для кэша/очередей) |

Перед запуском задайте переменные, используемые в `docker-compose.yml`:

```bash
export JWT_SECRET=your-strong-secret
export ADMIN_PASSWORD=your-admin-password
```

### Сборка образа вручную

```bash
docker build -t college-student-database .
docker run -p 5000:5000 -e JWT_SECRET=... college-student-database
```

Мультистейджинговая сборка (`Dockerfile`): образ собирает бэкенд и фронтенд отдельными стадиями, в итоговый контейнер попадают `backend/dist`, `backend/node_modules` (только production-зависимости) и `frontend/dist`.

---

## Деплой и CI/CD

GitHub Actions (`main`):

1. **CI** (`.github/workflows/ci.yml`) — запускается на push/PR в `main`:
   - линт и проверка типов (backend + frontend);
   - юнит-тесты бэкенда (Vitest);
   - юнит-тесты фронтенда (Vitest);
   - сборка backend и frontend;
   - сборка Docker-образа.
2. **Deploy** (`.github/workflows/deploy.yml`) — после успешного CI:
   - сборка Docker-образа и публикация в GitHub Container Registry (`ghcr.io/<repo>:latest` и `:<sha>`).

---

## API и документация

Бэкенд отдаёт Swagger-документацию по адресу http://localhost:5000/api/docs (в проде — `/api/docs` через Nginx).

Основные группы маршрутов (`backend/src/routes.ts`):

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/health` | Проверка работоспособности |
| `POST` | `/api/auth/register` | Регистрация |
| `POST` | `/api/auth/login` | Вход, выдача access/refresh-токенов |
| `POST` | `/api/auth/refresh` | Обновление access-токена |
| `POST` | `/api/auth/logout` | Выход |
| `GET/PUT` | `/api/auth/me` | Текущий пользователь / обновление профиля |
| `PUT` | `/api/auth/me/password` | Смена пароля |
| `GET/POST` | `/api/students` | Список (с поиском, фильтрами, пагинацией) / создание |
| `GET/PUT/DELETE` | `/api/students/:id` | Карточка студента |
| `PATCH` | `/api/students/:id/toggle-debt` | Переключение задолженности |
| `GET` | `/api/students/stats` | Статистика |
| `POST` | `/api/students/batch-delete` | Пакетное удаление |
| `POST` | `/api/students/batch-update` | Пакетное обновление |
| `POST` | `/api/students/batch-export` | Пакетный экспорт |
| `GET` | `/api/audit-logs` | Журнал действий (роль `admin`) |
| `GET` | `/api/admin/analytics` | Аналитика (роль `admin`) |

---

## Тестирование

```bash
# Бэкенд — юнит/интеграционные (supertest по маршрутам)
cd backend && npm test

# Фронтенд — юнит (Vitest + Testing Library)
cd frontend && npm test

# E2E (Playwright) — требует запущенных серверов
cd frontend && npm run e2e
```

- Тесты бэкенда: `backend/src/routes.test.ts` (health, CRUD, авторизация).
- Тесты фронтенда: `frontend/src/__tests__/` (`Login`, `StatsPanel`, `api`).
- E2E-сценарий: `frontend/e2e/app.spec.ts`.

---

## Доступ с телефона и PWA

Dev-сервер Vite открыт для локальной сети, но для установки PWA браузер требует HTTPS. Бесплатный вариант — SSH-туннель `localhost.run`:

```bash
# 1. Запустите локально фронтенд (порт 3000) и бэкенд (порт 5000)
# 2. В отдельном терминале поднимите туннель:
cd frontend && npm run tunnel:lhr
```

Скрипт выведет ссылку вида `https://xxx.lhr.life`. Откройте её с телефона или другого ПК — сайт будет доступен из любой сети, а браузер покажет кнопку «Установить приложение».

> Ссылка выдаётся заново при каждом запуске. Для постоянного адреса зарегистрируйтесь на localhost.run и используйте свой домен `*.lhr.life`.

---

## Структура проекта

```
college-student-database/
├── backend/                    # REST API (Express + TypeScript)
│   ├── src/
│   │   ├── index.ts            # Точка входа, подключение маршрутов
│   │   ├── routes.ts           # Обработчики API
│   │   ├── auth.ts             # JWT, регистрация, вход
│   │   ├── schema.ts           # Схема БД (PostgreSQL, Drizzle)
│   │   ├── schema.sqlite.ts    # Схема БД (SQLite)
│   │   ├── db.postgres.ts      # Клиент PostgreSQL
│   │   ├── db.sqlite.ts        # Клиент SQLite
│   │   ├── audit.ts            # Аудит-лог
│   │   ├── webhooks.ts         # Вебхуки
│   │   ├── email.ts            # SMTP-уведомления
│   │   ├── validation.ts       # Валидация (Zod)
│   │   ├── swagger.ts          # Swagger-документация
│   │   ├── seed.ts             # Создание пользователей по умолчанию
│   │   ├── logger.ts           # Winston
│   │   ├── env.ts              # Переменные окружения
│   │   └── routes.test.ts      # Тесты API
│   ├── drizzle.config.*.ts     # Конфиги Drizzle Kit
│   ├── .env.example
│   └── package.json
├── frontend/                   # SPA (React + Vite)
│   ├── src/
│   │   ├── main.tsx            # Точка входа, регистрация Service Worker
│   │   ├── App.tsx             # Маршрутизация, защита маршрутов
│   │   ├── api.ts              # HTTP-клиент (Axios)
│   │   ├── pages/              # Login, Register, Dashboard, AdminPanel, AuditLog, Profile
│   │   ├── components/         # StudentTable, StudentForm, StatsPanel, ChartsPanel и др.
│   │   └── __tests__/          # Юнит-тесты
│   ├── public/                 # sw.js, manifest.json, иконки PWA
│   ├── e2e/                    # Playwright-сценарии
│   └── package.json
├── nginx/                      # Конфиги Nginx (dev и prod)
├── scripts/                    # backup.sh / restore.sh
├── .github/workflows/          # CI и Deploy
├── docker-compose.yml
├── Dockerfile
├── start.bat                   # Однооконный запуск backend+frontend (Windows)
└── README.md
```

---

## Лицензия

Лицензия не указана. Перед публичным релизом добавьте файл `LICENSE` (например, MIT) и укажите его здесь.