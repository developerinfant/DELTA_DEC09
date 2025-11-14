const express = require('express');
const router = express.Router();
const {
    createFGBuyer,
    getFGBuyers,
    getFGBuyerById,
    updateFGBuyer,
    deleteFGBuyer,
    getNextBuyerCode
} = require('../controllers/fgBuyerController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get next buyer code
// @route   GET /api/fg/buyers/next-buyer-code
// @access  Private
router.route('/next-buyer-code')
    .get(protect, getNextBuyerCode);

// @desc    Create a new FG buyer
// @route   POST /api/fg/buyers
// @access  Private
router.route('/')
    .post(protect, createFGBuyer);

// @desc    Get all FG buyers
// @route   GET /api/fg/buyers
// @access  Private
router.route('/')
    .get(protect, getFGBuyers);

// @desc    Update a FG buyer
// @route   PUT /api/fg/buyers/:id
// @access  Private/Admin
router.route('/:id')
    .put(protect, admin, updateFGBuyer);

// @desc    Delete a FG buyer
// @route   DELETE /api/fg/buyers/:id
// @access  Private/Admin
router.route('/:id')
    .delete(protect, admin, deleteFGBuyer);

// @desc    Get a single FG buyer by ID
// @route   GET /api/fg/buyers/:id
// @access  Private
router.route('/:id')
    .get(protect, getFGBuyerById);

module.exports = router;