#!/usr/bin/env sh

curl -X DELETE "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/measurement?id=3,4" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -v
