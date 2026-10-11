
const mongoose = require("mongoose");

const investigationSchema = new mongoose.Schema(
  {
    advertisement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "NEW",
        "UNDER_REVIEW",
        "ESCALATED",
        "RESOLVED",
        "FALSE_POSITIVE",
      ],
      default: "NEW",
      index: true,
    },

    assignedTo: {
      type: String,
      default: "",
      trim: true,
    },

    notes: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 2000,
        },
        author: {
          type: String,
          default: "Analyst",
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    history: [
      {
        action: {
          type: String,
          required: true,
        },
        fromStatus: {
          type: String,
          default: "",
        },
        toStatus: {
          type: String,
          default: "",
        },
        details: {
          type: String,
          default: "",
          maxlength: 2000,
        },
        author: {
          type: String,
          default: "Analyst",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Investigation", investigationSchema);
