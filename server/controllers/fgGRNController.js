const GRN = require('../models/GRN');
const DeliveryChallan = require('../models/DeliveryChallan');
const ProductStock = require('../models/ProductStock');
const PackingMaterial = require('../models/PackingMaterial');
const mongoose = require('mongoose');
const { getNextGRNNumber } = require('../utils/grnUtils');
const { updateProductStockOnGRNCompletion, updateProductStockWithNewQuantity } = require('../utils/stockUpdate');

// Helper function to generate item code
const generateItemCode = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const yearPrefix = `FG-${currentYear}-`;
        
        // Find the latest item code for the current year
        const latestProductStock = await ProductStock
            .findOne({ itemCode: new RegExp(`^${yearPrefix}`) })
            .sort({ itemCode: -1 });
        
        let nextSequence = 1;
        
        if (latestProductStock && latestProductStock.itemCode) {
            // Extract the sequence number from the last code
            const lastSequence = parseInt(latestProductStock.itemCode.split('-')[2]);
            if (!isNaN(lastSequence)) {
                nextSequence = lastSequence + 1;
            }
        }
        
        // Format the sequence with leading zeros (4 digits)
        const sequence = nextSequence.toString().padStart(4, '0');
        return `${yearPrefix}${sequence}`;
    } catch (error) {
        console.error('Error generating item code:', error);
        throw error;
    }
};

// Helper function to calculate price difference
const calculatePriceDifference = async (materialId, materialModel, currentUnitPrice) => {
    // Validate inputs
    if (!materialId || !materialModel) {
        return {
            lastUnitPrice: 0,
            priceDifference: 0,
            priceDifferencePercentage: 0
        };
    }

    try {
        // Convert materialId to string for consistent comparison
        const materialIdStr = typeof materialId === 'object' && materialId.toString ? 
            materialId.toString() : 
            String(materialId);

        // Find the last GRN for this material
        // For string material IDs (DC-based GRNs), we need to use a different query approach
        let query;
        if (mongoose.Types.ObjectId.isValid(materialIdStr)) {
            // For ObjectId material IDs (PO-based GRNs)
            query = { 
                'items.material': materialId,
                'items.materialModel': materialModel
            };
        } else {
            // For string material IDs (DC-based GRNs)
            query = { 
                'items.material': materialIdStr,
                'items.materialModel': materialModel
            };
        }

        const lastGRN = await GRN.findOne(query)
            .sort({ createdAt: -1 })
            .select('items.unitPrice items.material')
            .lean();

        let lastUnitPrice = 0;
        if (lastGRN && lastGRN.items) {
            const lastItem = lastGRN.items.find(item => {
                // Safely check if item.material exists and matches
                if (!item.material) return false;
                
                // Handle both string and ObjectId cases
                const itemId = typeof item.material === 'object' && item.material.toString ? 
                    item.material.toString() : 
                    String(item.material);
                    
                return itemId === materialIdStr && item.materialModel === materialModel;
            });
            
            if (lastItem) {
                lastUnitPrice = lastItem.unitPrice || 0;
            }
        }

        const priceDifference = currentUnitPrice - lastUnitPrice;
        const priceDifferencePercentage = lastUnitPrice !== 0 ? (priceDifference / lastUnitPrice) * 100 : 0;

        return {
            lastUnitPrice,
            priceDifference,
            priceDifferencePercentage
        };
    } catch (error) {
        console.error('Error in calculatePriceDifference:', error);
        // Return default values in case of error
        return {
            lastUnitPrice: 0,
            priceDifference: 0,
            priceDifferencePercentage: 0
        };
    }
};

// Helper function to fetch price from Delivery Challan when GRN price is missing
const fetchPriceFromDeliveryChallan = async (deliveryChallanId, materialName) => {
    try {
        const dc = await DeliveryChallan.findById(deliveryChallanId);
        if (!dc) return { unitPrice: 0, totalPrice: 0 };
        
        // For delivery challans, we might not have price information
        // Return default values
        return { unitPrice: 0, totalPrice: 0 };
    } catch (error) {
        console.error('Error fetching price from Delivery Challan:', error);
        return { unitPrice: 0, totalPrice: 0 };
    }
};

// Helper function to calculate pending quantities per product for a delivery challan
const calculateProductPendingQuantities = async (deliveryChallanId) => {
    try {
        const dc = await DeliveryChallan.findById(deliveryChallanId);
        if (!dc) return null;
        
        // Find all GRNs for this delivery challan
        const existingGRNs = await GRN.find({ deliveryChallan: deliveryChallanId });
        
        // For multiple products DC
        if (dc.products && dc.products.length > 0) {
            const productPendingQuantities = [];
            
            for (const product of dc.products) {
                // Calculate total received cartons for this specific product across all GRNs
                let totalProductReceived = 0;
                
                for (const grn of existingGRNs) {
                    // If GRN has product-specific carton data
                    if (grn.productCartonsReceived && Array.isArray(grn.productCartonsReceived)) {
                        // Find the index of this product in the DC
                        const productIndex = dc.products.findIndex(p => p.product_name === product.product_name);
                        if (productIndex !== -1 && grn.productCartonsReceived[productIndex] !== undefined) {
                            totalProductReceived += parseFloat(grn.productCartonsReceived[productIndex]) || 0;
                        }
                    } else {
                        // Fallback: distribute cartonsReturned evenly among products
                        const totalCartonsInDC = dc.products.reduce((sum, p) => sum + (p.carton_qty || 0), 0);
                        if (totalCartonsInDC > 0) {
                            totalProductReceived += (grn.cartonsReturned || 0) * (product.carton_qty / totalCartonsInDC);
                        }
                    }
                }
                
                const pendingQty = (product.carton_qty || 0) - totalProductReceived;
                
                productPendingQuantities.push({
                    productName: product.product_name,
                    cartonsSent: product.carton_qty || 0,
                    totalReceived: totalProductReceived,
                    pendingQty: pendingQty
                });
            }
            
            return productPendingQuantities;
        }
        
        // For single product DC (backward compatibility)
        const cartonsSent = dc.carton_qty || 0;
        const totalReceived = existingGRNs.reduce((sum, grn) => sum + (grn.cartonsReturned || 0), 0);
        const pendingQty = cartonsSent - totalReceived;
        
        return [{
            productName: dc.product_name,
            cartonsSent: cartonsSent,
            totalReceived: totalReceived,
            pendingQty: pendingQty
        }];
    } catch (error) {
        console.error('Error calculating product pending quantities:', error);
        throw error;
    }
};

