const mongoose = require("mongoose");
const Tesseract = require("tesseract.js");
const fs = require("fs/promises");

const Advertisement = require("../models/Advertisement");

const detectPhone = require("../services/phoneDetector");
const detectURL = require("../services/urlDetector");
const detectUPI = require("../services/upiDetector");
const { scoreAd } = require("../services/riskScorer");
const generateEvidence = require("../services/evidenceGenerator");
const { fetchSourceText } = require("../services/sourceFetcher");
const { detectDuplicate } = require("../services/duplicateDetector");

// --------------------------------------------------
// Common helpers
// --------------------------------------------------

function getErrorStatus(error, fallback = 500) {
  const status = Number(error.status || error.statusCode);
  return status >= 400 && status <= 599 ? status : fallback;
}

function sendError(res, error, label, fallbackMessage) {
  console.error(`${label}:`, {
    message: error.message,
    status: error.status,
    statusCode: error.statusCode,
    code: error.code,
  });

  return res.status(getErrorStatus(error)).json({
    message: error.message || fallbackMessage,
    code: error.code || "REQUEST_FAILED",
  });
}

async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Uploaded-file cleanup error:", error.message);
    }
  }
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function normalizeIndicator(value, type = "") {
  let result = String(value || "").trim().toLowerCase();

  if (type === "URL") {
    result = result
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }

  return result;
}

function normalizeCampaignText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}@.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCampaignTokens(text) {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "to", "for", "of",
    "in", "on", "is", "are", "your", "with", "by",
    "this", "that", "contact", "call", "whatsapp",
    "available", "earn", "me", "my", "our", "from",
  ]);

  return new Set(
    normalizeCampaignText(text)
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

function calculateTextSimilarity(textA, textB) {
  const a = getCampaignTokens(textA);
  const b = getCampaignTokens(textB);

  if (!a.size || !b.size) return 0;

  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function getRiskLevelFromScore(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function safeScore(ad) {
  const score = Number(ad.score);
  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : 0;
}

/**
 * Clean common OCR mistakes for financial ads (phones, UPI, keywords).
 */
function cleanupOcrText(raw) {
  let text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!text) return "";

  // Fix OCR confusions near digits / phones (O→0, l/I→1)
  text = text.replace(/\b[\dOoIl|]{8,15}\b/g, (token) =>
    token
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1")
  );

  // Common UPI / payment OCR fixes
  text = text
    .replace(/\b([a-z0-9._]{2,})[@®©]([a-z]{2,})\b/gi, "$1@$2")
    .replace(/\bpaytrn\b/gi, "paytm")
    .replace(/\bphonepe\b/gi, "phonepe")
    .replace(/\bgpay\b/gi, "gpay");

  // Join broken financial phrases split across lines
  text = text
    .replace(/bank\s*\n\s*account/gi, "bank account")
    .replace(/account\s*\n\s*available/gi, "account available")
    .replace(/for\s*\n\s*rent/gi, "for rent")
    .replace(/advance\s*\n\s*payment/gi, "advance payment")
    .replace(/without\s*\n\s*kyc/gi, "without kyc")
    .replace(/earn\s*\n\s*commission/gi, "earn commission");

  return text.replace(/\s+/g, " ").trim();
}

// --------------------------------------------------
// Save and analyze advertisement
// --------------------------------------------------

async function saveAdvertisement({
  text,
  sourceType = "TEXT",
  sourceUrl = "",
  imagePath = "",
  ocrText = "",
}) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    const error = new Error("No advertisement text was found.");
    error.status = 422;
    error.code = "EMPTY_ADVERTISEMENT_TEXT";
    throw error;
  }

  const phones = detectPhone(cleanText) || [];
  const urls = detectURL(cleanText) || [];
  const upis = detectUPI(cleanText) || [];

  const existingAds = await Advertisement.find({})
    .select(
      "_id text phones urls upis score riskLevel sourceType sourceUrl imagePath createdAt"
    )
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const duplicateResult = detectDuplicate(
    { text: cleanText, phones, upis, urls },
    existingAds
  );

  const exactMatch = duplicateResult.matches?.find(
    (match) => match.exactDuplicate
  );

  if (exactMatch) {
    const existingAd = existingAds.find(
      (ad) => String(ad._id) === String(exactMatch.advertisementId)
    );

    if (existingAd) {
      return {
        ...existingAd,
        adText: existingAd.text,
        extractedPhones: existingAd.phones || [],
        extractedLinks: existingAd.urls || [],
        extractedUpis: existingAd.upis || [],
        duplicateDetection: {
          isDuplicate: true,
          hasRelatedAdvertisements: true,
          matchCount: duplicateResult.matchCount,
          matches: duplicateResult.matches,
        },
      };
    }
  }

  const risk = scoreAd(
    { text: cleanText, ocrText },
    { phones, urls, upiIds: upis }
  );

  const keywords = risk.matched || [];

  const evidence = generateEvidence(
    keywords,
    phones,
    urls,
    upis,
    cleanText,
    risk
  );

  const ad = await Advertisement.create({
    text: cleanText,
    ocrText,
    sourceType,
    sourceUrl,
    imagePath,
    keywords,
    phones,
    urls,
    upis,
    score: risk.score,
    riskLevel: risk.level,
    evidence,
  });

  return {
    ...ad.toObject(),
    adText: ad.text,
    extractedPhones: ad.phones,
    extractedLinks: ad.urls,
    extractedUpis: ad.upis,
    duplicateDetection: {
      isDuplicate: false,
      hasRelatedAdvertisements:
        duplicateResult.hasRelatedAdvertisements || false,
      matchCount: duplicateResult.matchCount || 0,
      matches: duplicateResult.matches || [],
    },
  };
}

