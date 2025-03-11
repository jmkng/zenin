#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/account/authenticate" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"${ZENIN_SCRIPT_USERNAME}\", \"password\": \"${ZENIN_SCRIPT_PASSWORD}\" }" \
    -v
