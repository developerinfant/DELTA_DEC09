const express = require('express');
const router = express.Router();
const {
    getFGStockAlerts,
    getFGStockReport,
    updateFGStock,
    getFGStockRecord
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

// @desc    Get FG stock record with date range
// @route   GET /api/fg/stock-record
// @access  Private
router.route('/stock-record')
    .get(protect, getFGStockRecord);

// @desc    Update FG product HSN code and alert threshold
// @route   PUT /api/fg/stock/:id
// @access  Private
router.route('/stock/:id')
    .put(protect, updateFGStock);

module.exports = router;