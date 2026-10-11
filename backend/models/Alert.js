const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    adText: { type: String, required: true },
    riskLevel: { type: String, enum: ['LOW RISK', 'MEDIUM RISK', 'HIGH RISK'], required: true },
    score: { type: Number, required: true },
    extractedPhones: [{ type: String }],
    extractedLinks: [{ type: String }],
    evidence: [{ type: String }],
    status: { type: String, enum: ['Pending', 'Investigating', 'Resolved'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', AlertSchema);
