#!/usr/bin/env node
/**
 * Production secret üretici — kriptografik olarak güvenli rastgele değerler üretir.
 *
 *   node scripts/generate-secrets.js
 *
 * Çıktı: .env'e yapıştırılacak hazır blok.
 */
const crypto = require('crypto');

function randomBase64(bytes) {
  // URL-safe değil, ama .env değeri olarak güvenli (= ve / hariç)
  return crypto.randomBytes(bytes).toString('base64').replace(/[=+/]/g, '').slice(0, Math.floor(bytes * 1.33));
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function strongPassword(len = 24) {
  // Harf + rakam + güvenli sembol; başında harf olsun (bazı DB yöneticileri özel karakterle başlamaz)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%^&*_-+';
  const out = [];
  out.push(alphabet[crypto.randomInt(26)]); // başta büyük harf
  for (let i = 1; i < len - 2; i++) {
    const pool = alphabet + (i % 4 === 3 ? symbols : '');
    out.push(pool[crypto.randomInt(pool.length)]);
  }
  // Sonda mutlaka 1 sembol + 1 rakam
  out.push(symbols[crypto.randomInt(symbols.length)]);
  out.push(String(crypto.randomInt(10)));
  return out.join('');
}

const jwtSecret = randomHex(48);           // 96 hex karakter
const dbPassword = strongPassword(28);
const adminPassword = strongPassword(20);

const banner = '━'.repeat(70);

console.log(`
${banner}
  CargoTrack — Production Secrets
  ${new Date().toISOString()}
${banner}

Aşağıdaki değerleri .env.production dosyana yapıştır:

# ---- üretilen değerler ----
JWT_SECRET=${jwtSecret}
DB_PASSWORD=${dbPassword}
DEFAULT_ADMIN_PASSWORD=${adminPassword}
# ---------------------------

${banner}
  ⚠️  UYARI
${banner}

1) Bu çıktıyı 1Password / Bitwarden / vault gibi bir yere kaydet.
2) DB_PASSWORD'ü MySQL'de de güncellemen GEREKİR:
     ALTER USER 'cargotrack'@'%' IDENTIFIED BY '${dbPassword}';
     FLUSH PRIVILEGES;
3) DEFAULT_ADMIN_PASSWORD ilk admin için. İlk giriş sonrası zorla değiştirilecek.
4) Bu çıktıyı LOG'a yazma, ekran görüntüsü alma, gitto commit etme.

${banner}
`);
