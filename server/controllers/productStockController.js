const ProductStock = require('../models/ProductStock');

/**
 * @desc    Get all product stocks
 * @route   GET /api/product-stock
 * @access  Private
 */
const getProductStocks = async (req, res) => {
    try {
        const productStocks = await ProductStock.find({}).sort({ productName: 1 });
        res.json(productStocks);
    } catch (error) {
        console.error(`Error fetching product stocks: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product stocks' });
    }
};

/**
 * @desc    Get a single product stock by name
 * @route   GET /api/product-stock/:name
 * @access  Private
 */
const getProductStockByName = async (req, res) => {
    try {
        const productStock = await ProductStock.findOne({ 
            productName: { $regex: new RegExp(`^${req.params.name}$`, 'i') } 
        });
        
        if (productStock) {
            res.json(productStock);
        } else {
            res.status(404).json({ message: 'Product stock not found' });
        }
    } catch (error) {
        console.error(`Error fetching product stock: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product stock' });
    }
};

/**
 * @desc    Update product stock (Admin only)
 * @route   PUT /api/product-stock/:name
 * @access  Private/Admin
 */
const updateProductStock = async (req, res) => {
    const { ownUnitStock, jobberStock, lastUpdatedFrom } = req.body;

    try {
        const productStock = await ProductStock.findOne({ 
            productName: { $regex: new RegExp(`^${req.params.name}$`, 'i') } 
        });
        
        if (!productStock) {
            return res.status(404).json({ message: 'Product stock not found' });
        }

        // Update fields
        if (ownUnitStock !== undefined) {
            productStock.ownUnitStock = ownUnitStock;
        }
        
        if (jobberStock !== undefined) {
            productStock.jobberStock = jobberStock;
        }
        
        if (lastUpdatedFrom !== undefined) {
            productStock.lastUpdatedFrom = lastUpdatedFrom;
        }
        
        // Add to stock history
        productStock.stockHistory.push({
            date: new Date(),
            unitType: lastUpdatedFrom || productStock.lastUpdatedFrom,
            cartonQty: (ownUnitStock !== undefined ? ownUnitStock : productStock.ownUnitStock) + 
                      (jobberStock !== undefined ? jobberStock : productStock.jobberStock),
            action: 'ADJUST',
            updatedBy: req.user ? req.user.name : 'Admin'
        });
        
        // Update last updated timestamp
        productStock.lastUpdated = new Date();
        
        const updatedProductStock = await productStock.save();
        
        res.json(updatedProductStock);
    } catch (error) {
        console.error(`Error updating product stock: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating product stock' });
    }
};

module.exports = {
    getProductStocks,
    getProductStockByName,
    updateProductStock
};