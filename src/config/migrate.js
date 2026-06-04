const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./database');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'db', 'schema.sql');

async function tableExists(name) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return rows[0].c > 0;
}

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows[0].c > 0;
}

/** Eksik kolonu ekle (varsa atla). MySQL 5.7+ uyumlu. */
async function ensureColumn(table, column, definition) {
  if (await columnExists(table, column)) return;
  console.log(`[migrate] ${table}.${column} ekleniyor...`);
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function runSchema() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

async function ensureDefaultAdmin() {
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM users');
  if (rows[0].c > 0) return;

  const isProd = process.env.NODE_ENV === 'production';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  // PRODUCTION'DA: DEFAULT_ADMIN_PASSWORD set edilmemişse admin oluşturma — kullanıcı 'setup-admin' komutunu kullanmalı
  if (isProd && !defaultPassword) {
    console.log('');
    console.log('━'.repeat(60));
    console.log('⚠️  İLK ADMIN OLUŞTURULMAMIŞ');
    console.log('━'.repeat(60));
    console.log('');
    console.log('Production modunda hiç kullanıcı yok ve DEFAULT_ADMIN_PASSWORD');
    console.log('env değişkeni de tanımlı değil.');
    console.log('');
    console.log('İnteraktif olarak güçlü şifreli süper admin oluşturmak için:');
    console.log('  node scripts/setup-admin.js');
    console.log('');
    console.log('━'.repeat(60));
    console.log('');
    return; // server başlamaya devam etsin ama login işe yaramaz
  }

  // Production'da zayıf şifre uyarısı
  if (isProd && defaultPassword) {
    const { validatePassword } = require('../helpers/password-strength');
    const v = validatePassword(defaultPassword, { username: 'admin' });
    if (!v.ok) {
      console.warn('⚠️  DEFAULT_ADMIN_PASSWORD zayıf — production için önerilmez:');
      for (const e of v.errors) console.warn(`   - ${e}`);
      console.warn('   Önerilen: scripts/generate-secrets.js veya scripts/setup-admin.js');
    }
  }

  // Default (admin123) ile fallback sadece development'ta
  const password = defaultPassword || 'admin123';
  const hash = bcrypt.hashSync(password, isProd ? 12 : 10);

  // must_change_password = 1 → ilk girişten sonra zorla değiştirme istenir
  await pool.execute(
    `INSERT INTO users (username, password, full_name, email, role, status, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ['admin', hash, 'Sistem Yöneticisi', 'admin@example.com', 'super_admin', 'active']
  );

  console.log(`[migrate] Varsayılan admin oluşturuldu — kullanıcı: admin, şifre: ${password}`);
  console.log('[migrate] ⚠️  İlk girişte şifre değiştirme zorunlu (must_change_password=1)');
}

async function migrate() {
  console.log('[migrate] Veritabanı kontrol ediliyor...');
  const usersExists = await tableExists('users');
  const shipmentsExists = await tableExists('shipments');

  if (!usersExists || !shipmentsExists) {
    console.log('[migrate] Tablolar eksik, schema.sql çalıştırılıyor...');
    await runSchema();
    console.log('[migrate] Şema oluşturuldu');
  } else {
    // Yine de IF NOT EXISTS olduğu için yeniden çalıştırmak güvenli (yeni tablolar/indexler eklenebilir)
    await runSchema();
  }

  // === Yeni kolonlar için additive migration'lar ===
  await ensureColumn('shipments', 'parties_data', 'JSON NULL AFTER `arrival_country`');
  await ensureColumn('users', 'permissions', 'JSON NULL AFTER `role`');
  await ensureColumn('users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `password`');

  await ensureDefaultAdmin();
  console.log('[migrate] Tamamlandı');
}

module.exports = { migrate };
