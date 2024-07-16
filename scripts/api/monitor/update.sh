#!/usr/bin/env sh

curl -X PUT "http://127.0.0.1:${ZENIN_RT_PORT}/api/v1/monitor/1" \
    -H "Authorization: Bearer ${ZENIN_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{ 
        \"id\": 1, 
        \"name\": \"Hello World\", 
        \"kind\": \"HTTP\", 
        \"active\": false, 
        \"interval\": 100, 
        \"timeout\": 10, 
        \"remoteAddress\": \"https://google.com\", 
        \"description\": \"Hello World Description\", 
        \"httpRange\": \"200-299\", 
        \"httpMethod\": \"GET\"
    }" \
    -v
