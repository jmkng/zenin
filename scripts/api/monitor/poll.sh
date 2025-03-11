#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/monitor/8/poll" \
    -H "Authorization: Bearer ${ZENIN_SCRIPT_TOKEN}" \
    -v
