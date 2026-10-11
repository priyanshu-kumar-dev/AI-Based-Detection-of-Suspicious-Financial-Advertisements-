
const Ad = require('../models/Ad');
const { extractEntities } = require('./extractor');
const { scoreAd } = require('./riskScorer');
const { buildClusters } = require('./clusterer');
const { analyzeWithAI } = require('./aiService');

/**
 * Recalculate clusters and risk scores for all saved advertisements.
 */
async function recomputeAll() {
  const ads = await Ad.find()
    .sort({ postedAt: 1, _id: 1 })
    .lean();

  if (!ads.length) {
    return;
  }

  const clusterInput = ads.map((ad) => ({
    id: String(ad._id),
    text: `${ad.text || ''} ${ad.ocrText || ''}`.trim(),
    extracted: ad.extracted || {},
  }));

  const clusters = buildClusters(clusterInput);

  const operations = ads.map((ad, index) => {
    const cluster = clusters[index] || {};

    // Pass the advertisement and its extracted indicators separately.
    const result = scoreAd(
      {
        text: ad.text || '',
        ocrText: ad.ocrText || '',
      },
      ad.extracted || {}
    );

    return {
      updateOne: {
        filter: { _id: ad._id },
        update: {
          $set: {
            riskScore: result.score,
            riskLevel: result.level,
            reasons: result.reasons,
            matchedKeywords: result.matched,
            clusterId: cluster.clusterId || null,
            clusterSize: cluster.clusterSize || 1,
            repeatCount: cluster.repeatCount || 0,
            similarCount: cluster.similarCount || 0,
          },
        },
      },
    };
  });

  if (operations.length) {
    await Ad.bulkWrite(operations, { ordered: false });
  }
}

/**
 * Extract, save, and classify an advertisement.
 */
async function analyzeAndSave(data, io) {
  const text = String(data.text || '');
  const ocrText = String(data.ocrText || '');
  const combinedText = [text, ocrText].filter(Boolean).join('\n');

  const extracted = extractEntities(combinedText);
  const aiVerdict = await analyzeWithAI(combinedText);

  const created = await Ad.create({
    ...data,
    text,
    ocrText,
    extracted,
    ...(aiVerdict ? { aiVerdict } : {}),
  });

  await recomputeAll();

  const ad = await Ad.findById(created._id);

  if (!ad) {
    throw new Error('Advertisement was saved but could not be retrieved.');
  }

  if (io) {
    io.emit('ads:updated');

    if (['HIGH', 'CRITICAL'].includes(ad.riskLevel)) {
      io.emit('alert', {
        _id: ad._id,
        platform: ad.platform,
        text: String(ad.text || '').slice(0, 120),
        riskScore: ad.riskScore,
        riskLevel: ad.riskLevel,
        clusterId: ad.clusterId,
      });
    }
  }

  return ad;
}

module.exports = {
  recomputeAll,
  analyzeAndSave,
};
