#!/usr/bin/env sh

docker network create zenin-network

# Check if the container already exists
if [ $(docker ps -a --format '{{.Names}}' | grep -x $ZENIN_CONTAINER) ]; then
    echo "attaching to existing container"
    docker start -i $ZENIN_CONTAINER
else
    echo "creating and attaching to new contianer"
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
        -e SHELL="/bin/bash" \
        --name $ZENIN_CONTAINER \
        zenin
fi

##!/usr/bin/env sh
#
#docker network create zenin-network
#
#docker run \
#    --network zenin-network \
#    -p 50010:50010 \
#    -e ZENIN_DB_KIND=$ZENIN_DB_KIND \
#    -e ZENIN_DB_HOST=$ZENIN_DB_CONTAINER \
#    -e ZENIN_DB_PORT=$ZENIN_DB_PORT \
#    -e ZENIN_DB_NAME=$ZENIN_DB_NAME \
#    -e ZENIN_DB_USERNAME=$ZENIN_DB_USERNAME \
#    -e ZENIN_DB_PASSWORD=$ZENIN_DB_PASSWORD \
#    -e ZENIN_RT_LEVEL=$ZENIN_RT_LEVEL \
#    -e SHELL="/bin/bash" \
#    --name $ZENIN_CONTAINER \
#    zenin

