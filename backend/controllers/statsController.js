const Ad = require('../models/Ad');

// repeated phones / UPI IDs / links across ads
const topRepeated = async (field, type) => {
  const rows = await Ad.aggregate([
    { $unwind: `$extracted.${field}` },
    { $group: { _id: `$extracted.${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  return rows.map((r) => ({ type, value: r._id, count: r.count }));
};

// GET /api/stats
exports.getStats = async (_req, res, next) => {
  try {
    const [total, levels, platforms, clusterIds, phones, upis, urls] = await Promise.all([
      Ad.countDocuments(),
      Ad.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
      Ad.aggregate([{ $group: { _id: '$platform', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Ad.distinct('clusterId', { clusterId: { $ne: null } }),
      topRepeated('phones', 'Phone'),
      topRepeated('upiIds', 'UPI ID'),
      topRepeated('urls', 'Link'),
    ]);

    const byRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    levels.forEach((l) => { byRisk[l._id] = l.count; });

    res.json({
      total,
      byRisk,
      byPlatform: platforms.map((p) => ({ platform: p._id, count: p.count })),
      clusters: clusterIds.length,
      topContacts: [...phones, ...upis, ...urls].sort((a, b) => b.count - a.count).slice(0, 8),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/alerts  -> latest high-risk ads
exports.getAlerts = async (_req, res, next) => {
  try {
    const ads = await Ad.find({ riskLevel: 'HIGH' }).sort({ createdAt: -1 }).limit(10);
    res.json(ads);
  } catch (err) {
    next(err);
  }
};