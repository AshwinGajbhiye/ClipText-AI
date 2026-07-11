# ==========================================
# Builder Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/

RUN npm ci

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx turbo run build --filter=api

# ==========================================
# Production Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3000

# Ensure migrations run on startup
CMD sh -c "cd ../../packages/database && npx prisma migrate deploy && cd ../../apps/api && node dist/index.js"
