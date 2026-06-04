# CargoTrack — Production Deployment Guide

Bu doküman temiz bir Linux sunucusunda CargoTrack'i sıfırdan kurar.

Test edildi: **Ubuntu 22.04 LTS** / **Debian 12**

---

## 0. Ön Gereksinimler

```bash
# Sistem güncelle
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# nginx + certbot (HTTPS)
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2 (global)
sudo npm install -g pm2

# Git
sudo apt install -y git
```

---

## 1. Kullanıcı + Dizin

```bash
# Sistem kullanıcısı
sudo useradd -r -s /bin/bash -m -d /opt/cargotrack cargotrack

# Repo klonla
sudo -u cargotrack git clone <REPO_URL> /opt/cargotrack
cd /opt/cargotrack
```

---

## 2. MySQL — DB + Kullanıcı

```bash
sudo mysql
```

```sql
CREATE DATABASE cargotrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Aşağıdaki ŞIFREYI scripts/generate-secrets.js çıktısındaki DB_PASSWORD ile değiştir
CREATE USER 'cargotrack'@'localhost' IDENTIFIED BY 'GENERATED_DB_PASSWORD';
GRANT ALL PRIVILEGES ON cargotrack.* TO 'cargotrack'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Secrets üret

```bash
cd /opt/cargotrack
sudo -u cargotrack node scripts/generate-secrets.js
```

Çıktıdaki **JWT_SECRET ve DB_PASSWORD** değerlerini güvenli bir yere kaydet
(1Password / Bitwarden gibi). **DB_PASSWORD'ü MySQL'de de aynısıyla güncelle (yukarıdaki adımda).**

> **Not**: `DEFAULT_ADMIN_PASSWORD` çıktısını kullanmayacağız — bunun yerine 7.1 adımında
> interaktif olarak süper admin oluşturacağız (şifre hiç dosyaya yazılmaz, sadece DB'de hash).

---

## 4. .env.production

```bash
sudo -u cargotrack cp .env.example .env.production
sudo -u cargotrack nano .env.production
```

Düzenle:

```env
NODE_ENV=production
DB_HOST=127.0.0.1
DB_USER=cargotrack
DB_PASSWORD=<GENERATED_DB_PASSWORD>
DB_NAME=cargotrack
DB_PORT=3306

JWT_SECRET=<GENERATED_JWT_SECRET>
JWT_EXPIRES_IN=8h

PORT=3000
UPLOAD_DIR=./uploads
# DEFAULT_ADMIN_PASSWORD'ü BOŞ bırak — 7.1 adımında setup-admin.js ile oluşturacağız
DEFAULT_ADMIN_PASSWORD=

# Frontend domain'ini buraya yaz
CORS_ORIGINS=https://cargotrack.example.com

TRUST_PROXY=1
FORCE_HTTPS=true
```

Yetki:
```bash
sudo chmod 600 /opt/cargotrack/.env.production
sudo chown cargotrack:cargotrack /opt/cargotrack/.env.production
```

---

## 5. Backend bağımlılıkları

```bash
cd /opt/cargotrack
sudo -u cargotrack npm install --omit=dev
```

Test:
```bash
sudo -u cargotrack NODE_ENV=production node app.js
# "[db] Bağlantı başarılı" + "[cargotrack] http://localhost:3000" görmelisiniz
# Ctrl+C ile kapat
```

---

## 6. Frontend build

```bash
cd /opt/cargotrack/frontend
sudo -u cargotrack npm install
sudo -u cargotrack npm run build
# Çıktı: /opt/cargotrack/public altına
```

---

## 7.1. ⭐ İlk Süper Admin (interaktif)

PM2 başlatmadan önce ilk süper admin'i oluştur. Bu komut interaktif olarak:
- Kullanıcı adı (default `admin`, değiştirebilirsin — örn. `mehmet.yilmaz`)
- Tam isim + email
- Şifre x2 (gizli giriş, ekrana yansımaz)
- Şifre kuvvetini kontrol eder (min 12 char, harf + rakam + sembol, yaygın şifreleri reddeder)

```bash
cd /opt/cargotrack
sudo -u cargotrack NODE_ENV=production node scripts/setup-admin.js
```

**Çıktı örneği:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CargoTrack — İlk Süper Admin Oluştur
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Süper admin kullanıcı bilgileri

Kullanıcı adı [admin]: mehmet.yilmaz
Tam isim [Sistem Yöneticisi]: Mehmet Yılmaz
E-posta (opsiyonel): mehmet@firma.com

→ Güçlü şifre belirle
  Kurallar: min 12 char, büyük + küçük harf + rakam + sembol
  (Yaygın şifreler ve "mehmet.yilmaz" içermez)

Şifre: ************
  Kuvvet: ▰▰▰▰ Güçlü
Tekrar gir: ************

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Süper admin oluşturuldu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **Şifreni unutursan**: bu komutu `--force` ile çalıştırabilirsin (yeni admin ekler),
> sonra eski admin'i frontend'den silersin.

---

## 7.2. PM2 ile backend başlat

```bash
cd /opt/cargotrack
sudo -u cargotrack pm2 start ecosystem.config.js --env production
sudo -u cargotrack pm2 save

# Sunucu boot'unda otomatik başlasın
sudo pm2 startup systemd -u cargotrack --hp /opt/cargotrack
# (komutun verdiği komutu kopyala-çalıştır)
```

Log rotation:
```bash
sudo -u cargotrack pm2 install pm2-logrotate
sudo -u cargotrack pm2 set pm2-logrotate:max_size 50M
sudo -u cargotrack pm2 set pm2-logrotate:retain 14
sudo -u cargotrack pm2 set pm2-logrotate:compress true
```

Doğrula:
```bash
sudo -u cargotrack pm2 status
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## 8. nginx + HTTPS

