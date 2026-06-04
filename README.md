# CargoTrack v3.0

Bağımsız (Node.js + React + MySQL) **Lojistik Yönetim Sistemi**. WordPress eklentisinden sıfırdan port edildi.

- **Backend:** Node.js 18+ / Express / mysql2 / JWT auth
- **Frontend:** React 19 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query + Recharts
- **DB:** MySQL 8.x (UTF-8, InnoDB, FK ilişkili)

## Özellikler

- ✅ Sevkiyat yönetimi (Karayolu / Denizyolu / Havayolu / Depolama / İthalat / İhracat)
- ✅ Partner CRM (Müşteri / Gönderici / Alıcı / Acente — çoklu rol)
- ✅ Depo (CGI uyumlu R/S/T/U/V/Y/Z tipler)
- ✅ Araç yönetimi (mod-bazlı ekipman)
- ✅ Atama sistemi (araç ↔ sevkiyat, pessimistic lock ile overbooking koruması)
- ✅ Belge yönetimi (12 standart slot + özel slotlar, korumalı endpoint)
- ✅ Çoklu para birimi + kur tablosu
- ✅ BI Dashboard (8 özet kart, Recharts grafikleri, Excel export)
- ✅ JWT auth + role hierarchy (super_admin > admin > user)
- ✅ Dark mode, Ctrl+K command palette, code splitting, error boundary

## Hızlı Başlangıç (Lokal)

### Önkoşullar
- Node.js 18+
- MySQL 8.x (veya Docker)

### Backend
```bash
# 1. Bağımlılıklar
npm install

# 2. .env oluştur
cp .env.example .env
# DB credentials güncelle

# 3. MySQL veritabanı (yoksa)
mysql -u root -p -e "CREATE DATABASE cargotrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Başlat — şema otomatik oluşur, default admin eklenir
node app.js
# → http://localhost:3000
```