// --------------------------------------------------
// POST /api/ads/analyze
// --------------------------------------------------

const analyzeAd = async (req, res) => {
  try {
    const alert = await saveAdvertisement({
      text: req.body?.text,
      sourceType: "TEXT",
    });

    return res
      .status(alert.duplicateDetection?.isDuplicate ? 200 : 201)
      .json({
        message: alert.duplicateDetection?.isDuplicate
          ? "Exact duplicate found. Existing advertisement returned."
          : "Advertisement analyzed successfully.",
        alert,
      });
  } catch (error) {
    return sendError(
      res,
      error,
      "Analyze advertisement error",
      "Failed to analyze advertisement."
    );
  }
};

// --------------------------------------------------
// POST /api/ads/ingest-url
// --------------------------------------------------

const ingestUrl = async (req, res) => {
  try {
    const inputUrl = req.body?.url;

    if (typeof inputUrl !== "string" || !inputUrl.trim()) {
      return res.status(400).json({
        message: "A source URL is required.",
        code: "URL_REQUIRED",
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(inputUrl.trim());
    } catch {
      return res.status(400).json({
        message: "Please provide a valid URL.",
        code: "INVALID_URL",
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        message: "Only HTTP and HTTPS URLs are allowed.",
        code: "UNSUPPORTED_PROTOCOL",
      });
    }

    const source = await fetchSourceText(parsedUrl.href);

    if (!source || !String(source.text || "").trim()) {
      return res.status(422).json({
        message: "No readable advertisement text was found at this URL.",
        code: "NO_READABLE_TEXT",
      });
    }

    const alert = await saveAdvertisement({
      text: source.text,
      sourceType: "URL",
      sourceUrl: source.sourceUrl || parsedUrl.href,
    });

    return res
      .status(alert.duplicateDetection?.isDuplicate ? 200 : 201)
      .json({
        message: alert.duplicateDetection?.isDuplicate
          ? "Duplicate webpage content found. Existing advertisement returned."
          : "Webpage content collected and analyzed.",
        alert,
      });
  } catch (error) {
    console.error("URL ingestion failure:", {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
    });

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Could not ingest this URL.",
      code: error.code || "URL_INGEST_FAILED",
    });
  }
};

// --------------------------------------------------
// POST /api/ads/ingest-image  (improved OCR)
// --------------------------------------------------

const ingestImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please upload an image.",
      code: "IMAGE_REQUIRED",
    });
  }

  let keepUploadedFile = false;

  try {
    // Try multiple page segmentation modes; keep the best confidence result
    const psmModes = ["6", "3", "4", "11"];
    let best = { text: "", confidence: -1, psm: null };

    for (const psm of psmModes) {
      try {
        const result = await Tesseract.recognize(req.file.path, "eng", {
          logger: () => {},
          tessedit_pageseg_mode: psm,
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._:+-()/₹$%&,.'\" ",
          preserve_interword_spaces: "1",
        });

        const raw = String(result?.data?.text || "").trim();
        const confidence = Number(result?.data?.confidence ?? 0);

        if (raw && confidence > best.confidence) {
          best = { text: raw, confidence, psm };
        }
      } catch (err) {
        console.warn(`OCR PSM ${psm} failed:`, err.message);
      }
    }

    // Fallback if all PSM modes failed
    if (!best.text) {
      const fallback = await Tesseract.recognize(req.file.path, "eng");
      best.text = String(fallback?.data?.text || "").trim();
      best.confidence = Number(fallback?.data?.confidence ?? 0);
    }

    const ocrText = cleanupOcrText(best.text);

    if (!ocrText) {
      return res.status(422).json({
        message: "OCR could not extract readable text from this image.",
        code: "OCR_NO_TEXT",
      });
    }

    const alert = await saveAdvertisement({
      text: ocrText,
      ocrText,
      sourceType: "IMAGE",
      imagePath: `/uploads/${req.file.filename}`,
    });

    keepUploadedFile = !alert.duplicateDetection?.isDuplicate;

    return res
      .status(alert.duplicateDetection?.isDuplicate ? 200 : 201)
      .json({
        message: alert.duplicateDetection?.isDuplicate
          ? "Duplicate image text found. Existing advertisement returned."
          : "Image OCR completed and advertisement analyzed.",
        extractedText: ocrText,
        ocrConfidence: best.confidence,
        ocrPsm: best.psm,
        alert,
      });
  } catch (error) {
    return sendError(
      res,
      error,
      "Image ingestion error",
      "Could not process the uploaded image."
    );
  } finally {
    if (!keepUploadedFile) {
      await removeUploadedFile(req.file.path);
    }
  }
};

// --------------------------------------------------
// POST /api/ads/ingest-samples
// --------------------------------------------------

const ingestSamples = async (_req, res) => {
  const samples = [
    "DEMO: Bank account available for rent. Call 9876543210. Advance payment on dealer786@paytm. Join t.me/bankaccsell",
    "DEMO: ATM card and current account available. KYC completed. Contact 9876543211",
    "DEMO: Warning: Never sell or rent your bank account. Report suspicious messages to your bank.",
  ];

  try {
    const alerts = [];

    for (const text of samples) {
      alerts.push(
        await saveAdvertisement({
          text,
          sourceType: "PUBLIC_SAMPLE",
        })
      );
    }

    const newCount = alerts.filter(
      (alert) => !alert.duplicateDetection?.isDuplicate
    ).length;

    return res.status(200).json({
      message: "Demonstration samples processed.",
      count: newCount,
      duplicateCount: alerts.length - newCount,
      alerts,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Sample ingestion error",
      "Could not import demonstration samples."
    );
  }
};

// --------------------------------------------------
// GET /api/ads
// --------------------------------------------------

const getAds = async (_req, res) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    return res.status(200).json(ads);
  } catch (error) {
    return sendError(
      res,
      error,
      "Get advertisements error",
      "Failed to fetch advertisements."
    );
  }
};

// --------------------------------------------------
// GET /api/ads/:id
// --------------------------------------------------

const getAdById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }

    const ad = await Advertisement.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    return res.status(200).json(ad);
  } catch (error) {
    return sendError(
      res,
      error,
      "Get advertisement by ID error",
      "Failed to fetch advertisement."
    );
  }
};

// --------------------------------------------------
// GET /api/ads/duplicates
// --------------------------------------------------

