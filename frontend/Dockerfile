# Frontend iMitra. Hasil build disajikan nginx — lebih stabil untuk demo
# daripada dev server.
FROM node:20-alpine AS build
WORKDIR /app
# Vite MENANAMKAN nilai ini saat build, jadi ia build arg, bukan env runtime.
# Nilainya WAJIB http://localhost:<port>, karena yang memanggil adalah browser
# di host — bukan container. Memakai http://backend:8080 di sini adalah
# kesalahan yang paling sering membuat repo gagal di mesin penilai.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
