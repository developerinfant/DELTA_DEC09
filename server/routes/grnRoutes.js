const express = require('express');
const router = express.Router();
const {
    createGRN,
    getGRNs,
    getGRNById,
    updateGRN,
    approveOrRejectGRN,
    getMaterialPriceHistory,
    getSupplierPriceComparison,
    checkPOForGRN,
    getWeeklyGRNStats,
    getGRNItemsForDamagedStock
} = require('../controllers/grnController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get weekly GRN statistics
// @route   GET /api/grn/weekly-stats
// @access  Private
router.route('/weekly-stats')
    .get(protect, getWeeklyGRNStats);

// @desc    Check if GRN exists for a PO and return appropriate action
// @route   GET /api/grn/check-po/:poId
// @access  Private
router.route('/check-po/:poId')
    .get(protect, checkPOForGRN);

// @desc    Get all GRNs or create a new one
// @route   GET /api/grn
// @route   POST /api/grn
// @access  Private
router.route('/')
    .get(protect, getGRNs)
    .post(protect, createGRN);

// @desc    Approve or reject a GRN
// @route   PUT /api/grn/:id/approve
// @access  Private/Admin
router.route('/:id/approve')
    .put(protect, admin, approveOrRejectGRN);

// @desc    Get price history for a material
// @route   GET /api/grn/price-history/:materialId/:materialModel
// @access  Private
router.route('/price-history/:materialId/:materialModel')
    .get(protect, getMaterialPriceHistory);

// @desc    Get supplier price comparison for a material
// @route   GET /api/grn/supplier-comparison/:materialId/:materialModel
// @access  Private
router.route('/supplier-comparison/:materialId/:materialModel')
    .get(protect, getSupplierPriceComparison);

// @desc    Get a single GRN by its ID or update it
// @route   GET /api/grn/:id
// @route   PUT /api/grn/:id
// @access  Private
router.route('/:id')
    .get(protect, getGRNById)
    .put(protect, updateGRN);

// @desc    Get GRN items for damaged stock recording
// @route   GET /api/grn/:id/damaged-items
// @access  Private
router.route('/:id/damaged-items')
    .get(protect, getGRNItemsForDamagedStock);

module.exports = router;