const express = require('express');
const router = express.Router();
// PO-based GRN functions
const { createGRN: createPackingGRN, updateGRN: updatePackingGRN, approveOrRejectGRN, checkPOForGRN } = require('../controllers/packingGRNController');

// DC-based GRN functions
const { createGRN: createFGGRN, updateGRN: updateFGGRN } = require('../controllers/fgGRNController');

// Shared functions (keeping these in the original controller for now)
const { 
    getGRNs,
    getGRNById,
    getMaterialPriceHistory,
    getSupplierPriceComparison,
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
    .post(protect, (req, res, next) => {
        // Determine which controller to use based on request body
        if (req.body.purchaseOrderId) {
            // PO-based GRN
            createPackingGRN(req, res, next);
        } else if (req.body.deliveryChallanId) {
            // DC-based GRN
            createFGGRN(req, res, next);
        } else {
            // Default to original controller for backward compatibility
            require('../controllers/grnController').createGRN(req, res, next);
        }
    });

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
    .put(protect, (req, res, next) => {
        // Determine which controller to use based on existing GRN
        require('../models/GRN').findById(req.params.id)
            .then(grn => {
                if (grn) {
                    if (grn.sourceType === 'purchase_order') {
                        // PO-based GRN
                        updatePackingGRN(req, res, next);
                    } else if (grn.sourceType === 'jobber') {
                        // DC-based GRN
                        updateFGGRN(req, res, next);
                    } else {
                        // Default to original controller for backward compatibility
                        require('../controllers/grnController').updateGRN(req, res, next);
                    }
                } else {
                    // GRN not found, use original controller
                    require('../controllers/grnController').updateGRN(req, res, next);
                }
            })
            .catch(err => {
                // Error fetching GRN, use original controller
                require('../controllers/grnController').updateGRN(req, res, next);
            });
    });

// @desc    Get GRN items for damaged stock recording
// @route   GET /api/grn/:id/damaged-items
// @access  Private
router.route('/:id/damaged-items')
    .get(protect, getGRNItemsForDamagedStock);

module.exports = router;