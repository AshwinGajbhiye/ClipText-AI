# ==========================================
# Hybrid Builder & Runner Stage
# ==========================================
FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# 1. Install System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    ffmpeg \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Python Virtual Environment (PEP 668 compliance)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY services/requirements.txt ./services/
RUN pip3 install --no-cache-dir -r ./services/requirements.txt

# 3. Setup Node.js Monorepo Environment
COPY package.json package-lock.json turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/

RUN npm ci --include=dev

# 4. Copy Code
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
COPY services/ ./services/

# 5. Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# 6. Build the Worker
RUN npx turbo run build --filter=worker

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
