// Önce ortama özel .env dosyasını yükle (NODE_ENV=production → .env.production)
// Sonra fallback olarak .env. Böylece dev/prod ayrımı temiz olur.
const path = require('path');
const fs = require('fs');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
if (fs.existsSync(path.join(__dirname, envFile))) {
  require('dotenv').config({ path: path.join(__dirname, envFile) });
} else {
  require('dotenv').config(); // varsayılan .env
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { migrate } = require('./src/config/migrate');
const { ping } = require('./src/config/database');

const IS_PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
const FORCE_HTTPS = process.env.FORCE_HTTPS === 'true';

const app = express();

// ---------- Reverse proxy arkasındaysak (nginx vb.) X-Forwarded-* header'larına güven ----------
if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// ---------- HTTPS yönlendirme (production + proxy ardında) ----------
// /api/health bypass edilebilir (loadbalancer health check için)
if (IS_PROD && FORCE_HTTPS) {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // POST/PUT'larda redirect kayıp olur — 403 ver, frontend HTTPS'e çevirsin
      return res.status(403).json({ success: false, data: { message: 'HTTPS gereklidir' } });
    }
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

// ---------- Güvenlik header'ları ----------
// CSP'yi dinamik açıyoruz; Vite bundle bazı inline script kullanır, prod build'te de gerekli olabilir.
app.use(helmet({
  contentSecurityPolicy: false, // SPA + dinamik content için kapalı; production'da reverse proxy CSP eklemeli
  crossOriginEmbedderPolicy: false, // PDF preview iframe için
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // PDF/img download için
}));

// ---------- CORS ----------
// Production: sadece CORS_ORIGINS env'inde belirtilen origin'ler (virgülle ayır)
// Development: tüm origin'ler (Vite dev server'dan API çağrısı için)
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (IS_PROD && corsOrigins.length > 0) {
  app.use(cors({
    origin: (origin, cb) => {
      // Same-origin (browser request from server's own domain) → origin undefined → allow
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} izinli değil`));
    },
    credentials: true,
  }));
} else if (IS_PROD) {
  // Production'da CORS_ORIGINS boş → same-origin only (varsayılan)
  // (cors middleware'sini hiç eklemiyoruz, browser zaten same-origin'i sorunsuz geçirir)
} else {
  // Development: her şeye açık
  app.use(cors());
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ---------- Health check (loadbalancer için, auth gerektirmez) ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ---------- Statik dosyalar ----------
// public/ → herkese açık (HTML, CSS, JS, görseller)
app.use(express.static(path.join(__dirname, 'public')));

// uploads/ → KORUMA: doğrudan servis edilmez, yalnızca /api/documents/:id üzerinden
// (web-accessible olmaması güvenlik için kritik)

// ---------- API Routes ----------
app.use('/api/auth', require('./src/routes/auth'));

// Diğer route'lar — modüller eklendikçe açılacak (Faz 3-5)
const routeRegistry = [
  { path: '/api/shipments', file: './src/routes/shipments' },
  { path: '/api/partners', file: './src/routes/partners' },
  { path: '/api/warehouses', file: './src/routes/warehouses' },
  { path: '/api/vehicles', file: './src/routes/vehicles' },
  { path: '/api/assignments', file: './src/routes/assignments' },
  { path: '/api/users', file: './src/routes/users' },
  { path: '/api/statistics', file: './src/routes/statistics' },
  { path: '/api/documents', file: './src/routes/documents' },
  { path: '/api/audit', file: './src/routes/audit' },
  { path: '/api/storage-orders', file: './src/routes/storage-orders' },
  { path: '/api/pdf', file: './src/routes/pdf' },
  { path: '/api/lookup', file: './src/routes/lookup' },
  { path: '/api/notifications', file: './src/routes/notifications' },
  { path: '/api/reports', file: './src/routes/reports' },
  { path: '/api/archive', file: './src/routes/archive' }
];

for (const r of routeRegistry) {
  const fullPath = path.join(__dirname, r.file + '.js');
  if (fs.existsSync(fullPath)) {
    app.use(r.path, require(r.file));
  }
}

// ---------- SPA fallback ----------
// /api/* dışındaki tüm istekleri index.html'e yönlendir (frontend router için)
app.get(/^(?!\/api).*/, (req, res, next) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// ---------- 404 + Error ----------
app.use((req, res) => {
  res.status(404).json({ success: false, data: { message: 'Bulunamadı' } });
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  // CORS error → 403
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, data: { message: err.message } });
  }
  // Production'da stack trace açığa vurma
  const payload = { success: false, data: { message: 'Sunucu hatası' } };
  if (!IS_PROD) {
    payload.data.detail = err.message;
    payload.data.stack = err.stack;
  }
  res.status(500).json(payload);
});

// ---------- Graceful shutdown (PM2 SIGTERM için) ----------
function shutdown(signal) {
  console.log(`[shutdown] ${signal} alındı, kapanılıyor...`);
  server.close(() => {
    console.log('[shutdown] HTTP server kapandı');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    console.error('[shutdown] Zorla kapatılıyor (10s timeout)');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------- Başlat ----------
const PORT = parseInt(process.env.PORT || '3000', 10);
let server;

(async () => {
  try {
    await ping();
    console.log('[db] Bağlantı başarılı');
    await migrate();
    server = app.listen(PORT, () => {
      const proto = (IS_PROD && FORCE_HTTPS) ? 'https' : 'http';
      console.log(`[cargotrack] ${proto}://localhost:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('[fatal] Başlatılamadı:', err.message || err.code || err);
    console.error(err.stack);
    process.exit(1);
  }
})();
