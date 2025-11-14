const express = require('express');
const router = express.Router();
const {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    getWeeklyPOStats
} = require('../controllers/purchaseOrderController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get weekly PO statistics
// @route   GET /api/purchase-orders/weekly-stats
// @access  Private
router.route('/weekly-stats')
    .get(protect, getWeeklyPOStats);

// @desc    Get all POs OR Create a new PO
// @route   GET /api/purchase-orders
// @route   POST /api/purchase-orders
// @access  Private
router.route('/')
    .get(protect, getPurchaseOrders)
    .post(protect, createPurchaseOrder);

// @desc    Update PO status (cancel/re-order)
// @route   PUT /api/purchase-orders/:id/status
// @access  Private/Admin
router.route('/:id/status')
    .put(protect, admin, updatePurchaseOrderStatus);

// @desc    Get, update, or delete a single PO by its ID
// @route   GET /api/purchase-orders/:id
// @route   PUT /api/purchase-orders/:id
// @route   DELETE /api/purchase-orders/:id
// @access  Private
router.route('/:id')
    .get(protect, getPurchaseOrderById)
    .put(protect, updatePurchaseOrder)
    .delete(protect, admin, deletePurchaseOrder);

module.exports = router;