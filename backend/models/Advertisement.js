const mongoose = require("mongoose");

const EvidenceSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    indicator: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const AdvertisementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    ocrText: { type: String, default: "" },

    sourceType: {
      type: String,
      enum: ["TEXT", "URL", "IMAGE", "PUBLIC_SAMPLE"],
      default: "TEXT",
    },
    sourceUrl: { type: String, default: "" },
    imagePath: { type: String, default: "" },
    collectedAt: { type: Date, default: Date.now },

    keywords: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    urls: { type: [String], default: [] },
    upis: { type: [String], default: [] },

    score: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
    },

    evidence: { type: [EvidenceSchema], default: [] },

    // Investigation workflow
    investigationStatus: {
      type: String,
      enum: ["NEW", "UNDER_REVIEW", "ESCALATED", "CLOSED"],
      default: "NEW",
    },

    // Alert review workflow
    reviewStatus: {
      type: String,
      enum: ["PENDING", "REVIEWED", "FALSE_POSITIVE"],
      default: "PENDING",
    },

    investigationNotes: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
  },
  { timestamps: true }
);

AdvertisementSchema.index({ riskLevel: 1, score: -1 });
AdvertisementSchema.index({ investigationStatus: 1, reviewStatus: 1 });
AdvertisementSchema.index({ phones: 1 });
AdvertisementSchema.index({ upis: 1 });
AdvertisementSchema.index({ urls: 1 });

module.exports = mongoose.model("Advertisement", AdvertisementSchema);