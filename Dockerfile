FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
ARG APP_NAME
RUN npm run build:${APP_NAME}

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
ARG APP_NAME
CMD ["sh", "-c", "node dist/apps/${NEST_APP}/apps/${NEST_APP}/src/main.js"]
