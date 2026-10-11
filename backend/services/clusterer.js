const stringSimilarity = require('string-similarity');

const SIMILARITY_THRESHOLD = 0.8;
const MIN_TEXT_LENGTH = 30;

// digits, symbols and emojis removed so "same ad, different phone number" still matches
const normalizeText = (t) =>
  (t || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * ads: [{ id, text, extracted }]  (in a stable order)
 * returns an array (same order) of
 *   { clusterId|null, clusterSize, repeatCount, similarCount, relatedIds[] }
 *
 * Two ads are linked if they share a phone / UPI / URL / account number,
 * or if their text is near-identical. Linked ads form a cluster.
 */
function buildClusters(ads) {
  const n = ads.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const shared = ads.map(() => new Set());
  const similar = ads.map(() => new Set());

  // 1) shared identifiers
  const keyMap = new Map();
  ads.forEach((ad, i) => {
    const e = ad.extracted || {};
    const keys = [
      ...(e.phones || []).map((v) => `p:${v}`),
      ...(e.upiIds || []).map((v) => `u:${v}`),
      ...(e.urls || []).map((v) => `l:${v}`),
      ...(e.accountNumbers || []).map((v) => `a:${v}`),
    ];
    keys.forEach((k) => {
      if (!keyMap.has(k)) keyMap.set(k, []);
      keyMap.get(k).push(i);
    });
  });
  keyMap.forEach((idxs) => {
    if (idxs.length < 2) return;
    idxs.forEach((a) => idxs.forEach((b) => { if (a !== b) shared[a].add(b); }));
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);
  });

  // 2) near-duplicate text
  const norm = ads.map((a) => normalizeText(a.text));
  for (let i = 0; i < n; i++) {
    if (norm[i].length < MIN_TEXT_LENGTH) continue;
    for (let j = i + 1; j < n; j++) {
      if (norm[j].length < MIN_TEXT_LENGTH) continue;
      if (stringSimilarity.compareTwoStrings(norm[i], norm[j]) >= SIMILARITY_THRESHOLD) {
        similar[i].add(j);
        similar[j].add(i);
        union(i, j);
      }
    }
  }

  // 3) number the clusters (size > 1)
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }

  const result = ads.map((_, i) => ({
    clusterId: null,
    clusterSize: 1,
    repeatCount: shared[i].size,
    similarCount: similar[i].size,
    relatedIds: [...new Set([...shared[i], ...similar[i]])].map((j) => ads[j].id),
  }));

  let nextId = 1;
  [...groups.values()]
    .filter((g) => g.length > 1)
    .sort((a, b) => Math.min(...a) - Math.min(...b))
    .forEach((g) => {
      const id = nextId++;
      g.forEach((i) => { result[i].clusterId = id; result[i].clusterSize = g.length; });
    });

  return result;
}

module.exports = { buildClusters };