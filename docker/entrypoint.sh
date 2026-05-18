#!/bin/sh
set -e

# Symfony writes cache і логи в /var/www/html/var — мусить існувати і бути writable
# власником php-fpm worker'а (www-data).
mkdir -p /var/www/html/var/cache /var/www/html/var/log
chown -R www-data:www-data /var/www/html/var
chmod -R u+rwX,g+rwX /var/www/html/var

# Symfony вимагає непорожнє APP_SECRET. У проді користувач має передати своє через -e,
# але щоб контейнер не падав без явно заданого значення, генеруємо випадкове fallback.
if [ -z "${APP_SECRET:-}" ]; then
    APP_SECRET="$(head -c 32 /dev/urandom | hexdump -v -e '/1 "%02x"')"
    export APP_SECRET
    echo "[entrypoint] APP_SECRET not set — generated a random value for this container instance" >&2
fi

# Кеш Symfony білдиться лінivo на першому запиті — warmup тут навмисно не робимо,
# щоб уникнути chown-перегонів між root-entrypoint'ом і www-data-php-fpm.

exec "$@"
