FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

FROM nginx:alpine
ENV PORT=80
ENV BACKEND_UPSTREAM=backend:8000
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["/bin/sh", "-c", "NAMESERVER=$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null || echo '127.0.0.11'); export NAMESERVER=${NAMESERVER:-127.0.0.11}; envsubst '${PORT} ${BACKEND_UPSTREAM} ${NAMESERVER}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
