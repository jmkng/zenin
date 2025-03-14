#!/usr/bin/env sh

response=$(curl "http://127.0.0.1:${ZENIN_PORT}/api/v1/account/authenticate" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"${ZENIN_SCRIPT_USERNAME}\", \"password\": \"${ZENIN_SCRIPT_PASSWORD}\" }" \
    -s)
if [ $? -ne 0 ]; then
    echo "curl failed"
    return 1
fi

token=$(echo "$response" | jq -r '.data.token')
export ZENIN_SCRIPT_TOKEN="$token"
