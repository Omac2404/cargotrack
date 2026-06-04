#!/bin/bash
# ============================================================
# CARGOTRACK — Tek-Script Production Kurulumu
# ============================================================
# Temiz Ubuntu 22.04 / Debian 12 sunucusunda kurulum:
#
#   curl -fsSL <REPO_URL>/raw/main/deploy/install.sh | sudo bash
# veya
#   git clone <REPO_URL> /opt/cargotrack
#   sudo bash /opt/cargotrack/deploy/install.sh
#
# Bu script:
#   - Bağımlılıkları kurar (Node, MySQL, nginx, PM2, certbot)
#   - Sistem kullanıcısı oluşturur (cargotrack)
#   - .env.production şablonu kurar (secret üretici çağırır)
#   - DB + admin kullanıcısı için interaktif setup
#   - PM2 + nginx + HTTPS kurulumu
#
# Manuel yapacaklar:
#   - Domain'i sunucuya yönlendir (A record)
#   - DEPLOY.md adım 8'i takip et (HTTPS sertifikası)
# ============================================================
set -euo pipefail

APP_DIR="/opt/cargotrack"
APP_USER="cargotrack"

# Renkler
G='\033[0;32m'; R='\033[0;31m'; Y='\033[0;33m'; B='\033[0;34m'; N='\033[0m'

step() { echo -e "\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n${B}  $1${N}\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"; }
ok() { echo -e "${G}✓${N} $1"; }
err() { echo -e "${R}✗${N} $1"; exit 1; }
warn() { echo -e "${Y}⚠${N} $1"; }

# Root kontrolü
[ "$EUID" -eq 0 ] || err "Bu script root olarak çalıştırılmalı: sudo bash $0"

# Distro kontrolü
. /etc/os-release
case "$ID" in
  ubuntu|debian) ok "Linux: $PRETTY_NAME" ;;
  *) err "Desteklenmeyen distro: $ID (Ubuntu/Debian gerekli)" ;;
esac

# ---- 1. Sistem güncelle + bağımlılıklar ----
step "1/6  Sistem paketleri"
apt-get update -qq
apt-get install -y -qq curl git build-essential ca-certificates

if ! command -v node &>/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
  apt-get install -y -qq nodejs
fi
ok "Node $(node -v)"

if ! command -v mysql &>/dev/null; then
  apt-get install -y -qq mysql-server
fi
ok "MySQL $(mysql --version | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)"

if ! command -v nginx &>/dev/null; then
  apt-get install -y -qq nginx
fi
ok "nginx $(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"

if ! command -v certbot &>/dev/null; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi
ok "certbot kurulu"

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 > /dev/null
fi
ok "pm2 $(pm2 -v)"

# ---- 2. Kullanıcı + dizin ----
step "2/6  Sistem kullanıcısı + dizin"
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -s /bin/bash -m -d "$APP_DIR" "$APP_USER"
  ok "Kullanıcı oluşturuldu: $APP_USER"
fi

# Repo
if [ ! -d "$APP_DIR/src" ]; then
  err "$APP_DIR boş — önce 'sudo -u $APP_USER git clone <REPO_URL> $APP_DIR' çalıştır"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
ok "Dizin hazır: $APP_DIR"

# ---- 3. Bağımlılıklar ----
step "3/6  npm install (backend + frontend)"
cd "$APP_DIR"
sudo -u "$APP_USER" npm install --omit=dev --silent 2>&1 | tail -3
ok "Backend deps"

cd "$APP_DIR/frontend"
sudo -u "$APP_USER" npm install --silent 2>&1 | tail -3
ok "Frontend deps"
sudo -u "$APP_USER" npm run build 2>&1 | tail -3
ok "Frontend build → /opt/cargotrack/public"

# ---- 4. Secrets + .env.production ----
step "4/6  Secrets üret + .env.production"
cd "$APP_DIR"
if [ ! -f .env.production ]; then
  sudo -u "$APP_USER" cp .env.example .env.production

  # Secret üret + env'e yapıştır
  SECRETS=$(sudo -u "$APP_USER" node scripts/generate-secrets.js 2>&1)
  JWT=$(echo "$SECRETS" | grep '^JWT_SECRET=' | head -1 | cut -d= -f2-)
  DB_PWD=$(echo "$SECRETS" | grep '^DB_PASSWORD=' | head -1 | cut -d= -f2-)

  sudo -u "$APP_USER" sed -i \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" \
    -e "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PWD|" \
    -e "s|^DB_USER=.*|DB_USER=cargotrack|" \
    -e "s|^DEFAULT_ADMIN_PASSWORD=.*|DEFAULT_ADMIN_PASSWORD=|" \
    .env.production
  chmod 600 .env.production
  ok ".env.production oluşturuldu (JWT + DB şifresi üretildi)"

  # MySQL'de DB + kullanıcı oluştur
  warn "MySQL root şifresini gir (kurulum sırasında set etmediysen Enter'a bas):"
  MYSQL_PWD_PROMPT="-p"
  mysql $MYSQL_PWD_PROMPT <<SQL
