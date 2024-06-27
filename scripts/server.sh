#!/usr/bin/env sh

docker network create zenin-network
docker run \
    --network zenin-network \
    -p 50010:50010 \
    -e ZENIN_DB_KIND=$ZENIN_DB_KIND \
    -e ZENIN_DB_HOST=$ZENIN_DB_CONTAINER \
    -e ZENIN_DB_PORT=$ZENIN_DB_PORT \
    -e ZENIN_DB_NAME=$ZENIN_DB_NAME \
    -e ZENIN_DB_USERNAME=$ZENIN_DB_USERNAME \
    -e ZENIN_DB_PASSWORD=$ZENIN_DB_PASSWORD \
    -e ZENIN_RT_LEVEL=$ZENIN_RT_LEVEL \
    --name zenin \
    zenin
