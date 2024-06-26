#!/usr/bin/env sh

source scripts/check.sh

if docker ps -a --format '{{.Names}}' | grep -q $ZENIN_DB_CONTAINER; then
    echo "removing $ZENIN_DB_CONTAINER"
    docker rm -f $ZENIN_DB_CONTAINER
fi
