#!/bin/bash
# ============================================================
# CARGOTRACK — DB Restore Script
# ============================================================
# Kullanım:
#   ./scripts/restore-db.sh backups/cargotrack_2026-06-15_030000.sql.gz
#
# UYARI: Mevcut DB içeriği tamamen üzerine yazılır!
# Önce mevcut DB'nin yedeğini al (./scripts/backup-db.sh).
# ============================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Kullanım: $0 <yedek-dosyasi.sql.gz>"
  echo
  echo "Mevcut yedekler:"
  ls -lh "$(dirname "$0")/../backups/"*.sql.gz 2>/dev/null || echo "  (yok)"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] HATA: dosya bulunamadı: $BACKUP_FILE"
  exit 1
fi

ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env.production}"
[ -f "$ENV_FILE" ] || ENV_FILE="$(dirname "$0")/../.env"
[ -f "$ENV_FILE" ] || { echo "[restore] HATA: env yok"; exit 1; }

set -a
# shellcheck disable=SC1090
source <(grep -v '^[[:space:]]*#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*=[[:space:]]*/=/')
set +a

echo "[restore] HEDEF DB: $DB_NAME @ $DB_HOST:${DB_PORT:-3306}"
echo "[restore] KAYNAK: $BACKUP_FILE"
read -p "[restore] Devam et? (mevcut $DB_NAME üzerine yazılacak) [evet/HAYIR] " confirm
if [ "$confirm" != "evet" ]; then
  echo "[restore] iptal"
  exit 0
fi

echo "[restore] başlıyor..."
gunzip < "$BACKUP_FILE" | mysql \
  --host="$DB_HOST" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --default-character-set=utf8mb4 \
  "$DB_NAME"

echo "[restore] tamamlandı"
