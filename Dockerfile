FROM node:22-alpine AS base
WORKDIR /app

FROM base AS backend-deps
COPY backend/package*.json ./
RUN npm ci --production

FROM base AS frontend-builder
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM base AS backend-builder
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

# Приложение не пишет в файлы, поэтому работает от непривилегированного пользователя.
RUN addgroup -S app && adduser -S app -G app

COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/package.json ./
COPY --from=frontend-builder /app/dist ./frontend/dist

RUN mkdir -p logs && chown -R app:app /app

ENV NODE_ENV=production
ENV PORT=5000

USER app

EXPOSE 5000

CMD ["node", "dist/index.js"]
