const express = require('express');
const router = express.Router();
const {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getNextSupplierCode,
    getSuppliersByJobberType
} = require('../controllers/supplierController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get next supplier code
// @route   GET /api/suppliers/next-supplier-code
// @access  Private
router.route('/next-supplier-code')
    .get(protect, getNextSupplierCode);

// @desc    Get suppliers by jobber type
// @route   GET /api/suppliers/jobber/:type
// @access  Private
router.route('/jobber/:type')
    .get(protect, getSuppliersByJobberType);

// @desc    Get all suppliers OR Create a new supplier
// @route   GET /api/suppliers
// @route   POST /api/suppliers
// @access  Private
router.route('/')
    .get(protect, getSuppliers)
    .post(protect, createSupplier);

// @desc    Get, update, or delete a single supplier by their ID
// @route   GET /api/suppliers/:id
// @route   PUT /api/suppliers/:id
// @route   DELETE /api/suppliers/:id
// @access  Private
router.route('/:id')
    .get(protect, getSupplierById)
    .put(protect, updateSupplier)
    .delete(protect, admin, deleteSupplier);

module.exports = router;