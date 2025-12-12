const ProductStock = require('../models/ProductStock');
const GRN = require('../models/GRN');
const FinishedGoodsDC = require('../models/FinishedGoodsDC');
const ProductMaterialMapping = require('../models/ProductMaterialMapping');
const ProductStockRecord = require('../models/ProductStockRecord');
const FGStockCaptureConfig = require('../models/FGStockCaptureConfig');
const mongoose = require('mongoose');

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
        // Get date filter from query params, default to today
        const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
        // Set to start of day for consistent comparison
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get current date for comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        // Get FG stock capture configuration
        const stockConfig = await FGStockCaptureConfig.getConfig();
        const closingTime = stockConfig.closingTime; // cron format
        
        // Parse closing time from cron format (e.g., "0 21 * * *" for 9:00 PM)
        // Format: minute hour day month dayOfWeek
        const closingParts = closingTime.split(' ');
        const closingHour = parseInt(closingParts[1]);
        const closingMinute = parseInt(closingParts[0]);
        
        // Create closing time for selected date
        const selectedDateClosing = new Date(selectedDate);
        selectedDateClosing.setHours(closingHour, closingMinute, 0, 0);
        
        // Get all product stocks
        const productStocks = await ProductStock.find({});
        
        // Process products to calculate stock distribution
        const reportData = [];
        
        for (const product of productStocks) {
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
            
            // Initialize opening and closing values
            let openingCartons = 0;
            let openingPieces = 0;
            let closingCartons = 0;
            let closingPieces = 0;
            
            // Handle date-specific logic for opening/closing values
            if (selectedDate < currentDate) {
                // Past date: Always use stored snapshots
                const stockRecord = await ProductStockRecord.findOne({
                    product: product._id,
                    date: selectedDate
                });
                
                if (stockRecord) {
                    openingCartons = stockRecord.openingCartons;
                    openingPieces = stockRecord.openingPieces;
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons = product.available_cartons;
                    closingPieces = product.broken_carton_pieces;
                } else {
                    // No record found for past date, use 0
                    openingCartons = 0;
                    openingPieces = 0;
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons = product.available_cartons;
                    closingPieces = product.broken_carton_pieces;
                }
            } else if (selectedDate.getTime() === currentDate.getTime()) {
                // Today: Follow time-capture rules
                const now = new Date();
                const todayClosingTime = new Date();
                todayClosingTime.setHours(closingHour, closingMinute, 0, 0);
                
                // Get previous day's closing snapshot for opening values
                const yesterday = new Date(selectedDate);
                yesterday.setDate(yesterday.getDate() - 1);
                
                const previousStockRecord = await ProductStockRecord.findOne({
                    product: product._id,
                    date: yesterday
                });
                
                if (previousStockRecord) {
                    openingCartons = previousStockRecord.closingCartons;
                    openingPieces = previousStockRecord.closingPieces;
                } else {
                    openingCartons = 0;
                    openingPieces = 0;
                }
                
                // For closing values, check if we've passed the closing time
                if (now >= todayClosingTime) {
                    // After closing time: Use today's stored closing snapshot
                    const todayStockRecord = await ProductStockRecord.findOne({
                        product: product._id,
                        date: selectedDate
                    });
                    
                    if (todayStockRecord) {
                        // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                        closingCartons = product.available_cartons;
                        closingPieces = product.broken_carton_pieces;
                    } else {
                        // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                        closingCartons = product.available_cartons;
                        closingPieces = product.broken_carton_pieces;
                    }
                } else {
                    // Before closing time: Calculate live values
                    // Calculate inward stock from GRNs for the selected date
                    let inward = 0;
                    
                    // Get GRNs that directly reference this product by productName for the selected date
                    const directGRNs = await GRN.find({
                        sourceType: 'jobber',
                        status: { $nin: ['Draft', 'Cancelled'] }, // Count all except Draft and Cancelled
                        productName: product.productName
                    });
                    
                    directGRNs.forEach(grn => {
                        const grnDate = new Date(grn.dateReceived);
                        grnDate.setHours(0, 0, 0, 0);
                        
                        // Count all GRNs except those marked as Draft or Cancelled
                        // This ensures real-time stock addition when GRN is submitted, not just when completed
                        if (grnDate.getTime() === selectedDate.getTime()) {
                            inward += grn.cartonsReturned || 0;
                        }
                    });
                    
                    // Additionally, get GRNs that reference Delivery Challans with multiple products for the selected date
                    const dcGRNs = await GRN.find({
                        sourceType: 'jobber',
                        status: { $nin: ['Draft', 'Cancelled'] }, // Count all except Draft and Cancelled
                        deliveryChallan: { $exists: true, $ne: null },
                        productName: { $ne: product.productName } // Exclude GRNs that already directly reference this product
                    }).populate('deliveryChallan');
                    
                    // For each of these GRNs, check if the referenced DC contains this product
                    for (const grn of dcGRNs) {
                        const grnDate = new Date(grn.dateReceived);
                        grnDate.setHours(0, 0, 0, 0);
                        
                        if (grnDate.getTime() === selectedDate.getTime() && grn.deliveryChallan) {
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
                                    inward += productCartons;
                                }
                            }
                        }
                    }
                    
                    // Calculate outward stock (cartons and pieces) from Delivery Challans for the selected date
                    let outwardCartons = 0;
                    let outwardPieces = 0;
                    
                    const deliveryChallans = await FinishedGoodsDC.find({
                        product_name: product.productName
                    });
                    
                    deliveryChallans.forEach(dc => {
                        const dcDate = new Date(dc.date);
                        dcDate.setHours(0, 0, 0, 0);
                        
                        // Count all DCs except those marked as Draft or Cancelled
                        // This ensures real-time stock deduction when DC is created, not just when completed
                        if (!['Draft', 'Cancelled'].includes(dc.status) && dcDate.getTime() === selectedDate.getTime()) {
                            // Calculate outward cartons and pieces based on issue type
                            if (dc.issue_type === 'Both') {
                                // Both cartons and pieces issued
                                outwardCartons += dc.carton_quantity || 0;
                                outwardPieces += dc.piece_quantity || 0;
                            } else if (dc.issue_type === 'Carton') {
                                // Only cartons issued
                                outwardCartons += dc.quantity || 0;
                            } else {
                                // Only pieces issued
                                outwardPieces += dc.quantity || 0;
                            }
                        }
                    });
                    
                    // Calculate total outward in carton equivalent
                    const totalOutward = (outwardCartons * unitsPerCarton) + outwardPieces;
                    
                    // Calculate closing stock using the correct FG rules
                    // closingCartons = openingCartons + inwardCartons − outwardCartons
                    // closingPieces = openingPieces + inwardPieces − outwardPieces
                    
                    // For inward calculation, we need to separate cartons and pieces
                    // Currently 'inward' only represents cartons, so inwardPieces = 0
                    const inwardCartons = inward;
                    const inwardPieces = 0;
                    
                    // Calculate closing values separately for cartons and pieces
                    let calculatedClosingCartons = openingCartons + inwardCartons - outwardCartons;
                    let calculatedClosingPieces = openingPieces + inwardPieces - outwardPieces;
                    
                    // Handle negative values
                    if (calculatedClosingCartons < 0) {
                        calculatedClosingCartons = 0;
                    }
                    if (calculatedClosingPieces < 0) {
                        calculatedClosingPieces = 0;
                    }
                    
                    // Handle piece overflow (when pieces exceed unitsPerCarton, convert to cartons)
                    if (calculatedClosingPieces >= unitsPerCarton) {
                        const extraCartons = Math.floor(calculatedClosingPieces / unitsPerCarton);
                        calculatedClosingCartons += extraCartons;
                        calculatedClosingPieces = calculatedClosingPieces % unitsPerCarton;
                    }
                    
                    // Handle negative pieces by borrowing from cartons
                    if (calculatedClosingPieces < 0 && calculatedClosingCartons > 0) {
                        calculatedClosingCartons -= 1;
                        calculatedClosingPieces += unitsPerCarton;
                    }
                    
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons = product.available_cartons;
                    closingPieces = product.broken_carton_pieces;
                }
            } else {
                // Future date: Use previous day's saved closing snapshot for both opening and closing
                const yesterday = new Date(selectedDate);
                yesterday.setDate(yesterday.getDate() - 1);
                
                const previousStockRecord = await ProductStockRecord.findOne({
                    product: product._id,
                    date: yesterday
                });
                
                if (previousStockRecord) {
                    openingCartons = previousStockRecord.closingCartons;
                    openingPieces = previousStockRecord.closingPieces;
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons = product.available_cartons;
                    closingPieces = product.broken_carton_pieces;
                } else {
                    openingCartons = 0;
                    openingPieces = 0;
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons = product.available_cartons;
                    closingPieces = product.broken_carton_pieces;
                }
            }
            
            // Calculate inward stock from GRNs for the selected date (unchanged logic)
            let inward = 0;
            
            // Get GRNs that directly reference this product by productName for the selected date
            const directGRNs = await GRN.find({
                sourceType: 'jobber',
                status: { $nin: ['Draft', 'Cancelled'] }, // Count all except Draft and Cancelled
                productName: product.productName
            });
            
            directGRNs.forEach(grn => {
                const grnDate = new Date(grn.dateReceived);
                grnDate.setHours(0, 0, 0, 0);
                
                // Count all GRNs except those marked as Draft or Cancelled
                // This ensures real-time stock addition when GRN is submitted, not just when completed
                if (grnDate.getTime() === selectedDate.getTime()) {
                    inward += grn.cartonsReturned || 0;
                }
            });
            
            // Additionally, get GRNs that reference Delivery Challans with multiple products for the selected date
            const dcGRNs = await GRN.find({
                sourceType: 'jobber',
                status: { $nin: ['Draft', 'Cancelled'] }, // Count all except Draft and Cancelled
                deliveryChallan: { $exists: true, $ne: null },
                productName: { $ne: product.productName } // Exclude GRNs that already directly reference this product
            }).populate('deliveryChallan');
            
            // For each of these GRNs, check if the referenced DC contains this product
            for (const grn of dcGRNs) {
                const grnDate = new Date(grn.dateReceived);
                grnDate.setHours(0, 0, 0, 0);
                
                if (grnDate.getTime() === selectedDate.getTime() && grn.deliveryChallan) {
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
                            inward += productCartons;
                        }
                    }
                }
            }
            
            // Calculate outward stock (cartons and pieces) from Delivery Challans for the selected date (unchanged logic)
            let outwardCartons = 0;
            let outwardPieces = 0;
            
            const deliveryChallans = await FinishedGoodsDC.find({
                product_name: product.productName
            });
            
            deliveryChallans.forEach(dc => {
                const dcDate = new Date(dc.date);
                dcDate.setHours(0, 0, 0, 0);
                
                // Count all DCs except those marked as Draft or Cancelled
                // This ensures real-time stock deduction when DC is created, not just when completed
                if (!['Draft', 'Cancelled'].includes(dc.status) && dcDate.getTime() === selectedDate.getTime()) {
                    // Calculate outward cartons and pieces based on issue type
                    if (dc.issue_type === 'Both') {
                        // Both cartons and pieces issued
                        outwardCartons += dc.carton_quantity || 0;
                        outwardPieces += dc.piece_quantity || 0;
                    } else if (dc.issue_type === 'Carton') {
                        // Only cartons issued
                        outwardCartons += dc.quantity || 0;
                    } else {
                        // Only pieces issued
                        outwardPieces += dc.quantity || 0;
                    }
                }
            });
            
            // Calculate total outward in carton equivalent (unchanged logic)
            const totalOutward = (outwardCartons * unitsPerCarton) + outwardPieces;
            
            // Calculate opening stock from cartons/pieces (for backward compatibility) (unchanged logic)
            const openingStock = (openingCartons * unitsPerCarton) + openingPieces;
            
            // Calculate closing stock from cartons/pieces (for backward compatibility) (unchanged logic)
            const closingStock = (product.available_cartons * unitsPerCarton) + product.broken_carton_pieces;
            
            // Save or update the stock record for the selected date (unchanged logic)
            await ProductStockRecord.findOneAndUpdate(
                {
                    product: product._id,
                    date: selectedDate
                },
                {
                    productName: product.productName,
                    openingStock: openingStock,
                    openingCartons: openingCartons,
                    openingPieces: openingPieces,
                    closingStock: closingStock,
                    // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                    closingCartons: product.available_cartons,
                    closingPieces: product.broken_carton_pieces,
                    inward: inward,
                    outward: totalOutward,
                    outwardCartons: outwardCartons,
                    outwardPieces: outwardPieces,
                    unit: 'cartons'
                },
                {
                    upsert: true,
                    new: true
                }
            );
            
            // Determine last updated timestamp (unchanged logic)
            let lastUpdated = product.updatedAt || product.createdAt || new Date();
            
            // Check if there were any transactions today that might have updated the product (unchanged logic)
            const todayTransactions = [...directGRNs, ...deliveryChallans].filter(item => {
                const itemDate = new Date(item.dateReceived || item.date || item.createdAt);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === selectedDate.getTime();
            });
            
            if (todayTransactions.length > 0) {
                // Find the latest transaction timestamp (unchanged logic)
                const latestTransaction = todayTransactions.reduce((latest, current) => {
                    const currentDate = new Date(current.dateReceived || current.date || current.createdAt);
                    const latestDate = new Date(latest.dateReceived || latest.date || latest.createdAt);
                    return currentDate > latestDate ? current : latest;
                });
                lastUpdated = latestTransaction.dateReceived || latestTransaction.date || latestTransaction.createdAt;
            }
            
            reportData.push({
                _id: product._id,
                productName: product.productName,
                itemCode: product.itemCode || 'N/A',
                openingStock: openingStock,
                openingCartons: openingCartons,
                openingPieces: openingPieces,
                inward: inward,
                outwardCartons: outwardCartons,
                outwardPieces: outwardPieces,
                closingStock: closingStock,
                // Per user request: Map closingCartons = totalCartons and closingPieces = brokenPieces
                closingCartons: product.available_cartons,
                closingPieces: product.broken_carton_pieces,
                available_cartons: product.available_cartons,
                available_pieces: product.available_pieces,
                broken_carton_pieces: product.broken_carton_pieces,
                units_per_carton: unitsPerCarton,
                alertThreshold: product.alertThreshold,
                hsnCode: product.hsnCode || '',
                lastUpdated: lastUpdated
            });
        }
        
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

