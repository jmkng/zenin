#!/usr/bin/env sh

curl "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/monitor" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{ 
        \"name\": \"Hello World\", 
        \"kind\": \"HTTP\", 
        \"active\": false, 
        \"interval\": 30, 
        \"timeout\": 100, 
        \"remoteAddress\": \"https://google.com\", 
        \"description\": \"Hello World Description\", 
        \"httpRange\": \"200-299\", 
        \"httpMethod\": \"GET\"
    }" \
    -v
