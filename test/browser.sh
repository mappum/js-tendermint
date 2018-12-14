#!/bin/sh

if [ $BROWSER ]; then
  airtap \
    --browser-name $BROWSER \
    --browser-version latest \
    --loopback airtap.local \
    -- test/*.js
else
  airtap \
    --local \
    --open \
    -- test/*.js
fi
