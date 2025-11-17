const ProductStock = require('../models/ProductStock');

/**
 * @desc    Update product stock when a Delivery Challan is completed (deduct stock)
 * @param   {Object} dc - Delivery Challan document
 * @param   {String} updatedBy - User who triggered the update
 * @returns {Object} Updated product stock document
 */
const updateProductStockOnDCCompletion = async (dc, updatedBy) => {
    try {
        // Validate input
        if (!dc || !dc.product_name) {
            throw new Error('Invalid delivery challan data');
        }

        // Find product stock record
        let productStock = await ProductStock.findOne({ productName: dc.product_name });
        
        if (!productStock) {
            throw new Error(`Product stock not found for ${dc.product_name}`);
        }
        
        // Deduct stock based on issue type (Carton or Pieces)
        if (dc.issue_type === 'Carton') {
            // Deduct cartons
            productStock.available_cartons -= dc.quantity;
        } else if (dc.issue_type === 'Pieces') {
            // Handle piece deduction logic
            if (productStock.broken_carton_pieces === 0) {
                // Break a new carton
                productStock.available_cartons -= 1;
                productStock.broken_carton_pieces = productStock.units_per_carton;
            }
            
            // Deduct pieces from broken carton first
            productStock.broken_carton_pieces -= dc.quantity;
            // Update available pieces (these are the loose pieces not in a broken carton)
            productStock.available_pieces = productStock.broken_carton_pieces;
        }
        
        // Add to stock history
        const stockHistoryEntry = {
            date: new Date(),
            unitType: 'Delivery Challan',
            cartonQty: dc.quantity,
            action: 'DEDUCT',
            updatedBy: updatedBy || 'System'
        };
        
        productStock.stockHistory.push(stockHistoryEntry);
        
        // Update last updated timestamp
        productStock.lastUpdated = new Date();
        
        // Save the updated product stock (this will trigger the pre-save middleware to calculate totalAvailable)
        await productStock.save();
        
        console.log(`Product stock updated for ${dc.product_name}: Cartons = ${productStock.available_cartons}, Pieces = ${productStock.available_pieces}, Total = ${productStock.totalAvailable}`);
        
        return productStock;
    } catch (error) {
        console.error(`Error updating product stock: ${error.message}`);
        throw error;
    }
};

/**
 * @desc    Update product stock when a GRN is completed (add stock)
 * @param   {Object} dc - Delivery Challan document (from which GRN was created)
 * @param   {String} updatedBy - User who triggered the update
 * @returns {Object} Updated product stock document
 */
const updateProductStockOnGRNCompletion = async (dc, updatedBy) => {
    try {
        // Validate input
        if (!dc || !dc.product_name) {
            throw new Error('Invalid delivery challan data');
        }

        // Find or create product stock record
        let productStock = await ProductStock.findOne({ productName: dc.product_name });
        
        if (!productStock) {
            // Get units per carton from ProductMaterialMapping
            const ProductMaterialMapping = require('../models/ProductMaterialMapping');
            const productMapping = await ProductMaterialMapping.findOne({ product_name: dc.product_name });
            const unitsPerCarton = productMapping ? productMapping.units_per_carton : 1;
            
            productStock = new ProductStock({
                productName: dc.product_name,
                ownUnitStock: 0,
                jobberStock: 0,
                available_cartons: 0,
                available_pieces: 0,
                broken_carton_pieces: 0,
                units_per_carton: unitsPerCarton
            });
        }
        
        // Add cartons to stock (GRN completion always adds cartons)
        productStock.available_cartons += dc.carton_qty;
        
        // Update last production details
        productStock.lastProductionDetails = {
            unitType: dc.unit_type,
            cartonQty: dc.carton_qty,
            date: new Date()
        };
        
        // Add to stock history
        const stockHistoryEntry = {
            date: new Date(),
            unitType: dc.unit_type,
            cartonQty: dc.carton_qty,
            action: dc.unit_type === 'Jobber' ? 'TRANSFER' : 'ADD',
            updatedBy: updatedBy || 'System'
        };
        
        productStock.stockHistory.push(stockHistoryEntry);
        
        // Update last updated timestamp
        productStock.lastUpdated = new Date();
        
        // Save the updated product stock (this will trigger the pre-save middleware to calculate totalAvailable)
        await productStock.save();
        
        console.log(`Product stock updated for ${dc.product_name}: Cartons = ${productStock.available_cartons}, Pieces = ${productStock.available_pieces}, Total = ${productStock.totalAvailable}`);
        
        return productStock;
    } catch (error) {
        console.error(`Error updating product stock: ${error.message}`);
        throw error;
    }
};

