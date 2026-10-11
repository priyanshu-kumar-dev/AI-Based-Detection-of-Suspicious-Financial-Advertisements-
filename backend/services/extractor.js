
/**
 * Extract phone numbers, URLs, UPI IDs, account numbers and IFSC codes
 * from advertisement text or OCR output.
 */

const PHONE_RE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s,;)]+|\b(?:t\.me|wa\.me|bit\.ly|tinyurl\.com|chat\.whatsapp\.com)\/[^\s,;)]+/gi;

const UPI_RE =
  /(?<![\w.])[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,15}(?!\w|\.[a-zA-Z])/g;

const ACCOUNT_RE = /(?<!\d)\d{11,18}(?!\d)/g;

const IFSC_RE = /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi;

function unique(values) {
  return [...new Set(values)];
}

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 12 && digits.startsWith('91')
    ? digits.slice(-10)
    : digits.slice(-10);
}

function normalizeUrl(raw) {
  return raw
    .replace(/[.!?]+$/, '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function extractEntities(text = '') {
  const input = String(text || '');

  const phones = unique(
    (input.match(PHONE_RE) || [])
      .map(normalizePhone)
      .filter((phone) => /^[6-9]\d{9}$/.test(phone))
  );

  const urls = unique(
    (input.match(URL_RE) || []).map(normalizeUrl)
  );

  const upiIds = unique(
    (input.match(UPI_RE) || []).map((value) => value.toLowerCase())
  );

  // Remove detected phone numbers before checking long numeric sequences.
  const withoutPhones = input.replace(PHONE_RE, ' ');
  const accountNumbers = unique(
    withoutPhones.match(ACCOUNT_RE) || []
  );

  const ifscCodes = unique(
    (input.match(IFSC_RE) || []).map((value) => value.toUpperCase())
  );

  return {
    phones,
    urls,
    upiIds,
    accountNumbers,
    ifscCodes,
  };
}

module.exports = { extractEntities };
