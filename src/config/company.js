/**
 * Şirket bilgileri — PDF antetlerinde (proforma fatura, dosya kapağı) kullanılır.
 *
 * Değerler ortam değişkenlerinden okunur; böylece adres/vergi no/IBAN değişince
 * kod değiştirmeye gerek kalmaz — EasyPanel'de env düzenleyip yeniden başlatmak yeter.
 * Boş bırakılan satırlar PDF'te hiç basılmaz, yer kaplamaz.
 */
const path = require('path');

const COMPANY = {
  name: process.env.COMPANY_NAME || 'INTER TRANS MMS',
  tagline: process.env.COMPANY_TAGLINE || 'MULTI MODAL SERVICES',
  address: process.env.COMPANY_ADDRESS || '5 Avenue du Beaumontoir',
  postalCity: process.env.COMPANY_POSTAL_CITY || '95380 Louvres',
  country: process.env.COMPANY_COUNTRY || 'France',
  phone: process.env.COMPANY_PHONE || '01 34 04 10 10',
  email: process.env.COMPANY_EMAIL || 'factures@intertransmms.com',
  web: process.env.COMPANY_WEB || 'www.intertransmms.com',
  /**
   * Antet görseli (logo + ünvan + adres bloğu). Varsa PDF'e resim olarak basılır,
   * yoksa yukarıdaki metin alanlarından antet kurulur.
   */
  letterheadPath: process.env.COMPANY_LETTERHEAD
    || path.join(__dirname, '..', '..', 'assets', 'letterhead.png'),
  /** TVA intracommunautaire */
  vatNumber: process.env.COMPANY_VAT || 'FR80 538664335',
  /** SIRET */
  registrationNo: process.env.COMPANY_REG_NO || '538 664 335 00048',
  eori: process.env.COMPANY_EORI || '',
  /** Sermaye (Fransız faturalarında zorunlu bilgi) */
  capital: process.env.COMPANY_CAPITAL || '50 000 €',
  bankName: process.env.COMPANY_BANK || 'BNP Paribas',
  iban: process.env.COMPANY_IBAN || 'FR76 3000 4006 0800 0100 8618 565',
  bic: process.env.COMPANY_BIC || 'BNPAFRPPXXX',
};

/** Antette adres bloğu olarak basılacak satırlar (boş olanlar atlanır). */
function addressLines() {
  return [
    COMPANY.address,
    [COMPANY.postalCity, COMPANY.country].filter(Boolean).join(' '),
    [COMPANY.phone && `Tél : ${COMPANY.phone}`, COMPANY.email].filter(Boolean).join('  ·  '),
    COMPANY.web,
  ].filter((l) => l && String(l).trim());
}

/**
 * Antette kimlik bilgileri satırı (vergi no, SIRET, EORI).
 * Etiketler Fransızca: bu blok Fransızca basılan proforma faturada kullanılıyor.
 */
function identityLines() {
  return [
    COMPANY.vatNumber && `N° TVA : ${COMPANY.vatNumber}`,
    COMPANY.registrationNo && `SIRET : ${COMPANY.registrationNo}`,
    COMPANY.eori && `EORI : ${COMPANY.eori}`,
  ].filter(Boolean);
}

/** Fatura altına basılacak banka bilgisi satırları (Fransızca etiketli). */
function bankLines() {
  return [
    COMPANY.bankName && `Banque : ${COMPANY.bankName}`,
    COMPANY.iban && `IBAN : ${COMPANY.iban}`,
    COMPANY.bic && `BIC / SWIFT : ${COMPANY.bic}`,
  ].filter(Boolean);
}

/**
 * Belge altına basılan yasal künye — Fransız faturalarında zorunlu bilgiler
 * (ünvan, sermaye, SIRET, TVA intracommunautaire, banka).
 * Müşterinin gönderdiği antet bilgisiyle birebir aynı düzende.
 */
function legalFooterLines() {
  const line1 = [
    COMPANY.name,
    COMPANY.capital && `CAPITAL : ${COMPANY.capital}`,
    COMPANY.registrationNo && `Siret : ${COMPANY.registrationNo}`,
  ].filter(Boolean).join(' · ');
  const line2 = COMPANY.vatNumber ? `TVA Intracommunautaire : ${COMPANY.vatNumber}` : '';
  const line3 = [
    COMPANY.iban && `IBAN : ${COMPANY.iban}`,
    COMPANY.bic && `BIC : ${COMPANY.bic}`,
  ].filter(Boolean).join(' / ');
  return [line1, line2, line3].filter((l) => l && l.trim());
}

module.exports = { COMPANY, addressLines, identityLines, bankLines, legalFooterLines };
