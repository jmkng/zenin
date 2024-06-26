#!/usr/bin/env sh

REQUIRED_VARS=("ZENIN_RT_LEVEL" "ZENIN_DB_KIND" "ZENIN_DB_HOST" "ZENIN_DB_PORT" "ZENIN_DB_NAME" "ZENIN_DB_USER" "ZENIN_DB_PASS" "ZENIN_DB_CONTAINER")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ "${#MISSING_VARS[@]}" -gt 0 ]; then
    echo "required environment variables are not set: ${MISSING_VARS[*]} \n\ntry 'source ./scripts/export.sh'"
    exit 1
fi
