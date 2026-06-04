/**
 * Şifre kuvvet kontrolü — production-grade güvenlik kuralları.
 *
 * Kurallar:
 *  - Minimum 12 karakter
 *  - En az 1 büyük harf, 1 küçük harf, 1 rakam, 1 sembol
 *  - Yaygın zayıf şifreler (blacklist) reddedilir
 *  - Kullanıcı adı şifrede geçemez (case-insensitive)
 *  - Aynı karakter 4+ kez ardışık olamaz (örn. "aaaa")
 *  - Sıralı pattern reddedilir (123456, abcdef, qwerty)
 */

// Yaygın zayıf şifreler (kısaltılmış liste — top kullanılan tahmin edilebilenler)
const BLACKLIST = new Set([
  'password', 'password123', 'password1', 'password!', 'passw0rd',
  'admin', 'admin123', 'admin1234', 'administrator', 'root', 'root123',
  '123456', '123456789', '12345678', '1234567890', '111111', '000000',
  'qwerty', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'welcome', 'welcome123', 'letmein', 'iloveyou', 'monkey', 'dragon',
  'cargotrack', 'cargotrack123', 'cargo', 'logistics',
  'sifre', 'sifre123', '123sifre', 'parola', 'parola123',
  // Türkiye'de yaygın
  '12345', 'abcdef', 'qwerty1', 'galatasaray', 'fenerbahce', 'besiktas',
  'istanbul', 'ankara', 'turkiye', 'turkey',
]);

// Klavye sıralı kontrolleri
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiopasdfghjklzxcvbnm',
  '0123456789',
];

/**
 * Şifre kuvvet kontrolü. Geçerse {ok: true} döner; aksi halde {ok: false, errors: [...]}.
 *
 * @param {string} password
 * @param {object} [opts]
 * @param {string} [opts.username] - şifrede geçmemesi gereken kullanıcı adı
 * @param {number} [opts.minLength=12]
 */
function validatePassword(password, opts = {}) {
  const minLength = opts.minLength || 12;
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { ok: false, errors: ['Şifre boş olamaz'] };
  }

  if (password.length < minLength) {
    errors.push(`En az ${minLength} karakter olmalı (şu an: ${password.length})`);
  }
  if (password.length > 128) {
    errors.push('En fazla 128 karakter olabilir');
  }

  if (!/[a-z]/.test(password)) errors.push('En az 1 küçük harf gerekli (a-z)');
  if (!/[A-Z]/.test(password)) errors.push('En az 1 BÜYÜK harf gerekli (A-Z)');
  if (!/[0-9]/.test(password)) errors.push('En az 1 rakam gerekli (0-9)');
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('En az 1 sembol gerekli (örn. !@#$%^&*)');

  const lower = password.toLowerCase();

  // Blacklist (tam eşleşme veya içerme)
  if (BLACKLIST.has(lower)) {
    errors.push('Çok yaygın bir şifre — tahmin edilmesi kolay');
  } else {
    for (const bad of BLACKLIST) {
      if (bad.length >= 6 && lower.includes(bad)) {
        errors.push(`Yaygın bir kelime içeriyor: "${bad}"`);
        break;
      }
    }
  }

  // Kullanıcı adı şifrede mi?
  if (opts.username && opts.username.length >= 3) {
    if (lower.includes(opts.username.toLowerCase())) {
      errors.push('Kullanıcı adınızı şifrede kullanmayın');
    }
  }

  // Ardışık aynı karakter (örn. "aaaa", "1111")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('4 veya daha fazla aynı karakter ardışık olamaz (örn. "aaaa")');
  }

  // Sıralı pattern (örn. "12345", "abcdef", "qwerty")
  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - 5; i++) {
      const part = seq.slice(i, i + 5);
      if (lower.includes(part) || lower.includes(part.split('').reverse().join(''))) {
        errors.push(`Sıralı karakter dizisi içeriyor: "${part}"`);
        return { ok: errors.length === 0, errors };
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 0-4 arası kabaca kuvvet skoru (görsel bar için).
 * 0 = çok zayıf, 4 = mükemmel
 */
function passwordStrengthScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(password)).length;
  if (types >= 3) score++;
  if (types === 4 && password.length >= 12) score++;
  // Blacklist'teyse 0
  if (BLACKLIST.has(password.toLowerCase())) return 0;
  return Math.min(4, score);
}

module.exports = { validatePassword, passwordStrengthScore };
