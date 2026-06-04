/**
 * Frontend Extraction Script
 *
 * cargotrack.php'den HTML/CSS/JS'i çıkartıp 3 dosyaya yazar:
 *  - public/index.html  (login + ana SPA + modallar)
 *  - public/css/app.css (tüm <style> blokları)
 *  - public/js/app.js   (tüm <script> blokları, AJAX → REST API'ye dönüştürülmüş)
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'cargotrack.php');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');
const JS_DIR = path.join(PUBLIC_DIR, 'js');

for (const d of [PUBLIC_DIR, CSS_DIR, JS_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n');
function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

// =====================================================================
// 1) CSS
// =====================================================================
function extractCss() {
  let chunk = slice(4261, 6828);
  chunk = chunk.replace(/^\s*<style>\s*/, '').replace(/\s*<\/style>\s*$/, '');
  chunk = chunk.replace(/<\?php[\s\S]*?\?>/g, '');
  return chunk.trim();
}

// =====================================================================
// 2) AJAX HELPER (head of js file)
// =====================================================================

const AJAX_MAP = {
  cargotrack_login:            { method: 'POST',   path: '/api/auth/login' },
  cargotrack_logout:           { method: 'POST',   path: '/api/auth/logout' },

  cargotrack_save_shipment:    { method: 'POST',   path: '/api/shipments',     unwrap: 'shipment' },
  cargotrack_get_shipment:     { method: 'GET',    path: '/api/shipments/:id' },
  cargotrack_get_shipments:    { method: 'GET',    path: '/api/shipments' },
  cargotrack_delete_shipment:  { method: 'DELETE', path: '/api/shipments/:id' },

  cargotrack_get_users:        { method: 'GET',    path: '/api/users' },
  cargotrack_save_user:        { method: 'POST',   path: '/api/users' },
  cargotrack_delete_user:      { method: 'DELETE', path: '/api/users/:user_id' },

  cargotrack_get_partners:     { method: 'GET',    path: '/api/partners' },
  cargotrack_save_partner:     { method: 'POST',   path: '/api/partners' },
  cargotrack_delete_partner:   { method: 'DELETE', path: '/api/partners/:partner_id' },

  cargotrack_get_warehouses:   { method: 'GET',    path: '/api/warehouses' },
  cargotrack_save_warehouse:   { method: 'POST',   path: '/api/warehouses' },
  cargotrack_delete_warehouse: { method: 'DELETE', path: '/api/warehouses/:warehouse_id' },

  cargotrack_get_vehicles:     { method: 'GET',    path: '/api/vehicles' },
  cargotrack_save_vehicle:     { method: 'POST',   path: '/api/vehicles' },
  cargotrack_delete_vehicle:   { method: 'DELETE', path: '/api/vehicles/:vehicle_id' },

  cargotrack_get_assignments:  { method: 'GET',    path: '/api/assignments' },
  cargotrack_save_assignment:  { method: 'POST',   path: '/api/assignments' },
  cargotrack_delete_assignment:{ method: 'DELETE', path: '/api/assignments/:assignment_id' },

  cargotrack_get_statistics:   { method: 'POST',   path: '/api/statistics' },
  cargotrack_export_stats_excel:{method: 'POST',   path: '/api/statistics/export-excel' },

  cargotrack_upload_document:  { method: 'POST',   path: '/api/documents/upload' },
  cargotrack_delete_document:  { method: 'DELETE', path: '/api/documents/:shipment_id/:doc_key' }
};

