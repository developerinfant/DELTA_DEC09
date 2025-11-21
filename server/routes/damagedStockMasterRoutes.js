const express = require('express');
const router = express.Router();
const {
    getDamagedStockMasterEntries,
    getDamagedStockMasterById,
    getDamagedStockHistory,
    getDamagedStockHistoryByMaterial
} = require('../controllers/damagedStockMasterController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all damaged stock master entries
// @route   GET /api/damaged-stock-master
// @access  Private
router.route('/')
    .get(protect, getDamagedStockMasterEntries);

// @desc    Get a single damaged stock master entry
// @route   GET /api/damaged-stock-master/:id
// @access  Private
router.route('/:id')
    .get(protect, getDamagedStockMasterById);

// @desc    Get damaged stock history for a specific master entry
// @route   GET /api/damaged-stock-master/:id/history
// @access  Private
router.route('/:id/history')
    .get(protect, getDamagedStockHistory);

// @desc    Get damaged stock history by material name
// @route   GET /api/damaged-stock-master/history/:materialName
// @access  Private
router.route('/history/:materialName')
    .get(protect, getDamagedStockHistoryByMaterial);

module.exports = router;