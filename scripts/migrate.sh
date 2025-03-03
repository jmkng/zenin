#!/usr/bin/env sh

if [ "$ZENIN_DB_KIND" = "postgres" ]; then
    MIGRATION_DIR="repository/postgres"
elif [ "$ZENIN_DB_KIND" = "sqlite" ]; then
    MIGRATION_DIR="repository/sqlite"
else
    echo "unsupported database kind, supported values: [\"postgres\", \"sqlite\"]"
    exit 1
fi

for migration_file in $(ls ${MIGRATION_DIR}/*.sql 2>/dev/null | sort -n); do
    echo "applying migration: $migration_file"
    if [ "$ZENIN_DB_KIND" = "postgres" ]; then
        PGPASSWORD=$ZENIN_DB_PASSWORD psql -h $ZENIN_DB_ADDRESS -p $ZENIN_DB_PORT -U $ZENIN_DB_USERNAME -d $ZENIN_DB_NAME -f $migration_file
    elif [ "$ZENIN_DB_KIND" = "sqlite" ]; then
        sqlite3 "${ZENIN_RT_BASE_DIR}/${ZENIN_DB_NAME}" < "$migration_file"
    fi
done

echo "migrations complete"
