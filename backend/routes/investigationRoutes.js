
const express = require("express");

const {
  getInvestigations,
  getInvestigationByAdId,
  updateInvestigation,
} = require("../controllers/investigationController");

const router = express.Router();

router.get("/", getInvestigations);
router.get("/:adId", getInvestigationByAdId);
router.patch("/:adId", updateInvestigation);

module.exports = router;