// Helper function to update Delivery Challan material quantities based on GRN
const updateDeliveryChallanQuantities = async (deliveryChallanId, grnItems, grnId = null) => {
    try {
        const dc = await DeliveryChallan.findById(deliveryChallanId);
        if (!dc) return;
        
        // Calculate total received quantities for each material from all GRNs except the current one (if updating)
        const materialReceivedTotals = {};
        
        // Find all GRNs for this delivery challan
        const grnQuery = { deliveryChallan: deliveryChallanId };
        if (grnId) {
            // Exclude the current GRN when calculating totals (for updates)
            grnQuery._id = { $ne: grnId };
        }
        
        const existingGRNs = await GRN.find(grnQuery);
        
        // Sum up received quantities for each material from existing GRNs
        for (const existingGRN of existingGRNs) {
            for (const item of existingGRN.items) {
                const materialName = typeof item.material === 'string' ? item.material : item.material.name;
                const receivedQty = item.receivedQuantity || 0;
                
                if (!materialReceivedTotals[materialName]) {
                    materialReceivedTotals[materialName] = 0;
                }
                materialReceivedTotals[materialName] += receivedQty;
            }
        }
        
        // Add current GRN items to the totals
        for (const grnItem of grnItems) {
            const materialName = typeof grnItem.material === 'string' ? grnItem.material : grnItem.material.name;
            const receivedQty = grnItem.receivedQuantity || 0;
            
            if (!materialReceivedTotals[materialName]) {
                materialReceivedTotals[materialName] = 0;
            }
            materialReceivedTotals[materialName] += receivedQty;
        }
        
        // Update each material's received and balance quantities in the delivery challan
        // Handle both single product (backward compatibility) and multiple products
        if (dc.products && dc.products.length > 0) {
            // For multiple products, update materials in each product
            for (const product of dc.products) {
                if (product.materials && Array.isArray(product.materials)) {
                    for (const material of product.materials) {
                        const totalReceived = materialReceivedTotals[material.material_name] || 0;
                        
                        // Update received quantity
                        material.received_qty = totalReceived;
                        // Update balance quantity
                        material.balance_qty = material.total_qty - material.received_qty;
                    }
                }
            }
        } else {
            // For single product (backward compatibility)
            for (const dcMaterial of dc.materials) {
                const totalReceived = materialReceivedTotals[dcMaterial.material_name] || 0;
                
                // Update received quantity
                dcMaterial.received_qty = totalReceived;
                // Update balance quantity
                dcMaterial.balance_qty = dcMaterial.total_qty - dcMaterial.received_qty;
            }
        }
        
        // Update overall DC status based on material statuses
       
        
        // Save the updated delivery challan
        await dc.save();
        
        console.log(`Successfully updated Delivery Challan ${dc.dc_no} quantities`);
    } catch (error) {
        console.error('Error updating Delivery Challan quantities:', error);
        throw error;
    }
};

/**
 * @desc    Create a new Goods Receipt Note (GRN) from Delivery Challan
 * @route   POST /api/grn
 * @access  Private
 */
