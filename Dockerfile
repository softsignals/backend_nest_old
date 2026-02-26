# Build stage: build entire monorepo (all three apps)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts

RUN npm run build

# Production stage: single image runs any app via NEST_APP
FROM node:22-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000 3001 3002

ENTRYPOINT ["/docker-entrypoint.sh"]
