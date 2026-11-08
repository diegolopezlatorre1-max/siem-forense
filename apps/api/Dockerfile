# Imagen de la API, el worker y las migraciones (mismo build, distinto comando).
# Contexto de build: la raíz del repo (docker-compose lo pasa así).
FROM node:22-bookworm-slim

# argon2 es un módulo nativo: necesita toolchain por si no hay binario precompilado.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.15.9

WORKDIR /repo

# Manifiestos primero: así la capa de dependencias se cachea mientras no cambien.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter api...

# Código y compilación (shared antes que la API, que depende de él).
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY rules ./rules
RUN pnpm --filter @siem/shared build && pnpm --filter api build

ENV NODE_ENV=production
WORKDIR /repo/apps/api

# Por defecto arranca la API; el worker y las migraciones sobrescriben el comando en compose.
CMD ["node", "dist/main.js"]
