const express = require('express');
const { getStats, getAlerts } = require('../controllers/statsController');

const router = express.Router();
router.get('/stats', getStats);
router.get('/alerts', getAlerts);

module.exports = router;