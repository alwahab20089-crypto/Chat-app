FROM node:22-alpine

WORKDIR /app

COPY server/package*.json ./

RUN npm ci --omit=dev

COPY server/src ./src

ENV NODE_ENV=production

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
