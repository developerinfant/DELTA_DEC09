const express = require('express');
const router = express.Router();
const {
    createFGDriver,
    getFGDrivers,
    getFGDriverById,
    updateFGDriver,
    deleteFGDriver,
    getNextDriverCode
} = require('../controllers/fgDriverController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get next driver code
// @route   GET /api/fg/drivers/next-driver-code
// @access  Private
router.route('/next-driver-code')
    .get(protect, getNextDriverCode);

// @desc    Create a new FG driver
// @route   POST /api/fg/drivers
// @access  Private
router.route('/')
    .post(protect, createFGDriver);

// @desc    Get all FG drivers
// @route   GET /api/fg/drivers
// @access  Private
router.route('/')
    .get(protect, getFGDrivers);

// @desc    Update a FG driver
// @route   PUT /api/fg/drivers/:id
// @access  Private/Admin
router.route('/:id')
    .put(protect, admin, updateFGDriver);

// @desc    Delete a FG driver
// @route   DELETE /api/fg/drivers/:id
// @access  Private/Admin
router.route('/:id')
    .delete(protect, admin, deleteFGDriver);

// @desc    Get a single FG driver by ID
// @route   GET /api/fg/drivers/:id
// @access  Private
router.route('/:id')
    .get(protect, getFGDriverById);

module.exports = router;