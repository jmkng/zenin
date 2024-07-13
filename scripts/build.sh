#!/usr/bin/env sh

# Remove the old image if it exists
if docker images | grep -q $ZENIN_CONTAINER; then
    echo "removing old image $ZENIN_CONTAINER"
    docker image rm -f $ZENIN_CONTAINER
fi

# Build the new image
docker build --no-cache -t $ZENIN_CONTAINER .
