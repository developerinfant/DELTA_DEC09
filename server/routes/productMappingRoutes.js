const express = require('express');
const router = express.Router();

// Import controller functions and middleware
const {
    createProductMapping,
    getProductMappings,
    getProductMappingById,
    updateProductMapping,
    deleteProductMapping
} = require('../controllers/productMappingController');

const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getProductMappings)
    .post(protect, createProductMapping);

// Get, update, or delete a single product mapping by its ID
router.route('/:id')
    .get(protect, getProductMappingById)
    .put(protect, updateProductMapping)
    .delete(protect, deleteProductMapping);

// Export the router
module.exports = router;