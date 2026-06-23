# syntax=docker/dockerfile:1
# Multi-stage build for Next.js 15 (standalone output).
# NEXT_PUBLIC_* are compiled into the bundle at build time, so they are passed
# as build args per environment. Defaults below = mock mode (no backend needed).

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_USE_MOCK=true
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_AZURE_CLIENT_ID=
ARG NEXT_PUBLIC_AZURE_TENANT_ID=
ARG NEXT_PUBLIC_AZURE_REDIRECT_URI=
ARG NEXT_PUBLIC_AZURE_API_SCOPE=
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_AZURE_CLIENT_ID=$NEXT_PUBLIC_AZURE_CLIENT_ID \
    NEXT_PUBLIC_AZURE_TENANT_ID=$NEXT_PUBLIC_AZURE_TENANT_ID \
    NEXT_PUBLIC_AZURE_REDIRECT_URI=$NEXT_PUBLIC_AZURE_REDIRECT_URI \
    NEXT_PUBLIC_AZURE_API_SCOPE=$NEXT_PUBLIC_AZURE_API_SCOPE

RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0 is required so the Next.js standalone server accepts
# external connections inside the container (otherwise it can bind to localhost).
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
