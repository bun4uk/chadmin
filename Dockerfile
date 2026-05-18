# -----------------------------------------------------------------------------
# Stage 1 — composer vendor (no dev deps)
# -----------------------------------------------------------------------------
FROM composer:2.9.7 AS vendor

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

# -----------------------------------------------------------------------------
# Stage 2 — frontend build (Vite → public/build/)
# -----------------------------------------------------------------------------
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

# -----------------------------------------------------------------------------
# Stage 3 — runtime: php-fpm + nginx + supervisord, single container
# -----------------------------------------------------------------------------
FROM php:8.5.5-fpm-alpine3.22

RUN apk add --no-cache \
        nginx \
        supervisor \
        tzdata \
        libzip-dev \
        icu-dev \
        libxml2-dev \
        linux-headers \
 && docker-php-ext-install -j"$(nproc)" \
        intl \
        bcmath \
        zip \
        pcntl \
        pdo_mysql \
        mysqli \
        soap \
 && (docker-php-ext-enable opcache || true) \
 # CVE-2026-24049 — vendored wheel .dist-info is dead metadata (see vex/chadmin.openvex.json).
 && rm -rf /usr/lib/python*/site-packages/setuptools/_vendor/wheel-*.dist-info \
 && rm -rf /var/cache/apk/* /tmp/*

WORKDIR /var/www/html

# Application source + built artifacts
COPY . /var/www/html
COPY --from=vendor   /app/vendor/      /var/www/html/vendor/
COPY --from=frontend /app/public/build /var/www/html/public/build

# Runtime configs
COPY docker/prod/nginx.conf       /etc/nginx/nginx.conf
COPY docker/prod/php-fpm.conf     /usr/local/etc/php-fpm.d/zz-chadmin.conf
COPY docker/prod/php.ini          /usr/local/etc/php/conf.d/zz-chadmin.ini
COPY docker/prod/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh         /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && mkdir -p /var/www/html/var /run/nginx \
 && chown -R www-data:www-data /var/www/html/var /var/www/html/public \
 # Symfony Dotenv::bootEnv() вимагає реальний .env; справжні значення приходять через
 # `docker run -e ...` і мають пріоритет над файлом, тому .env.example тут — лише плейсхолдер.
 && cp /var/www/html/.env.example /var/www/html/.env

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
