#!/usr/bin/env sh

curl -X PATCH "http://127.0.0.1:${ZENIN_PORT}/api/v1/monitor?id=4,5&active=false" \
    -H "Authorization: Bearer ${ZENIN_SCRIPT_TOKEN}" \
    -v
