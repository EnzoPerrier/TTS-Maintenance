#!/bin/sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Démarrage du backup de $DB_NAME..."

mysqldump \
  -h mysql \
  -u "$DB_USER" \
  -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --hex-blob \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] ✅ Backup réussi : $BACKUP_FILE"
else
  echo "[$(date)] ❌ Erreur lors du backup"
  exit 1
fi

# Suppression des backups de plus de 30 jours
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +60 -delete
echo "[$(date)] 🧹 Anciens backups supprimés (> 60 jours)"