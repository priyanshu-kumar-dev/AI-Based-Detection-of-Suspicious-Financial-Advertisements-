
const HIGH_RISK_PATTERNS = [
  'bank account available for rent',
  'bank account for rent',
  'rent your bank account',
  'renting your account',
  'renting bank account',
  'renting an account',
  'rent bank account',
  'rent an account',
  'account available for rent',
  'account for rent',
  'bank accounts for rent',
  'earn commission by renting',
  'earn money by renting',
  'verified bank account for rent',
  'sell bank account',
  'sell your bank account',
  'selling bank accounts',
  'selling verified bank accounts',
  'buy bank account',
  'bank account for sale',
  'account available for sale',
  'sell atm card',
  'sell debit card',
  'sell credit card',
  'buy atm card',
  'buy debit card',
  'buy credit card',
  'current account for sale',
  'savings account for sale',
  'sell current account',
  'sell savings account',
  'kyc bypass',
  'bypass kyc',
  'fake kyc',
];

const MEDIUM_RISK_PATTERNS = [
  'advance payment',
  'instant cash',
  'earn money daily',
  'no verification required',
  'without verification',
  'account on rent',
  'commission guaranteed',
  'urgent payment',
  'account details required',
  'earn commission',
  'without kyc verification',
];

const AWARENESS_PATTERNS = [
  'never sell',
  'never rent',
  'do not sell',
  'do not rent',
  "don't sell",
  "don't rent",
  'dont sell',
  'dont rent',
  'report suspicious ads',
  'report suspicious advertisements',
  'beware of bank account scams',
  'protect your bank account',
  'never share your upi pin',
  'never share your otp',
  'avoid account rental scams',
  'scam awareness',
  'financial fraud awareness',
];

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    ),
  ];
}

function findMatches(text, patterns) {
  const normalizedText = normalize(text);

  return [
    ...new Set(patterns.map(normalize).filter(Boolean)),
  ].filter((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
      'i'
    );

    return regex.test(normalizedText);
  });
}

function hasContactOrPaymentDetails(indicators) {
  return (
    indicators.phones.length > 0 ||
    indicators.urls.length > 0 ||
    indicators.upiIds.length > 0 ||
    indicators.accountNumbers.length > 0 ||
    indicators.ifscCodes.length > 0
  );
}

// Remove clearly warning-oriented clauses before checking for an
// actual sale/rental offer. This prevents "Never sell your account"
// from being treated as an advertisement offering an account for rent.
function getNonWarningText(text) {
  const warningStart =
    /^\s*(?:never\b|do not\b|don't\b|dont\b|beware\b|report\b|protect\b|avoid\b|warning\b|scam awareness\b|financial fraud awareness\b)/i;

  return String(text || '')
    .split(/[.!?;\n]+/)
    .filter((clause) => !warningStart.test(clause.trim()))
    .join(' ');
}

function hasExplicitOffer(text) {
  const offerPatterns = [
    ...HIGH_RISK_PATTERNS,
    'account on rent',
    'atm card available',
    'debit card available',
    'credit card available',
    'current account available',
    'savings account available',
  ];

  return findMatches(getNonWarningText(text), offerPatterns).length > 0;
}

function isAwarenessPost(
  text,
  awarenessMatches,
  indicators
) {
  if (!awarenessMatches.length) return false;

  if (hasContactOrPaymentDetails(indicators)) return false;

  // A real offer in a separate clause takes priority over awareness text.
  if (hasExplicitOffer(text)) return false;

  return true;
}

function getRiskLevel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

function scoreAd(content = {}, indicators = {}) {
  const combinedText = normalize(
    [
      content.text || '',
      content.ocrText || '',
    ].filter(Boolean).join(' ')
  );

  const normalizedIndicators = {
    phones: uniqueStrings(indicators.phones),
    urls: uniqueStrings(indicators.urls),
    upiIds: uniqueStrings(indicators.upiIds || indicators.upis),
    accountNumbers: uniqueStrings(indicators.accountNumbers),
    ifscCodes: uniqueStrings(indicators.ifscCodes),
  };

  const awarenessMatches = findMatches(
    combinedText,
    AWARENESS_PATTERNS
  );

  const highMatches = findMatches(
    combinedText,
    HIGH_RISK_PATTERNS
  );

  const mediumMatches = findMatches(
    combinedText,
    MEDIUM_RISK_PATTERNS
  );

  const awarenessPost = isAwarenessPost(
    combinedText,
    awarenessMatches,
    normalizedIndicators
  );

  if (awarenessPost) {
    return {
      score: 0,
      level: 'LOW',
      riskLevel: 'LOW',
      reasons: [
        'Warning/awareness context detected; financial phrases were not treated as a sale offer.',
      ],
      matched: [],
      awarenessPost: true,
      safeHits: awarenessMatches,
      highHits: [],
      mediumHits: [],
    };
  }

  let score = 0;
  const reasons = [];

  if (highMatches.length > 0) {
    score += Math.min(highMatches.length * 35, 55);
    reasons.push(
      `High-risk phrases found: ${highMatches.join(', ')}`
    );
  }

  if (mediumMatches.length > 0) {
    score += Math.min(mediumMatches.length * 10, 20);
    reasons.push(
      `Supporting phrases found: ${mediumMatches.join(', ')}`
    );
  }

  const {
    phones,
    urls,
    upiIds,
    accountNumbers,
    ifscCodes,
  } = normalizedIndicators;

  if (phones.length > 0) {
    score += Math.min(phones.length * 4, 8);
    reasons.push(`Contact number(s) extracted: ${phones.join(', ')}`);
  }

  if (urls.length > 0) {
    score += Math.min(urls.length * 5, 10);
    reasons.push(`URL(s) extracted: ${urls.join(', ')}`);
  }

  if (upiIds.length > 0) {
    score += Math.min(upiIds.length * 7, 14);
    reasons.push(`UPI identifier(s) extracted: ${upiIds.join(', ')}`);
  }

  if (accountNumbers.length > 0) {
    score += Math.min(accountNumbers.length * 5, 10);
    reasons.push('Possible bank account number(s) detected.');
  }

  if (ifscCodes.length > 0) {
    score += Math.min(ifscCodes.length * 5, 10);
    reasons.push('Possible IFSC code(s) detected.');
  }

  const supportingCategories = [
    phones.length > 0,
    urls.length > 0,
    upiIds.length > 0,
    accountNumbers.length > 0,
    ifscCodes.length > 0,
    mediumMatches.length > 0,
  ].filter(Boolean).length;

  if (highMatches.length > 0 && supportingCategories >= 2) {
    score += 8;
    reasons.push(
      'High-risk language is supported by multiple indicator categories.'
    );
  }

  // A matched high-risk phrase cannot receive a LOW score.
  if (highMatches.length > 0) {
    score = Math.max(score, 60);
  }

  score = Math.min(Math.round(score), 100);

  if (reasons.length === 0) {
    reasons.push(
      'No indicators covered by the current rules were found.'
    );
  }

  const level = getRiskLevel(score);

  return {
    score,
    level,
    riskLevel: level,
    reasons: [...new Set(reasons)],
    matched: [...new Set([...highMatches, ...mediumMatches])],
    awarenessPost: false,
    safeHits: awarenessMatches,
    highHits: highMatches,
    mediumHits: mediumMatches,
  };
}

module.exports = { scoreAd };
