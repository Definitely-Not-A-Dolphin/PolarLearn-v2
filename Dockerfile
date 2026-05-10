FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS build-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm prisma generate
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

COPY package.json pnpm-lock.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/prisma /app/prisma

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm run start"]
