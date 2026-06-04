#!/usr/bin/env node
/**
 * CargoTrack — İlk Süper Admin Setup
 *
 * Production'da DEFAULT_ADMIN_PASSWORD hardcode etmek yerine bu komut çalıştırılır:
 *   node scripts/setup-admin.js
 *
 * Komut interaktif:
 *   - Kullanıcı adı seçtirir (default: admin)
 *   - Tam isim + email
 *   - Şifre x2 (gizli, ekrana yansımaz)
 *   - Şifre kuvveti kontrol edilir, geçmezse tekrar sorar
 *
 * Şifre HİÇBİR dosyaya yazılmaz — sadece bcrypt hash olarak DB'de.
 *
 * Mevcut bir admin varsa hata verir (overwrite engeli).
 * Force etmek için: node scripts/setup-admin.js --force
 */

// .env'i yükle (production'da .env.production)
const path = require('path');
const fs = require('fs');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.join(__dirname, '..', envFile);
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');
const { validatePassword, passwordStrengthScore } = require('../src/helpers/password-strength');

const FORCE = process.argv.includes('--force');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};
const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

function prompt(question, defaultValue) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const q = defaultValue ? `${question} [${c('gray', defaultValue)}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/** Şifreyi gizli giriş ile sorar (terminalde görünmez) */
function promptPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(`${question}: `);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    let pwd = '';
    const onData = (ch) => {
      ch = String(ch);
      if (ch === '\n' || ch === '\r' || ch === '') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(pwd);
      } else if (ch === '') { // Ctrl+C
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write('\n');
        process.exit(0);
      } else if (ch === '' || ch === '\b') { // Backspace
        if (pwd.length > 0) {
          pwd = pwd.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        pwd += ch;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

function strengthBar(score) {
  const bars = ['', '▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰'];
  const colors = ['gray', 'red', 'yellow', 'cyan', 'green'];
  const labels = ['', 'Çok zayıf', 'Zayıf', 'Orta', 'Güçlü'];
  return `${c(colors[score], bars[score])} ${c(colors[score], labels[score])}`;
}

async function main() {
  console.log();
  console.log(c('bold', '━'.repeat(60)));
  console.log(c('bold', '  CargoTrack — İlk Süper Admin Oluştur'));
  console.log(c('bold', '━'.repeat(60)));
  console.log();

  // DB bağlantı
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error(c('red', '✗ DB bağlantı hatası:'), err.message);
    console.error(c('gray', '  .env dosyasındaki DB bilgilerini ve MySQL servisini kontrol et.'));
    process.exit(1);
  }

  // Mevcut admin var mı?
  const [existing] = await pool.execute(
    "SELECT id, username FROM users WHERE role = 'super_admin' LIMIT 1"
  );
  if (existing.length > 0 && !FORCE) {
    console.log(c('yellow', `⚠ Zaten bir süper admin var: ${c('bold', existing[0].username)}`));
    console.log(c('gray', '  Yenisini eklemek için: node scripts/setup-admin.js --force'));
    console.log(c('gray', "  Mevcut admin'in şifresini değiştirmek için frontend → Profil sayfası."));
    process.exit(0);
  }

  // Kullanıcı bilgileri
  console.log(c('cyan', '→ Süper admin kullanıcı bilgileri'));
  console.log();
  const username = await prompt('Kullanıcı adı', 'admin');
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    console.error(c('red', '✗ Kullanıcı adı geçersiz (3-50 karakter, harf/rakam/. _ -)'));
    process.exit(1);
  }

  // Kullanıcı adı çakışması (force durumunda yine engel)
  const [dup] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (dup.length > 0) {
    console.error(c('red', `✗ "${username}" zaten kayıtlı`));
    process.exit(1);
  }

  const fullName = await prompt('Tam isim', 'Sistem Yöneticisi');
  if (!fullName || fullName.length < 2) {
    console.error(c('red', '✗ Tam isim zorunlu (min 2 karakter)'));
    process.exit(1);
  }

  const email = await prompt('E-posta (opsiyonel)', '');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(c('red', '✗ E-posta geçersiz'));
    process.exit(1);
  }

  console.log();
  console.log(c('cyan', '→ Güçlü şifre belirle'));
  console.log(c('gray', '  Kurallar: min 12 char, büyük + küçük harf + rakam + sembol'));
  console.log(c('gray', '  (Yaygın şifreler ve "' + username + '" içermez)'));
  console.log();

  // Şifre x2 + doğrulama loop
  let password = '';
  while (true) {
    const pwd1 = await promptPassword('Şifre');
    if (!pwd1) {
      console.log(c('red', '  Şifre boş olamaz, tekrar dene'));
      continue;
    }

    const score = passwordStrengthScore(pwd1);
    console.log(`  Kuvvet: ${strengthBar(score)}`);

    const v = validatePassword(pwd1, { username });
    if (!v.ok) {
      console.log(c('red', '  Şifre kurallara uymuyor:'));
      for (const e of v.errors) console.log(c('red', `    - ${e}`));
      console.log();
      continue;
    }

    const pwd2 = await promptPassword('Tekrar gir');
    if (pwd1 !== pwd2) {
      console.log(c('red', '  Şifreler eşleşmedi, tekrar dene'));
      console.log();
      continue;
    }

    password = pwd1;
    break;
  }

  // Insert
  const hash = bcrypt.hashSync(password, 12); // production: 12 round (~250ms)
  await pool.execute(
    `INSERT INTO users (username, password, full_name, email, role, status, must_change_password)
     VALUES (?, ?, ?, ?, 'super_admin', 'active', 0)`,
    [username, hash, fullName, email || null]
  );

  console.log();
  console.log(c('green', '━'.repeat(60)));
  console.log(c('green', '  ✓ Süper admin oluşturuldu'));
  console.log(c('green', '━'.repeat(60)));
  console.log();
  console.log(`  Kullanıcı: ${c('bold', username)}`);
  console.log(`  Tam isim: ${fullName}`);
  if (email) console.log(`  E-posta:   ${email}`);
  console.log();
  console.log(c('cyan', '→ Şimdi frontend üzerinden giriş yapabilirsin.'));
  console.log(c('gray', '  Şifreni sadece sen biliyorsun (DB\'de bcrypt hash).'));
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error(c('red', '✗ Hata:'), err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
