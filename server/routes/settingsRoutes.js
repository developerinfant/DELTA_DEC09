const express = require('express');
const router = express.Router();

// 1. Import controller functions and middleware
const {
    getAllManagersWithAccess,
    updateManagerModuleAccess,
    getManagerModuleAccess,
    cloneManagerPermissions
} = require('../controllers/settingsController');

const { protect, admin } = require('../middleware/authMiddleware');

// 2. Define the settings routes

// @desc    Get all managers with their module access settings
// @route   GET /api/settings/managers
// @access  Private/Admin
router.route('/managers')
    .get(protect, admin, getAllManagersWithAccess);

// @desc    Get or update a manager's module access settings
// @route   GET /api/settings/managers/:id/module-access
// @route   PUT /api/settings/managers/:id/module-access
// @access  Private/Admin
router.route('/managers/:id/module-access')
    .get(protect, admin, getManagerModuleAccess)
    .put(protect, admin, updateManagerModuleAccess);

// @desc    Clone permissions from another manager
// @route   POST /api/settings/managers/:id/clone-permissions
// @access  Private/Admin
router.route('/managers/:id/clone-permissions')
    .post(protect, admin, cloneManagerPermissions);

// 3. Export the router
module.exports = router;