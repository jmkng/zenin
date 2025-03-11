#!/usr/bin/env sh

docker exec -it $ZENIN_SCRIPT_REPO_CONTAINER bash -c "psql -U $ZENIN_REPO_USERNAME -d $ZENIN_REPO_NAME"
