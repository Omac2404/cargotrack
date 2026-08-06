#!/usr/bin/env node
/**
 * Senaryo Motoru — uçtan uca lojistik süreci simülasyonu
 *
 * seed.js'ten farkı: seed doğrudan veritabanına yazar, bu script GERÇEK HTTP API'yi
 * kullanır. Yani kullanıcının yaptığı her tıklamayı taklit eder ve her adımı Türkçe
 * anlatır — hem demo/eğitim videosu için hem de uçtan uca doğrulama (smoke test) için.
 *
 * Kullanım:
 *   node scripts/scenario.js                      # 10 karayolu sevkiyatı, 3 TIR
 *   node scripts/scenario.js --shipments 6 --trucks 2
 *   node scripts/scenario.js --api https://intertransmms.com --user admin --pass ****
 *   node scripts/scenario.js --keep-draft         # statü ilerletme/faturalama yapma
 *   node scripts/scenario.js --cleanup            # önceki senaryo kayıtlarını arşivle
 *
 * Senaryonun akışı:
 *   1) Giriş yap
 *   2) Ön koşulları hazırla (müşteri/gönderici/alıcı partnerleri + TIR'lar)
 *   3) N adet karayolu sevkiyatı aç (rastgele ama gerçekçi yük bilgisiyle)
 *   4) Yükleri TIR'lara dağıt — bir TIR'a birden çok sevkiyat, bir sevkiyatı iki TIR'a böl
 *   5) Belgeleri yükle ve onayla
 *   6) Statüleri ilerlet, faturala, dosyaları kapat
 *   7) Özet tablo: hangi TIR neyi taşıyor, doluluk yüzdesi
 */

const API_DEFAULT = process.env.SCENARIO_API || 'http://localhost:3000';

// ---------- CLI argümanları ----------
function parseArgs(argv) {
  const args = {
    api: API_DEFAULT,
    user: process.env.SCENARIO_USER || 'admin',
    pass: process.env.SCENARIO_PASS || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
    shipments: 10,
    trucks: 3,
    keepDraft: false,
    cleanup: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--api') args.api = next();
    else if (a === '--user') args.user = next();
    else if (a === '--pass') args.pass = next();
    else if (a === '--shipments') args.shipments = parseInt(next(), 10) || 10;
    else if (a === '--trucks') args.trucks = parseInt(next(), 10) || 3;
    else if (a === '--keep-draft') args.keepDraft = true;
    else if (a === '--cleanup') args.cleanup = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  args.api = String(args.api).replace(/\/+$/, '');
  return args;
}

function printHelp() {
  console.log(`
Senaryo Motoru — CargoTrack uçtan uca simülasyon

  --api <url>          API adresi (varsayılan: ${API_DEFAULT})
  --user <kullanıcı>   Giriş kullanıcı adı (varsayılan: admin)
  --pass <şifre>       Giriş şifresi
  --shipments <n>      Kaç sevkiyat açılsın (varsayılan: 10)
  --trucks <n>         Kaç TIR kullanılsın (varsayılan: 3)
  --keep-draft         Statü ilerletme ve faturalama yapma
  --cleanup            Önceki senaryo kayıtlarını arşive taşı ve çık
`);
}

// ---------- Konsol yardımcıları ----------
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  cyan: '\x1b[36m', red: '\x1b[31m', magenta: '\x1b[35m',
};
let stepNo = 0;
const step = (title) => console.log(`\n${C.bold}${C.blue}━━ ADIM ${++stepNo}: ${title}${C.reset}`);
const ok = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const info = (msg) => console.log(`  ${C.dim}·${C.reset} ${msg}`);
const warn = (msg) => console.log(`  ${C.yellow}!${C.reset} ${msg}`);
const fail = (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`);

// ---------- Rastgelelik ----------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------- API istemcisi ----------
class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async request(method, path, { body, formData, query } = {}) {
    let url = this.baseUrl + path;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      }
      if (qs.toString()) url += '?' + qs.toString();
    }

    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let payload;
    if (formData) {
      payload = formData; // Content-Type'ı fetch kendisi (boundary ile) koyar
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let resp;
    try {
      resp = await fetch(url, { method, headers, body: payload });
    } catch (err) {
      throw new Error(`API'ye ulaşılamadı (${url}) — sunucu çalışıyor mu? [${err.message}]`);
    }

    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!resp.ok || (json && json.success === false)) {
      const msg = (json && json.data && json.data.message) || `HTTP ${resp.status}`;
      const err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return json ? json.data : null;
  }

  get(path, query) { return this.request('GET', path, { query }); }
  post(path, body) { return this.request('POST', path, { body }); }
  del(path, query) { return this.request('DELETE', path, { query }); }
  upload(path, formData) { return this.request('POST', path, { formData }); }

  async login(username, password) {
    const data = await this.request('POST', '/api/auth/login', { body: { username, password } });
    this.token = data.token;
    return data.user;
  }
}

