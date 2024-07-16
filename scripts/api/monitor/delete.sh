#!/usr/bin/env sh

curl -X DELETE "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/monitor?id=2,3" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -v
