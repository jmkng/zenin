#!/usr/bin/env sh

if docker ps -a --format '{{.Names}}' | grep -q $ZENIN_SCRIPT_REPO_CONTAINER; then
    echo "removing $ZENIN_SCRIPT_REPO_CONTAINER"
    docker rm -f $ZENIN_SCRIPT_REPO_CONTAINER
fi

docker network create zenin-network

docker run \
    --network zenin-network \
    -p $ZENIN_REPO_PORT:$ZENIN_REPO_PORT \
    -e POSTGRES_PASSWORD=$ZENIN_REPO_PASSWORD \
    -e POSTGRES_USER=$ZENIN_REPO_USERNAME \
    --name $ZENIN_SCRIPT_REPO_CONTAINER \
    -d postgres \
