FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Nginx oficial procesa templates en /etc/nginx/templates con envsubst al iniciar.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Valor por defecto para despliegue docker-compose (backend como servicio "backend").
ENV BACKEND_URL=http://backend:8080

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