// ---------- Senaryo verisi ----------
const SCENARIO_TAG = 'SENARYO';

const CUSTOMERS = [
  { company_name: 'Anadolu Tekstil San. A.Ş.', city: 'Bursa', country: 'Türkiye',
    contact_person: 'Elif Yıldırım', contact_phone: '+90 224 555 1010', contact_email: 'elif@anadolutekstil.com.tr' },
  { company_name: 'Marmara Otomotiv Ltd.', city: 'Kocaeli', country: 'Türkiye',
    contact_person: 'Kemal Doğan', contact_phone: '+90 262 555 2020', contact_email: 'kemal@marmaraoto.com.tr' },
  { company_name: 'Ege Gıda İhracat A.Ş.', city: 'İzmir', country: 'Türkiye',
    contact_person: 'Selin Acar', contact_phone: '+90 232 555 3030', contact_email: 'selin@egegida.com.tr' },
];

const RECEIVERS = [
  { company_name: 'Rhein Logistik GmbH', city: 'Köln', country: 'Almanya',
    contact_person: 'Markus Weber', contact_phone: '+49 221 555 100', contact_email: 'weber@rhein-logistik.de' },
  { company_name: 'Transports Dubois SARL', city: 'Lyon', country: 'Fransa',
    contact_person: 'Camille Dubois', contact_phone: '+33 4 72 55 20 00', contact_email: 'camille@dubois-transports.fr' },
  { company_name: 'Benelux Cargo BV', city: 'Rotterdam', country: 'Hollanda',
    contact_person: 'Joost van Dijk', contact_phone: '+31 10 555 3000', contact_email: 'joost@beneluxcargo.nl' },
];

const GOODS = [
  { desc: 'Dokuma kumaş rulosu', hs: '5407.61.30', pkg: 'RO', unitKg: 45 },
  { desc: 'Otomotiv yedek parça (fren balatası)', hs: '8708.30.91', pkg: 'CT', unitKg: 22 },
  { desc: 'Konserve gıda ürünleri', hs: '2005.99.80', pkg: 'CT', unitKg: 18 },
  { desc: 'Plastik enjeksiyon parçaları', hs: '3926.90.97', pkg: 'BX', unitKg: 12 },
  { desc: 'Beyaz eşya (bulaşık makinesi)', hs: '8422.11.00', pkg: 'PX', unitKg: 55 },
  { desc: 'Mobilya aksamı (MDF panel)', hs: '4411.13.00', pkg: 'PX', unitKg: 68 },
];

const ROUTES = [
  { from: 'Türkiye', to: 'Almanya', incoterm: 'CPT', loc: 'Köln' },
  { from: 'Türkiye', to: 'Fransa', incoterm: 'DAP', loc: 'Lyon' },
  { from: 'Türkiye', to: 'Hollanda', incoterm: 'CIF', loc: 'Rotterdam' },
];