```bash
# Config'i kopyala
sudo cp /opt/cargotrack/deploy/nginx.conf.example /etc/nginx/sites-available/cargotrack

# server_name'yi düzenle
sudo nano /etc/nginx/sites-available/cargotrack
# cargotrack.example.com → senin domain'in

# Symlink
sudo ln -s /etc/nginx/sites-available/cargotrack /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # default'u kaldır

# Test + reload
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS (Let's Encrypt):
```bash
sudo certbot --nginx -d cargotrack.example.com -d www.cargotrack.example.com
# certbot config'i otomatik günceller ve HTTPS yapar
```

Otomatik yenileme (zaten kuruludur):
```bash
sudo systemctl status certbot.timer
```

---

## 9. DB Backup cron

```bash
sudo chmod +x /opt/cargotrack/scripts/backup-db.sh /opt/cargotrack/scripts/restore-db.sh

# cargotrack kullanıcısı için cron — her gece 03:00
sudo crontab -u cargotrack -e
```

Ekle:
```cron
0 3 * * * /opt/cargotrack/scripts/backup-db.sh >> /var/log/cargotrack-backup.log 2>&1
```

Log dosyasını oluştur:
```bash
sudo touch /var/log/cargotrack-backup.log
sudo chown cargotrack:cargotrack /var/log/cargotrack-backup.log
```

Manuel test:
```bash
sudo -u cargotrack /opt/cargotrack/scripts/backup-db.sh
ls -lh /opt/cargotrack/backups/
```

---

## 10. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80 + 443
# MySQL doğrudan dışarıya açma! (127.0.0.1'de bind, default)
sudo ufw enable
sudo ufw status
```

---

## 11. İlk Giriş + Güvenlik

1. **Tarayıcıdan açın**: `https://cargotrack.example.com`
2. **Giriş**: 7.1'de oluşturduğun kullanıcı adı + şifre
3. **Test bir sevkiyat oluşturup silmeyi/güncellemeyi deneyin**
4. **Audit Log'u kontrol edin** — kayıtlar tutuluyor mu

---

## 12. Güncellemeler

```bash
cd /opt/cargotrack

# Pull
sudo -u cargotrack git pull

# Backend deps + frontend rebuild
sudo -u cargotrack npm install --omit=dev
cd frontend && sudo -u cargotrack npm install && sudo -u cargotrack npm run build
cd ..

# Zero-downtime reload (cluster mode'da)
sudo -u cargotrack pm2 reload cargotrack
```

---

## 13. Restore (felaket durumunda)

```bash
cd /opt/cargotrack
sudo -u cargotrack ./scripts/restore-db.sh backups/cargotrack_2026-06-15_030000.sql.gz
# Onay sorusuna "evet" yaz
```

---

## 14. İzleme & Sağlık

| Komut | Ne yapar |
|---|---|
| `pm2 status` | Backend durumu |
| `pm2 logs cargotrack` | Canlı log |
| `pm2 monit` | İnteraktif izleme |
| `sudo systemctl status nginx` | nginx durumu |
| `sudo tail -f /var/log/nginx/cargotrack.access.log` | nginx erişim log'u |
| `sudo tail -f /var/log/nginx/cargotrack.error.log` | nginx hata log'u |
| `tail -f /var/log/cargotrack-backup.log` | DB backup log'u |
| `curl https://cargotrack.example.com/api/health` | Health check |

---

## 15. Sorun Giderme

**Backend başlamıyor:**
```bash
sudo -u cargotrack pm2 logs cargotrack --lines 50
# DB bağlantı hatası → .env.production DB_PASSWORD MySQL ile uyumlu mu?
# JWT_SECRET boş mu? → generate-secrets.js'i yeniden çalıştır
```

**Frontend yüklenmez ama API çalışıyor:**
```bash
ls -la /opt/cargotrack/public/
# Boş ise: cd /opt/cargotrack/frontend && npm run build
```

**HTTPS sertifikası süresi dolarsa:**
```bash
sudo certbot renew --dry-run
```

**MySQL "too many connections":**
```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf içinde:
# max_connections = 200
sudo systemctl restart mysql
```

**Disk dolarsa:**
```bash
# Backup'lar disk yiyor mu?
du -sh /opt/cargotrack/backups
# PM2 log'ları?
du -sh /opt/cargotrack/logs
# pm2-logrotate kurulu mu?
pm2 conf | grep logrotate
```

---

## 16. Çıkış Listesi (Deploy Sonrası Kontrol)

- [ ] `https://yourdomain.com` HTTPS ile açılıyor
- [ ] `http://yourdomain.com` otomatik HTTPS'e yönleniyor
- [ ] Login yapabiliyorum + zorla şifre değiştirme tetiklendi
- [ ] Şifre değiştirdikten sonra normal kullanım açıldı
- [ ] Sevkiyat oluşturup-silebiliyorum
- [ ] PDF (file-cover, proforma) indirilebiliyor
- [ ] Audit Log kayıtları görünüyor
- [ ] `pm2 status` "online" gösteriyor
- [ ] `pm2 logs` hata yok
- [ ] `/api/health` 200 dönüyor
- [ ] Manuel backup test edildi (`scripts/backup-db.sh`)
- [ ] Cron yedeklemesi planlandı
- [ ] Sertifika otomatik yenileme aktif (`systemctl status certbot.timer`)

İyi şanslar! 🚀
