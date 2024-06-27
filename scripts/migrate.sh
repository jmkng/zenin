#!/usr/bin/env sh

source scripts/check.sh

if [ "$ZENIN_DB_KIND" = "postgres" ]; then
    MIGRATION_DIR="repository/postgres"
else
    echo "unsupported database kind, supported values: ['postgres']"
    exit 1
fi

for migration_file in $(ls ${MIGRATION_DIR}/*.sql 2>/dev/null | sort -n); do
    echo "applying migration: $migration_file"
    PGPASSWORD=$ZENIN_DB_PASSWORD psql -h $ZENIN_DB_HOST -p $ZENIN_DB_PORT -U $ZENIN_DB_USERNAME -d $ZENIN_DB_NAME -f $migration_file
done

echo "migrations complete"
