const express = require('express');
const router = express.Router();
const {
    createFGInvoice,
    getFGInvoices,
    getFGInvoiceById,
    updateFGInvoice,
    deleteFGInvoice
} = require('../controllers/fgInvoiceController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create a new FG invoice
// @route   POST /api/fg/invoices
// @access  Private
router.route('/')
    .post(protect, createFGInvoice);

// @desc    Get all FG invoices
// @route   GET /api/fg/invoices
// @access  Private
router.route('/')
    .get(protect, getFGInvoices);

// @desc    Update a FG invoice
// @route   PUT /api/fg/invoices/:id
// @access  Private/Admin
router.route('/:id')
    .put(protect, admin, updateFGInvoice);

// @desc    Delete a FG invoice
// @route   DELETE /api/fg/invoices/:id
// @access  Private/Admin
router.route('/:id')
    .delete(protect, admin, deleteFGInvoice);

// @desc    Get a single FG invoice by ID
// @route   GET /api/fg/invoices/:id
// @access  Private
router.route('/:id')
    .get(protect, getFGInvoiceById);

module.exports = router;