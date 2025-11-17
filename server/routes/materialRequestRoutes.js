const express = require('express');
const router = express.Router();

// Import controller functions and middleware
const {
    createMaterialRequest,
    getMaterialRequests,
    getMaterialRequestById,
    updateMaterialRequestStatus,
    deleteMaterialRequest
} = require('../controllers/materialRequestController');

const { protect } = require('../middleware/authMiddleware');

// @desc    Create a new material request
// @route   POST /api/material-requests
// @access  Private (Finished Goods)
router.route('/')
    .post(protect, createMaterialRequest)
    .get(protect, getMaterialRequests);

// @desc    Get material request by ID
// @route   GET /api/material-requests/:id
// @access  Private
router.route('/:id')
    .get(protect, getMaterialRequestById)
    .delete(protect, deleteMaterialRequest);

// @desc    Update material request status
// @route   PUT /api/material-requests/:id/status
// @access  Private (Packing)
router.route('/:id/status')
    .put(protect, updateMaterialRequestStatus);

module.exports = router;