const express = require('express');
const router = express.Router();
const {
    createFinishedGood,
    getFinishedGoods,
    updateFinishedGoodPricing,
    getProductionRecords,
    getJobberProductivityReport,
    getDailyProductionReport,
    getProductWiseReport
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create a new Finished Good entry
// @route   POST /api/products/finished-goods
// @access  Private
router.route('/finished-goods')
    .post(protect, createFinishedGood);

// @desc    Get all Finished Goods
// @route   GET /api/products/finished-goods
// @access  Private
router.route('/finished-goods')
    .get(protect, getFinishedGoods);

// @desc    Update finished good pricing and tax details
// @route   PATCH /api/products/finished-goods/:id
// @access  Private
router.route('/finished-goods/:id')
    .patch(protect, updateFinishedGoodPricing);

// @desc    Get all Production Records
// @route   GET /api/products/production-records
// @access  Private
router.route('/production-records')
    .get(protect, getProductionRecords);

// @desc    Get jobber productivity report
// @route   GET /api/products/reports/jobber-productivity
// @access  Private
router.route('/reports/jobber-productivity')
    .get(protect, getJobberProductivityReport);

// @desc    Get daily production report
// @route   GET /api/products/reports/daily-production
// @access  Private
router.route('/reports/daily-production')
    .get(protect, getDailyProductionReport);

// @desc    Get product-wise FG report
// @route   GET /api/products/reports/product-wise
// @access  Private
router.route('/reports/product-wise')
    .get(protect, getProductWiseReport);

module.exports = router;