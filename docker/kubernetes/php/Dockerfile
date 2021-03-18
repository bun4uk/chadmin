FROM composer:2.0.8 as vendor

COPY composer.json composer.json
COPY composer.lock composer.lock

RUN composer install
#
FROM node:15.4 as frontend

RUN mkdir -p /app/public

COPY package.json webpack.config.js yarn.lock /app/
COPY assets/ /app/assets/

WORKDIR /app

RUN yarn install && yarn build
#
FROM php:8.0.3-fpm-alpine

RUN apk add --no-cache \
    \
    libzip-dev \
    \
    icu-dev \
    libxml2-dev \
    \
    mysql-client \
    tzdata \
    git \
    bash

RUN docker-php-ext-install sockets intl bcmath zip pcntl pdo_mysql mysqli soap \
  && docker-php-ext-enable opcache

WORKDIR /var/www/html

STOPSIGNAL SIGQUIT

EXPOSE 9000

CMD ["php-fpm", "-R", "-F"]

COPY --from=vendor   /app/vendor/           /var/www/html/vendor/
COPY --from=frontend /app/public/           /var/www/html/public/
COPY --from=frontend /app/webpack.config.js /var/www/html/webpack.config.js
COPY . /var/www/html