const TRUCKS = [
  { plate: '34 SNR 001', trailer_plate: '34 RM 101', driver_name: 'Hüseyin Kaya', driver_phone: '+90 532 111 2201', capacity_kg: 24000, volume_m3: 90, equipment_type: 'tilt' },
  { plate: '34 SNR 002', trailer_plate: '34 RM 102', driver_name: 'Ahmet Şahin', driver_phone: '+90 532 111 2202', capacity_kg: 24000, volume_m3: 90, equipment_type: 'tilt' },
  { plate: '34 SNR 003', trailer_plate: '34 RM 103', driver_name: 'Mustafa Erdem', driver_phone: '+90 532 111 2203', capacity_kg: 22000, volume_m3: 86, equipment_type: 'frigorifik' },
  { plate: '34 SNR 004', trailer_plate: '34 RM 104', driver_name: 'Volkan Aydın', driver_phone: '+90 532 111 2204', capacity_kg: 24000, volume_m3: 90, equipment_type: 'tilt' },
  { plate: '34 SNR 005', trailer_plate: '34 RM 105', driver_name: 'Serkan Polat', driver_phone: '+90 532 111 2205', capacity_kg: 20000, volume_m3: 82, equipment_type: 'container' },
];

/** Demo için geçerli, minimal bir PDF dosyası üretir (tek sayfa, tek satır metin). */
function makePdfBuffer(title) {
  const content = `BT /F1 14 Tf 60 760 Td (${title.replace(/[()\\]/g, '')}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// ---------- Ön koşullar ----------

async function ensurePartners(api) {
  const existing = await api.get('/api/partners');
  const byName = new Map(existing.map((p) => [p.company_name, p]));

  const created = { customers: [], receivers: [] };

  for (const c of CUSTOMERS) {
    if (byName.has(c.company_name)) {
      created.customers.push(byName.get(c.company_name));
      info(`Müşteri zaten var: ${c.company_name}`);
      continue;
    }
    const res = await api.post('/api/partners', {
      ...c, type: 'customer', extra_roles: ['sender'],
      physical_address: `${c.city} Organize Sanayi Bölgesi`,
    });
    created.customers.push({ id: res.id, company_name: c.company_name, ...c });
    ok(`Müşteri açıldı: ${c.company_name} (${res.partner_code})`);
  }

  for (const r of RECEIVERS) {
    if (byName.has(r.company_name)) {
      created.receivers.push(byName.get(r.company_name));
      info(`Alıcı zaten var: ${r.company_name}`);
      continue;
    }
    const res = await api.post('/api/partners', {
      ...r, type: 'receiver',
      physical_address: `${r.city} Industriegebiet 12`,
    });
    created.receivers.push({ id: res.id, company_name: r.company_name, ...r });
    ok(`Alıcı açıldı: ${r.company_name} (${res.partner_code})`);
  }

  return created;
}

async function ensureTrucks(api, count) {
  const existing = await api.get('/api/vehicles', { transport_type: 'road' });
  const byPlate = new Map(existing.map((v) => [v.plate, v]));
  const trucks = [];

  for (const t of TRUCKS.slice(0, count)) {
    const plateUpper = t.plate.toUpperCase();
    if (byPlate.has(plateUpper)) {
      trucks.push(byPlate.get(plateUpper));
      info(`TIR zaten kayıtlı: ${plateUpper} (${byPlate.get(plateUpper).capacity_kg} kg)`);
      continue;
    }
    const res = await api.post('/api/vehicles', {
      ...t, transport_type: 'road', status: 'active',
      notes: `${SCENARIO_TAG} — demo aracı`,
    });
    trucks.push({ id: res.id, vehicle_code: res.vehicle_code, ...t, plate: plateUpper });
    ok(`TIR eklendi: ${plateUpper} — ${t.driver_name}, ${t.capacity_kg} kg (${res.vehicle_code})`);
  }

  return trucks;
}

// ---------- Sevkiyat üretimi ----------

async function createShipments(api, count, partners) {
  const shipments = [];

  for (let i = 0; i < count; i++) {
    const customer = randItem(partners.customers);
    const receiver = randItem(partners.receivers);
    const route = ROUTES.find((r) => r.to === receiver.country) || randItem(ROUTES);
    const goods = randItem(GOODS);

    const quantity = randInt(18, 90);
    const grossWeight = quantity * goods.unitKg + randInt(50, 400);
    const salePrice = Math.round((grossWeight * randInt(9, 16)) / 10) * 10;
    const purchasePrice = Math.round(salePrice * (0.62 + Math.random() * 0.16));

    const payload = {
      transport_type: 'road',
      status: 'draft',
      created_date: dateOffset(-randInt(0, 6)),
      responsible_user: 'Senaryo Motoru',
      client_reference: `${SCENARIO_TAG}-${Date.now().toString().slice(-6)}-${i + 1}`,

      client_billing: customer.company_name,
      sender: customer.company_name,
      receiver: receiver.company_name,
      client_contact: customer.contact_person,
      client_phone: customer.contact_phone,
      client_email: customer.contact_email,
      departure_country: route.from,
      arrival_country: route.to,

      goods_description: goods.desc,
      hs_code: goods.hs,
      package_type: goods.pkg,
      quantity,
      package_count: quantity,
      gross_weight: grossWeight,
      net_weight: Math.round(grossWeight * 0.92),
      volume_cbm: Math.round(quantity * 0.42 * 10) / 10,
      dimensions: '120x80x145 cm',
      goods_value: salePrice * randInt(8, 20),
      incoterm: route.incoterm,
      incoterm_location: route.loc,
      currency_code: 'EUR',

      sale_price: salePrice,
      purchase_price: purchasePrice,
    };

    const res = await api.post('/api/shipments', payload);
    const ship = {
      id: res.id,
      shipment_no: res.shipment_no,
      quantity,
      gross_weight: grossWeight,
      customer: customer.company_name,
      route: `${route.from} → ${route.to}`,
      goods: goods.desc,
      sale_price: salePrice,
      remaining_qty: quantity,
      remaining_kg: grossWeight,
      loads: [],
    };
    shipments.push(ship);
    ok(`${res.shipment_no} — ${customer.company_name} · ${ship.route} · ${quantity} kap / ${grossWeight} kg`);
  }

  return shipments;
}

// ---------- Yükleme (asıl gösterilmek istenen kısım) ----------

/**
 * Yükleri TIR'lara dağıtır.
 *
 * Amaç sadece veri üretmek değil, iki senaryoyu da göstermek:
 *   a) BİR TIR'A BİRDEN FAZLA SEVKİYAT — TIR'da yer kaldıkça sıradaki sevkiyat aynı araca biner
 *   b) BİR SEVKİYATI BİRDEN FAZLA TIR'A BÖLME — sığmayan yük kısmi olarak bölünür
 */
async function distributeLoads(api, shipments, trucks) {
  // Her TIR için kalan kapasiteyi takip et (mevcut yüklerini de hesaba katarak)
  const fleet = [];
  for (const t of trucks) {
    const load = await api.get(`/api/vehicles/${t.id}/load`);
    fleet.push({
      id: t.id,
      plate: t.plate,
      driver: t.driver_name || load.vehicle.plate,
      capacity: Number(load.vehicle.capacity_kg) || Number(t.capacity_kg) || 0,
      used: Number(load.summary.total_weight) || 0,
      items: [],
    });
    if (load.summary.total_weight > 0) {
      info(`${t.plate} üzerinde önceden ${Math.round(load.summary.total_weight)} kg yük var, hesaba katılıyor`);
    }
  }

  const loadingDate = dateOffset(2);
  let splitCount = 0;

  for (const ship of shipments) {
    // Yükü sığdıracak TIR'ları en boş olandan başlayarak dene
    while (ship.remaining_qty > 0) {
      // capacity 0 = kapasitesi tanımsız araç; backend de bu durumda limit uygulamıyor
      const freeOf = (f) => (f.capacity > 0 ? f.capacity - f.used : Infinity);
      const candidates = fleet
        .filter((f) => freeOf(f) > 1) // en az 1 kg yeri olan
        .sort((a, b) => freeOf(b) - freeOf(a));

      if (candidates.length === 0) {
        warn(`${ship.shipment_no}: filoda yer kalmadı, ${ship.remaining_qty} kap atanamadı`);
        break;
      }

      const truck = candidates[0];
      const freeKg = freeOf(truck);
      const kgPerKap = ship.remaining_kg / ship.remaining_qty;

      // Kalan yükün tamamı sığıyor mu?
      let qty = ship.remaining_qty;
      let kg = ship.remaining_kg;
      let isSplit = false;

      if (kg > freeKg) {
        // Sığmıyor → sığan kadar kap yükle, kalanı sonraki TIR'a
        qty = Math.floor(freeKg / kgPerKap);
        if (qty < 1) {
          // Bu TIR'a tek kap bile sığmıyor → doldu say, sıradakine geç
          truck.used = truck.capacity;
          continue;
        }
        kg = Math.round(qty * kgPerKap);
        isSplit = true;
      }

      await api.post('/api/assignments', {
        vehicle_id: truck.id,
        shipment_id: ship.id,
        assigned_quantity: qty,
        assigned_weight: kg,
        loading_date: loadingDate,
        notes: isSplit
          ? `${SCENARIO_TAG} — kısmi yükleme (yük birden fazla araca bölündü)`
          : `${SCENARIO_TAG} — tam yükleme`,
      });

      truck.used += kg;
      truck.items.push({ shipment_no: ship.shipment_no, qty, kg, partial: isSplit });
      ship.loads.push({ plate: truck.plate, qty, kg });
      ship.remaining_qty -= qty;
      ship.remaining_kg -= kg;

      if (isSplit) {
        splitCount++;
        warn(`${ship.shipment_no} → ${truck.plate}: ${qty} kap / ${kg} kg (KISMİ — ${ship.remaining_qty} kap kaldı)`);
      } else {
        ok(`${ship.shipment_no} → ${truck.plate}: ${qty} kap / ${kg} kg (tam yükleme)`);
      }
    }
  }

  return { fleet, splitCount };
}

// ---------- Belgeler ----------

const DOC_FLOW = [
  { key: 'commercial_invoice', label: 'Ticari Fatura' },
  { key: 'packing_list', label: 'Çeki Listesi' },
  { key: 'cmr', label: 'CMR' },
];

async function processDocuments(api, shipments) {
  let uploaded = 0;
  let approved = 0;

  for (const ship of shipments) {
    for (const doc of DOC_FLOW) {
      const fd = new FormData();
      fd.append('shipment_id', String(ship.id));
      fd.append('doc_key', doc.key);
      fd.append(
        'file',
        new Blob([makePdfBuffer(`${doc.label} - ${ship.shipment_no}`)], { type: 'application/pdf' }),
        `${doc.key}_${ship.shipment_no}.pdf`
      );
      await api.upload('/api/documents/upload', fd);
      uploaded++;

      // CMR yükleme anında henüz onaylanmaz — gerçek akışta sürücü teslim eder
      if (doc.key !== 'cmr') {
        await api.post('/api/shipments', {
          id: ship.id,
          documents_data: JSON.stringify(await buildDocState(api, ship.id, doc.key, 'approved')),
        });
        approved++;
      }
    }
    ok(`${ship.shipment_no}: ${DOC_FLOW.length} belge yüklendi, ${DOC_FLOW.length - 1} tanesi onaylandı`);
  }

  return { uploaded, approved };
}

/** Mevcut documents_data'yı okuyup tek bir belgenin durumunu değiştirir. */
async function buildDocState(api, shipmentId, docKey, status) {
  const ship = await api.get(`/api/shipments/${shipmentId}`);
  let docs = {};
  if (ship.documents_data) {
    try {
      docs = typeof ship.documents_data === 'string'
        ? JSON.parse(ship.documents_data) || {}
        : ship.documents_data;
    } catch { docs = {}; }
  }
  docs[docKey] = { ...(docs[docKey] || {}), status };
  return docs;
}

// ---------- Süreci tamamla ----------

async function completeLifecycle(api, shipments) {
  const counts = { in_progress: 0, to_invoice: 0, closed: 0 };

  for (let i = 0; i < shipments.length; i++) {
    const ship = shipments[i];

    // Hepsi yola çıkar
    await api.post('/api/shipments', { id: ship.id, status: 'in_progress' });
    counts.in_progress++;

    // İlk üçte ikisi teslim edilip faturalanır
    if (i < Math.floor(shipments.length * 0.66)) {
      const invoiceNo = `FTR-${new Date().getFullYear()}-${String(1000 + i).slice(-4)}`;
      await api.post('/api/shipments', {
        id: ship.id,
        status: 'to_invoice',
        invoice_generated: 1,
        invoice_no: invoiceNo,
        invoice_date: dateOffset(-randInt(0, 3)),
        invoice_amount: ship.sale_price,
        payment_type: randItem(['havale', 'cek', 'vesaik']),
      });
      counts.to_invoice++;
      ok(`${ship.shipment_no}: teslim edildi → faturalandı (${invoiceNo} · ${ship.sale_price} EUR)`);

      // Bunların yarısının ödemesi gelir ve dosya kapanır
      if (i % 2 === 0) {
        await api.post('/api/shipments', {
          id: ship.id,
          status: 'closed',
          payment_received: 1,
        });
        counts.closed++;
        ok(`${ship.shipment_no}: ödeme alındı → dosya kapatıldı`);
      }
    } else {
      info(`${ship.shipment_no}: yolda (devam ediyor)`);
    }
  }

  return counts;
}

// ---------- Temizlik ----------

async function cleanup(api) {
  step('Önceki senaryo kayıtlarını arşive taşı');
  const shipments = await api.get('/api/shipments', { transport_type: 'road' });
  const targets = shipments.filter((s) => String(s.client_reference || '').startsWith(SCENARIO_TAG));

  if (targets.length === 0) {
    info('Arşivlenecek senaryo sevkiyatı bulunamadı.');
    return;
  }

  let removedAssignments = 0;
  for (const s of targets) {
    try {
      // Önce atamalar: sevkiyatı arşivlemek atamayı kaldırmıyor, kalan aktif
      // atamalar yüzünden demo TIR'ları sonradan silinemez hale geliyor.
      const assignments = await api.get('/api/assignments', { shipment_id: s.id });
      for (const a of assignments) {
        await api.del(`/api/assignments/${a.id}`);
        removedAssignments++;
      }
      await api.del(`/api/shipments/${s.id}`, { expected_transport_type: 'road' });
      ok(`${s.shipment_no} arşive taşındı${assignments.length ? ` (${assignments.length} atama kaldırıldı)` : ''}`);
    } catch (err) {
      fail(`${s.shipment_no} temizlenemedi: ${err.message}`);
    }
  }
  console.log(
    `\n${C.green}${targets.length} senaryo sevkiyatı ve ${removedAssignments} atama arşive taşındı.${C.reset}`
  );
  info('Demo partner ve TIR kayıtları bilerek duruyor — sonraki senaryo bunları tekrar kullanır.');
  info('Kalıcı silmek için: Panel → Arşiv → Kalıcı Sil (yalnızca süper admin)');
}

// ---------- Özet ----------

function printSummary(fleet, shipments, docStats, lifecycle, splitCount) {
  console.log(`\n${C.bold}${C.magenta}${'═'.repeat(72)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}  SENARYO ÖZETİ${C.reset}`);
  console.log(`${C.bold}${C.magenta}${'═'.repeat(72)}${C.reset}\n`);

  console.log(`${C.bold}TIR'lardaki yükler:${C.reset}`);
  for (const truck of fleet) {
    const pct = truck.capacity > 0 ? (truck.used / truck.capacity) * 100 : 0;
    const barLen = 28;
    const filled = Math.min(barLen, Math.round((pct / 100) * barLen));
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const color = pct > 95 ? C.red : pct > 80 ? C.yellow : C.green;

    console.log(`\n  ${C.bold}${truck.plate}${C.reset} ${C.dim}(${truck.driver})${C.reset}`);
    console.log(`  ${color}${bar}${C.reset} %${pct.toFixed(1)} — ${Math.round(truck.used)} / ${truck.capacity} kg`);
    if (truck.items.length === 0) {
      console.log(`    ${C.dim}(boş)${C.reset}`);
    } else {
      for (const item of truck.items) {
        const tag = item.partial ? `${C.yellow}[kısmi]${C.reset}` : '';
        console.log(`    ├─ ${item.shipment_no}  ${item.qty} kap / ${item.kg} kg ${tag}`);
      }
    }
  }

  const fullyLoaded = shipments.filter((s) => s.remaining_qty === 0).length;
  const multiTruck = shipments.filter((s) => s.loads.length > 1);

  console.log(`\n${C.bold}Sayılar:${C.reset}`);
  console.log(`  Sevkiyat            : ${shipments.length} (${fullyLoaded} tanesi tamamen yüklendi)`);
  console.log(`  Kullanılan araç     : ${fleet.filter((f) => f.items.length > 0).length} / ${fleet.length}`);
  console.log(`  Toplam atama        : ${fleet.reduce((s, f) => s + f.items.length, 0)}`);
  console.log(`  Bölünmüş yük        : ${multiTruck.length} sevkiyat, ${splitCount} kısmi atama`);
  if (docStats) {
    console.log(`  Belge               : ${docStats.uploaded} yüklendi, ${docStats.approved} onaylandı`);
  }
  if (lifecycle) {
    console.log(`  Statü               : ${lifecycle.in_progress} yolda, ${lifecycle.to_invoice} faturalandı, ${lifecycle.closed} kapandı`);
  }

  if (multiTruck.length > 0) {
    console.log(`\n${C.bold}Birden fazla araca bölünen yükler:${C.reset}`);
    for (const s of multiTruck) {
      const parts = s.loads.map((l) => `${l.plate} (${l.qty} kap)`).join(' + ');
      console.log(`  ${s.shipment_no}: ${parts}`);
    }
  }

  console.log(`\n${C.bold}Panelde nereye bakmalı:${C.reset}`);
  console.log(`  ${C.cyan}Atamalar → Yük Havuzu${C.reset}      : hangi sevkiyatta kaç kap kaldı`);
  console.log(`  ${C.cyan}Araçlar → araç → Yük${C.reset}       : bir TIR'ın taşıdığı tüm sevkiyatlar + doluluk`);
  console.log(`  ${C.cyan}Sevkiyat → Sevk Planı${C.reset}      : bir yükün hangi araçlara dağıldığı`);
  console.log(`  ${C.cyan}İstatistikler${C.reset}              : ciro, kâr, doluluk grafikleri`);
  console.log(`\n${C.dim}Bu kayıtları temizlemek için: node scripts/scenario.js --cleanup${C.reset}\n`);
}