Varsayılan giriş: **admin / admin123** (production'da `DEFAULT_ADMIN_PASSWORD` env ile değiştirin)

### Frontend (Geliştirme)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 (Vite proxy /api → 3000)
```

İki terminal: backend (3000) + frontend dev (5173). Hot reload aktif.

### Frontend (Production Build)
```bash
cd frontend
npm run build
# Çıktı: ../public/ → Express otomatik servis eder
```

Build sonrası tek port (3000) yeterli — backend hem API hem statik servis verir.

### Docker MySQL (alternatif)
```bash
docker run -d --name cargotrack-mysql \
  -e MYSQL_ROOT_PASSWORD=cargotrack \
  -e MYSQL_DATABASE=cargotrack \
  -p 3306:3306 \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```
`.env` → `DB_PASSWORD=cargotrack`

## Proje Yapısı

```
cargotrack/
├── app.js                  Express server
├── package.json            Backend deps
├── .env                    DB credentials, JWT secret
├── db/schema.sql           Konsolide şema (FK + index)
├── src/                    Backend
│   ├── config/             DB pool + migrate
│   ├── middleware/         JWT auth
│   ├── helpers/            Yardımcılar
│   └── routes/             REST API (11 modül)
├── frontend/               Frontend kaynağı (React + TS)
│   ├── package.json
│   ├── vite.config.ts      Proxy /api → :3000
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx         Router + lazy loading
│       ├── lib/            API client + utils
│       ├── stores/         Zustand (auth, theme)
│       ├── components/
│       │   ├── ui/         shadcn (button, input, table, dialog, ...)
│       │   ├── shared/     Combobox
│       │   ├── layout/     AppShell, Sidebar, Topbar
│       │   ├── ProtectedRoute, ErrorBoundary, CommandPalette
│       ├── features/       Sayfa modülleri (her biri kendi bundle'ında)
│       └── types/          TypeScript tipleri
├── public/                 Build çıktısı (Vite üretir, Express servis)
└── uploads/                Belge dosyaları (web-accessible DEĞİL)
```

## Geliştirme İpuçları

- **Ctrl+K** — Hızlı gezinme/komut paleti (her sayfada çalışır)
- **Tema değiştir** — Sağ üst güneş/ay ikonu (localStorage'a kaydedilir)
- **Çalışan yeni route eklemek** — `App.tsx`'e lazy import + sidebar'a item
- **TypeScript tipleri** — `frontend/src/types/api.ts` (backend response'larıyla bire bir)

## REST API Özeti

Tüm endpoint'ler `Authorization: Bearer <jwt>` gerektirir (login hariç).

```
POST   /api/auth/login              { username, password } → { token, user }
POST   /api/auth/logout
POST   /api/auth/change-password    { current_password, new_password }
GET    /api/auth/me

GET    /api/shipments?transport_type=road
GET    /api/shipments/:id
POST   /api/shipments               (id varsa update, yoksa create)
DELETE /api/shipments/:id?expected_transport_type=road

GET    /api/partners?type=customer
POST   /api/partners
DELETE /api/partners/:id

GET    /api/warehouses
POST   /api/warehouses
DELETE /api/warehouses/:id

GET    /api/vehicles?transport_type=road
POST   /api/vehicles
DELETE /api/vehicles/:id

GET    /api/assignments?vehicle_id=X&shipment_id=Y
POST   /api/assignments
DELETE /api/assignments/:id

POST   /api/documents/upload         (multipart: shipment_id, doc_key, file)
GET    /api/documents/:shipmentId/:docKey   (binary download)
DELETE /api/documents/:shipmentId/:docKey

POST   /api/statistics               { date_from, date_to, transport_type?, currency? }
POST   /api/statistics/export-excel  (binary xls)

GET    /api/users                    (super_admin)
POST   /api/users
DELETE /api/users/:id

GET    /api/exchange-rates
POST   /api/exchange-rates           (admin+)
DELETE /api/exchange-rates/:id       (admin+)
```

## Alastyr cPanel Deployment

### Hazırlık (lokal makinede)
```bash
# 1. Frontend build
cd frontend && npm run build
# → ../public/ dolar

# 2. Backend için sadece gerekli dosyalar
# Yüklenecek: app.js, src/, db/, public/, package.json, .env
# Yüklenmeyecek: frontend/, node_modules/, scripts/, cargotrack.php, uploads/
```

### Alastyr cPanel'de
1. **MySQL veritabanı oluştur** — cPanel → MySQL Databases → `cargotrack` + kullanıcı + tam yetki
2. **Dosyaları yükle** — File Manager veya FTP ile `~/cargotrack/` (örnek)
3. **`.env`** dosyasını oluştur — DB credentials + güçlü `JWT_SECRET`
4. **Node.js uygulamasını yapılandır** — cPanel → Setup Node.js App → Create:
   - Node.js version: **20.x**
   - Application mode: **Production**
   - Application root: `cargotrack`
   - Application URL: alan adın
   - Application startup file: `app.js`
5. **NPM Install** butonuna bas → bittiğinde **Start App**
6. **SSL** — cPanel → SSL/TLS Status → Run AutoSSL (Let's Encrypt)
7. Alan adına git → CargoTrack login ekranı → **admin/admin123** → ilk iş şifre değiştir!

### Frontend güncelleme
Sadece UI'da değişiklik yapıldıysa:
1. Lokalde `cd frontend && npm run build`
2. `public/` klasörünü FTP ile upload et (üzerine yaz)
3. Backend restart **gerekmez** — Express dinamik servis eder

### Backend güncelleme
1. `src/`, `app.js`, `db/`, `package.json` değişikliklerini upload
2. cPanel Node.js App → Restart
3. Migration: schema değişti ise `node app.js` ilk açılışta otomatik tablo oluşturur

## Güvenlik Notları

- `JWT_SECRET` production'da en az 64 karakter (`openssl rand -hex 32`)
- `DEFAULT_ADMIN_PASSWORD` ilk login'den sonra değiştirin, .env'den silin
- `uploads/` web-accessible **değil** — sadece `/api/documents/...` üzerinden
- CORS şimdilik tüm origin'lere açık — production'da daraltın: `cors({ origin: 'https://alan-adim.com' })`
- Login rate-limit eklemeyi düşün (brute-force koruması)
- HTTPS zorunlu (Let's Encrypt cPanel'de hazır)

## Önemli Tasarım Kararları

| Konu | Karar | Neden |
|------|-------|-------|
| Auth | JWT (stateless) | Cluster-friendly, mobile-ready |
| Atama overbooking | `SELECT ... FOR UPDATE` | Race condition önler |
| Silme (partner/depo) | RESTRICT | Orphan veri yok |
| Silme (sevkiyat) | CASCADE atamalar | Atomik temizlik |
| Para birimi | exchange_rates tablosu | Çapraz para karşılaştırma |
| Belge erişimi | JWT-protected endpoint | URL paylaşımı engellenir |
| Frontend bundle | Code splitting | Sayfa-bazlı lazy load |

## Bilinen Kısıtlamalar

- Login için rate-limit yok (eklenmeli)
- Şifre sıfırlama (forgot password) yok — e-posta servisi gerekir
- Audit log yok (kim ne zaman ne değiştirdi)
- Multi-tenant değil (tek şirket varsayımı)

## Lisans

Proprietary — Webreta Web Teknolojileri © 2026
