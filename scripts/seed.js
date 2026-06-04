/**
 * Test Data Seed Script — birbirine bağlı, gerçekçi lojistik verisi
 *
 * Kullanım: node scripts/seed.js [--reset]
 *   --reset: önce tüm test verisini siler (users hariç)
 *
 * Oluşturur (her birinden 10+):
 *   - 6 kullanıcı (super_admin, admin, user rolleri)
 *   - 16 partner (müşteri/gönderici/alıcı/acente — çoklu rol)
 *   - 10 depo (CGI tipleri R/S/T/U/V/Y/Z karışık)
 *   - 12 araç (4 kara, 4 deniz, 4 hava)
 *   - 32 sevkiyat (10 kara, 8 deniz, 6 hava, 8 depo)
 *   - ~50 atama (sevkiyatların çoğuna gerçek araç atamaları)
 *   - 8 sevkiyat için stok hareketleri (depo)
 *   - Belge durumları (missing/uploaded/approved karışık)
 *   - Finansal veri (FIN_SCHEMAS uyumlu KDV ile)
 *
 * UTF-8 doğru biçimde direkt mysql2 üzerinden yazılır.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

const RESET = process.argv.includes('--reset');

// === Kullanıcılar ===
// Production'da admin oluşturmak için: node scripts/setup-admin.js (interaktif, güçlü şifre)
// Bu seed sadece development için varsayılan admin garantiler.
const USERS = [
  { username: 'admin', full_name: 'Sistem Yöneticisi', email: 'admin@cargotrack.com', role: 'super_admin', password: 'admin123' },
];

// === Partnerler (16) ===
const PARTNERS = [
  // Türk müşteriler
  { type: 'customer', extra_roles: ['sender'], company_name: 'Arçelik Lojistik A.Ş.', city: 'İstanbul', country: 'Türkiye',
    physical_address: 'Sütlüce Mah. İmrahor Cad. No:25', postal_code: '34445',
    contact_person: 'Burak Öztürk', contact_phone: '+90 212 555 1001', contact_email: 'burak@arcelik-lojistik.com.tr',
    tax_number: '0710000123', mersis_number: '0710-0001-2345-0001' },
  { type: 'customer', extra_roles: [], company_name: 'Tupras Petrol Dağıtım Ltd.', city: 'Kocaeli', country: 'Türkiye',
    physical_address: 'Tüpraş Yolu Üzeri Körfez', postal_code: '41780',
    contact_person: 'Emre Doğan', contact_phone: '+90 262 555 2002', contact_email: 'emre@tupras-dist.com',
    tax_number: '0860000456' },
  { type: 'customer', extra_roles: ['receiver'], company_name: 'Eczacıbaşı İthalat A.Ş.', city: 'İzmir', country: 'Türkiye',
    physical_address: 'Cumhuriyet Bulvarı No:1', postal_code: '35210',
    contact_person: 'Selin Aydın', contact_phone: '+90 232 555 3003', contact_email: 'selin@ecz-import.com',
    tax_number: '3420000789' },
  { type: 'customer', extra_roles: [], company_name: 'Vakko Tekstil Sanayi A.Ş.', city: 'Bursa', country: 'Türkiye',
    contact_person: 'Cem Karaca', contact_phone: '+90 224 555 4004', contact_email: 'cem@vakko-textile.com',
    tax_number: '9300000234' },
  // Almanya / Avrupa müşterileri (alıcı)
  { type: 'receiver', extra_roles: ['customer'], company_name: 'MediaMarkt GmbH', city: 'Berlin', country: 'Almanya',
    physical_address: 'Alexanderplatz 5', postal_code: '10178',
    contact_person: 'Hans Müller', contact_phone: '+49 30 12345678', contact_email: 'h.mueller@mediamarkt.de',
    eori_number: 'DE123456789012' },
  { type: 'receiver', extra_roles: [], company_name: 'Carrefour France SAS', city: 'Paris', country: 'Fransa',
    physical_address: '93 Avenue de Paris', postal_code: '91300',
    contact_person: 'Marie Dubois', contact_phone: '+33 1 4567 8910', contact_email: 'm.dubois@carrefour.fr',
    eori_number: 'FR98765432101' },
  { type: 'receiver', extra_roles: [], company_name: 'IKEA Italia Retail Srl', city: 'Milano', country: 'İtalya',
    contact_person: 'Marco Rossi', contact_phone: '+39 02 1234567', contact_email: 'm.rossi@ikea.it',
    eori_number: 'IT45678901234' },
  // Göndericiler (genelde fabrika/üretici)
  { type: 'sender', extra_roles: [], company_name: 'Bosch Sanayi ve Ticaret A.Ş.', city: 'Manisa', country: 'Türkiye',
    contact_person: 'Hakan Yıldırım', contact_phone: '+90 236 555 5005', contact_email: 'hakan@bosch-tr.com' },
  { type: 'sender', extra_roles: [], company_name: 'Şişecam Düzcam Üretim Tesisleri', city: 'Mersin', country: 'Türkiye',
    contact_person: 'Pınar Güneş', contact_phone: '+90 324 555 6006', contact_email: 'pinar@sisecam-mersin.com' },
  { type: 'sender', extra_roles: ['receiver'], company_name: 'Ford Otosan İnegöl Tesisi', city: 'Bursa', country: 'Türkiye',
    contact_person: 'Murat Acar', contact_phone: '+90 224 555 7007', contact_email: 'murat@ford-otosan.com' },
  // Acenteler (taşıma acenteleri)
  { type: 'agent', extra_roles: [], company_name: 'Maersk Türkiye Acentası', city: 'İstanbul', country: 'Türkiye',
    contact_person: 'Ozan Bakırcı', contact_phone: '+90 212 555 8008', contact_email: 'ozan@maersk.com.tr' },
  { type: 'agent', extra_roles: [], company_name: 'Schenker Arkas Nakliyat', city: 'İzmir', country: 'Türkiye',
    contact_person: 'Defne Şensoy', contact_phone: '+90 232 555 9009', contact_email: 'defne@schenker.com.tr' },
  { type: 'agent', extra_roles: [], company_name: 'Lufthansa Cargo Türkiye', city: 'İstanbul', country: 'Türkiye',
    contact_person: 'Tolga Erkin', contact_phone: '+90 212 555 1010', contact_email: 'tolga@lufthansa-cargo.com.tr' },
  // Ek lojistik partnerler
  { type: 'agent', extra_roles: ['sender'], company_name: 'DHL Global Forwarding TR', city: 'İstanbul', country: 'Türkiye',
    contact_person: 'Banu Akyürek', contact_phone: '+90 212 555 1111', contact_email: 'banu@dhl.com.tr' },
  { type: 'sender', extra_roles: [], company_name: 'BASF Türk Kimya', city: 'Gebze', country: 'Türkiye',
    contact_person: 'Yusuf Çelebi', contact_phone: '+90 262 555 1212', contact_email: 'yusuf@basf-turk.com' },
  { type: 'receiver', extra_roles: [], company_name: 'El Corte Inglés', city: 'Madrid', country: 'İspanya',
    contact_person: 'Carlos García', contact_phone: '+34 91 123 4567', contact_email: 'c.garcia@elcorteingles.es' },
];

// === Depolar (10) ===
const WAREHOUSES = [
  { name: 'Tuzla Antrepo Merkez',          type_code: 'U', city: 'İstanbul', country: 'Türkiye',
    address: 'Tuzla Organize Sanayi Bölgesi No:42', postal_code: '34950',
    capacity_info: '5000 m² / 12000 palet', responsible_person: 'Ahmet Yılmaz', contact_phone: '+90 216 555 4001', contact_email: 'tuzla@cargotrack.com' },
  { name: 'Pendik Liman Antrepo',          type_code: 'T', city: 'İstanbul', country: 'Türkiye',
    address: 'Pendik Liman İçi Bölge', postal_code: '34890',
    capacity_info: '8000 m² / 20000 palet', responsible_person: 'Mehmet Demir', contact_phone: '+90 216 555 4002' },
  { name: 'İzmir Aliağa Depo',             type_code: 'R', city: 'İzmir', country: 'Türkiye',
    address: 'Aliağa Petrokimya Tesisleri Yanı', capacity_info: '3000 m² konteyner sahası',
    responsible_person: 'Hasan Kara', contact_phone: '+90 232 555 4003' },
  { name: 'Mersin Liman Geçici Stok',      type_code: 'V', city: 'Mersin', country: 'Türkiye',
    address: 'Mersin Uluslararası Liman Bölgesi', capacity_info: '2500 m² (90 gün max)',
    responsible_person: 'Selçuk Öz', contact_phone: '+90 324 555 4004', notes: 'V tipi - 90 gün süre kısıtlı' },
  { name: 'Atatürk Hava Kargo Antrepo',    type_code: 'T', city: 'İstanbul', country: 'Türkiye',
    address: 'İGA Cargo City Bölgesi', capacity_info: '1500 m² hava kargo',
    responsible_person: 'Burcu Yıldız', contact_phone: '+90 212 555 4005' },
  { name: 'Gebze Lojistik Üssü',           type_code: 'U', city: 'Kocaeli', country: 'Türkiye',
    address: 'Gebze OSB E-5 üzeri', capacity_info: '6000 m² + 200 araç parkı',
    responsible_person: 'Cengiz Akın', contact_phone: '+90 262 555 4006' },
  { name: 'Ankara Eskişehir Yolu Depo',    type_code: 'U', city: 'Ankara', country: 'Türkiye',
    capacity_info: '4500 m²', responsible_person: 'Esra Çetin', contact_phone: '+90 312 555 4007' },
  { name: 'Antalya Serbest Bölge',         type_code: 'Z', city: 'Antalya', country: 'Türkiye',
    address: 'Antalya Serbest Bölge B Blok', capacity_info: '3500 m² vergi muafiyetli',
    responsible_person: 'Kemal Aslan', contact_phone: '+90 242 555 4008', notes: 'Vergi muafiyetli serbest bölge' },
  { name: 'Diyarbakır Gümrük Antrepo',     type_code: 'S', city: 'Diyarbakır', country: 'Türkiye',
    address: 'Diyarbakır Havalimanı Yolu', capacity_info: '2000 m²',
    responsible_person: 'Mehmet Şahin', contact_phone: '+90 412 555 4009' },
  { name: 'Bursa Demirtaş Antrepo',        type_code: 'Y', city: 'Bursa', country: 'Türkiye',
    capacity_info: '4000 m² özel kullanım',
    responsible_person: 'Gözde Yenal', contact_phone: '+90 224 555 4010', notes: 'Otomotiv yedek parça odaklı' },
];

// === Araçlar (12: 4 kara + 4 deniz + 4 hava) ===
const VEHICLES = [
  // Karayolu (4)
  { transport_type: 'road', plate: '34 ABC 1234', trailer_plate: '34 RM 5678',
    volume_m3: 90, capacity_kg: 25000, equipment_type: 'tilt', adr_certified: 1,
    brand_model: 'Mercedes Actros 1851', driver_name: 'Ahmet Yıldız', driver_phone: '+90 532 100 1001' },
  { transport_type: 'road', plate: '34 DEF 5678', trailer_plate: '34 RT 9012',
    volume_m3: 85, capacity_kg: 24500, equipment_type: 'frigorifik', adr_certified: 0,
    brand_model: 'Volvo FH16', driver_name: 'Hasan Karagül', driver_phone: '+90 532 200 2002' },
  { transport_type: 'road', plate: '06 GHI 9012',
    volume_m3: 60, capacity_kg: 20000, equipment_type: 'container', adr_certified: 0,
    brand_model: 'Scania R450', driver_name: 'Mustafa Bozkurt', driver_phone: '+90 532 300 3003' },
  { transport_type: 'road', plate: '35 JKL 3456', trailer_plate: '35 RP 7890',
    volume_m3: 80, capacity_kg: 22000, equipment_type: 'tilt', adr_certified: 1,
    brand_model: 'MAN TGX 18.500', driver_name: 'İsmail Yıldız', driver_phone: '+90 532 400 4004' },
  // Denizyolu (4) - container/vessel
  { transport_type: 'sea', plate: 'MSCU2345671', trailer_plate: 'SEAL-A1234',
    volume_m3: 33, capacity_kg: 28000, equipment_type: 'container_20',
    brand_model: 'MSC Standart 20 DV', driver_name: 'Kaptan Mehmet Özer', driver_phone: '+90 532 500 5005' },
  { transport_type: 'sea', plate: 'MAEU9876543', trailer_plate: 'SEAL-B5678',
    volume_m3: 67, capacity_kg: 30000, equipment_type: 'container_40',
    brand_model: 'Maersk 40 DV', driver_name: 'Kaptan Ali Kara', driver_phone: '+90 532 600 6006' },
  { transport_type: 'sea', plate: 'CSQU3050201',
    volume_m3: 76, capacity_kg: 30000, equipment_type: 'container_40hc',
    brand_model: 'COSCO 40 HC' },
  { transport_type: 'sea', plate: 'TGHU8765432', trailer_plate: 'SEAL-C9012',
    volume_m3: 33, capacity_kg: 27000, equipment_type: 'container_reefer',
    brand_model: 'Hapag-Lloyd Reefer 20', driver_name: 'Kaptan Yusuf Demir' },
  // Havayolu (4) - flight references
  { transport_type: 'air', plate: 'TK1821', trailer_plate: 'B777F',
    volume_m3: 650, capacity_kg: 102000, equipment_type: 'freighter',
    brand_model: 'Boeing 777F (Turkish Cargo)' },
  { transport_type: 'air', plate: 'LH8261',
    volume_m3: 280, capacity_kg: 47500, equipment_type: 'passenger',
    brand_model: 'A330-200 (Lufthansa belly hold)' },
  { transport_type: 'air', plate: 'EK205', trailer_plate: 'B747-8F',
    volume_m3: 858, capacity_kg: 137750, equipment_type: 'freighter',
    brand_model: 'Boeing 747-8F (Emirates SkyCargo)' },
  { transport_type: 'air', plate: 'TK7321',
    volume_m3: 150, capacity_kg: 18000, equipment_type: 'express',
    brand_model: 'A321 Cargo (Turkish Cargo)' },
];

// === Helper'lar ===

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return Number((Math.random() * (max - min) + min).toFixed(dec)); }

// Finansal data üretici (FIN_SCHEMAS uyumlu)
function genFinancialData(mode, basePrice) {
  const data = {};
  if (mode === 'road' || mode === 'import' || mode === 'export') {
    data.navlun = { income: basePrice * 0.6, income_vat: '18', expense: basePrice * 0.45, expense_vat: '18' };
    data.cikis_tasima = { income: basePrice * 0.05, income_vat: '18', expense: basePrice * 0.03, expense_vat: '18' };
    data.ihracat_gumruk = { income: basePrice * 0.04, income_vat: '0', expense: basePrice * 0.02, expense_vat: '0' };
    data.ithalat_gumruk = { income: basePrice * 0.06, income_vat: '0', expense: basePrice * 0.04, expense_vat: '0' };
    data.sigorta = { income: basePrice * 0.02, income_vat: '0', expense: basePrice * 0.015, expense_vat: '0' };
  } else if (mode === 'maritime' || mode === 'sea') {
    data.navlun = { income: basePrice * 0.5, income_vat: '0', expense: basePrice * 0.4, expense_vat: '0' };
    data.thc_origin = { income: basePrice * 0.08, income_vat: '18', expense: basePrice * 0.06, expense_vat: '18' };
    data.thc_dest = { income: basePrice * 0.08, income_vat: '18', expense: basePrice * 0.06, expense_vat: '18' };
    data.bl_fee = { income: basePrice * 0.03, income_vat: '18', expense: basePrice * 0.02, expense_vat: '18' };
    data.baf = { income: basePrice * 0.05, income_vat: '18', expense: basePrice * 0.04, expense_vat: '18' };
    data.ihracat_gumruk = { income: basePrice * 0.04, income_vat: '0', expense: basePrice * 0.025, expense_vat: '0' };
  } else if (mode === 'air') {
    data.navlun = { income: basePrice * 0.55, income_vat: '0', expense: basePrice * 0.42, expense_vat: '0' };
    data.fuel_surcharge = { income: basePrice * 0.12, income_vat: '0', expense: basePrice * 0.10, expense_vat: '0' };
    data.security_surcharge = { income: basePrice * 0.05, income_vat: '18', expense: basePrice * 0.04, expense_vat: '18' };
    data.awb_fee = { income: basePrice * 0.03, income_vat: '18', expense: basePrice * 0.02, expense_vat: '18' };
    data.handling_origin = { income: basePrice * 0.06, income_vat: '18', expense: basePrice * 0.04, expense_vat: '18' };
  } else { // storage
    data.varis_depo = { income: basePrice * 0.6, income_vat: '20', expense: basePrice * 0.40, expense_vat: '20' };
    data.sigorta = { income: basePrice * 0.05, income_vat: '0', expense: basePrice * 0.03, expense_vat: '0' };
  }
  // Yuvarla
  for (const k of Object.keys(data)) {
    if (data[k].income) data[k].income = Number(data[k].income.toFixed(2));
    if (data[k].expense) data[k].expense = Number(data[k].expense.toFixed(2));
  }
  return data;
}

// === Sevkiyatları üret ===

function genShipments() {
  const list = [];
  let shipmentId = 1;

  const turkishCustomers = ['Arçelik Lojistik A.Ş.', 'Eczacıbaşı İthalat A.Ş.', 'Vakko Tekstil Sanayi A.Ş.', 'Tupras Petrol Dağıtım Ltd.'];
  const senders = ['Bosch Sanayi ve Ticaret A.Ş.', 'Şişecam Düzcam Üretim Tesisleri', 'Ford Otosan İnegöl Tesisi', 'BASF Türk Kimya', 'DHL Global Forwarding TR'];
  const receivers = {
    DE: 'MediaMarkt GmbH', FR: 'Carrefour France SAS', IT: 'IKEA Italia Retail Srl', ES: 'El Corte Inglés',
  };
  const agents = ['Maersk Türkiye Acentası', 'Schenker Arkas Nakliyat', 'Lufthansa Cargo Türkiye', 'DHL Global Forwarding TR'];

  // 10 karayolu sevkiyatı
  const roadRoutes = [
    { dep: 'Türkiye', arr: 'Almanya', recv: 'MediaMarkt GmbH', goods: 'Beyaz eşya parçaları' },
    { dep: 'Türkiye', arr: 'Fransa', recv: 'Carrefour France SAS', goods: 'Gıda ürünleri' },
    { dep: 'Türkiye', arr: 'İtalya', recv: 'IKEA Italia Retail Srl', goods: 'Mobilya aksesuarları' },
    { dep: 'Türkiye', arr: 'Almanya', recv: 'MediaMarkt GmbH', goods: 'Elektronik ürünler' },
    { dep: 'Türkiye', arr: 'İspanya', recv: 'El Corte Inglés', goods: 'Tekstil ürünleri' },
    { dep: 'Türkiye', arr: 'Fransa', recv: 'Carrefour France SAS', goods: 'Otomotiv yedek parça' },
    { dep: 'Almanya', arr: 'Türkiye', recv: 'Eczacıbaşı İthalat A.Ş.', goods: 'Kimyasal hammadde' },
    { dep: 'Türkiye', arr: 'Almanya', recv: 'MediaMarkt GmbH', goods: 'Cam ürünleri' },
    { dep: 'Türkiye', arr: 'İtalya', recv: 'IKEA Italia Retail Srl', goods: 'Çelik konstrüksiyon' },
    { dep: 'Türkiye', arr: 'Belçika', recv: '', goods: 'Plastik enjeksiyon parçaları' },
  ];
  const statuses = ['draft', 'in_progress', 'in_progress', 'to_invoice', 'closed', 'closed'];
  roadRoutes.forEach((r, i) => {
    const sale = randFloat(8000, 25000);
    const purchase = sale * randFloat(0.65, 0.82);
    const qty = randInt(20, 120);
    const weight = qty * randFloat(80, 250);
    list.push({
      shipment_no: `ROU-${dateOffset(-30 + i*2).replace(/-/g, '')}-${String(i+1).padStart(3, '0')}`,
      transport_type: 'road',
      status: randItem(statuses),
      created_date: dateOffset(-30 + i * 2),
      client_billing: randItem(turkishCustomers),
      sender: randItem(senders),
      receiver: r.recv || receivers.DE,
      agent: randItem(agents),
      client_phone: '+90 532 555 1' + String(i).padStart(3, '0'),
      client_email: `mp${i}@cargotrack.com`,
      departure_country: r.dep, arrival_country: r.arr,
      goods_description: r.goods, hs_code: `${randInt(8400, 9500)}.${randInt(10, 99)}.${randInt(10, 99)}`,
      gross_weight: weight, net_weight: weight * 0.92,
      volume_cbm: randFloat(15, 80), quantity: qty, package_count: qty,
      package_type: randItem(['Palet', 'Karton kutu', 'Konteyner', 'Big bag']),
      dangerous_goods: i === 5 ? 1 : 0, adr_code: i === 5 ? 'UN3082' : '',
      temperature_controlled: i === 1 ? 1 : 0, temperature_min: i === 1 ? 2 : null, temperature_max: i === 1 ? 8 : null,
      incoterm: randItem(['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP']),
      purchase_price: purchase, sale_price: sale,
      currency_code: 'EUR',
      financial_data: JSON.stringify(genFinancialData('road', sale)),
    });
  });

  // 8 denizyolu sevkiyatı
  const seaRoutes = [
    { pol: 'TR-IZM', pod: 'FR-MRS', dep: 'Türkiye', arr: 'Fransa', vessel: 'MSC OSCAR', voyage: '142W', operator: 'MSC' },
    { pol: 'TR-MER', pod: 'IT-GOA', dep: 'Türkiye', arr: 'İtalya', vessel: 'MAERSK SEMARANG', voyage: '081E', operator: 'Maersk' },
    { pol: 'TR-IST', pod: 'DE-HAM', dep: 'Türkiye', arr: 'Almanya', vessel: 'HMM ALGECIRAS', voyage: '215W', operator: 'HMM' },
    { pol: 'TR-IZM', pod: 'ES-BCN', dep: 'Türkiye', arr: 'İspanya', vessel: 'COSCO SHIPPING UNIVERSE', voyage: '047E', operator: 'COSCO' },
    { pol: 'TR-MER', pod: 'NL-RTM', dep: 'Türkiye', arr: 'Hollanda', vessel: 'EVER GIVEN', voyage: '103W', operator: 'Evergreen' },
    { pol: 'TR-IST', pod: 'BE-ANR', dep: 'Türkiye', arr: 'Belçika', vessel: 'ONE STORK', voyage: '067E', operator: 'ONE' },
    { pol: 'CN-SHA', pod: 'TR-IZM', dep: 'Çin', arr: 'Türkiye', vessel: 'CMA CGM JACQUES SAADE', voyage: '198W', operator: 'CMA CGM' },
    { pol: 'TR-IZM', pod: 'US-NYC', dep: 'Türkiye', arr: 'ABD', vessel: 'MSC GULSUN', voyage: '321E', operator: 'MSC' },
  ];
  seaRoutes.forEach((r, i) => {
    const sale = randFloat(12000, 45000);
    const purchase = sale * randFloat(0.60, 0.78);
    const qty = randInt(15, 50);
    const weight = qty * randFloat(800, 2500);
    const etd = dateOffset(-15 + i * 5);
    const eta = dateOffset(-15 + i * 5 + randInt(20, 35));
    list.push({
      shipment_no: `SEA-${etd.replace(/-/g, '')}-${String(i+1).padStart(3, '0')}`,
      transport_type: 'maritime',
      status: randItem(statuses),
      created_date: etd,
      client_billing: randItem(turkishCustomers),
      sender: randItem(senders),
      receiver: r.arr === 'Türkiye' ? randItem(turkishCustomers) : (receivers[r.arr.slice(0, 2).toUpperCase()] || 'MediaMarkt GmbH'),
      agent: 'Maersk Türkiye Acentası',
      departure_country: r.dep, arrival_country: r.arr,
      goods_description: randItem(['Konteyner FCL yükü', 'Bulk granül', 'Endüstriyel makine parçaları', 'Tekstil ürünleri']),
      gross_weight: weight, quantity: qty, package_count: qty,
      package_type: 'Konteyner',
      incoterm: randItem(['FOB', 'CFR', 'CIF', 'DAP']),
      purchase_price: purchase, sale_price: sale,
      currency_code: randItem(['EUR', 'USD']),
      mode_data: JSON.stringify({
        vessel_name: r.vessel, voyage_no: r.voyage, operator: r.operator,
        pol: r.pol, pod: r.pod,
        mbl_no: `${r.operator.substr(0, 4).toUpperCase()}${randInt(1000000, 9999999)}`,
        hbl_no: `HBL${randInt(100000, 999999)}`,
        etd: etd, eta: eta,
        atd: i < 4 ? etd : null, ata: i < 2 ? eta : null,
        incoterm: 'CIF', container_list: [`MSCU${randInt(1000000, 9999999)}`],
      }),
      financial_data: JSON.stringify(genFinancialData('maritime', sale)),
    });
  });

  // 6 havayolu sevkiyatı
  const airRoutes = [
    { orig: 'IST', dest: 'CDG', dep: 'Türkiye', arr: 'Fransa', airline: 'TK', flight: 'TK1821' },
    { orig: 'IST', dest: 'FRA', dep: 'Türkiye', arr: 'Almanya', airline: 'LH', flight: 'LH1322' },
    { orig: 'IST', dest: 'JFK', dep: 'Türkiye', arr: 'ABD', airline: 'TK', flight: 'TK3' },
    { orig: 'IST', dest: 'DXB', dep: 'Türkiye', arr: 'BAE', airline: 'EK', flight: 'EK122' },
    { orig: 'IST', dest: 'MAD', dep: 'Türkiye', arr: 'İspanya', airline: 'IB', flight: 'IB3127' },
    { orig: 'IST', dest: 'AMS', dep: 'Türkiye', arr: 'Hollanda', airline: 'KL', flight: 'KL1958' },
  ];
  airRoutes.forEach((r, i) => {
    const sale = randFloat(15000, 60000);
    const purchase = sale * randFloat(0.55, 0.75);
    const weight = randFloat(500, 8000);
    const cbm = weight / 167; // volumetric ratio
    const flightDate = dateOffset(-10 + i * 3);
    list.push({
      shipment_no: `AIR-${flightDate.replace(/-/g, '')}-${String(i+1).padStart(3, '0')}`,
      transport_type: 'air',
      status: randItem(statuses),
      created_date: flightDate,
      client_billing: randItem(turkishCustomers),
      sender: randItem(senders),
      receiver: receivers[r.arr.slice(0, 2).toUpperCase()] || 'MediaMarkt GmbH',
      agent: 'Lufthansa Cargo Türkiye',
      departure_country: r.dep, arrival_country: r.arr,
      goods_description: randItem(['Acil teslim elektronik', 'Tıbbi cihaz', 'Yedek parça', 'E-ticaret kargo']),
      gross_weight: weight, quantity: randInt(5, 30), package_count: randInt(5, 30),
      package_type: 'ULD palet',
      incoterm: randItem(['DAP', 'DDP', 'EXW']),
      purchase_price: purchase, sale_price: sale,
      currency_code: 'USD',
      mode_data: JSON.stringify({
        airline_code: r.airline, flight_no: r.flight, flight_date: flightDate,
        origin_airport: r.orig, dest_airport: r.dest,
        mawb_no: `${randInt(100, 999)}-${randInt(10000000, 99999999)}`,
        hawb_no: `H${randInt(100000, 999999)}`,
        volumetric_weight: Number(cbm.toFixed(2)),
        chargeable_weight: Math.max(weight, cbm),
      }),
      financial_data: JSON.stringify(genFinancialData('air', sale)),
    });
  });

  // 8 depo sevkiyatı (storage) - bazılarının stok hareketi olacak
  const warehouseNames = ['Tuzla Antrepo Merkez', 'Pendik Liman Antrepo', 'İzmir Aliağa Depo', 'Mersin Liman Geçici Stok', 'Gebze Lojistik Üssü', 'Atatürk Hava Kargo Antrepo'];
  for (let i = 0; i < 8; i++) {
    const entryDate = dateOffset(-randInt(5, 90));
    const exitDate = i < 4 ? dateOffset(-randInt(0, 5)) : null;  // ilk 4 tamamlanmış
    const kap = randInt(50, 500);
    const dailyRate = randFloat(0.5, 3.5);
    const days = exitDate ? Math.round((new Date(exitDate) - new Date(entryDate)) / 86400000) : Math.round((Date.now() - new Date(entryDate).getTime()) / 86400000);
    const baseCost = kap * dailyRate * days;
    list.push({
      shipment_no: `STO-${entryDate.replace(/-/g, '')}-${String(i+1).padStart(3, '0')}`,
      transport_type: 'storage',
      status: exitDate ? 'closed' : 'in_progress',
      created_date: entryDate,
      client_billing: randItem(turkishCustomers),
      depo_musteri: randItem(turkishCustomers),
      warehouse: randItem(warehouseNames),
      entry_date: entryDate, exit_date: exitDate,
      depo_kap_sayisi: kap,
      depo_ucret_tipi: 'gun',
      depo_gun_ucret: dailyRate,
      depo_hafta_ucret: dailyRate * 6.5,
      depo_ay_ucret: dailyRate * 27,
      depo_toplam_satis: baseCost,
      goods_description: randItem(['Kuru gıda paletleri', 'Elektronik ürün stoku', 'Tekstil hammadde', 'Otomotiv yedek parça stoku']),
      quantity: kap,
      gross_weight: kap * randFloat(20, 80),
      currency_code: 'EUR',
      // Storage data (ell ile birlikte)
      storage_data: JSON.stringify({
        warehouse_code: `W${String(i+1).padStart(3, '0')}`,
        ell: {
          ellecleme_filmleme_sales: randFloat(50, 200),
          ellecleme_filmleme_sales_vat: '18',
          ellecleme_filmleme_cost: randFloat(30, 120),
          ellecleme_filmleme_cost_vat: '18',
          ellecleme_paletleme_sales: randFloat(80, 300),
          ellecleme_paletleme_sales_vat: '18',
          ellecleme_paletleme_cost: randFloat(50, 200),
          ellecleme_paletleme_cost_vat: '18',
          ellecleme_depo_giris_sales: randFloat(100, 400),
          ellecleme_depo_giris_sales_vat: '18',
          ellecleme_depo_giris_cost: randFloat(60, 250),
          ellecleme_depo_giris_cost_vat: '18',
        },
      }),
      financial_data: JSON.stringify(genFinancialData('storage', baseCost * 1.5)),
      // Stok log (ilk 5 tanesi için)
      depo_stock_log: i < 5 ? JSON.stringify([
        { entry_date: entryDate, exit_date: exitDate || '', in: kap, out: 0, note: 'İlk giriş' },
        ...(i < 3 ? [
          { entry_date: dateOffset(-randInt(2, 20) + (-randInt(5, 90))), exit_date: '', in: randInt(20, 100), out: 0, note: 'Ek parti' },
          { entry_date: dateOffset(-randInt(1, 15) + (-randInt(5, 90))), exit_date: '', in: 0, out: randInt(10, 50), note: 'Kısmi sevk' },
        ] : []),
      ]) : '',
    });
  }

  return list.map((s, idx) => ({ ...s, _idx: idx + 1 }));
}

// === Atamalar üret ===

function genAssignments(shipments, vehicles) {
  const assignments = [];
  // Karayolu sevkiyatları için karayolu araçları
  const roadVehicles = vehicles.filter(v => v.transport_type === 'road');
  const seaVehicles = vehicles.filter(v => v.transport_type === 'sea');
  const airVehicles = vehicles.filter(v => v.transport_type === 'air');

  shipments.forEach((s) => {
    let pool = [];
    if (s.transport_type === 'road') pool = roadVehicles;
    else if (s.transport_type === 'maritime') pool = seaVehicles;
    else if (s.transport_type === 'air') pool = airVehicles;
    else return; // storage atama yok

    // Sevkiyatların ~%70'ine atama
    if (Math.random() > 0.3 && pool.length > 0) {
      const v = randItem(pool);
      const totalQty = s.quantity || randInt(20, 100);
      const totalWeight = Number(s.gross_weight || 1000);
      // %80-100 arası atama
      const assignedQty = Math.floor(totalQty * randFloat(0.7, 1));
      const assignedWeight = Math.floor(totalWeight * (assignedQty / totalQty));
      assignments.push({
        _shipmentNo: s.shipment_no,
        _vehiclePlate: v.plate,
        assigned_quantity: assignedQty,
        assigned_weight: assignedWeight,
        loading_date: s.created_date,
        notes: randItem(['Standart yükleme', 'Acil teslim', 'ADR koşullarına dikkat', '', '', 'Soğuk zincir korunmalı']),
      });
    }
  });

  return assignments;
}

// === Ana fonksiyon ===

async function seed() {
  console.log('🌱 Test data seed başlıyor...\n');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (RESET) {
      console.log('🗑️  Reset modu — mevcut veriler siliniyor...');
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
      await conn.execute('TRUNCATE TABLE vehicle_assignments');
      await conn.execute('TRUNCATE TABLE shipments');
      await conn.execute('TRUNCATE TABLE vehicles');
      await conn.execute('TRUNCATE TABLE warehouses');
      await conn.execute('TRUNCATE TABLE partners');
      // users - admin koru, diğerlerini sil
      await conn.execute("DELETE FROM users WHERE username != 'admin'");
      await conn.execute('TRUNCATE TABLE audit_log');
      await conn.execute('TRUNCATE TABLE login_attempts');
      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('   ✓ Reset tamamlandı\n');
    }

    // === Users (admin dışındakileri ekle) ===
    console.log('👤 Kullanıcılar...');
    let userCount = 0;
    for (const u of USERS) {
      const [existing] = await conn.execute('SELECT id FROM users WHERE username = ?', [u.username]);
      if (existing.length > 0) continue;
      const hash = bcrypt.hashSync(u.password, 10);
      await conn.execute(
        'INSERT INTO users (username, password, full_name, email, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [u.username, hash, u.full_name, u.email, u.role, 'active']
      );
      userCount++;
    }
    console.log(`   ✓ ${userCount} yeni kullanıcı eklendi (varolan ${USERS.length - userCount} korundu)`);

    // === Partners ===
    console.log('🏢 Partnerler...');
    const [partnerIdMap] = await conn.execute('SELECT id, company_name FROM partners');
    const existingPartnerNames = new Set(partnerIdMap.map(p => p.company_name));
    let pCount = 0;
    let pId = 0;
    for (const p of PARTNERS) {
      if (existingPartnerNames.has(p.company_name)) continue;
      pId++;
      await conn.execute(
        `INSERT INTO partners (partner_code, type, extra_roles, company_name, physical_address, postal_code, city, country,
         contact_person, contact_email, contact_phone, tax_number, mersis_number, eori_number, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(pId).padStart(5, '0'),
          p.type, (p.extra_roles || []).join(','),
          p.company_name, p.physical_address || '', p.postal_code || '', p.city, p.country,
          p.contact_person || '', p.contact_email || '', p.contact_phone || '',
          p.tax_number || '', p.mersis_number || '', p.eori_number || '',
          1, // admin
        ]
      );
      pCount++;
    }
    console.log(`   ✓ ${pCount} partner eklendi`);

    // === Warehouses ===
    console.log('🏬 Depolar...');
    const [whIdMap] = await conn.execute('SELECT id, name FROM warehouses');
    const existingWhNames = new Set(whIdMap.map(w => w.name));
    let wCount = 0;
    let wId = 0;
    for (const w of WAREHOUSES) {
      if (existingWhNames.has(w.name)) continue;
      wId++;
      await conn.execute(
        `INSERT INTO warehouses (warehouse_code, name, type_code, address, postal_code, city, country,
         capacity_info, responsible_person, contact_phone, contact_email, notes, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `W${String(wId).padStart(3, '0')}`,
          w.name, w.type_code, w.address || '', w.postal_code || '', w.city, w.country,
          w.capacity_info || '', w.responsible_person || '', w.contact_phone || '', w.contact_email || '',
          w.notes || '', 'active', 1,
        ]
      );
      wCount++;
    }
    console.log(`   ✓ ${wCount} depo eklendi`);

    // === Vehicles ===
    console.log('🚛 Araçlar...');
    const [vIdMap] = await conn.execute('SELECT id, plate FROM vehicles');
    const existingPlates = new Set(vIdMap.map(v => v.plate));
    let vCount = 0;
    const prefixMap = { road: 'V', sea: 'VS', air: 'VA' };
    const counters = { road: 0, sea: 0, air: 0 };
    for (const v of VEHICLES) {
      if (existingPlates.has(v.plate)) continue;
      counters[v.transport_type]++;
      const code = prefixMap[v.transport_type] + String(counters[v.transport_type]).padStart(3, '0');
      await conn.execute(
        `INSERT INTO vehicles (vehicle_code, transport_type, plate, trailer_plate, volume_m3, capacity_kg,
         equipment_type, adr_certified, brand_model, driver_name, driver_phone, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code, v.transport_type, v.plate, v.trailer_plate || '',
          v.volume_m3, v.capacity_kg, v.equipment_type, v.adr_certified || 0,
          v.brand_model || '', v.driver_name || '', v.driver_phone || '',
          'active', 1,
        ]
      );
      vCount++;
    }
    console.log(`   ✓ ${vCount} araç eklendi`);

    // === Shipments ===
    console.log('📦 Sevkiyatlar...');
    const shipmentList = genShipments();
    let sCount = 0;
    const insertedShipments = [];
    for (const s of shipmentList) {
      // Mevcut kontrol
      const [exist] = await conn.execute('SELECT id FROM shipments WHERE shipment_no = ?', [s.shipment_no]);
      if (exist.length > 0) {
        insertedShipments.push({ ...s, id: exist[0].id });
        continue;
      }

      const keys = Object.keys(s).filter(k => !k.startsWith('_'));
      const cols = keys.map(k => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      // Date kolonlarında boş string → null (MySQL strict mode için)
      const dateCols = new Set(['created_date', 'entry_date', 'exit_date', 'invoice_date', 'registration_date']);
      const values = keys.map(k => {
        const v = s[k];
        if (dateCols.has(k) && v === '') return null;
        return v;
      });
      const [result] = await conn.execute(
        `INSERT INTO shipments (${cols}, created_by) VALUES (${placeholders}, ?)`,
        [...values, 1]
      );
      insertedShipments.push({ ...s, id: result.insertId });
      sCount++;
    }
    console.log(`   ✓ ${sCount} sevkiyat eklendi (toplam ${insertedShipments.length})`);

    // === Assignments ===
    console.log('🔗 Atamalar...');
    // İsim → ID eşleme
    const [allVehicles] = await conn.execute('SELECT id, plate FROM vehicles');
    const plateToId = Object.fromEntries(allVehicles.map(v => [v.plate, v.id]));

    const assignList = genAssignments(insertedShipments, VEHICLES);
    let aCount = 0;
    for (const a of assignList) {
      const ship = insertedShipments.find(s => s.shipment_no === a._shipmentNo);
      const vid = plateToId[a._vehiclePlate];
      if (!ship || !vid) continue;

      // Mevcut kontrol
      const [exist] = await conn.execute(
        'SELECT id FROM vehicle_assignments WHERE vehicle_id = ? AND shipment_id = ?',
        [vid, ship.id]
      );
      if (exist.length > 0) continue;

      await conn.execute(
        `INSERT INTO vehicle_assignments (vehicle_id, shipment_id, assigned_quantity, assigned_weight, loading_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vid, ship.id, a.assigned_quantity, a.assigned_weight, a.loading_date, a.notes, 1]
      );
      aCount++;
    }
    console.log(`   ✓ ${aCount} atama eklendi`);

    // === Documents_data update (3-stage status karışık) ===
    console.log('📋 Belge durumları...');
    let docCount = 0;
    const docStages = ['missing', 'uploaded', 'approved', 'uploaded', 'approved'];
    for (const s of insertedShipments) {
      // Mevcut documents_data var mı?
      const [existing] = await conn.execute('SELECT documents_data FROM shipments WHERE id = ?', [s.id]);
      if (existing[0].documents_data) continue;

      // Mode başına temel belgeler + rastgele status
      const docs = {};
      const docKeys = s.transport_type === 'maritime' ? ['mbl', 'invoice', 'packing_list', 'customs_dec']
                    : s.transport_type === 'air'      ? ['mawb', 'invoice', 'packing_list', 'customs_dec']
                    : s.transport_type === 'storage'  ? ['invoice', 'packing_list']
                    : ['cmr', 'invoice', 'packing_list', 'customs_dec'];
      docKeys.forEach((k, i) => {
        docs[k] = {
          status: docStages[i % docStages.length],
          uploaded_at: docStages[i % docStages.length] !== 'missing' ? new Date().toISOString() : undefined,
        };
      });
      await conn.execute(
        'UPDATE shipments SET documents_data = ? WHERE id = ?',
        [JSON.stringify(docs), s.id]
      );
      docCount++;
    }
    console.log(`   ✓ ${docCount} sevkiyat için belge durumu eklendi`);

    await conn.commit();
    console.log('\n✅ Seed başarıyla tamamlandı!');

    // Özet
    const [usersN] = await conn.execute('SELECT COUNT(*) AS c FROM users');
    const [partnersN] = await conn.execute('SELECT COUNT(*) AS c FROM partners');
    const [whN] = await conn.execute('SELECT COUNT(*) AS c FROM warehouses');
    const [vN] = await conn.execute('SELECT COUNT(*) AS c FROM vehicles');
    const [sN] = await conn.execute('SELECT COUNT(*) AS c FROM shipments');
    const [aN] = await conn.execute('SELECT COUNT(*) AS c FROM vehicle_assignments');
    console.log('\n📊 Toplam:');
    console.log(`   Kullanıcı:    ${usersN[0].c}`);
    console.log(`   Partner:      ${partnersN[0].c}`);
    console.log(`   Depo:         ${whN[0].c}`);
    console.log(`   Araç:         ${vN[0].c}`);
    console.log(`   Sevkiyat:     ${sN[0].c}`);
    console.log(`   Atama:        ${aN[0].c}`);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Seed başarısız:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
