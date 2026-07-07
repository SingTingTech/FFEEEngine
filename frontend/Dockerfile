# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
# Use Aliyun alpine mirror to avoid slow dl-cdn.alpinelinux.org in CN
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY tsconfig.base.json tsconfig.json ./
COPY apps/platform-admin/package.json apps/platform-admin/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/form-embeddable/package.json packages/form-embeddable/

RUN pnpm install --frozen-lockfile

COPY apps/platform-admin apps/platform-admin
COPY packages/shared-types packages/shared-types
COPY packages/form-embeddable packages/form-embeddable

RUN pnpm --filter platform-admin build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=builder /app/apps/platform-admin/dist .

COPY apps/platform-admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
