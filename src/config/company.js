/**
 * Şirket bilgileri — PDF antetlerinde (proforma fatura, dosya kapağı) kullanılır.
 *
 * Değerler ortam değişkenlerinden okunur; böylece adres/vergi no/IBAN değişince
 * kod değiştirmeye gerek kalmaz — EasyPanel'de env düzenleyip yeniden başlatmak yeter.
 * Boş bırakılan satırlar PDF'te hiç basılmaz, yer kaplamaz.
 */
const COMPANY = {
  name: process.env.COMPANY_NAME || 'INTER TRANS MMS',
  tagline: process.env.COMPANY_TAGLINE || 'MULTI MODAL SERVICES',
  address: process.env.COMPANY_ADDRESS || '',
  postalCity: process.env.COMPANY_POSTAL_CITY || '',
  country: process.env.COMPANY_COUNTRY || '',
  phone: process.env.COMPANY_PHONE || '',
  email: process.env.COMPANY_EMAIL || '',
  web: process.env.COMPANY_WEB || '',
  /** TVA intracommunautaire / KDV numarası */
  vatNumber: process.env.COMPANY_VAT || '',
  /** SIRET / SIREN / vergi kimlik no */
  registrationNo: process.env.COMPANY_REG_NO || '',
  eori: process.env.COMPANY_EORI || '',
  bankName: process.env.COMPANY_BANK || '',
  iban: process.env.COMPANY_IBAN || '',
  bic: process.env.COMPANY_BIC || '',
};

/** Antette adres bloğu olarak basılacak satırlar (boş olanlar atlanır). */
function addressLines() {
  return [
    COMPANY.address,
    [COMPANY.postalCity, COMPANY.country].filter(Boolean).join(' '),
    [COMPANY.phone && `Tel: ${COMPANY.phone}`, COMPANY.email].filter(Boolean).join('  ·  '),
    COMPANY.web,
  ].filter((l) => l && String(l).trim());
}

/** Antette kimlik bilgileri satırı (vergi no, SIRET, EORI). */
function identityLines() {
  return [
    COMPANY.vatNumber && `TVA / KDV No: ${COMPANY.vatNumber}`,
    COMPANY.registrationNo && `SIRET / Vergi No: ${COMPANY.registrationNo}`,
    COMPANY.eori && `EORI: ${COMPANY.eori}`,
  ].filter(Boolean);
}

/** Fatura altına basılacak banka bilgisi satırları. */
function bankLines() {
  return [
    COMPANY.bankName && `Banka: ${COMPANY.bankName}`,
    COMPANY.iban && `IBAN: ${COMPANY.iban}`,
    COMPANY.bic && `BIC/SWIFT: ${COMPANY.bic}`,
  ].filter(Boolean);
}

module.exports = { COMPANY, addressLines, identityLines, bankLines };
