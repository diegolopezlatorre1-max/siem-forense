# Build de la web (Vue) y servidor nginx. Contexto de build: la raíz del repo.
FROM node:22-bookworm-slim AS build

RUN npm install -g pnpm@9.15.9

WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter web...

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @siem/shared build && pnpm --filter web build

# Imagen final: solo nginx con los archivos estáticos.
FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
