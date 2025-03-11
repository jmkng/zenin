#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/account/2" \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ZENIN_SCRIPT_TOKEN}" \
    -d "{ \"username\": \"${ZENIN_SCRIPT_USERNAME}\", \"password\": \"${ZENIN_SCRIPT_PASSWORD}\"}" \
    -v
