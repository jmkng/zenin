#!/usr/bin/env sh

if docker images | grep -q $ZENIN_CONTAINER; then
    echo "removing old image $ZENIN_CONTAINER"
    docker container rm -f $ZENIN_CONTAINER
    docker image rm -f $ZENIN_CONTAINER
fi

docker build -t $ZENIN_CONTAINER .
