#!/usr/bin/env sh

source scripts/check.sh
docker exec -it $ZENIN_DB_CONTAINER bash -c "psql -U $ZENIN_DB_USERNAME -d $ZENIN_DB_NAME"
