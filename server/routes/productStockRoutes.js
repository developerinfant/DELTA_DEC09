const express = require('express');
const router = express.Router();
const {
    getProductStocks,
    getProductStockByName,
    updateProductStock
} = require('../controllers/productStockController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all product stocks
// @route   GET /api/product-stock
// @access  Private
router.route('/')
    .get(protect, getProductStocks);

// @desc    Get a single product stock by name
// @route   GET /api/product-stock/:name
// @access  Private
router.route('/:name')
    .get(protect, getProductStockByName);

// @desc    Update product stock (Admin only)
// @route   PUT /api/product-stock/:name
// @access  Private/Admin
router.route('/:name')
    .put(protect, admin, updateProductStock);

module.exports = router;