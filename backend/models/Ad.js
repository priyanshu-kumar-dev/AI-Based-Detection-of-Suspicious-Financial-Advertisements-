
const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      default: 'other',
      lowercase: true,
      trim: true,
    },

    text: { type: String, required: true },
    ocrText: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    postedBy: { type: String, default: 'unknown' },
    sourceUrl: { type: String, default: '' },
    postedAt: { type: Date, default: Date.now },

    extracted: {
      phones: { type: [String], default: [] },
      urls: { type: [String], default: [] },
      upiIds: { type: [String], default: [] },
      accountNumbers: { type: [String], default: [] },
      ifscCodes: { type: [String], default: [] },
    },

    matchedKeywords: { type: [String], default: [] },

    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // CRITICAL is included because the dashboard already displays it.
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },

    reasons: { type: [String], default: [] },

    // Duplicate / related advertisement analysis
    clusterId: { type: Number, default: null },
    clusterSize: { type: Number, default: 1 },
    repeatCount: { type: Number, default: 0 },
    similarCount: { type: Number, default: 0 },

    // Investigation workflow
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'FALSE_POSITIVE'],
      default: 'PENDING',
      index: true,
    },

    investigationStatus: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },

    investigationNotes: {
      type: String,
      default: '',
      maxlength: 5000,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: String,
      default: '',
      trim: true,
    },

    assignedTo: {
      type: String,
      default: '',
      trim: true,
    },

    aiVerdict: {
      label: { type: String },
      confidence: { type: Number },
      reason: { type: String },
    },
  },
  { timestamps: true }
);

adSchema.index({ riskLevel: 1, riskScore: -1 });
adSchema.index({ clusterId: 1 });
adSchema.index({ 'extracted.phones': 1 });
adSchema.index({ 'extracted.upiIds': 1 });
adSchema.index({ 'extracted.urls': 1 });

module.exports = mongoose.model('Ad', adSchema);
