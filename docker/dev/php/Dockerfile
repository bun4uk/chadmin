FROM php:8.5.5-fpm-alpine3.22

RUN apk add --no-cache \
    libzip-dev \
    icu-dev \
    libxml2-dev \
    tzdata \
    linux-headers

RUN docker-php-ext-install intl \
 && docker-php-ext-install bcmath \
 && docker-php-ext-install zip \
 && docker-php-ext-install pcntl \
 && docker-php-ext-install pdo_mysql \
 && docker-php-ext-install mysqli \
 && docker-php-ext-install soap

# Opcache: in PHP 8.5 the extension may ship compiled-in or as shared — try to enable,
# ignore failure (some base images don't expose a separate opcache.so).
RUN docker-php-ext-enable opcache || true

RUN php -r "readfile('https://getcomposer.org/installer');" | php -- --install-dir=/usr/bin/ --filename=composer --version=2.9.7

WORKDIR /var/www/html

STOPSIGNAL SIGQUIT

EXPOSE 9000

CMD ["php-fpm", "-R", "-F"]
