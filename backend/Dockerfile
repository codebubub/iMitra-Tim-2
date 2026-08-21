# Backend iMitra. Multi-stage supaya image runtime tidak memuat devDependencies.
FROM node:20-alpine AS build
WORKDIR /app
# Prisma memerlukan OpenSSL, dan node:20-alpine TIDAK memuatnya. Tanpa baris ini
# schema engine gagal dimuat dengan pesan yang menyesatkan:
#   "Could not parse schema engine response: SyntaxError: Unexpected token 'E'"
# yang sebenarnya berbunyi "Error loading shared library libssl.so.3".
# libc6-compat diperlukan karena binary Prisma di-link ke glibc.
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Sama seperti stage build: runtime menjalankan Prisma Client, yang juga
# memerlukan OpenSSL.
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
# Direktori upload dipasang sebagai volume di docker-compose.yml.
RUN mkdir -p /app/uploads
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
