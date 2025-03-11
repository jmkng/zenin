#!/usr/bin/env sh

if docker images | grep -q $ZENIN_SCRIPT_CONTAINER; then
    echo "removing old image $ZENIN_SCRIPT_CONTAINER"
    docker container rm -f $ZENIN_SCRIPT_CONTAINER
    docker image rm -f $ZENIN_SCRIPT_CONTAINER
fi

docker build -t $ZENIN_SCRIPT_CONTAINER .
