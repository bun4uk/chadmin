FROM php:7.4.13-fpm-alpine

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

RUN php -r "readfile('http://getcomposer.org/installer');" | php -- --install-dir=/usr/bin/ --version=2.0.8 --filename=composer

WORKDIR /var/www/html

STOPSIGNAL SIGQUIT

EXPOSE 9000

CMD ["php-fpm", "-R", "-F"]
