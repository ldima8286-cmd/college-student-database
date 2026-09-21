#!/bin/bash
if [ -z "$1" ]; then echo "Usage: $0 <backup_file.sql.gz>"; exit 1; fi
gunzip -c "$1" | psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-student_db}
echo "Restore complete from: $1"
