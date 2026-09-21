FROM node:20-alpine AS base

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production

COPY backend/ ./backend/

# Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/backend/package*.json ./backend/
RUN cd backend && npm ci --production

COPY --from=base /app/backend/ ./backend/
COPY --from=base /app/frontend/dist ./frontend/dist

RUN mkdir -p logs

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]
