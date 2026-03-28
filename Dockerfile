FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN npx esbuild migrations/run.ts --bundle --platform=node --format=esm --outfile=migrations/run.mjs --external:postgres

FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/build ./build
COPY --from=build /app/migrations ./migrations

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "build/index.js"]
