const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. Import controller functions and middleware
const {
    addMaterial,
    getMaterials,
    getMaterialById,
    updateMaterial,
    deleteMaterial,
    recordOutgoing,
    getOutgoingHistory,
    getStockAlerts,
    getNextItemCode,
    importMaterials,
    exportMaterials
} = require('../controllers/materialController');

const { protect } = require('../middleware/authMiddleware');
const { /*...,*/ getStats } = require('../controllers/materialController');

router.route('/stats').get(protect, getStats);

router.route('/next-item-code').get(protect, getNextItemCode);

// Import/Export routes
router.route('/import')
    .post(protect, upload.single('file'), importMaterials);
    
router.route('/export')
    .get(protect, exportMaterials);

router.route('/')
    .get(protect, getMaterials)
    .post(protect, addMaterial);

// @desc    Get materials that are low on stock
// @route   GET /api/materials/alerts
// @access  Private
router.route('/alerts')
    .get(protect, getStockAlerts);

// @desc    Record an outgoing use of a material
// @route   POST /api/materials/outgoing
// @access  Private
router.route('/outgoing')
    .post(protect, recordOutgoing);

// @desc    Get the history of all outgoing material records
// @route   GET /api/materials/outgoing/history
// @access  Private
router.route('/outgoing/history')
    .get(protect, getOutgoingHistory);

// @desc    Get, update, or delete a single material by its ID
// @route   GET /api/materials/:id
// @route   PUT /api/materials/:id
// @route   DELETE /api/materials/:id
// @access  Private
router.route('/:id')
    .get(protect, getMaterialById)
    .put(protect, updateMaterial)
    .delete(protect, deleteMaterial);

// 3. Export the router
module.exports = router;