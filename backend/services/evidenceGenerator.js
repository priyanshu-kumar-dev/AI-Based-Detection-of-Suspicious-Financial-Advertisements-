
const generateEvidence = (
  matched = [],
  phones = [],
  urls = [],
  upis = [],
  originalText = "",
  risk = {}
) => {
  const evidence = [];
  const seen = new Set();

  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const add = (type, indicator, reason) => {
    const cleanIndicator = String(indicator ?? "").trim();
    const cleanReason = String(reason ?? "").trim();

    if (!cleanIndicator || !cleanReason) return;

    // Remove duplicate entries even if capitalization or spacing differs.
    const key = `${normalize(type)}|${normalize(cleanIndicator)}`;

    if (seen.has(key)) return;
    seen.add(key);

    evidence.push({
      type,
      indicator: cleanIndicator,
      reason: cleanReason,
    });
  };

  const awarenessPost = risk.awarenessPost === true;

  // 1. Awareness / warning context
  if (awarenessPost) {
    add(
      "AWARENESS_CONTEXT",
      "warning_or_awareness",
      "Warning or awareness context detected. Review the full context before classifying this as a suspicious offer."
    );
  }

  // 2. Matched suspicious phrases
  if (!awarenessPost && Array.isArray(matched)) {
    for (const phrase of matched) {
      const cleanPhrase = String(phrase ?? "").trim();

      if (!cleanPhrase) continue;

      add(
        "SUSPICIOUS_KEYWORD",
        cleanPhrase,
        `Matched financial-risk phrase: "${cleanPhrase}". Review the complete advertisement context.`
      );
    }
  }

  // 3. Extracted phone numbers
  for (const phone of Array.isArray(phones) ? phones : []) {
    add(
      "PHONE_NUMBER",
      phone,
      "A contact number was extracted. Its presence alone does not establish fraud; investigate its context and repeated appearances."
    );
  }

  // 4. Extracted URLs
  for (const url of Array.isArray(urls) ? urls : []) {
    add(
      "URL",
      url,
      "A URL or social-platform link was extracted. Review its destination and surrounding text."
    );
  }

  // 5. Extracted UPI identifiers
  for (const upi of Array.isArray(upis) ? upis : []) {
    add(
      "PAYMENT_IDENTIFIER",
      upi,
      "A payment identifier was extracted. Its presence alone does not establish fraud."
    );
  }

  // 6. Unique risk reasons
  const reasons = Array.isArray(risk.reasons) ? risk.reasons : [];
  const uniqueReasons = [
    ...new Map(
      reasons
        .map((reason) => String(reason ?? "").trim())
        .filter(Boolean)
        .map((reason) => [normalize(reason), String(reason).trim()])
    ).values(),
  ];

  for (const reason of uniqueReasons) {
    add("RISK_REASON", reason, reason);
  }

  return evidence;
};

module.exports = generateEvidence;
