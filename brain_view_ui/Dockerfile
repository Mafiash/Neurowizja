# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Nginx config to support SPA routing and custom port
RUN sed -i 's/80/8080/g' /etc/nginx/conf.d/default.conf \
    && sed -i '/index  index.html index.htm;/a \        try_files $uri /index.html;' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
