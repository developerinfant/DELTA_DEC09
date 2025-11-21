const express = require('express');
const router = express.Router();

// Import controller functions and middleware
const {
    createProductMapping,
    getProductMappings,
    getProductMappingById,
    getProductMappingByProductName,  // Add this line
    updateProductMapping,
    deleteProductMapping
} = require('../controllers/productMappingController');

const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getProductMappings)
    .post(protect, createProductMapping);

// Get product mapping by product name
router.route('/name/:product_name')
    .get(protect, getProductMappingByProductName);  // Add this line

// Get, update, or delete a single product mapping by its ID
router.route('/:id')
    .get(protect, getProductMappingById)
    .put(protect, updateProductMapping)
    .delete(protect, deleteProductMapping);

// Export the router
module.exports = router;