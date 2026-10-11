const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getAds,
  getAdById,
  analyzeAd,
  ingestUrl,
  ingestImage,
  ingestSamples,
  getDuplicateAds,
  getCampaigns,
  updateInvestigation,
  getRelatedAds,
} = require("../controllers/adController");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const allowedExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      const error = new Error(
        "Only PNG, JPEG and WebP images are allowed."
      );
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

// Specific GET routes first
router.get("/duplicates", getDuplicateAds);
router.get("/campaigns", getCampaigns);

// Advertisement ingestion
router.post("/analyze", analyzeAd);
router.post("/ingest-samples", ingestSamples);
router.post("/ingest-url", ingestUrl);

router.post(
  "/ingest-image",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        err.status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      } else {
        err.status = err.status || 400;
      }

      return next(err);
    });
  },
  ingestImage
);

// Investigation/review updates
router.patch("/:id/investigation", updateInvestigation);
router.patch("/:id/review", updateInvestigation);

// Related advertisements
router.get("/:id/related", getRelatedAds);

// List and detail routes
router.get("/", getAds);
router.get("/:id", getAdById);

module.exports = router;