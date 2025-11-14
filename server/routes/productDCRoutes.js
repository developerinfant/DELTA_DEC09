const express = require('express');
const router = express.Router();
const {
    createProductDC,
    getProductDCs,
    getProductDCById,
    generateProductDCPDF
} = require('../controllers/productDCController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create a new Product DC (Dispatch Certificate) / Invoice
// @route   POST /api/products/dc/create
// @access  Private
router.route('/create')
    .post(protect, createProductDC);

// @desc    Get all Product DCs
// @route   GET /api/products/dc/list
// @access  Private
router.route('/list')
    .get(protect, getProductDCs);

// @desc    Get a specific Product DC by ID
// @route   GET /api/products/dc/:id
// @access  Private
router.route('/:id')
    .get(protect, getProductDCById);

// @desc    Generate PDF for a Product DC
// @route   GET /api/products/dc/:id/pdf
// @access  Private
router.route('/:id/pdf')
    .get(protect, generateProductDCPDF);

module.exports = router;