# Mock SLIK — layanan terpisah, dipanggil backend via HTTP (brief 7.2 butir 3).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# wget dipakai healthcheck di docker-compose.yml. Ia sudah ada di image alpine.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 9090
CMD ["node", "dist/server.js"]
