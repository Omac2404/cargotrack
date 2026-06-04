#!/bin/bash
# ============================================================
# CARGOTRACK — DB Backup Script
# ============================================================
# Günlük tam mysqldump + 30 günlük rotasyon.
#
# KURULUM:
#   1) chmod +x scripts/backup-db.sh
#   2) Crontab'a ekle (her gece 03:00):
#        crontab -e
#        0 3 * * * /opt/cargotrack/scripts/backup-db.sh >> /var/log/cargotrack-backup.log 2>&1
#
# MANUEL ÇALIŞTIR:
#   ./scripts/backup-db.sh
#
# GERİ YÜKLEME:
#   gunzip < backups/cargotrack_2026-06-15_030000.sql.gz | mysql -u root -p cargotrack
# ============================================================
set -euo pipefail

# .env'den DB bilgilerini oku (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)
ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$(dirname "$0")/../.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] HATA: env dosyası bulunamadı ($ENV_FILE)"
  exit 1
fi

# .env'i export et (boş satır + yorum satırlarını atla)
set -a
# shellcheck disable=SC1090
source <(grep -v '^[[:space:]]*#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*=[[:space:]]*/=/')
set +a

: "${DB_HOST:?DB_HOST tanımlı değil}"
: "${DB_USER:?DB_USER tanımlı değil}"
: "${DB_PASSWORD:?DB_PASSWORD tanımlı değil}"
: "${DB_NAME:?DB_NAME tanımlı değil}"
DB_PORT="${DB_PORT:-3306}"

# Backup dizini
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
mkdir -p "$BACKUP_DIR"

# Saklama süresi (gün) — bu kadar günden eski yedekler silinir
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Dosya adı: cargotrack_YYYY-MM-DD_HHMMSS.sql.gz
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
OUT="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[backup] $(date) — başlıyor: $OUT"

# mysqldump (docker container kullananlar için $DB_HOST=127.0.0.1 + portu doğru olmalı)
# --single-transaction → InnoDB için tutarlı snapshot, lock yapmaz
# --routines + --triggers → stored procedure + trigger'ları da al
# --quick → büyük tablolar için bellek tasarrufu
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --quick \
  --default-character-set=utf8mb4 \
  "$DB_NAME" \
  | gzip > "$OUT"

# Boyut kontrolü
SIZE=$(du -h "$OUT" | cut -f1)
echo "[backup] başarılı: $OUT ($SIZE)"

# Eski yedekleri sil
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[backup] $DELETED eski yedek silindi (>$RETENTION_DAYS gün)"
fi

# Mevcut yedekleri listele
COUNT=$(ls -1 "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)
echo "[backup] toplam yedek: $COUNT"

# Disk kullanımı
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[backup] disk kullanımı: $TOTAL"

echo "[backup] tamamlandı"
