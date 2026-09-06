FROM node:24.20.0-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm install --no-audit --no-fund

FROM node:24.20.0-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run test:integrity && npm run test:unit && npm run build

FROM node:24.20.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build --chown=node:node /app ./
RUN npm prune --omit=dev \
  && find . -type f -not -path './node_modules/*' -exec chmod 0444 {} + \
  && sed -i 's/\r$//' ./docker-entrypoint.sh \
  && chmod 0555 ./docker-entrypoint.sh \
  && chmod 0555 .
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