CREATE DATABASE IF NOT EXISTS cargotrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'cargotrack'@'localhost' IDENTIFIED BY '$DB_PWD';
ALTER USER 'cargotrack'@'localhost' IDENTIFIED BY '$DB_PWD';
GRANT ALL PRIVILEGES ON cargotrack.* TO 'cargotrack'@'localhost';
FLUSH PRIVILEGES;
SQL
  ok "MySQL: cargotrack DB + kullanıcı"
else
  ok ".env.production zaten var (atlandı)"
fi

# ---- 5. İlk admin (interaktif) ----
step "5/6  İlk süper admin (interaktif)"
sudo -u "$APP_USER" NODE_ENV=production node scripts/setup-admin.js

# ---- 6. PM2 başlat ----
step "6/6  PM2 başlat"
sudo -u "$APP_USER" pm2 start ecosystem.config.js --env production
sudo -u "$APP_USER" pm2 save

# PM2 sistem servisi (boot'ta otomatik)
pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" | tail -5

# Log rotation
sudo -u "$APP_USER" pm2 install pm2-logrotate > /dev/null 2>&1 || true
sudo -u "$APP_USER" pm2 set pm2-logrotate:max_size 50M > /dev/null
sudo -u "$APP_USER" pm2 set pm2-logrotate:retain 14 > /dev/null
sudo -u "$APP_USER" pm2 set pm2-logrotate:compress true > /dev/null
ok "PM2 + log rotation hazır"

# Backup cron
mkdir -p "$APP_DIR/backups"
chown "$APP_USER:$APP_USER" "$APP_DIR/backups"
chmod +x "$APP_DIR/scripts/backup-db.sh"
chmod +x "$APP_DIR/scripts/restore-db.sh"

CRON_LINE="0 3 * * * $APP_DIR/scripts/backup-db.sh >> /var/log/cargotrack-backup.log 2>&1"
( sudo -u "$APP_USER" crontab -l 2>/dev/null | grep -v 'backup-db.sh' ; echo "$CRON_LINE" ) | sudo -u "$APP_USER" crontab -
touch /var/log/cargotrack-backup.log
chown "$APP_USER:$APP_USER" /var/log/cargotrack-backup.log
ok "Backup cron (her gece 03:00)"

# Firewall
if command -v ufw &>/dev/null; then
  ufw --force allow OpenSSH > /dev/null
  ufw --force allow 'Nginx Full' > /dev/null
  ufw --force enable > /dev/null
  ok "UFW: SSH + nginx açık"
fi

# Final test
sleep 3
if curl -fsS http://localhost:3000/api/health > /dev/null; then
  ok "Backend health: 200 OK"
else
  warn "Backend health check başarısız — 'pm2 logs cargotrack' kontrol et"
fi

# ---- Sonuç ----
step "✓ KURULUM TAMAM"
cat <<EOM

${G}Backend çalışıyor: http://localhost:3000${N}

${Y}Şimdi yapman gerekenler:${N}

  1. DOMAİN — DNS A record sunucu IP'sine yönlendir
     (yourdomain.com → $(curl -s4 ifconfig.me))

  2. NGİNX — config'i kopyala + domain'i düzenle:
     sudo cp $APP_DIR/deploy/nginx.conf.example /etc/nginx/sites-available/cargotrack
     sudo nano /etc/nginx/sites-available/cargotrack   # server_name değiştir
     sudo ln -s /etc/nginx/sites-available/cargotrack /etc/nginx/sites-enabled/
     sudo rm /etc/nginx/sites-enabled/default 2>/dev/null
     sudo nginx -t && sudo systemctl reload nginx

  3. HTTPS — Let's Encrypt sertifikası:
     sudo certbot --nginx -d yourdomain.com

  4. TARAYICI — https://yourdomain.com aç, az önce oluşturduğun kullanıcıyla giriş yap

${G}İyi şanslar!${N}
EOM
