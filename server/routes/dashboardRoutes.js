const express = require('express');
const router = express.Router();
const {
    getPackingSummary,
    getFinishedSummary,
    getGRNAnalytics,
    getPOStats,
    getStockDistribution,
    getStockAlerts
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get packing materials summary
// @route   GET /api/dashboard/packing-summary
// @access  Private
router.route('/packing-summary')
    .get(protect, getPackingSummary);

// @desc    Get finished goods summary
// @route   GET /api/dashboard/finished-summary
// @access  Private
router.route('/finished-summary')
    .get(protect, getFinishedSummary);

// @desc    Get GRN analytics
// @route   GET /api/dashboard/grn-analytics
// @access  Private
router.route('/grn-analytics')
    .get(protect, getGRNAnalytics);

// @desc    Get PO stats
// @route   GET /api/dashboard/po-stats
// @access  Private
router.route('/po-stats')
    .get(protect, getPOStats);

// @desc    Get stock distribution
// @route   GET /api/dashboard/stock-distribution
// @access  Private
router.route('/stock-distribution')
    .get(protect, getStockDistribution);

// @desc    Get stock alerts
// @route   GET /api/dashboard/stock-alerts
// @access  Private
router.route('/stock-alerts')
    .get(protect, getStockAlerts);

module.exports = router;