const AJAX_HELPER = `
// =================================================================
// AJAX HELPER — WordPress wp_ajax_* → REST API + JWT
// =================================================================
window.__CT_AJAX_MAP = ${JSON.stringify(AJAX_MAP)};

function ctGetToken() { return localStorage.getItem('ct_token') || ''; }
function ctSetToken(t) { localStorage.setItem('ct_token', t); }
function ctClearToken() { localStorage.removeItem('ct_token'); localStorage.removeItem('ct_user'); }
function ctGetUser() {
  try { return JSON.parse(localStorage.getItem('ct_user') || 'null'); }
  catch (e) { return null; }
}
function ctSetUser(u) { localStorage.setItem('ct_user', JSON.stringify(u)); }

/**
 * FormData veya plain obj → REST request
 */
async function ctAjaxCall(formData) {
  let action = '';
  let body = {};
  let fileField = null;
  const isFD = (typeof FormData !== 'undefined') && (formData instanceof FormData);

  if (isFD) {
    action = formData.get('action');
    for (const [k, v] of formData.entries()) {
      if (k === 'action') continue;
      if (v instanceof File || v instanceof Blob) {
        fileField = { name: k, value: v };
      } else if (k.endsWith('[]')) {
        const base = k.slice(0, -2);
        if (!Array.isArray(body[base])) body[base] = [];
        body[base].push(v);
      } else if (k.includes('[')) {
        const m = k.match(/^([^\\[]+)\\[([^\\]]+)\\]$/);
        if (m) {
          if (!body[m[1]]) body[m[1]] = {};
          body[m[1]][m[2]] = v;
        } else {
          body[k] = v;
        }
      } else {
        body[k] = v;
      }
    }
  } else if (formData && typeof formData === 'object') {
    action = formData.action;
    body = { ...formData };
    delete body.action;
  }

  const route = window.__CT_AJAX_MAP[action];
  if (!route) {
    throw new Error('Bilinmeyen AJAX action: ' + action);
  }

  // unwrap (örn shipment nested → top-level)
  if (route.unwrap && body[route.unwrap] && typeof body[route.unwrap] === 'object') {
    body = { ...body[route.unwrap] };
  }

  // Path parametrelerini doldur
  let url = route.path;
  url = url.replace(/:([a-zA-Z_]+)/g, (m, name) => {
    const v = body[name] != null ? body[name] : '';
    return encodeURIComponent(v);
  });
  // shipment_id alias 'id' fallback
  if (url.includes('//')) {
    url = url.replace('//', '/' + encodeURIComponent(body.id || '') + '/');
  }

  const headers = {};
  const token = ctGetToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let fetchOpts = { method: route.method, headers };

  if (route.method === 'GET' || route.method === 'DELETE') {
    const qs = new URLSearchParams();
    for (const k of Object.keys(body)) {
      if (body[k] !== undefined && body[k] !== null && body[k] !== '') qs.append(k, body[k]);
    }
    const q = qs.toString();
    if (q) url += '?' + q;
  } else if (fileField) {
    const fd = new FormData();
    for (const k of Object.keys(body)) fd.append(k, body[k]);
    fd.append(fileField.name, fileField.value);
    fetchOpts.body = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }

  return await fetch(url, fetchOpts);
}

/**
 * fetch() override — orijinal kod fetch(ajaxUrl, { body: fd }) yapıyor.
 * Body bir FormData ise ve action field içeriyorsa, REST'e yönlendir.
 */
(function() {
  const _origFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    const body = init && init.body;
    const isFD = body instanceof FormData;
    const action = isFD ? body.get('action') : null;
    if (action && window.__CT_AJAX_MAP[action]) {
      try {
        const resp = await ctAjaxCall(body);

        // Login başarılıysa token + user kaydet
        if (action === 'cargotrack_login' && resp.ok) {
          const cloned = resp.clone();
          try {
            const d = await cloned.json();
            if (d.success && d.data && d.data.token) {
              ctSetToken(d.data.token);
              ctSetUser(d.data.user);
            }
          } catch (e) {}
        }
        if (action === 'cargotrack_logout') {
          ctClearToken();
        }
        if (resp.status === 401) {
          ctClearToken();
          // sayfayı login'e çevir
          if (typeof ctShowLogin === 'function') ctShowLogin();
        }
        return resp;
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          data: { message: err.message }
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return _origFetch(input, init);
  };
})();

// =================================================================
// VIEW TOGGLE — login vs main app (WP session reload yerine JWT)
// =================================================================
function ctShowLogin() {
  const login = document.getElementById('ct-view-login');
  const main = document.getElementById('ct-view-main');
  if (login) login.style.display = '';
  if (main) main.style.display = 'none';
}
function ctShowMain() {
  const login = document.getElementById('ct-view-login');
  const main = document.getElementById('ct-view-main');
  if (login) login.style.display = 'none';
  if (main) main.style.display = '';
  const u = ctGetUser();
  if (u) {
    document.querySelectorAll('#ct-user-name').forEach(el => el.textContent = u.full_name || '');
    document.querySelectorAll('#ct-user-username').forEach(el => el.textContent = u.username || '');
    document.querySelectorAll('#ct-user-role').forEach(el => el.textContent = u.role || '');
  }
}
function ctInitView() {
  if (ctGetToken()) ctShowMain();
  else ctShowLogin();
}

// location.reload() çağrılarını intercept et — JWT mode'da reload yerine view toggle
const _origReload = window.location.reload.bind(window.location);
window.__ctReload = function() {
  if (ctGetToken()) ctShowMain();
  else ctShowLogin();
};

document.addEventListener('DOMContentLoaded', ctInitView);
`;

