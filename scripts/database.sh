#!/usr/bin/env sh

source scripts/check.sh

if docker ps -a --format '{{.Names}}' | grep -q $ZENIN_DB_CONTAINER; then
    echo "removing $ZENIN_DB_CONTAINER"
    docker rm -f $ZENIN_DB_CONTAINER
fi

docker network create zenin-network
docker run \
    --network zenin-network \
    -p $ZENIN_DB_PORT:$ZENIN_DB_PORT \
    -e POSTGRES_PASSWORD=$ZENIN_DB_PASSWORD \
    -e POSTGRES_USER=$ZENIN_DB_USERNAME \
    --name $ZENIN_DB_CONTAINER \
    -d postgres \
