FROM composer:1.7 AS php
RUN mkdir -p /room9/app/
WORKDIR /room9/app/
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-suggest --optimize-autoloader --ignore-platform-reqs

FROM docker.room9.co.nz:5000/room9/php:7.2-silverstripe
ENV NEWRELIC_LICENSE_KEY="REPLACE_WITH_REAL_KEY"
ENV NEWRELIC_APP_NAME="PHP Application"
ENV NEWRELIC_ENABLED="false"
ENV FQDN="hub.local"
ENV BASE_URL="http://hub.local:8081"
ENV SS_DATABASE_SERVER="mysql"
ENV SS_DATABASE_USERNAME="root"
ENV SS_DATABASE_PASSWORD="password"
ENV SS_DATABASE_NAME="room9hub"
ENV SS_DEFAULT_ADMIN_USERNAME="admin"
ENV SS_DEFAULT_ADMIN_PASSWORD="fiddlesticks"
ENV LOG_FILE="/var/www/html/logs/silverstripe.log"
ENV TEMP_FOLDER="/var/www/html/silverstripe-cache"
ENV ERROR_EMAIL="errors@room9.co.nz"
ENV ADMIN_EMAIL="developers@room9.co.nz"
ENV HUB_BACKUP_WEBHOOK="https://hub.dev.room9.co.nz/api/backup"
RUN { \
    echo "<VirtualHost *:80>"; \
    echo "  DocumentRoot /var/www/html/public"; \
    echo "  LogLevel warn"; \
    echo "  ErrorLog /var/log/apache2/error.log"; \
    echo "  CustomLog /var/log/apache2/access.log combined"; \
    echo "  ServerSignature Off"; \
    echo "  <Directory /var/www/html>"; \
    echo "    Options +FollowSymLinks"; \
    echo "    Options -ExecCGI -Includes -Indexes"; \
    echo "    AllowOverride all"; \
    echo; \
    echo "    Require all granted"; \
    echo "  </Directory>"; \
    echo "  <LocationMatch assets/>"; \
    echo "    php_flag engine off"; \
    echo "  </LocationMatch>"; \
    echo; \
    echo "  IncludeOptional sites-available/000-default.local*"; \
    echo "</VirtualHost>"; \
  } | tee /etc/apache2/sites-available/000-default.conf
RUN echo "ServerName $FQDN" > /etc/apache2/conf-available/fqdn.conf
WORKDIR /var/www/html
COPY . ./
COPY --from=php /room9/app/ ./

ENTRYPOINT "./docker-entrypoint.sh"
