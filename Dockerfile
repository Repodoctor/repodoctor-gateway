# Build context is a staging directory:
#   contracts/  -> built @repodoctor/contracts sources
#   service/    -> this service
# GitHub Actions assembles that context. Local:
#   ./scripts not required; see README.

FROM node:22-alpine AS contracts
WORKDIR /contracts
COPY contracts/package.json contracts/package-lock.json* ./
COPY contracts/tsconfig.json ./
COPY contracts/src ./src
RUN npm install && npm run build

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=contracts /contracts /repodoctor-contracts
COPY service/package.json service/package-lock.json* ./
RUN npm install
COPY service/tsconfig.json ./
COPY service/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=43121
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /repodoctor-contracts /repodoctor-contracts
USER app
EXPOSE 43121
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'43121')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
