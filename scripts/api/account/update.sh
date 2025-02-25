#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/account/2" \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -d "{ \"username\": \"${ZENIN_API_USER}\", \"password\": \"${ZENIN_API_PASS}\"}" \
    -v
