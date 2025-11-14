const express = require('express');
const router = express.Router();

// 1. Import controller functions and middleware
const {
    createManager,
    getManagers,
    getManagerById,
    updateManager,
    deleteManager
} = require('../controllers/managerController');

const { protect, admin } = require('../middleware/authMiddleware');

// 2. Define the manager routes

// We can chain the middleware directly to the route definitions.
// Both 'protect' and 'admin' middleware will run in sequence before the controller function.

// @desc    Get all managers OR Create a new manager
// @route   GET /api/managers
// @route   POST /api/managers
// @access  Private/Admin
router.route('/')
    .get(protect, admin, getManagers)
    .post(protect, admin, createManager);


// @desc    Get, update, or delete a single manager by their ID
// @route   GET /api/managers/:id
// @route   PUT /api/managers/:id
// @route   DELETE /api/managers/:id
// @access  Private/Admin
router.route('/:id')
    .get(protect, admin, getManagerById)
    .put(protect, admin, updateManager)
    .delete(protect, admin, deleteManager);


// 3. Export the router
module.exports = router;