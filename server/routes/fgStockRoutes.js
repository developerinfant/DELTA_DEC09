const express = require('express');
const router = express.Router();
const {
    getFGStockAlerts,
    getFGStockReport
} = require('../controllers/fgStockController');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get FG stock alerts
// @route   GET /api/fg/stock-alerts
// @access  Private
router.route('/stock-alerts')
    .get(protect, getFGStockAlerts);

// @desc    Get FG stock report
// @route   GET /api/fg/stock-report
// @access  Private
router.route('/stock-report')
    .get(protect, getFGStockReport);

module.exports = router;