// ---------- Ana akış ----------

async function main() {
  const args = parseArgs(process.argv);

  console.log(`\n${C.bold}${C.cyan}CargoTrack Senaryo Motoru${C.reset}`);
  console.log(`${C.dim}API: ${args.api} · Kullanıcı: ${args.user}${C.reset}`);

  const api = new Api(args.api);

  step('Giriş yap');
  const user = await api.login(args.user, args.pass);
  ok(`Giriş başarılı: ${user.full_name || user.username} (${user.role})`);

  if (args.cleanup) {
    await cleanup(api);
    return;
  }

  step('Ön koşulları hazırla — partnerler');
  const partners = await ensurePartners(api);

  step(`Ön koşulları hazırla — ${args.trucks} TIR`);
  const trucks = await ensureTrucks(api, args.trucks);
  if (trucks.length === 0) throw new Error('Hiç araç hazırlanamadı');

  step(`${args.shipments} karayolu sevkiyatı aç`);
  const shipments = await createShipments(api, args.shipments, partners);

  step(`Yükleri ${trucks.length} TIR'a dağıt`);
  info('Kural: TIR dolana kadar aynı araca yükle; sığmayan yükü böl ve sonraki araca aktar');
  const { fleet, splitCount } = await distributeLoads(api, shipments, trucks);

  let docStats = null;
  let lifecycle = null;

  if (!args.keepDraft) {
    step('Belgeleri yükle ve onayla');
    docStats = await processDocuments(api, shipments);

    step('Süreci tamamla — statü, fatura, kapanış');
    lifecycle = await completeLifecycle(api, shipments);
  } else {
    info('--keep-draft verildi: belge/statü/fatura adımları atlandı');
  }

  printSummary(fleet, shipments, docStats, lifecycle, splitCount);
}

main().catch((err) => {
  console.error(`\n${C.red}${C.bold}Senaryo durdu:${C.reset} ${err.message}`);
  if (err.status === 401) {
    console.error(`${C.dim}İpucu: --user / --pass ile doğru giriş bilgisini ver.${C.reset}`);
  }
  process.exit(1);
});
