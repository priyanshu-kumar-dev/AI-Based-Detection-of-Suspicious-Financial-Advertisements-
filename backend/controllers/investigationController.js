
const mongoose = require("mongoose");
const Advertisement = require("../models/Advertisement");
const Investigation = require("../models/Investigation");

const VALID_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "ESCALATED",
  "RESOLVED",
  "FALSE_POSITIVE",
];

async function getOrCreateInvestigation(adId) {
  let investigation = await Investigation.findOne({
    advertisement: adId,
  });

  if (!investigation) {
    investigation = await Investigation.create({
      advertisement: adId,
      status: "NEW",
      history: [
        {
          action: "CREATED",
          toStatus: "NEW",
          details: "Investigation record created",
        },
      ],
    });
  }

  return investigation;
}

// GET /api/investigations
exports.getInvestigations = async (req, res) => {
  try {
    const { status, riskLevel, search } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status filter.",
      });
    }

    const investigationFilter = status ? { status } : {};

    let investigations = await Investigation.find(investigationFilter)
      .populate("advertisement")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    // Risk and text filters are applied to the populated advertisement.
    if (riskLevel) {
      const validRiskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

      if (!validRiskLevels.includes(riskLevel)) {
        return res.status(400).json({
          message: "Invalid risk level filter.",
        });
      }

      investigations = investigations.filter(
        (item) => item.advertisement?.riskLevel === riskLevel
      );
    }

    if (search && typeof search === "string") {
      const term = search.trim().toLowerCase();

      if (term) {
        investigations = investigations.filter((item) => {
          const ad = item.advertisement;
          if (!ad) return false;

          const searchableText = [
            ad.text,
            ad.sourceUrl,
            ...(ad.phones || []),
            ...(ad.urls || []),
            ...(ad.upis || []),
            ...(ad.keywords || []),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(term);
        });
      }
    }

    return res.json({
      count: investigations.length,
      investigations,
    });
  } catch (error) {
    console.error("Get investigations error:", error);

    return res.status(500).json({
      message: "Could not load investigations.",
    });
  }
};

// GET /api/investigations/:adId
exports.getInvestigationByAdId = async (req, res) => {
  try {
    const { adId } = req.params;

    if (!mongoose.isValidObjectId(adId)) {
      return res.status(400).json({
        message: "Invalid advertisement ID.",
      });
    }

    const ad = await Advertisement.findById(adId).lean();

    if (!ad) {
      return res.status(404).json({
        message: "Advertisement not found.",
      });
    }

    const investigation = await getOrCreateInvestigation(adId);

    // Keep the investigation status consistent with the advertisement.
    if (ad.investigationStatus !== investigation.status) {
      await Advertisement.updateOne(
        { _id: adId },
        { $set: { investigationStatus: investigation.status } }
      );

      ad.investigationStatus = investigation.status;
    }

    // Find other advertisements sharing extracted indicators.
    const indicators = [
      ...(ad.phones || []).map((value) => ({ phones: value })),
      ...(ad.upis || []).map((value) => ({ upis: value })),
      ...(ad.urls || []).map((value) => ({ urls: value })),
    ];

    let relatedAdvertisements = [];

    if (indicators.length > 0) {
      relatedAdvertisements = await Advertisement.find({
        _id: { $ne: adId },
        $or: indicators,
      })
        .select(
          "text sourceType sourceUrl phones upis urls score riskLevel investigationStatus createdAt"
        )
        .limit(100)
        .lean();
    }

    return res.json({
      advertisement: ad,
      investigation,
      relatedAdvertisements,
    });
  } catch (error) {
    console.error("Get investigation details error:", error);

    return res.status(500).json({
      message: "Could not load investigation details.",
    });
  }
};

// PATCH /api/investigations/:adId
exports.updateInvestigation = async (req, res) => {
  try {
    const { adId } = req.params;
    const { status, assignedTo, note, author } = req.body || {};

    if (!mongoose.isValidObjectId(adId)) {
      return res.status(400).json({
        message: "Invalid advertisement ID.",
      });
    }

    const ad = await Advertisement.findById(adId);

    if (!ad) {
      return res.status(404).json({
        message: "Advertisement not found.",
      });
    }

    if (
      status === undefined &&
      assignedTo === undefined &&
      note === undefined
    ) {
      return res.status(400).json({
        message: "Provide a status, assignedTo, or note to update.",
      });
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid investigation status.",
      });
    }

    if (
      assignedTo !== undefined &&
      (typeof assignedTo !== "string" ||
        assignedTo.trim().length > 120)
    ) {
      return res.status(400).json({
        message: "Invalid assignee.",
      });
    }

    if (
      note !== undefined &&
      (typeof note !== "string" ||
        !note.trim() ||
        note.trim().length > 2000)
    ) {
      return res.status(400).json({
        message: "Note must contain 1–2000 characters.",
      });
    }

    const investigation = await getOrCreateInvestigation(adId);

    const analyst =
      typeof author === "string" && author.trim()
        ? author.trim().slice(0, 120)
        : "Analyst";

    if (status !== undefined && status !== investigation.status) {
      const previousStatus = investigation.status;

      investigation.status = status;

      investigation.history.push({
        action: "STATUS_CHANGED",
        fromStatus: previousStatus,
        toStatus: status,
        author: analyst,
        details: `Status changed from ${previousStatus} to ${status}`,
      });
    }

    if (assignedTo !== undefined) {
      const newAssignee = assignedTo.trim();
      const previousAssignee = investigation.assignedTo || "";

      if (newAssignee !== previousAssignee) {
        investigation.assignedTo = newAssignee;

        investigation.history.push({
          action: "ASSIGNEE_CHANGED",
          author: analyst,
          details: `Assignee changed from "${previousAssignee}" to "${newAssignee}"`,
        });
      }
    }

    if (note !== undefined) {
      investigation.notes.push({
        text: note.trim(),
        author: analyst,
      });

      investigation.history.push({
        action: "NOTE_ADDED",
        author: analyst,
        details: note.trim(),
      });
    }

    // Save both records when the status changes.
    if (status !== undefined) {
      ad.investigationStatus = investigation.status;
      await ad.save();
    }

    await investigation.save();

    return res.json({
      message: "Investigation updated successfully.",
      investigation,
    });
  } catch (error) {
    console.error("Update investigation error:", error);

    return res.status(500).json({
      message: "Could not update investigation.",
    });
  }
};
