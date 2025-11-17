const ProductMaterialMapping = require('../models/ProductMaterialMapping');

/**
 * @desc    Create a new product material mapping
 * @route   POST /api/product-mapping
 * @access  Private (Admin/Manager)
 */
const createProductMapping = async (req, res) => {
    const { product_name, hsn_code, units_per_carton, materials } = req.body;

    try {
        // Check if a mapping with this product name already exists
        const existingMapping = await ProductMaterialMapping.findOne({ product_name });
        if (existingMapping) {
            return res.status(400).json({ message: 'Duplicate product mapping already exists.' });
        }

        // Validate that at least one material is selected
        if (!materials || materials.length === 0) {
            return res.status(400).json({ message: 'At least 1 material selected is required.' });
        }

        // Validate that all quantities are greater than 0
        for (const material of materials) {
            if (material.qty_per_carton <= 0) {
                return res.status(400).json({ message: 'All quantities must be greater than 0.' });
            }
        }

        // Create the new product mapping
        const productMapping = new ProductMaterialMapping({
            product_name,
            hsn_code: hsn_code || '',
            units_per_carton: units_per_carton || 1, // Default to 1 if not provided
            materials
        });

        const createdMapping = await productMapping.save();
        res.status(201).json(createdMapping);
    } catch (error) {
        console.error(`Error creating product mapping: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating product mapping' });
    }
};

/**
 * @desc    Get all product material mappings
 * @route   GET /api/product-mapping
 * @access  Private (Admin/Manager)
 */
const getProductMappings = async (req, res) => {
    try {
        const mappings = await ProductMaterialMapping.find({}).sort({ createdAt: -1 });
        res.json(mappings);
    } catch (error) {
        console.error(`Error fetching product mappings: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product mappings' });
    }
};

/**
 * @desc    Get a single product material mapping by ID
 * @route   GET /api/product-mapping/:id
 * @access  Private (Admin/Manager)
 */
const getProductMappingById = async (req, res) => {
    try {
        const mapping = await ProductMaterialMapping.findById(req.params.id);
        if (mapping) {
            res.json(mapping);
        } else {
            res.status(404).json({ message: 'Product mapping not found' });
        }
    } catch (error) {
        console.error(`Error fetching product mapping: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product mapping' });
    }
};

/**
 * @desc    Update a product material mapping
 * @route   PUT /api/product-mapping/:id
 * @access  Private (Admin/Manager)
 */
const updateProductMapping = async (req, res) => {
    const { product_name, hsn_code, units_per_carton, materials } = req.body;

    try {
        const mapping = await ProductMaterialMapping.findById(req.params.id);
        if (!mapping) {
            return res.status(404).json({ message: 'Product mapping not found' });
        }

        // Check if another mapping with this product name already exists
        const existingMapping = await ProductMaterialMapping.findOne({ 
            product_name,
            _id: { $ne: req.params.id }
        });
        if (existingMapping) {
            return res.status(400).json({ message: 'Duplicate product mapping already exists.' });
        }

        // Validate that at least one material is selected
        if (!materials || materials.length === 0) {
            return res.status(400).json({ message: 'At least 1 material selected is required.' });
        }

        // Validate that all quantities are greater than 0
        for (const material of materials) {
            if (material.qty_per_carton <= 0) {
                return res.status(400).json({ message: 'All quantities must be greater than 0.' });
            }
        }

        mapping.product_name = product_name;
        mapping.hsn_code = hsn_code || '';
        mapping.units_per_carton = units_per_carton || 1; // Default to 1 if not provided
        mapping.materials = materials;

        const updatedMapping = await mapping.save();
        res.json(updatedMapping);
    } catch (error) {
        console.error(`Error updating product mapping: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating product mapping' });
    }
};

/**
 * @desc    Delete a product material mapping
 * @route   DELETE /api/product-mapping/:id
 * @access  Private (Admin/Manager)
 */
const deleteProductMapping = async (req, res) => {
    try {
        const mapping = await ProductMaterialMapping.findById(req.params.id);
        if (!mapping) {
            return res.status(404).json({ message: 'Product mapping not found' });
        }

        await mapping.deleteOne();
        res.json({ message: 'Product mapping removed successfully' });
    } catch (error) {
        console.error(`Error deleting product mapping: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting product mapping' });
    }
};

module.exports = {
    createProductMapping,
    getProductMappings,
    getProductMappingById,
    updateProductMapping,
    deleteProductMapping
};