// =====================================================================
// 3) JS — ana script bloğu (satır 6830-12920)
// =====================================================================
function extractJs() {
  let chunk = slice(6830, 12920);
  chunk = chunk.replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
  // PHP bloklarını boşalt (çevreleyen JS string quote'ları zaten yerinde olduğu için boş string OK)
  chunk = chunk.replace(/<\?php[\s\S]*?\?>/g, '');
  // location.reload() çağrılarını __ctReload() ile değiştir (JWT mode'da sayfa yenilemeye gerek yok)
  chunk = chunk.replace(/location\.reload\(\)/g, 'window.__ctReload()');
  return chunk;
}

// =====================================================================
// 4) HTML — login + main + modallar
// =====================================================================
function extractHtml() {
  let html = slice(2691, 4260);
  // PHP if/else/endif → HTML wrapper'lara dönüştür
  html = html.replace(
    /<\?php\s+if\s*\(!\$logged_in\):\s*\?>/g,
    '<div id="ct-view-login" style="display:none">'
  );
  html = html.replace(
    /<\?php\s+else:\s*\?>/g,
    '</div><div id="ct-view-main" style="display:none">'
  );
  html = html.replace(
    /<\?php\s+endif;\s*\?>/g,
    '</div>'
  );
  // User echo'ları
  html = html.replace(/<\?php\s+echo\s+esc_html\(\$user\['full_name'\]\);\s*\?>/g, '<span id="ct-user-name"></span>');
  html = html.replace(/<\?php\s+echo\s+esc_html\(\$user\['username'\]\);\s*\?>/g, '<span id="ct-user-username"></span>');
  html = html.replace(/<\?php\s+echo\s+esc_html\(\$user\['role'\]\);\s*\?>/g, '<span id="ct-user-role"></span>');
  html = html.replace(/<\?php[\s\S]*?\?>/g, '');

  // 4 modal fonksiyonu - sadece içlerindeki HTML/script
  const modalRanges = [
    [2232, 2384, 'partner'],
    [2385, 2481, 'warehouse'],
    [2482, 2608, 'vehicle'],
    [2609, 2682, 'assignment']
  ];
  let modals = '';
  for (const [start, end, name] of modalRanges) {
    let m = slice(start, end);
    // PHP fonksiyonlarında HTML, ilk `?>` ile son `<?php` arasındaki kısımdadır
    const firstOpenIdx = m.indexOf('?>');
    const lastCloseIdx = m.lastIndexOf('<?php');
    if (firstOpenIdx !== -1 && lastCloseIdx !== -1 && lastCloseIdx > firstOpenIdx) {
      m = m.substring(firstOpenIdx + 2, lastCloseIdx);
    }
    // Ortada kalan php blokları (içeride heredoc gibi)
    m = m.replace(/<\?php[\s\S]*?\?>/g, '');
    modals += `\n<!-- ===== MODAL: ${name} ===== -->\n${m.trim()}\n`;
  }

  return { mainHtml: html, modalsHtml: modals };
}

// =====================================================================
// Çıktıları birleştir
// =====================================================================

const css = extractCss();
const js = extractJs();
const { mainHtml, modalsHtml } = extractHtml();

const htmlOut = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CargoTrack — Lojistik Yönetim Sistemi</title>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
<div id="cargotrack-app">
${mainHtml}
</div>

<!-- ============ MODALS (eski wp_footer hook'undan taşındı) ============ -->
${modalsHtml}

<script src="/js/app.js"></script>
</body>
</html>
`;

const jsOut = AJAX_HELPER +
  '\n\n// =================================================================\n' +
  '// ORİJİNAL UYGULAMA KODU (cargotrack.php\'den çıkarıldı)\n' +
  '// =================================================================\n' +
  js;

fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), htmlOut, 'utf8');
fs.writeFileSync(path.join(CSS_DIR, 'app.css'), css, 'utf8');
fs.writeFileSync(path.join(JS_DIR, 'app.js'), jsOut, 'utf8');

console.log('[extract] index.html →', (htmlOut.length / 1024).toFixed(1), 'KB');
console.log('[extract] app.css   →', (css.length / 1024).toFixed(1), 'KB');
console.log('[extract] app.js    →', (jsOut.length / 1024).toFixed(1), 'KB');
console.log('[extract] Tamamlandı');
