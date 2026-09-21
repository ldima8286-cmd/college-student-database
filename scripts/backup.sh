#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/student_db_${TIMESTAMP}.sql.gz"
pg_dump -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-student_db} | gzip > "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"
ls -t "$BACKUP_DIR"/student_db_*.sql.gz | tail -n +31 | xargs -r rm
echo "Cleanup done. Backups kept: $(ls "$BACKUP_DIR"/student_db_*.sql.gz 2>/dev/null | wc -l)"
