FROM composer:2.9.8 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
COPY bin/console bin/console

# Composer image ships its own PHP, which may lag behind the runtime version below.
# Skip the platform PHP check at install time — the runtime PHP is what executes the code.
RUN composer install \
      --no-scripts \
      --no-dev \
      --optimize-autoloader \
      --no-progress \
      --no-interaction \
      --ignore-platform-req=php

FROM node:24.15.0-alpine3.23 AS frontend

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
# npm install (not `npm ci`) — the committed lock file has stale peer-dep entries
# from earlier upstream packages; npm install reconciles silently, npm ci fails strict.
RUN npm install --no-audit --no-fund --no-progress --legacy-peer-deps

COPY frontend/ ./frontend/
COPY assets/   ./assets/
COPY public/   ./public/

RUN npm run build

# Target for base php-fpm mode
FROM php:8.5.5-fpm-alpine3.23 AS base

RUN (docker-php-ext-enable opcache || true)

WORKDIR /var/www/html

RUN addgroup -S chadmin && adduser --uid 1984 -S chadmin -G chadmin && \
 mkdir -p /sock && chown chadmin:chadmin /sock && chmod 750 /sock

# Application source + built artifacts
COPY --chown=chadmin:chadmin . /var/www/html 
COPY --from=frontend --chown=chadmin:chadmin /app/public/build /var/www/html/public/build
COPY --from=vendor   --chown=chadmin:chadmin /app/vendor/      /var/www/html/vendor/

COPY docker/configs/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

USER chadmin

CMD ["php-fpm", "-F"]


# Target for all in one image mode
FROM base AS aio

USER root

RUN apk add --no-cache \
       nginx \
       supervisor \
       && rm -rf /var/cache/apk/* /tmp/*

# Runtime configs
COPY docker/configs/nginx.conf /etc/nginx/nginx.conf
COPY docker/configs/nginx-chadmin.conf /etc/nginx/conf.d/default.conf
COPY docker/configs/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/configs/supervisord.conf /etc/supervisord.conf
COPY docker/aio-entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && cp /var/www/html/.env.example /var/www/html/.env

USER chadmin

EXPOSE 80

# Let's have some fun
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]