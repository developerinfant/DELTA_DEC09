const express = require('express');
const router = express.Router();
const {
    createDeliveryChallan,
    getDeliveryChallans,
    getDeliveryChallanById,
    updateDeliveryChallan
} = require('../controllers/deliveryChallanController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Create a new delivery challan
// @route   POST /api/delivery-challan
// @access  Private
router.route('/')
    .post(protect, createDeliveryChallan);

// @desc    Get all delivery challans
// @route   GET /api/delivery-challan
// @access  Private
router.route('/')
    .get(protect, getDeliveryChallans);

// @desc    Update a delivery challan
// @route   PUT /api/delivery-challan/:id
// @access  Private/Admin
router.route('/:id')
    .put(protect, admin, updateDeliveryChallan);

// @desc    Get a single delivery challan by ID
// @route   GET /api/delivery-challan/:id
// @access  Private
router.route('/:id')
    .get(protect, getDeliveryChallanById);

module.exports = router;