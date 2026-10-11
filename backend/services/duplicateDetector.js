
const crypto = require("crypto");

function normalizeText(text = "") {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}@._\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateTextHash(text = "") {
  const normalized = normalizeText(text);

  if (!normalized) return null;

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}

function normalizeIndicators(values = []) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort();
}

function createFingerprints(ad = {}) {
  const text = ad.text || ad.originalText || ad.content || "";

  return {
    textHash: generateTextHash(text),
    phones: normalizeIndicators(ad.phones || ad.phoneNumbers),
    upis: normalizeIndicators(ad.upis || ad.upiIds),
    urls: normalizeIndicators(ad.urls || ad.links),
  };
}

function detectDuplicate(candidate = {}, existingAds = []) {
  const candidateFp = createFingerprints(candidate);
  const matches = [];

  for (const existing of existingAds) {
    const existingFp = createFingerprints(existing);

    const sharedPhones = candidateFp.phones.filter((item) =>
      existingFp.phones.includes(item)
    );

    const sharedUpis = candidateFp.upis.filter((item) =>
      existingFp.upis.includes(item)
    );

    const sharedUrls = candidateFp.urls.filter((item) =>
      existingFp.urls.includes(item)
    );

    const exactDuplicate =
      candidateFp.textHash !== null &&
      candidateFp.textHash === existingFp.textHash;

    const hasSharedIndicators =
      sharedPhones.length > 0 ||
      sharedUpis.length > 0 ||
      sharedUrls.length > 0;

    if (exactDuplicate || hasSharedIndicators) {
      matches.push({
        advertisementId: existing._id || existing.id || null,
        exactDuplicate,
        sharedIndicators: {
          phones: sharedPhones,
          upis: sharedUpis,
          urls: sharedUrls,
        },
        matchType: exactDuplicate
          ? "EXACT_TEXT_MATCH"
          : "SHARED_INDICATORS",
      });
    }
  }

  return {
    isDuplicate: matches.some((match) => match.exactDuplicate),
    hasRelatedAdvertisements: matches.length > 0,
    matchCount: matches.length,
    matches,
    fingerprints: candidateFp,
  };
}

module.exports = {
  normalizeText,
  generateTextHash,
  createFingerprints,
  detectDuplicate,
};
