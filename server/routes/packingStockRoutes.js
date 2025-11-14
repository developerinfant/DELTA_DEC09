const express = require('express');
const router = express.Router();

// Import controller functions and middleware
const {
    getPackingMaterialStockReport,
    getPackingMaterialStockByName
} = require('../controllers/materialController');

const { protect } = require('../middleware/authMiddleware');

// @desc    Get packing material stock report
// @route   GET /api/packing/material-stock-report
// @access  Private
router.route('/material-stock-report')
    .get(protect, getPackingMaterialStockReport);

// @desc    Get packing material stock by name
// @route   GET /api/packing/material-stock/:materialName
// @access  Private
router.route('/material-stock/:materialName')
    .get(protect, getPackingMaterialStockByName);

// Export the router
module.exports = router;