#!/usr/bin/env sh

source scripts/check.sh
source scripts/wipe.sh

docker run --name $ZENIN_DB_CONTAINER -p $ZENIN_DB_PORT:$ZENIN_DB_PORT -e POSTGRES_PASSWORD=$ZENIN_DB_PASS -e POSTGRES_USER=$ZENIN_DB_USER -d postgres