const createGRN = async (req, res) => {
    let { deliveryChallanId, items, receivedBy, dateReceived, cartonsReturned, damagedStock, productCartonsReceived } = req.body;
        
    // Add logging to help diagnose issues
    console.log('GRN Creation Request Body:', JSON.stringify(req.body, null, 2));
    
    // Parse cartonsReturned as a number if it's provided
    console.log(`Parsing cartonsReturned: ${cartonsReturned}`);
    if (cartonsReturned !== undefined) {
        cartonsReturned = parseFloat(cartonsReturned);
        console.log(`Parsed cartonsReturned: ${cartonsReturned}`);
        // Validate that cartonsReturned is a valid number
        if (isNaN(cartonsReturned)) {
            console.log(`Invalid carton quantity provided: ${cartonsReturned}`);
            return res.status(400).json({ 
                message: 'Invalid carton quantity provided.' 
            });
        }
    }

    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        // Handle Delivery Challan-based GRN creation
        if (deliveryChallanId) {
            // Validate required fields for DC-based GRN
            if (!receivedBy || !dateReceived) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Find the delivery challan and populate supplier details
            const dc = await DeliveryChallan.findById(deliveryChallanId)
                .populate('supplier_id'); // Populate supplier details

            if (!dc) {
                return res.status(404).json({ message: 'Delivery Challan not found.' });
            }

            // Check if a GRN already exists for this delivery challan
                 if (dc.status === 'Completed') {
                return res.status(400).json({ 
                   message: `⚠️ This Delivery Challan (${dc.dc_no}) is already completed. You cannot create a new GRN.` 
               });
           }
            
            const grnNumber = await getNextGRNNumber();
            
            // Handle carton-based GRN creation for delivery challans
            if (cartonsReturned !== undefined) {
                // Carton-based GRN logic
                // Handle both single product (backward compatibility) and multiple products
                let cartonsSent = 0;
                if (dc.products && dc.products.length > 0) {
                    // For multiple products, calculate total cartons sent
                    cartonsSent = dc.products.reduce((total, product) => total + (product.carton_qty || 0), 0);
                } else {
                    // For single product (backward compatibility)
                    cartonsSent = parseFloat(dc.carton_qty) || 0;
                }
                
                console.log(`Parsed cartonsSent: ${cartonsSent}`);
                // Validate that cartonsSent is a valid number
                if (isNaN(cartonsSent) || cartonsSent <= 0) {
                    console.log(`Invalid carton quantity in Delivery Challan: ${cartonsSent}`);
                    return res.status(400).json({ 
                        message: 'Invalid carton quantity in Delivery Challan.' 
                    });
                }
                
                // Calculate total cartons already received for this DC
                // Validate that deliveryChallanId is a valid ObjectId
                if (!mongoose.Types.ObjectId.isValid(deliveryChallanId)) {
                    return res.status(400).json({ 
                        message: 'Invalid Delivery Challan ID.' 
                    });
                }
                console.log(`Querying existing GRNs for deliveryChallanId: ${deliveryChallanId}`);
                const existingGRNs = await GRN.find({ deliveryChallan: deliveryChallanId });
                console.log(`Found ${existingGRNs.length} existing GRNs for DC ${deliveryChallanId}`);
                console.log(`Existing GRNs:`, JSON.stringify(existingGRNs.map(g => ({
                    _id: g._id,
                    cartonsReturned: g.cartonsReturned,
                    status: g.status
                })), null, 2));
                const totalReceived = existingGRNs.reduce((sum, grn) => {
                    const cartons = parseFloat(grn.cartonsReturned) || 0;
                    console.log(`GRN ${grn._id}: cartonsReturned = ${grn.cartonsReturned}, parsed = ${cartons}`);
                    return sum + cartons;
                }, 0);
                console.log(`Total received cartons: ${totalReceived}`);
                const pendingCartons = parseFloat((cartonsSent - totalReceived).toFixed(3));
                console.log(`Cartons sent: ${cartonsSent}, Pending cartons: ${pendingCartons}`);
                
                // Validate carton quantities
                console.log(`Validating carton quantities: cartonsReturned = ${cartonsReturned}, pendingCartons = ${pendingCartons}`);
                // Use a small tolerance for floating point comparison
                if (cartonsReturned > pendingCartons + 0.001) {
                    console.log(`Validation failed: cartonsReturned (${cartonsReturned}) > pendingCartons (${pendingCartons})`);
                    return res.status(400).json({ 
                        message: `Returned cartons cannot exceed pending cartons. Pending: ${pendingCartons}` 
                    });
                }
                
                // For multiple products, validate per-product quantities
                if (dc.products && dc.products.length > 0 && productCartonsReceived && Array.isArray(productCartonsReceived)) {
                    try {
                        await validateProductQuantities(deliveryChallanId, productCartonsReceived);
                    } catch (validationError) {
                        return res.status(400).json({ 
                            message: validationError.message 
                        });
                    }
                }
                
                // Validate that newReceivedQty > 0
                console.log(`Validating cartonsReturned > 0: isNaN = ${isNaN(cartonsReturned)}, value = ${cartonsReturned}`);
                if (isNaN(cartonsReturned) || cartonsReturned <= 0) {
                    console.log(`Validation failed: cartonsReturned (${cartonsReturned}) is not > 0`);
                    return res.status(400).json({ 
                        message: 'Returned cartons must be greater than zero.' 
                    });
                }
                
                console.log(`Calculating balance: pendingCartons = ${pendingCartons}, cartonsReturned = ${cartonsReturned}`);
                const balance = parseFloat((pendingCartons - cartonsReturned).toFixed(3));
                console.log(`Calculated balance: ${balance}`);
                
                // Determine status based on carton quantities
                // Only set to Completed if pendingQty == 0, otherwise Partial
                // Use a small tolerance for floating point comparison
                let status = 'Partial';
                console.log(`Determining status: balance = ${balance}`);
                if (Math.abs(balance) < 0.001) {
                    status = 'Completed';
                    console.log(`Status set to Completed`);
                } else {
                    console.log(`Status set to Partial`);
                }

                // Determine supplier name based on unit type
                let supplierName = '';
                if (dc.unit_type === 'Jobber') {
                    supplierName = dc.supplier_id ? dc.supplier_id.name : 'N/A';
                } else if (dc.unit_type === 'Own Unit') {
                    supplierName = dc.person_name || 'N/A';
                }

                // Validate damaged stock quantities
                if (damagedStock && Array.isArray(damagedStock)) {
                    for (const item of damagedStock) {
                        const receivedQty = item.received_qty || 0;
                        const damagedQty = item.damaged_qty || 0;
                        
                        if (damagedQty > receivedQty) {
                            return res.status(400).json({ 
                                message: `Damaged quantity for ${item.material_name} cannot exceed received quantity.` 
                            });
                        }
                    }
                }
                
                // Process items to calculate usedQty and remainingQty based on carton return
                const processedItems = [];
                
                // Handle multiple products in the DC
                // Handle both single product (backward compatibility) and multiple products
                let productNameForGRN = '';
                if (dc.products && dc.products.length > 0) {
                    // Handle multiple products
                    // For backward compatibility, we'll use the first product name for the main GRN field
                    productNameForGRN = dc.products[0].product_name;
                    
                    // Process materials for all products
                    for (const product of dc.products) {
                        for (const material of product.materials) {
                            // Calculate usedQty and remainingQty using the formula:
                            // UsedQty = (CartonsReturned / CartonsSent) * SentQty
                            // RemainingQty = SentQty - UsedQty
                            const sentQty = material.total_qty || 0;
                            const usedQty = cartonsSent > 0 ? (cartonsReturned / cartonsSent) * sentQty : 0;
                            const remainingQty = sentQty - usedQty;
                            
                            // Get damaged quantity from the request if provided
                            let damagedQty = 0;
                            if (damagedStock && Array.isArray(damagedStock)) {
                                const damagedItem = damagedStock.find(item => item.material_name === material.material_name);
                                damagedQty = damagedItem ? damagedItem.damaged_qty : 0;
                            }
                            
                            processedItems.push({
                                material: material.material_name, // For jobber DCs, we store material name as string
                                materialModel: 'PackingMaterial', // Jobber is always packing materials
                                orderedQuantity: sentQty,
                                receivedQuantity: usedQty, // Use calculated usedQty as received quantity
                                unitPrice: 0, // No price info for delivery challans
                                totalPrice: 0,
                                damagedQuantity: damagedQty,
                                remarks: '',
                                balanceQuantity: remainingQty,
                                usedQty: usedQty,
                                remainingQty: remainingQty
                            });
                        }
                    }
                } else {
                    // Handle single product (backward compatibility)
                    productNameForGRN = dc.product_name;
                    for (const material of dc.materials) {
                        // Calculate usedQty and remainingQty using the formula:
                        // UsedQty = (CartonsReturned / CartonsSent) * SentQty
                        // RemainingQty = SentQty - UsedQty
                        const sentQty = material.total_qty || 0;
                        const usedQty = cartonsSent > 0 ? (cartonsReturned / cartonsSent) * sentQty : 0;
                        const remainingQty = sentQty - usedQty;
                        
                        // Get damaged quantity from the request if provided
                        let damagedQty = 0;
                        if (damagedStock && Array.isArray(damagedStock)) {
                            const damagedItem = damagedStock.find(item => item.material_name === material.material_name);
                            damagedQty = damagedItem ? damagedItem.damaged_qty : 0;
                        }
                        
                        processedItems.push({
                            material: material.material_name, // For jobber DCs, we store material name as string
                            materialModel: 'PackingMaterial', // Jobber is always packing materials
                            orderedQuantity: sentQty,
                            receivedQuantity: usedQty, // Use calculated usedQty as received quantity
                            unitPrice: 0, // No price info for delivery challans
                            totalPrice: 0,
                            damagedQuantity: damagedQty,
                            remarks: '',
                            balanceQuantity: remainingQty,
                            usedQty: usedQty,
                            remainingQty: remainingQty
                        });
                    }
                }

                const grnData = {
                    grnNumber,
                    deliveryChallan: deliveryChallanId,
                    supplier: dc.supplier_id ? dc.supplier_id._id : null,
                    items: processedItems,
                    status,
                    receivedBy,
                    dateReceived,
                    isSubmitted: true,
                    sourceType: 'jobber',
                    referenceNumber: dc.dc_no,
                    productName: productNameForGRN,
                    cartonsSent,
                    cartonsReturned: parseFloat(cartonsReturned.toFixed(3)),
                    cartonBalance: balance,
                    dcNumber: dc.dc_no,
                    supplierName: supplierName,
                    unitType: dc.unit_type,
                    // Add individual product carton quantities for multi-product DCs
                    productCartonsReceived: dc.products && dc.products.length > 0 ? productCartonsReceived : undefined
                };

                if (mongoose.Types.ObjectId.isValid(req.user._id)) {
                    grnData.createdBy = req.user._id;
                }
                
                // Set the approver and date now since it's auto-approved
                if (mongoose.Types.ObjectId.isValid(req.user._id)) {
                    grnData.approvedBy = req.user._id;
                    grnData.approvalDate = new Date();
                }

                console.log(`Creating new GRN with data:`, JSON.stringify(grnData, null, 2));
                const newGRN = new GRN(grnData);
                const savedGRN = await newGRN.save();
                console.log(`Saved GRN:`, JSON.stringify(savedGRN, null, 2));
                
                // Update the Delivery Challan status to match the GRN status
                // Validate that status is a valid value
                console.log(`Validating status: ${status}`);
                if (!['Completed', 'Partial'].includes(status)) {
                    console.log(`Validation failed: invalid status ${status}`);
                    return res.status(400).json({ 
                        message: 'Invalid status value.' 
                    });
                }
                await DeliveryChallan.findByIdAndUpdate(deliveryChallanId, { status });
                
                // Create damaged stock records if any
                if (damagedStock && Array.isArray(damagedStock) && damagedStock.length > 0) {
                    try {
                        const DamagedStock = require('../models/DamagedStock');
                        
                        // Filter out items with zero damaged quantity
                        const damagedItems = damagedStock.filter(item => item.damaged_qty > 0);
                        
                        // Create damaged stock records for each item
                        const damagedStockPromises = damagedItems.map(item => {
                            // Handle both single product (backward compatibility) and multiple products
                            let productName = '';
                            if (dc.products && dc.products.length > 0) {
                                // For multiple products, use the first product for backward compatibility
                                productName = dc.products[0].product_name;
                            } else {
                                // For single product (backward compatibility)
                                productName = dc.product_name;
                            }
                            
                            return new DamagedStock({
                                grn_id: savedGRN._id,
                                dc_no: dc.dc_no,
                                product_name: productName,
                                material_name: item.material_name,
                                received_qty: item.received_qty,
                                damaged_qty: item.damaged_qty,
                                entered_by: req.user ? req.user.name : 'System',
                                remarks: 'Recorded during GRN creation'
                            }).save();
                        });
                        
                        await Promise.all(damagedStockPromises);
                    } catch (damagedStockError) {
                        console.error(`Error creating damaged stock records: ${damagedStockError.message}`);
                        // Don't fail the GRN creation if damaged stock recording fails, just log it
                    }
                }
                
                // Update Delivery Challan quantities
                try {
                    await updateDeliveryChallanQuantities(deliveryChallanId, processedItems);
                } catch (dcUpdateError) {
                    console.error(`Error updating Delivery Challan quantities: ${dcUpdateError.message}`);
                    // Don't fail the GRN creation if DC update fails, just log it
                }
                
                // Immediately update product stock with newly received quantity
                try {
                    // Handle both single product (backward compatibility) and multiple products
                    if (dc.products && dc.products.length > 0) {
                        // Handle multiple products - update stock for EACH product individually
                        for (let i = 0; i < dc.products.length; i++) {
                            const product = dc.products[i];
                            
                            // Get the cartons received for this specific product
                            let specificProductCartonsReceived = 0;
                            if (productCartonsReceived && Array.isArray(productCartonsReceived) && productCartonsReceived[i] !== undefined) {
                                specificProductCartonsReceived = parseFloat(productCartonsReceived[i]) || 0;
                            } else {
                                // Fallback: distribute cartonsReturned evenly among products
                                specificProductCartonsReceived = cartonsReturned * (product.carton_qty / cartonsSent);
                            }
                            
                            // Create a mock DC object for this specific product
                            const productDC = {
                                product_name: product.product_name,
                                unit_type: dc.unit_type,
                                carton_qty: specificProductCartonsReceived // Use the actual received quantity
                            };
                            
                            // Update product stock with newly received quantity for this specific product
                            await updateProductStockWithNewQuantity(productDC, specificProductCartonsReceived, req.user ? req.user.name : 'System');
                        }
                    } else {
                        // Handle single product (backward compatibility)
                        // Generate item code for the product (only for first GRN)
                        let productStock = await ProductStock.findOne({ productName: dc.product_name });
                        if (!productStock || !productStock.itemCode) {
                            const itemCode = await generateItemCode();
                            
                            if (productStock) {
                                // If product stock exists, update it with the item code
                                productStock.itemCode = itemCode;
                                await productStock.save();
                            } else {
                                // If product stock doesn't exist, create it with the item code
                                productStock = new ProductStock({
                                    productName: dc.product_name,
                                    itemCode: itemCode,
                                    ownUnitStock: dc.unit_type === 'Own Unit' ? dc.carton_qty : 0,
                                    jobberStock: dc.unit_type === 'Jobber' ? dc.carton_qty : 0,
                                    available_cartons: 0, // Will be updated with new quantity
                                    units_per_carton: dc.units_per_carton || 1,
                                    lastUpdatedFrom: dc.unit_type,
                                    lastProductionDetails: {
                                        unitType: dc.unit_type,
                                        cartonQty: cartonsReturned,
                                        date: new Date()
                                    }
                                });
                                await productStock.save();
                            }
                        }
                        
                        // Update product stock with newly received quantity
                        await updateProductStockWithNewQuantity(dc, cartonsReturned, req.user ? req.user.name : 'System');
                    }
                } catch (stockError) {
                    console.error(`Error updating product stock: ${stockError.message}`);
                    // Don't fail the GRN creation if stock update fails, just log it
                }
                
                return res.status(201).json(savedGRN);
            }
            
            // If cartonsReturned is not provided, return an error
            return res.status(400).json({ 
                message: 'Carton information is required for Delivery Challan-based GRN creation.' 
            });
        }
        
        // If we reach here, it's not a jobber GRN, so return an error
        return res.status(400).json({ 
            message: 'Delivery Challan ID is required for DC-based GRN creation.' 
        });
    } catch (error) {
        console.error(`Error creating GRN: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        res.status(500).json({ message: `Server error while creating GRN: ${error.message}` });
    }
};

/**
 * @desc    Update an existing GRN (for Partial status GRNs)
 * @route   PUT /api/grn/:id
 * @access  Private
 */
const updateGRN = async (req, res) => {
    let { items, receivedBy, dateReceived, cartonsReturned, damagedStock } = req.body;
    
    // Parse cartonsReturned as a number if it's provided
    console.log(`Parsing cartonsReturned: ${cartonsReturned}`);
    if (cartonsReturned !== undefined) {
        cartonsReturned = parseFloat(cartonsReturned);
        console.log(`Parsed cartonsReturned: ${cartonsReturned}`);
        // Validate that cartonsReturned is a valid number
        if (isNaN(cartonsReturned)) {
            console.log(`Invalid carton quantity provided: ${cartonsReturned}`);
            return res.status(400).json({ 
                message: 'Invalid carton quantity provided.' 
            });
        }
    }

    try {
        console.log(`Updating GRN with ID: ${req.params.id}`); // Add logging for debugging
        const grn = await GRN.findById(req.params.id)
            .populate('purchaseOrder')
            .populate('deliveryChallan'); // Populate delivery challan for jobber GRNs
        if (!grn) {
            console.log(`GRN not found for ID: ${req.params.id}`); // Add logging for debugging
            return res.status(404).json({ message: 'GRN not found.' });
        }

        // Only allow updating Partial status GRNs
        if (grn.status !== 'Partial') {
            console.log(`GRN status is ${grn.status}, not Partial. Update not allowed.`); // Add logging for debugging
            return res.status(400).json({ 
                message: 'Only Partial status GRNs can be updated. Other GRNs are locked after submission.' 
            });
        }

        // Check if PO is cancelled (only for PO-based GRNs)
        if (grn.sourceType === 'purchase_order' && grn.purchaseOrder && grn.purchaseOrder.status === 'Cancelled') {
            console.log(`Purchase Order is cancelled. Update not allowed.`); // Add logging for debugging
            return res.status(400).json({ message: 'Cannot update GRN for a cancelled Purchase Order.' });
        }

        // Handle carton-based GRN update for delivery challans
        if (grn.sourceType === 'jobber' && grn.deliveryChallan && cartonsReturned !== undefined) {
            // Carton-based GRN logic
            console.log(`Parsing cartonsSent from grn.deliveryChallan.carton_qty: ${grn.deliveryChallan.carton_qty}`);
            const cartonsSent = parseFloat(grn.deliveryChallan.carton_qty) || 0;
            console.log(`Parsed cartonsSent: ${cartonsSent}`);
            // Validate that cartonsSent is a valid number
            if (isNaN(cartonsSent) || cartonsSent <= 0) {
                console.log(`Invalid carton quantity in Delivery Challan: ${cartonsSent}`);
                return res.status(400).json({ 
                    message: 'Invalid carton quantity in Delivery Challan.' 
                });
            }
            
            // Calculate total cartons already received for this DC (excluding current GRN)
            // Validate that deliveryChallan ID is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(grn.deliveryChallan._id)) {
                return res.status(400).json({ 
                    message: 'Invalid Delivery Challan ID.' 
                });
            }
            const existingGRNs = await GRN.find({ 
                deliveryChallan: grn.deliveryChallan._id, 
                _id: { $ne: grn._id } 
            });
            console.log(`Querying existing GRNs for deliveryChallanId: ${grn.deliveryChallan._id} (excluding current GRN: ${grn._id})`);
            console.log(`Found ${existingGRNs.length} existing GRNs for DC ${grn.deliveryChallan._id} (excluding current GRN)`);
            console.log(`Existing GRNs:`, JSON.stringify(existingGRNs.map(g => ({
                _id: g._id,
                cartonsReturned: g.cartonsReturned,
                status: g.status
            })), null, 2));
            const totalReceived = existingGRNs.reduce((sum, g) => {
                const cartons = parseFloat(g.cartonsReturned) || 0;
                console.log(`GRN ${g._id}: cartonsReturned = ${g.cartonsReturned}, parsed = ${cartons}`);
                return sum + cartons;
            }, 0);
            console.log(`Total received cartons: ${totalReceived}`);
            const pendingCartons = parseFloat((cartonsSent - totalReceived).toFixed(3));
            console.log(`Cartons sent: ${cartonsSent}, Pending cartons: ${pendingCartons}`);
            
            // Validate carton quantities
            console.log(`Validating carton quantities: cartonsReturned = ${cartonsReturned}, pendingCartons = ${pendingCartons}`);
            // Use a small tolerance for floating point comparison
            if (cartonsReturned > pendingCartons + 0.001) {
                console.log(`Validation failed: cartonsReturned (${cartonsReturned}) > pendingCartons (${pendingCartons})`);
                return res.status(400).json({ 
                    message: `Returned cartons cannot exceed pending cartons. Pending: ${pendingCartons}` 
                });
            }
            
            // For multiple products, validate per-product quantities
            if (grn.deliveryChallan.products && grn.deliveryChallan.products.length > 0 && req.body.productCartonsReceived && Array.isArray(req.body.productCartonsReceived)) {
                try {
                    await validateProductQuantities(grn.deliveryChallan._id, req.body.productCartonsReceived);
                } catch (validationError) {
                    return res.status(400).json({ 
                        message: validationError.message 
                    });
                }
            }
            
            // Validate that newReceivedQty > 0
            console.log(`Validating cartonsReturned > 0: isNaN = ${isNaN(cartonsReturned)}, value = ${cartonsReturned}`);
            if (isNaN(cartonsReturned) || cartonsReturned <= 0) {
                console.log(`Validation failed: cartonsReturned (${cartonsReturned}) is not > 0`);
                return res.status(400).json({ 
                    message: 'Returned cartons must be greater than zero.' 
                });
            }
            
            console.log(`Calculating balance: pendingCartons = ${pendingCartons}, cartonsReturned = ${cartonsReturned}`);
            const balance = parseFloat((pendingCartons - cartonsReturned).toFixed(3));
            console.log(`Calculated balance: ${balance}`);
            
            // Determine status based on carton quantities
            // NEW: Only set to Completed if pendingQty == 0, otherwise Partial
            // Use a small tolerance for floating point comparison
            let status = 'Partial';
            console.log(`Determining status: balance = ${balance}`);
            if (Math.abs(balance) < 0.001) {
                status = 'Completed';
                console.log(`Status set to Completed`);
            } else {
                console.log(`Status set to Partial`);
            }

            // Process items to calculate usedQty and remainingQty based on carton return
            const processedItems = [];
            
            // Handle both single product (backward compatibility) and multiple products
            if (grn.deliveryChallan.products && grn.deliveryChallan.products.length > 0) {
                // Handle multiple products
                // Process materials for all products
                for (const product of grn.deliveryChallan.products) {
                    for (const material of product.materials) {
                        // Calculate usedQty and remainingQty using the formula:
                        // UsedQty = (CartonsReturned / CartonsSent) * SentQty
                        // RemainingQty = SentQty - UsedQty
                        const sentQty = material.total_qty || 0;
                        const usedQty = cartonsSent > 0 ? (cartonsReturned / cartonsSent) * sentQty : 0;
                        const remainingQty = sentQty - usedQty;
                        
                        // Get damaged quantity from the request if provided
                        let damagedQty = 0;
                        if (damagedStock && Array.isArray(damagedStock)) {
                            const damagedItem = damagedStock.find(item => item.material_name === material.material_name);
                            damagedQty = damagedItem ? damagedItem.damaged_qty : 0;
                        }
                        
                        processedItems.push({
                            material: material.material_name, // For jobber DCs, we store material name as string
                            materialModel: 'PackingMaterial', // Jobber is always packing materials
                            orderedQuantity: sentQty,
                            receivedQuantity: usedQty, // Use calculated usedQty as received quantity
                            unitPrice: 0, // No price info for delivery challans
                            totalPrice: 0,
                            damagedQuantity: damagedQty,
                            remarks: '',
                            balanceQuantity: remainingQty,
                            usedQty: usedQty,
                            remainingQty: remainingQty
                        });
                    }
                }
            } else {
                // Handle single product (backward compatibility)
                for (const material of grn.deliveryChallan.materials) {
                    // Calculate usedQty and remainingQty using the formula:
                    // UsedQty = (CartonsReturned / CartonsSent) * SentQty
                    // RemainingQty = SentQty - UsedQty
                    const sentQty = material.total_qty || 0;
                    const usedQty = cartonsSent > 0 ? (cartonsReturned / cartonsSent) * sentQty : 0;
                    const remainingQty = sentQty - usedQty;
                    
                    // Get damaged quantity from the request if provided
                    let damagedQty = 0;
                    if (damagedStock && Array.isArray(damagedStock)) {
                        const damagedItem = damagedStock.find(item => item.material_name === material.material_name);
                        damagedQty = damagedItem ? damagedItem.damaged_qty : 0;
                    }
                    
                    processedItems.push({
                        material: material.material_name, // For jobber DCs, we store material name as string
                        materialModel: 'PackingMaterial', // Jobber is always packing materials
                        orderedQuantity: sentQty,
                        receivedQuantity: usedQty, // Use calculated usedQty as received quantity
                        unitPrice: 0, // No price info for delivery challans
                        totalPrice: 0,
                        damagedQuantity: damagedQty,
                        remarks: '',
                        balanceQuantity: remainingQty,
                        usedQty: usedQty,
                        remainingQty: remainingQty
                    });
                }
            }

            // Update GRN fields
            grn.items = processedItems;
            grn.status = status;
            grn.receivedBy = receivedBy;
            grn.dateReceived = dateReceived;
            grn.cartonsReturned = parseFloat(cartonsReturned.toFixed(3));
            grn.cartonBalance = balance;
            // For multi-product DCs, we might need to update productCartonsReceived if provided in the request
            if (req.body.productCartonsReceived && Array.isArray(req.body.productCartonsReceived)) {
                grn.productCartonsReceived = req.body.productCartonsReceived;
            }

            // If it is approved/partial, set the approver and date now
            if ((status === 'Completed' || status === 'Partial') && mongoose.Types.ObjectId.isValid(req.user._id)) {
                grn.approvedBy = req.user._id;
                grn.approvalDate = new Date();
            }

            console.log(`Updating GRN ${grn._id} with data:`, JSON.stringify({
                items: processedItems,
                status,
                receivedBy,
                dateReceived,
                cartonsReturned: parseFloat(cartonsReturned.toFixed(3)),
                cartonBalance: balance
            }, null, 2));
            const updatedGRN = await grn.save();
            console.log(`Updated GRN:`, JSON.stringify(updatedGRN, null, 2));

            // Create damaged stock records if any
            if (damagedStock && Array.isArray(damagedStock) && damagedStock.length > 0) {
                try {
                    const DamagedStock = require('../models/DamagedStock');
                    
                    // Filter out items with zero damaged quantity
                    const damagedItems = damagedStock.filter(item => item.damaged_qty > 0);
                    
                    // Create damaged stock records for each item
                    const damagedStockPromises = damagedItems.map(item => {
                        // Handle both single product (backward compatibility) and multiple products
                        let productName = '';
                        if (grn.deliveryChallan.products && grn.deliveryChallan.products.length > 0) {
                            // For multiple products, use the first product for backward compatibility
                            productName = grn.deliveryChallan.products[0].product_name;
                        } else {
                            // For single product (backward compatibility)
                            productName = grn.deliveryChallan.product_name;
                        }
                        
                        return new DamagedStock({
                            grn_id: updatedGRN._id,
                            dc_no: grn.deliveryChallan.dc_no,
                            product_name: productName,
                            material_name: item.material_name,
                            received_qty: item.received_qty,
                            damaged_qty: item.damaged_qty,
                            entered_by: req.user ? req.user.name : 'System',
                            remarks: 'Recorded during GRN update'
                        }).save();
                    });
                    
                    await Promise.all(damagedStockPromises);
                } catch (damagedStockError) {
                    console.error(`Error creating damaged stock records: ${damagedStockError.message}`);
                    // Don't fail the GRN update if damaged stock recording fails, just log it
                }
            }

            // Sync status with Delivery Challan
            // Validate that status is a valid value
            console.log(`Validating status: ${status}`);
            if (!['Completed', 'Partial'].includes(status)) {
                console.log(`Validation failed: invalid status ${status}`);
                return res.status(400).json({ 
                    message: 'Invalid status value.' 
                });
            }
            await DeliveryChallan.findByIdAndUpdate(grn.deliveryChallan._id, { status });

            // Update Delivery Challan quantities
            try {
                await updateDeliveryChallanQuantities(grn.deliveryChallan._id, processedItems, grn._id);
            } catch (dcUpdateError) {
                console.error(`Error updating Delivery Challan quantities: ${dcUpdateError.message}`);
                // Don't fail the GRN update if DC update fails, just log it
            }
            
            // Immediately update product stock with newly received quantity
            try {
                // Get the DC to pass to the update function
                const dc = grn.deliveryChallan;
                const grnNumber = grn.grnNumber;
                
                // Handle both single product (backward compatibility) and multiple products
                if (dc.products && dc.products.length > 0) {
                    // Handle multiple products - update stock for EACH product individually
                    // Calculate total cartons sent
                    const cartonsSent = dc.products.reduce((total, product) => total + (product.carton_qty || 0), 0);
                    
                    for (let i = 0; i < dc.products.length; i++) {
                        const product = dc.products[i];
                        
                        // Get the cartons received for this specific product
                        let specificProductCartonsReceived = 0;
                        if (grn.productCartonsReceived && Array.isArray(grn.productCartonsReceived) && grn.productCartonsReceived[i] !== undefined) {
                            specificProductCartonsReceived = parseFloat(grn.productCartonsReceived[i]) || 0;
                        } else {
                            // Fallback: distribute cartonsReturned evenly among products
                            specificProductCartonsReceived = cartonsReturned * (product.carton_qty / cartonsSent);
                        }
                        
                        // Create a mock DC object for this specific product
                        const productDC = {
                            product_name: product.product_name,
                            unit_type: dc.unit_type,
                            carton_qty: specificProductCartonsReceived // Use the actual received quantity
                        };
                        
                        // Update product stock with newly received quantity for this specific product
                        await updateProductStockWithNewQuantity(productDC, specificProductCartonsReceived, req.user ? req.user.name : 'System');
                    }
                } else {
                    // Handle single product (backward compatibility)
                    // Use the new utility function to update product stock
                    await updateProductStockWithNewQuantity(dc, cartonsReturned, req.user ? req.user.name : 'System');
                }
            } catch (stockError) {
                console.error(`Error updating product stock: ${stockError.message}`);
                // Don't fail the GRN creation if stock update fails, just log it
            }

            return res.json(updatedGRN);
        }

        // If we reach here, it's not a jobber GRN with cartonsReturned, so return an error
        return res.status(400).json({ 
            message: 'Carton information is required for Delivery Challan-based GRN updates.' 
        });
    } catch (error) {
        console.error(`Error updating GRN: ${error.message}`); // Add logging for debugging
        res.status(500).json({ message: 'Server error.' });
    }
};

// Helper function to validate that received quantity doesn't exceed pending quantity per product
const validateProductQuantities = async (deliveryChallanId, productCartonsReceived) => {
    try {
        const pendingQuantities = await calculateProductPendingQuantities(deliveryChallanId);
        
        if (!pendingQuantities) {
            throw new Error('Delivery Challan not found');
        }
        
        const dc = await DeliveryChallan.findById(deliveryChallanId);
        
        if (dc.products && dc.products.length > 0) {
            for (let i = 0; i < dc.products.length; i++) {
                const product = dc.products[i];
                const pendingQty = pendingQuantities.find(p => p.productName === product.product_name)?.pendingQty || 0;
                const receivedQty = parseFloat(productCartonsReceived[i]) || 0;
                
                if (receivedQty > pendingQty) {
                    throw new Error(`You can receive only ${pendingQty} cartons for ${product.product_name}. Pending only ${pendingQty}`);
                }
                
                if (receivedQty < 0) {
                    throw new Error(`Received quantity for ${product.product_name} must be greater than or equal to 0`);
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error validating product quantities:', error);
        throw error;
    }
};

/**
 * @desc    Get pending quantities per product for a delivery challan
 * @route   GET /api/grn/pending-quantities/:dcId
 * @access  Private
 */
const getPendingQuantities = async (req, res) => {
    try {
        const { dcId } = req.params;
        
        // Validate that the ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(dcId)) {
            return res.status(400).json({ message: 'Invalid Delivery Challan ID format.' });
        }
        
        const pendingQuantities = await calculateProductPendingQuantities(dcId);
        
        if (!pendingQuantities) {
            return res.status(404).json({ message: 'Delivery Challan not found.' });
        }
        
        res.json(pendingQuantities);
    } catch (error) {
        console.error(`Error fetching pending quantities: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching pending quantities.' });
    }
};

module.exports = {
    createGRN,
    updateGRN,
    getPendingQuantities,
    calculateProductPendingQuantities,
    validateProductQuantities
};