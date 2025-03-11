#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/measurement/4/certificates" \
    -H "Authorization: Bearer ${ZENIN_SCRIPT_TOKEN}" \
    -H "Content-Type: application/json" \
    -v
