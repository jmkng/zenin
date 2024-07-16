#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/monitor/2/poll" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -v