/**
 * @desc    Configure opening and closing stock capture times for FG
 * @route   POST /api/fg/configure-stock-times
 * @access  Private (Admin)
 */
const configureFGStockCaptureTimes = async (req, res) => {
    try {
        const { openingTime, closingTime } = req.body;
        
        // Validate input
        if (!openingTime || !closingTime) {
            return res.status(400).json({ message: 'Both openingTime and closingTime are required' });
        }
        
        // Update configuration
        let config = await FGStockCaptureConfig.getConfig();
        config.openingTime = openingTime;
        config.closingTime = closingTime;
        await config.save();
        
        res.json({ message: 'Stock capture times configured successfully' });
    } catch (error) {
        console.error(`Error configuring FG stock capture times: ${error.message}`);
        res.status(500).json({ message: 'Server error while configuring FG stock capture times' });
    }
};

/**
 * @desc    Get current FG stock capture configuration
 * @route   GET /api/fg/stock-config
 * @access  Private (Admin)
 */
const getFGStockCaptureConfig = async (req, res) => {
    try {
        const config = await FGStockCaptureConfig.getConfig();
        
        res.json({
            openingTime: config.openingTime,
            closingTime: config.closingTime
        });
    } catch (error) {
        console.error(`Error fetching FG stock capture configuration: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG stock capture configuration' });
    }
};

module.exports = {
    getFGStockAlerts,
    getFGStockReport,
    updateFGStock,
    configureFGStockCaptureTimes,
    getFGStockCaptureConfig
};