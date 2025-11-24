const express = require('express');
const router = express.Router();

// Import controller functions and middleware
const {
    getPackingMaterialStockReport,
    getPackingMaterialStockReportByDateRange, // Add this new function
    getPackingMaterialStockByName,
    configureStockCaptureTimes, // Add this new function
    getStockCaptureConfig // Add this new function
} = require('../controllers/materialController');

const { protect } = require('../middleware/authMiddleware');

// @desc    Get packing material stock report
// @route   GET /api/packing/material-stock-report
// @access  Private
router.route('/material-stock-report')
    .get(protect, getPackingMaterialStockReport);

// @desc    Get packing material stock report with date range
// @route   GET /api/packing/material-stock-report-range
// @access  Private
router.route('/material-stock-report-range')
    .get(protect, getPackingMaterialStockReportByDateRange);

// @desc    Configure stock capture times
// @route   POST /api/packing/configure-stock-times
// @access  Private (Admin)
router.route('/configure-stock-times')
    .post(protect, configureStockCaptureTimes);

// @desc    Get stock capture configuration
// @route   GET /api/packing/stock-config
// @access  Private (Admin)
router.route('/stock-config')
    .get(protect, getStockCaptureConfig);

// @desc    Get packing material stock by name
// @route   GET /api/packing/material-stock/:materialName
// @access  Private
router.route('/material-stock/:materialName')
    .get(protect, getPackingMaterialStockByName);

// Export the router
module.exports = router;