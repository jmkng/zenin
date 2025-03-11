#!/usr/bin/env sh

if [ "$ZENIN_REPO_KIND" = "postgres" ]; then
    MIGRATION_DIR="repository/postgres"
elif [ "$ZENIN_REPO_KIND" = "sqlite" ]; then
    MIGRATION_DIR="repository/sqlite"
else
    echo "unsupported database kind, supported values: [\"postgres\", \"sqlite\"]"
    exit 1
fi

for migration_file in $(ls ${MIGRATION_DIR}/*.sql 2>/dev/null | sort -n); do
    echo "applying migration: $migration_file"
    if [ "$ZENIN_REPO_KIND" = "postgres" ]; then
        PGPASSWORD=$ZENIN_REPO_PASSWORD psql -h $ZENIN_REPO_ADDRESS -p $ZENIN_REPO_PORT -U $ZENIN_REPO_USERNAME -d $ZENIN_REPO_NAME -f $migration_file
    elif [ "$ZENIN_REPO_KIND" = "sqlite" ]; then
        sqlite3 "${ZENIN_BASE_DIR}/${ZENIN_REPO_NAME}" < "$migration_file"
    fi
done

echo "migrations complete"
