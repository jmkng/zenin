#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/account" \
    -H "Authorization: Bearer ${ZENIN_SCRIPT_TOKEN}" \
    -v