/**
 * @desc    Update product stock with a new quantity (add to existing stock)
 * @param   {Object} dc - Delivery Challan document
 * @param   {Number} newQuantity - New quantity of cartons to add
 * @param   {String} updatedBy - User who triggered the update
 * @returns {Object} Updated product stock document
 */
const updateProductStockWithNewQuantity = async (dc, newQuantity, updatedBy) => {
    try {
        // Validate input
        if (!dc || !dc.product_name) {
            throw new Error('Invalid delivery challan data');
        }

        if (typeof newQuantity !== 'number' || newQuantity < 0) {
            throw new Error('Invalid new quantity');
        }

        // Find or create product stock record
        let productStock = await ProductStock.findOne({ productName: dc.product_name });
        
        if (!productStock) {
            // Get units per carton from ProductMaterialMapping
            const ProductMaterialMapping = require('../models/ProductMaterialMapping');
            const productMapping = await ProductMaterialMapping.findOne({ product_name: dc.product_name });
            const unitsPerCarton = productMapping ? productMapping.units_per_carton : 1;
            
            // Create new product stock with initial quantity
            productStock = new ProductStock({
                productName: dc.product_name,
                ownUnitStock: dc.unit_type === 'Own Unit' ? newQuantity : 0,
                jobberStock: dc.unit_type === 'Jobber' ? newQuantity : 0,
                available_cartons: newQuantity, // Set initial stock to new quantity
                available_pieces: 0,
                broken_carton_pieces: 0,
                units_per_carton: unitsPerCarton
            });
            
            // Add to stock history
            const stockHistoryEntry = {
                date: new Date(),
                unitType: dc.unit_type,
                cartonQty: newQuantity,
                action: 'ADD',
                updatedBy: updatedBy || 'System'
            };
            
            productStock.stockHistory.push(stockHistoryEntry);
        } else {
            // Add new quantity to existing stock (increment logic)
            productStock.available_cartons += newQuantity;
            
            // Update unit type stock
            if (dc.unit_type === 'Own Unit') {
                productStock.ownUnitStock += newQuantity;
            } else if (dc.unit_type === 'Jobber') {
                productStock.jobberStock += newQuantity;
            }
            
            // Add to stock history
            const stockHistoryEntry = {
                date: new Date(),
                unitType: dc.unit_type,
                cartonQty: newQuantity,
                action: dc.unit_type === 'Jobber' ? 'TRANSFER' : 'ADD',
                updatedBy: updatedBy || 'System'
            };
            
            productStock.stockHistory.push(stockHistoryEntry);
        }
        
        // Update last production details
        productStock.lastProductionDetails = {
            unitType: dc.unit_type,
            cartonQty: newQuantity,
            date: new Date()
        };
        
        // Update last updated timestamp
        productStock.lastUpdated = new Date();
        productStock.lastUpdatedFrom = dc.unit_type;
        
        // Save the updated product stock (this will trigger the pre-save middleware to calculate totalAvailable)
        await productStock.save();
        
        console.log(`Product stock updated for ${dc.product_name}: Cartons = ${productStock.available_cartons}, Pieces = ${productStock.available_pieces}, Total = ${productStock.totalAvailable}`);
        
        return productStock;
    } catch (error) {
        console.error(`Error updating product stock with new quantity: ${error.message}`);
        throw error;
    }
};

module.exports = {
    updateProductStockOnDCCompletion,
    updateProductStockOnGRNCompletion,
    updateProductStockWithNewQuantity
};