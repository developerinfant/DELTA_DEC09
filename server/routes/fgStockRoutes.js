const express = require('express');
const router = express.Router();
const {
    getFGStockAlerts,
    getFGStockReport,
    updateFGStock,
    configureFGStockCaptureTimes,
    getFGStockCaptureConfig
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

// @desc    Update FG product HSN code and alert threshold
// @route   PUT /api/fg/stock/:id
// @access  Private
router.route('/stock/:id')
    .put(protect, updateFGStock);

// @desc    Configure FG stock capture times
// @route   POST /api/fg/configure-stock-times
// @access  Private (Admin)
router.route('/configure-stock-times')
    .post(protect, configureFGStockCaptureTimes);

// @desc    Get FG stock capture configuration
// @route   GET /api/fg/stock-config
// @access  Private (Admin)
router.route('/stock-config')
    .get(protect, getFGStockCaptureConfig);

module.exports = router;