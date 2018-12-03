#! /usr/bin/env bash

if [[ "$NEWRELIC_ENABLED" == "true" && "$NEWRELIC_LICENSE_KEY" && "$NEWRELIC_APP_NAME" ]]; then
echo "===============Enabling newrelic==============="
sed -i -e 's/"REPLACE_WITH_REAL_KEY"/"'${NEWRELIC_LICENSE_KEY}'"/' \
    -e 's/newrelic.appname = "PHP Application"/newrelic.appname = "'${NEWRELIC_APP_NAME}'"/' \
    -e 's/newrelic.enabled = false/newrelic.enabled = '${NEWRELIC_ENABLED}'/' \
    /usr/local/etc/php/conf.d/newrelic.ini
fi

chown 33:33 -R $TEMP_FOLDER
chown 33:33 -R public/assets

apache2-foreground
