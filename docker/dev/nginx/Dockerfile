FROM nginx:1.28.3-alpine3.23 AS builder

ENV VTS_VERSION=0.2.1

# Download sources
RUN wget "http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" -O nginx.tar.gz && \
    wget "https://github.com/vozlt/nginx-module-vts/archive/v${VTS_VERSION}.tar.gz" -O vts.tar.gz

# For latest build deps, see https://github.com/nginxinc/docker-nginx/blob/master/mainline/alpine/Dockerfile
RUN apk add --no-cache --virtual .build-deps \
  gcc \
  libc-dev \
  make \
  openssl-dev \
  zlib-dev \
  gnupg \
  libxslt-dev \
  pcre-dev \
  g++

# Reuse same cli arguments as the nginx:alpine image used to build
RUN CONFARGS=$(nginx -V 2>&1 | sed -n -e 's/^.*arguments: //p') \
  mkdir -p /usr/src && \
  tar -zxC /usr/src -f nginx.tar.gz && \
  tar -xzvf "vts.tar.gz" && \
  VTSDIR="$(pwd)/nginx-module-vts-${VTS_VERSION}" && \
  cd /usr/src/nginx-$NGINX_VERSION && \
  ./configure --with-compat --with-stream $CONFARGS --add-dynamic-module=$VTSDIR && \
  make modules

FROM nginx:1.28.3-alpine3.23

# Copy all modules
COPY --from=builder /usr/src/nginx-$NGINX_VERSION/objs/*.so /usr/lib/nginx/modules/
RUN apk add --no-cache --virtual .build-deps \
    vim \
    libmaxminddb-dev \
    libstdc++

WORKDIR /var/www/html/

STOPSIGNAL SIGQUIT
