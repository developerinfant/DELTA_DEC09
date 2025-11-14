const express = require('express');
const router = express.Router();
const {
    createFGDeliveryChallan,
    getFGDeliveryChallans,
    getFGDeliveryChallanById,
    updateFGDeliveryChallan
} = require('../controllers/fgDeliveryChallanController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create a new FG delivery challan
// @route   POST /api/fg/delivery-challan
// @access  Private
router.route('/')
    .post(protect, createFGDeliveryChallan);

// @desc    Get all FG delivery challans
// @route   GET /api/fg/delivery-challan
// @access  Private
router.route('/')
    .get(protect, getFGDeliveryChallans);

// @desc    Update a FG delivery challan
// @route   PUT /api/fg/delivery-challan/:id
// @access  Private/Admin
router.route('/:id')
    .put(protect, admin, updateFGDeliveryChallan);

// @desc    Get a single FG delivery challan by ID
// @route   GET /api/fg/delivery-challan/:id
// @access  Private
router.route('/:id')
    .get(protect, getFGDeliveryChallanById);

module.exports = router;