const getDuplicateAds = async (_req, res) => {
  try {
    const ads = await Advertisement.find({})
      .select(
        "_id text phones urls upis score riskLevel sourceType sourceUrl createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const indicatorMap = new Map();

    function addIndicator(type, rawValue, ad) {
      const value = normalizeIndicator(rawValue, type);
      if (!value) return;

      const key = `${type}:${value}`;

      if (!indicatorMap.has(key)) {
        indicatorMap.set(key, { type, indicator: value, ads: new Map() });
      }

      indicatorMap.get(key).ads.set(String(ad._id), ad);
    }

    for (const ad of ads) {
      for (const value of ad.phones || []) {
        addIndicator("PHONE_NUMBER", value, ad);
      }
      for (const value of ad.upis || []) {
        addIndicator("UPI_ID", value, ad);
      }
      for (const value of ad.urls || []) {
        addIndicator("URL", value, ad);
      }
    }

    const duplicates = [];

    for (const group of indicatorMap.values()) {
      const matchedAds = [...group.ads.values()];
      if (matchedAds.length < 2) continue;

      duplicates.push({
        type: group.type,
        indicator: group.indicator,
        occurrenceCount: matchedAds.length,
        highestRiskScore: Math.max(...matchedAds.map(safeScore)),
        ads: matchedAds.map((ad) => ({
          id: ad._id,
          text: ad.text || "",
          score: safeScore(ad),
          riskLevel: ad.riskLevel || "LOW",
          sourceType: ad.sourceType || "UNKNOWN",
          sourceUrl: ad.sourceUrl || "",
          createdAt: ad.createdAt || null,
        })),
      });
    }

    duplicates.sort(
      (a, b) =>
        b.highestRiskScore - a.highestRiskScore ||
        b.occurrenceCount - a.occurrenceCount
    );

    const duplicateIds = new Set();

    for (const group of duplicates) {
      for (const ad of group.ads) duplicateIds.add(String(ad.id));
    }

    return res.status(200).json({
      message: "Duplicate detection completed successfully.",
      summary: {
        advertisementsScanned: ads.length,
        duplicateGroups: duplicates.length,
        duplicateAds: duplicateIds.size,
      },
      duplicates,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Duplicate lookup error",
      "Failed to detect duplicate indicators."
    );
  }
};

// --------------------------------------------------
// GET /api/ads/campaigns
// --------------------------------------------------

const getCampaigns = async (_req, res) => {
  try {
    const ads = await Advertisement.find({})
      .select(
        "_id text phones urls upis score riskLevel sourceType sourceUrl createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const count = ads.length;
    const parent = Array.from({ length: count }, (_, i) => i);
    const rank = Array(count).fill(0);
    const edgeReasons = new Map();
    const indicatorOwners = new Map();

    function find(i) {
      if (parent[i] !== i) parent[i] = find(parent[i]);
      return parent[i];
    }

    function union(a, b) {
      let ra = find(a);
      let rb = find(b);
      if (ra === rb) return;

      if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
      parent[rb] = ra;
      if (rank[ra] === rank[rb]) rank[ra]++;
    }

    function connect(a, b, reason) {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;

      if (!edgeReasons.has(key)) edgeReasons.set(key, new Set());
      edgeReasons.get(key).add(reason);
      union(a, b);
    }

    ads.forEach((ad, index) => {
      const indicators = [
        ...(ad.phones || []).map((v) => ["PHONE_NUMBER", v]),
        ...(ad.upis || []).map((v) => ["UPI_ID", v]),
        ...(ad.urls || []).map((v) => ["URL", v]),
      ];

      for (const [type, rawValue] of indicators) {
        const value = normalizeIndicator(rawValue, type);
        if (!value) continue;

        const key = `${type}:${value}`;

        if (!indicatorOwners.has(key)) {
          indicatorOwners.set(key, { type, value, owners: new Set() });
        }

        const owners = indicatorOwners.get(key).owners;

        for (const previous of owners) {
          connect(index, previous, `${type}:${value}`);
        }

        owners.add(index);
      }
    });

    const SIMILARITY_THRESHOLD = 0.55;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const similarity = calculateTextSimilarity(ads[i].text, ads[j].text);

        if (similarity >= SIMILARITY_THRESHOLD) {
          connect(i, j, `SIMILAR_TEXT:${Math.round(similarity * 100)}%`);
        }
      }
    }

    const components = new Map();

    for (let i = 0; i < count; i++) {
      const root = find(i);
      if (!components.has(root)) components.set(root, []);
      components.get(root).push(i);
    }

    const campaignCandidates = [];

    for (const indexes of components.values()) {
      if (indexes.length < 2) continue;

      const campaignAds = indexes.map((i) => ads[i]);
      const indexSet = new Set(indexes);
      const sharedIndicators = [];

      for (const indicator of indicatorOwners.values()) {
        const matchingIndexes = indexes.filter((i) => {
          const ad = ads[i];
          const values =
            indicator.type === "PHONE_NUMBER"
              ? ad.phones
              : indicator.type === "UPI_ID"
                ? ad.upis
                : ad.urls;

          return (values || []).some(
            (v) => normalizeIndicator(v, indicator.type) === indicator.value
          );
        });

        if (matchingIndexes.length >= 2) {
          sharedIndicators.push({
            type: indicator.type,
            value: indicator.value,
            occurrenceCount: matchingIndexes.length,
          });
        }
      }

      const similarTextPairs = [];

      for (const [key, reasons] of edgeReasons.entries()) {
        const [a, b] = key.split(":").map(Number);
        if (!indexSet.has(a) || !indexSet.has(b)) continue;

        if (![...reasons].some((r) => r.startsWith("SIMILAR_TEXT:"))) continue;

        similarTextPairs.push({
          adIds: [String(ads[a]._id), String(ads[b]._id)],
          similarityPercent: Math.round(
            calculateTextSimilarity(ads[a].text, ads[b].text) * 100
          ),
        });
      }

      const dates = campaignAds
        .map((ad) => new Date(ad.createdAt).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

      const scores = campaignAds.map(safeScore);
      const highestRiskScore = Math.max(...scores);
      const averageRiskScore = Math.round(
        scores.reduce((sum, s) => sum + s, 0) / scores.length
      );

      const riskDistribution = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      for (const score of scores) {
        riskDistribution[getRiskLevelFromScore(score)]++;
      }

      const gaps = dates.slice(1).map((date, i) =>
        Math.round((date - dates[i]) / 60000)
      );

      campaignCandidates.push({
        advertisementCount: campaignAds.length,
        campaignRiskLevel: getRiskLevelFromScore(highestRiskScore),
        highestRiskScore,
        averageRiskScore,
        riskDistribution,
        correlationSummary: {
          sharedIndicators,
          similarTextPairs,
          sharedIndicatorCount: sharedIndicators.length,
          similarTextPairCount: similarTextPairs.length,
        },
        postingPattern: {
          firstSeen: dates.length ? new Date(dates[0]) : null,
          lastSeen: dates.length ? new Date(dates[dates.length - 1]) : null,
          postsInLast24Hours: dates.length
            ? dates.filter((d) => d >= dates[dates.length - 1] - 86400000).length
            : 0,
          averageGapMinutes: gaps.length
            ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)
            : null,
        },
        ads: campaignAds.map((ad) => ({
          id: ad._id,
          text: ad.text || "",
          score: safeScore(ad),
          riskLevel: ad.riskLevel || "LOW",
          sourceType: ad.sourceType || "UNKNOWN",
          sourceUrl: ad.sourceUrl || "",
          createdAt: ad.createdAt || null,
        })),
      });
    }

    campaignCandidates.sort(
      (a, b) =>
        b.highestRiskScore - a.highestRiskScore ||
        b.advertisementCount - a.advertisementCount
    );

    const campaigns = campaignCandidates.map((campaign, i) => ({
      campaignId: `CMP-${String(i + 1).padStart(3, "0")}`,
      ...campaign,
    }));

    const adsInCampaigns = new Set(
      campaigns.flatMap((c) => c.ads.map((ad) => String(ad.id)))
    );

    return res.status(200).json({
      message: "Advertisement campaign correlation completed.",
      summary: {
        advertisementsScanned: ads.length,
        campaignsDetected: campaigns.length,
        advertisementsInCampaigns: adsInCampaigns.size,
        correlationMethods: [
          "SHARED_PHONE_NUMBER",
          "SHARED_UPI_ID",
          "SHARED_URL",
          "SIMILAR_TEXT",
          "POSTING_TIME_ANALYSIS",
        ],
      },
      campaigns,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Campaign correlation error",
      "Failed to correlate advertisements into campaigns."
    );
  }
};

// --------------------------------------------------
// PATCH /api/ads/:id/review
// PATCH /api/ads/:id/investigation
// --------------------------------------------------

const updateInvestigation = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }

    const {
      reviewStatus,
      investigationStatus,
      investigationNotes,
      reviewedBy,
      assignedTo,
    } = req.body || {};

    const allowedReviewStatuses = [
      "PENDING",
      "REVIEWED",
      "FALSE_POSITIVE",
    ];

    const allowedInvestigationStatuses = [
      "NEW",
      "UNDER_REVIEW",
      "ESCALATED",
      "CLOSED",
    ];

    if (
      reviewStatus !== undefined &&
      !allowedReviewStatuses.includes(reviewStatus)
    ) {
      return res.status(400).json({
        message: "Invalid review status.",
        allowed: allowedReviewStatuses,
      });
    }

    if (
      investigationStatus !== undefined &&
      !allowedInvestigationStatuses.includes(investigationStatus)
    ) {
      return res.status(400).json({
        message: "Invalid investigation status.",
        allowed: allowedInvestigationStatuses,
      });
    }

    const ad = await Advertisement.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    if (reviewStatus !== undefined) {
      ad.reviewStatus = reviewStatus;
      ad.reviewedAt = reviewStatus === "PENDING" ? null : new Date();
    }

    if (reviewedBy !== undefined) {
      ad.reviewedBy = String(reviewedBy).trim();
    }

    if (investigationStatus !== undefined) {
      ad.investigationStatus = investigationStatus;
    }

    if (investigationNotes !== undefined) {
      ad.investigationNotes = String(investigationNotes).trim();
    }

    if (assignedTo !== undefined) {
      ad.assignedTo = String(assignedTo).trim();
    }

    await ad.save();

    const savedAd = await Advertisement.findById(ad._id).lean();

    return res.status(200).json({
      message: "Investigation updated and saved successfully.",
      advertisement: savedAd,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Update investigation error",
      "Failed to save investigation changes."
    );
  }
};

