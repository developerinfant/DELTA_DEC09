const express = require('express');
const router = express.Router();
const {
    createDamagedStock,
    getDamagedStockEntries,
    getDamagedStockById,
    updateDamagedStock,
    deleteDamagedStock,
    getDamagedStockSummary
} = require('../controllers/damagedStockController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get damaged stock summary
// @route   GET /api/damaged-stock/summary
// @access  Private
router.route('/summary')
    .get(protect, getDamagedStockSummary);

// @desc    Get all damaged stock entries or create a new one
// @route   GET /api/damaged-stock
// @route   POST /api/damaged-stock
// @access  Private
router.route('/')
    .get(protect, getDamagedStockEntries)
    .post(protect, createDamagedStock);

// @desc    Get a single damaged stock entry, update it, or delete it
// @route   GET /api/damaged-stock/:id
// @route   PUT /api/damaged-stock/:id
// @route   DELETE /api/damaged-stock/:id
// @access  Private
router.route('/:id')
    .get(protect, getDamagedStockById)
    .put(protect, admin, updateDamagedStock)
    .delete(protect, admin, deleteDamagedStock);

module.exports = router;