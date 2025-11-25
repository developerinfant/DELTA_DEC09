const ProductStock = require('../models/ProductStock');
const GRN = require('../models/GRN');
const FinishedGoodsDC = require('../models/FinishedGoodsDC');
const ProductMaterialMapping = require('../models/ProductMaterialMapping');

/**
 * @desc    Get FG products that are below their stock alert threshold
 * @route   GET /api/fg/stock-alerts
 * @access  Private
 */
const getFGStockAlerts = async (req, res) => {
    try {
        // Get all product stocks
        const productStocks = await ProductStock.find({});
        
        // For each product, we need to determine:
        // 1. Current stock (availableStock)
        // 2. Alert threshold (we'll use a default of 10 for now, or we could add this field to the ProductStock model)
        const alertedProducts = productStocks
            .map(product => {
                // Use a default alert threshold of 10 or implement a proper threshold field
                const alertThreshold = product.alertThreshold || 10;
                return {
                    _id: product._id,
                    productName: product.productName,
                    itemCode: product.itemCode || 'N/A', // Include itemCode
                    currentStock: product.totalAvailable,
                    alertThreshold: alertThreshold
                };
            })
            .filter(product => product.currentStock < product.alertThreshold);
        
        res.json(alertedProducts);
    } catch (error) {
        console.error(`Error fetching FG stock alerts: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get FG stock report with total inward, outward, and available stock
 * @route   GET /api/fg/stock-report
 * @access  Private
 */
const getFGStockReport = async (req, res) => {
    try {
        // Get all product stocks
        const productStocks = await ProductStock.find({});
        
        // For each product, calculate:
        // 1. Total inward (from completed GRNs)
        // 2. Total outward (from all DCs)
        // 3. Available stock (current stock)
        // 4. Last updated date
        
        const reportData = await Promise.all(productStocks.map(async (product) => {
            // Get units per carton from product mapping
            let unitsPerCarton = 1; // Default value
            try {
                const productMapping = await ProductMaterialMapping.findOne({ product_name: product.productName });
                if (productMapping && productMapping.units_per_carton) {
                    unitsPerCarton = productMapping.units_per_carton;
                }
            } catch (error) {
                console.error(`Error fetching product mapping for ${product.productName}:`, error.message);
            }
            
            // Calculate total inward from completed GRNs
            // First, get GRNs that directly reference this product by productName
            const directGRNs = await GRN.find({
                sourceType: 'jobber',
                status: 'Completed',
                productName: product.productName
            });
            
            let totalInward = directGRNs.reduce((total, grn) => {
                return total + (grn.cartonsReturned || 0);
            }, 0);
            
            // Additionally, get GRNs that reference Delivery Challans with multiple products
            // We need to find GRNs that reference DCs containing this product
            const dcGRNs = await GRN.find({
                sourceType: 'jobber',
                status: 'Completed',
                deliveryChallan: { $exists: true, $ne: null },
                productName: { $ne: product.productName } // Exclude GRNs that already directly reference this product
            }).populate('deliveryChallan');
            
            // For each of these GRNs, check if the referenced DC contains this product
            for (const grn of dcGRNs) {
                if (grn.deliveryChallan) {
                    // Check if this DC contains the product we're looking for
                    if (grn.deliveryChallan.products && Array.isArray(grn.deliveryChallan.products)) {
                        const productInDC = grn.deliveryChallan.products.find(p => p.product_name === product.productName);
                        if (productInDC) {
                            // This DC contains our product, so we need to calculate the portion that belongs to this product
                            // If the GRN has a productCartonsReceived field, use that, otherwise distribute evenly
                            let productCartons = 0;
                            if (grn.productCartonsReceived && Array.isArray(grn.productCartonsReceived)) {
                                // Find the index of this product in the DC
                                const productIndex = grn.deliveryChallan.products.findIndex(p => p.product_name === product.productName);
                                if (productIndex !== -1 && grn.productCartonsReceived[productIndex] !== undefined) {
                                    productCartons = parseFloat(grn.productCartonsReceived[productIndex]) || 0;
                                }
                            } else {
                                // Fallback: distribute cartonsReturned evenly among products
                                const totalCartonsInDC = grn.deliveryChallan.products.reduce((sum, p) => sum + (p.carton_qty || 0), 0);
                                if (totalCartonsInDC > 0) {
                                    productCartons = (grn.cartonsReturned || 0) * (productInDC.carton_qty / totalCartonsInDC);
                                }
                            }
                            totalInward += productCartons;
                        }
                    }
                }
            }
            
            // Calculate total outward from all DCs
            const deliveryChallans = await FinishedGoodsDC.find({
                product_name: product.productName
            });
            
            const totalOutward = deliveryChallans.reduce((total, dc) => {
                // Only count dispatched DCs
                if (dc.status === 'Dispatched') {
                    // For "Both" issue type, we need to consider both carton and piece quantities
                    if (dc.issue_type === 'Both') {
                        // Convert cartons to pieces and add piece quantity
                        return total + (dc.carton_quantity * unitsPerCarton) + (dc.piece_quantity || 0);
                    } else if (dc.issue_type === 'Carton') {
                        // For Carton issue type, quantity is in cartons, so convert to pieces
                        return total + ((dc.quantity || 0) * unitsPerCarton);
                    } else {
                        // For Pieces issue type, quantity is already in pieces
                        return total + (dc.quantity || 0);
                    }
                }
                return total;
            }, 0);
            
            return {
                _id: product._id,
                productName: product.productName,
                itemCode: product.itemCode || 'N/A', // Include itemCode
                totalInward: totalInward,
                totalOutward: totalOutward,
                availableStock: product.totalAvailable,
                available_cartons: product.available_cartons,
                available_pieces: product.available_pieces,
                broken_carton_pieces: product.broken_carton_pieces,
                units_per_carton: unitsPerCarton, // Use the value from product mapping
                alertThreshold: product.alertThreshold,
                hsnCode: product.hsnCode || '', // Include HSN Code
                lastUpdated: product.lastUpdated
            };
        }));
        
        res.json(reportData);
    } catch (error) {
        console.error(`Error fetching FG stock report: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG stock report' });
    }
};

/**
 * @desc    Update FG product HSN code and alert threshold
 * @route   PUT /api/fg/stock/:id
 * @access  Private
 */
const updateFGStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { alertThreshold, hsnCode } = req.body;
        
        // Validate input
        if (alertThreshold === undefined && hsnCode === undefined) {
            return res.status(400).json({ message: 'At least one field (alertThreshold or hsnCode) is required' });
        }
        
        // Prepare update object
        const updateData = {};
        if (alertThreshold !== undefined) {
            updateData.alertThreshold = alertThreshold;
        }
        if (hsnCode !== undefined) {
            updateData.hsnCode = hsnCode;
        }
        
        // Update the product stock
        const updatedProductStock = await ProductStock.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedProductStock) {
            return res.status(404).json({ message: 'Product stock not found' });
        }
        
        res.json(updatedProductStock);
    } catch (error) {
        console.error(`Error updating FG stock: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating FG stock' });
    }
};

module.exports = {
    getFGStockAlerts,
    getFGStockReport,
    updateFGStock
};