// --------------------------------------------------
// GET /api/ads/:id/related
// --------------------------------------------------

const getRelatedAds = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }

    const ad = await Advertisement.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    const conditions = [];

    if (ad.phones?.length) conditions.push({ phones: { $in: ad.phones } });
    if (ad.upis?.length) conditions.push({ upis: { $in: ad.upis } });
    if (ad.urls?.length) conditions.push({ urls: { $in: ad.urls } });

    if (ad.sourceUrl?.trim()) {
      conditions.push({ sourceUrl: ad.sourceUrl.trim() });
    }

    if (!conditions.length) {
      return res.status(200).json({ count: 0, relatedAds: [] });
    }

    const relatedAds = await Advertisement.find({
      _id: { $ne: ad._id },
      $or: conditions,
    })
      .select(
        "text sourceType sourceUrl phones upis urls score riskLevel evidence reviewStatus investigationStatus createdAt"
      )
      .sort({ score: -1, createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      count: relatedAds.length,
      relatedAds,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Related advertisements error",
      "Failed to fetch related advertisements."
    );
  }
};

module.exports = {
  analyzeAd,
  ingestUrl,
  ingestImage,
  ingestSamples,
  getAds,
  getAdById,
  getDuplicateAds,
  getCampaigns,
  updateInvestigation,
  getRelatedAds,
};