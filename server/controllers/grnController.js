const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const DeliveryChallan = require('../models/DeliveryChallan');
const ProductStock = require('../models/ProductStock'); // Add this line
const PackingMaterial = require('../models/PackingMaterial');
const RawMaterial = require('../models/RawMaterial');
const mongoose = require('mongoose');
const { getNextGRNNumber } = require('../utils/grnUtils');
const { updateProductStockOnGRNCompletion, updateProductStockWithNewQuantity } = require('../utils/stockUpdate'); // Import the new utility

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

// Helper function to fetch price from PO when GRN price is missing
const fetchPriceFromPO = async (purchaseOrderId, materialId, materialModel) => {
    try {
        const po = await PurchaseOrder.findById(purchaseOrderId);
        if (!po) return { unitPrice: 0, totalPrice: 0 };
        
        // Convert materialId to string for consistent comparison
        const materialIdStr = typeof materialId === 'object' && materialId.toString ? 
            materialId.toString() : 
            String(materialId);
        
        // Find the corresponding item in the PO
        const poItem = po.items.find(item => {
            if (!item || !item.material) return false;
            const poItemId = typeof item.material === 'object' ? item.material.toString() : item.material;
            return poItemId === materialIdStr && item.materialModel === materialModel;
        });
        
        if (poItem) {
            return {
                unitPrice: poItem.rate || 0,  // Changed from 'price' to 'rate'
                totalPrice: poItem.lineTotal || 0  // Changed from 'total' to 'lineTotal'
            };
        }
        
        return { unitPrice: 0, totalPrice: 0 };
    } catch (error) {
        console.error('Error fetching price from PO:', error);
        return { unitPrice: 0, totalPrice: 0 };
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
 * @desc    Check if GRN exists for a PO and return appropriate action
 * @route   GET /api/grn/check-po/:poId
 * @access  Private
 */
const checkPOForGRN = async (req, res) => {
    try {
        const { poId } = req.params;
        
        // Find the PO
        const po = await PurchaseOrder.findById(poId);
        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found.' });
        }
        
        // Check if PO is cancelled
        if (po.status === 'Cancelled') {
            return res.status(200).json({ 
                action: 'allow_new', 
                message: 'PO is cancelled. New GRN creation allowed.' 
            });
        }
        
        // Check if a GRN already exists for this PO
        const existingGRN = await GRN.findOne({ purchaseOrder: poId }).sort({ createdAt: -1 });
        
        if (existingGRN) {
            if (existingGRN.status === 'Completed') {
                return res.status(400).json({ 
                    message: `⚠️ GRN already completed for this Purchase Order. You cannot create another GRN for ${po.poNumber}.` 
                });
            }
            // For Partial status, we should allow creating new GRNs (partial receiving should be allowed)
            // The check for Partial status has been removed to allow multiple partial GRNs for the same PO
        }

        const grnNumber = await getNextGRNNumber();

        // No existing GRN or existing GRN is not blocking
        return res.status(200).json({ 
            action: 'allow_new', 
            message: 'New GRN creation allowed.' 
        });
        
    } catch (error) {
        console.error(`Error checking PO for GRN: ${error.message}`);
        res.status(500).json({ message: 'Server error while checking PO status.' });
    }
};

/**
 * @desc    Create a new Goods Receipt Note (GRN) from Purchase Order or Delivery Challan
 * @route   POST /api/grn
 * @access  Private
 */
const createGRN = async (req, res) => {
    let { purchaseOrderId, deliveryChallanId, items, receivedBy, dateReceived, cartonsReturned, damagedStock } = req.body;
        
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
                    unitType: dc.unit_type
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
                        // Handle multiple products
                        // Update stock for the first product (for backward compatibility)
                        const firstProduct = dc.products[0];
                        let productStock = await ProductStock.findOne({ productName: firstProduct.product_name });
                        if (!productStock || !productStock.itemCode) {
                            const itemCode = await generateItemCode();
                            
                            if (productStock) {
                                // If product stock exists, update it with the item code
                                productStock.itemCode = itemCode;
                                await productStock.save();
                            } else {
                                // If product stock doesn't exist, create it with the item code
                                productStock = new ProductStock({
                                    productName: firstProduct.product_name,
                                    itemCode: itemCode,
                                    ownUnitStock: dc.unit_type === 'Own Unit' ? firstProduct.carton_qty : 0,
                                    jobberStock: dc.unit_type === 'Jobber' ? firstProduct.carton_qty : 0,
                                    available_cartons: 0, // Will be updated with new quantity
                                    units_per_carton: firstProduct.units_per_carton || 1,
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
        
        // Handle Purchase Order-based GRN creation (existing logic)
        if (!purchaseOrderId) {
            return res.status(400).json({ message: 'Purchase Order ID is required for PO-based GRN creation.' });
        }
        
        const po = await PurchaseOrder.findById(purchaseOrderId).populate('supplier');
        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found.' });
        }

        // Check if PO is cancelled
        if (po.status === 'Cancelled') {
            return res.status(400).json({ message: 'Cannot create GRN for a cancelled Purchase Order.' });
        }

        // Check if a GRN already exists for this PO
        const existingGRN = await GRN.findOne({ purchaseOrder: purchaseOrderId }).sort({ createdAt: -1 });
        
        if (existingGRN) {
            if (existingGRN.status === 'Completed') {
                return res.status(400).json({ 
                    message: `⚠️ GRN already completed for this Purchase Order. You cannot create another GRN for ${po.poNumber}.` 
                });
            } else if (existingGRN.status === 'Partial') {
                // For Partial status, we should allow creating new GRNs (partial receiving should be allowed)
                // The check for Partial status has been removed to allow multiple partial GRNs for the same PO
                // return res.status(400).json({ 
                //     message: '⚠️ A Partial GRN already exists for this PO. Please edit the existing GRN instead of creating a new one.'
                // });
            }
        }

        const grnNumber = await getNextGRNNumber();

        // Validate that items array is provided and not empty
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items array is required and cannot be empty.' });
        }

        // Process items to calculate totals and price differences
        const processedItems = [];
        let allItemsMatch = true; // Flag to check if all items match exactly
        let allExtraItemsMatch = true; // Flag to check if all extra items match exactly

        // Process each item
        for (const item of items) {
            const { material, materialModel, receivedQuantity, extraReceivedQty = 0 } = item;
            
            // Validate required fields for PO-based GRN
            if (!material || !materialModel || receivedQuantity === undefined) {
                return res.status(400).json({ message: 'Material, materialModel, and receivedQuantity are required for each item.' });
            }
            
            // Check if price details are missing and fetch from PO if needed
            let unitPrice = item.unitPrice;
            let totalPrice = receivedQuantity * unitPrice;
            
            // Detect missing price (0 or null)
            if (!unitPrice || unitPrice === 0) {
                const priceData = await fetchPriceFromPO(purchaseOrderId, material, materialModel);
                unitPrice = priceData.unitPrice;
                totalPrice = receivedQuantity * unitPrice;
            }
            
            // Find the corresponding item in the PO
            const poItem = po.items.find(poItem => {
                if (!poItem || !poItem.material) return false;
                const poItemId = typeof poItem.material === 'object' ? poItem.material.toString() : poItem.material;
                const itemMaterialId = typeof material === 'object' ? material.toString() : material;
                return poItemId === itemMaterialId && poItem.materialModel === materialModel;
            });
            
            // Validate that the item exists in the PO
            if (!poItem) {
                return res.status(400).json({ message: `Item not found in Purchase Order: ${material}` });
            }
            
            // Calculate total received quantities for this material from all previous GRNs for this PO
            const existingGRNs = await GRN.find({ 
                purchaseOrder: purchaseOrderId,
                'items.material': material,
                'items.materialModel': materialModel
            });
            
            let previousReceived = 0;
            let previousExtraReceived = 0;
            for (const existingGRN of existingGRNs) {
                for (const grnItem of existingGRN.items) {
                    const grnItemId = typeof grnItem.material === 'object' ? grnItem.material.toString() : grnItem.material;
                    const itemMaterialId = typeof material === 'object' ? material.toString() : material;
                    if (grnItemId === itemMaterialId && grnItem.materialModel === materialModel) {
                        previousReceived += grnItem.receivedQuantity || 0;
                        previousExtraReceived += grnItem.extraReceivedQty || 0;
                    }
                }
            }
            
            // Calculate pending quantity
            const pendingQuantity = poItem.quantity - previousReceived;
            
            // Check if received quantity exceeds pending quantity
            if (receivedQuantity > pendingQuantity) {
                return res.status(400).json({ 
                    message: `Received quantity (${receivedQuantity}) cannot exceed pending quantity (${pendingQuantity}) for material ${poItem.material.name || material}.` 
                });
            }
            
            // Calculate pending extra quantity
            const pendingExtraQuantity = poItem.extraAllowedQty - previousExtraReceived;
            
            // Check if extra received quantity exceeds pending extra quantity
            if (extraReceivedQty > pendingExtraQuantity) {
                return res.status(400).json({ 
                    message: `Extra received quantity (${extraReceivedQty}) cannot exceed pending extra quantity (${pendingExtraQuantity}) for material ${poItem.material.name || material}.` 
                });
            }
            
            // Check if all items are fully received to determine status
            // We need to check if the current item plus previous received equals the ordered quantity
            if (previousReceived + receivedQuantity !== poItem.quantity) {
                allItemsMatch = false;
            }
            
            // Check if all extra items are fully received to determine status
            if (previousExtraReceived + extraReceivedQty !== poItem.extraAllowedQty) {
                allExtraItemsMatch = false;
            }
            
            // Calculate price difference using the (possibly updated) unitPrice
            const priceData = await calculatePriceDifference(material, materialModel, unitPrice);
            
            // Calculate balance quantity (ordered - (previous received + current received))
            const balanceQuantity = poItem.quantity - (previousReceived + receivedQuantity);
            
            const totalReceived = previousReceived + receivedQuantity;
            
            processedItems.push({
                material,
                materialModel,
                orderedQuantity: poItem.quantity,
                receivedQuantity: parseFloat(receivedQuantity),
                extraReceivedQty: parseFloat(extraReceivedQty),
                unitPrice: parseFloat(unitPrice),
                totalPrice: parseFloat(totalPrice),

                remarks: item.remarks || '',
                lastUnitPrice: priceData.lastUnitPrice,
                priceDifference: priceData.priceDifference,
                priceDifferencePercentage: priceData.priceDifferencePercentage,
                balanceQuantity: balanceQuantity,
                previousReceived: previousReceived,
                receivedQuantity: parseFloat(receivedQuantity),
                totalReceived: totalReceived + (parseFloat(extraReceivedQty) || 0),
                pendingQty: pendingQuantity,
                extraAllowedQty: poItem.extraAllowedQty,
                previousExtraReceived: previousExtraReceived,
                extraPending: pendingExtraQuantity
            });
        }
        
        // Determine GRN status based on whether all items are fully received:
        // 1. If all normal quantities are fully received → "Normal Completed"
        // 2. If all extra quantities are fully received → "Extra Completed"
        // 3. If both normal and extra quantities are fully received → "Completed"
        // 4. If quantities are partially received → "Partial"
        let status;
        if (allItemsMatch && allExtraItemsMatch) {
            // All quantities fully received - set to Completed
            status = 'Completed';
        } else if (allItemsMatch && !allExtraItemsMatch) {
            // Normal quantities fully received but extra not - set to Normal Completed
            status = 'Normal Completed';
        } else if (!allItemsMatch && allExtraItemsMatch) {
            // Extra quantities fully received but normal not - set to Extra Completed
            status = 'Extra Completed';
        } else {
            // Quantity partially received - set to Partial
            status = 'Partial';
        }

        const grnData = {
            grnNumber,
            purchaseOrder: purchaseOrderId,
            supplier: po.supplier._id,
            items: processedItems,
            status,
            receivedBy,
            dateReceived,
            isSubmitted: true, // Mark as submitted
            sourceType: 'purchase_order', // Set source type to purchase_order
            referenceNumber: po.poNumber, // Store the PO number
            dcNumber: po.poNumber,
            supplierName: po.supplier.name,
            // Add reference fields
            referenceType: referenceType || undefined,
            invoiceNo: invoiceNo || undefined,
            invoiceDate: invoiceDate || undefined,
            dcNo: dcNo || undefined
        };

        if (mongoose.Types.ObjectId.isValid(req.user._id)) {
            grnData.createdBy = req.user._id;
        }
        
        // Set the approver and date now since it's auto-approved
        if (mongoose.Types.ObjectId.isValid(req.user._id)) {
            grnData.approvedBy = req.user._id;
            grnData.approvalDate = new Date();
        }

        const newGRN = new GRN(grnData);
        const savedGRN = await newGRN.save();
        // Update stock for each item in the GRN immediately upon submission
        for (const item of processedItems) {
            const Model = item.materialModel === 'PackingMaterial' ? PackingMaterial : RawMaterial;
            
            // Handle both ObjectId and string material references
            let material;
            if (typeof item.material === 'string') {
                // For jobber GRNs, item.material is a string (material name)
                material = await Model.findOne({ name: item.material });
            } else {
                // For PO-based GRNs, item.material is an ObjectId
                material = await Model.findById(item.material);
            }
            
            if (!material) continue;
            
            // Calculate weighted average price
            const existingQuantity = material.quantity || 0;
            const existingPrice = material.perQuantityPrice || 0;
            // Total quantity to add is normal received + extra received
            const newQuantity = item.receivedQuantity + item.extraReceivedQty;
            const newPrice = item.unitPrice || 0; // Use the provided unitPrice or 0
            
            // Calculate total values
            const existingTotalValue = existingQuantity * existingPrice;
            const newTotalValue = newQuantity * newPrice;
            const totalQuantityAfter = existingQuantity + newQuantity;
            const totalValueAfter = existingTotalValue + newTotalValue;
            
            // Calculate new weighted average price
            const newAveragePrice = totalQuantityAfter > 0 ? totalValueAfter / totalQuantityAfter : 0;
            
            // Update material quantity and price
            const materialId = typeof item.material === 'string' ? material._id : item.material;
            await Model.findByIdAndUpdate(materialId, { 
                quantity: totalQuantityAfter,
                perQuantityPrice: newAveragePrice
            });
            
            // Get the supplier info
            const supplierName = po.supplier.name;
            
            // Create new GRN history entry with correct prices
            const grnHistoryEntry = {
                date: new Date(dateReceived), // Use the GRN date, not current date
                type: 'New GRN',
                supplier: supplierName,
                poNumber: po.poNumber, // Use purchase order number
                grnNumber: grnNumber,
                qty: newQuantity, // Use total quantity (normal + extra)
                unitPrice: newPrice,
                total: newTotalValue
            };
            
            // Update material history with the new logic
            // First, get the current material to work with its history
            const updatedMaterial = await Model.findById(materialId);
            
            // Filter out existing "New Average Price (Updated)" entries
            const filteredHistory = updatedMaterial.priceHistory.filter(entry => 
                entry.type !== 'New Average Price (Updated)'
            );
            
            // Add the new GRN entry
            filteredHistory.push(grnHistoryEntry);
            
            // Calculate new totals for all entries (Existing Stock + New GRN entries only)
            const entries = filteredHistory.filter(h => 
                h.type === 'Existing Stock' || h.type === 'New GRN'
            );
            
            // Calculate new weighted average price from all entries
            let totalQty = 0;
            let totalValue = 0;
            entries.forEach(entry => {
                totalQty += entry.qty || 0;
                totalValue += entry.total || 0;
            });
            
            const newWeightedAveragePrice = totalQty > 0 ? totalValue / totalQty : 0;
            
            // Add the "New Average Price (Updated)" entry
            filteredHistory.push({
                date: new Date(),
                type: 'New Average Price (Updated)',
                supplier: supplierName,
                poNumber: po.poNumber,
                grnNumber: grnNumber,
                qty: totalQty,
                unitPrice: newWeightedAveragePrice,
                total: totalValue
            });
            
            // Update the material with the new history
            await Model.findByIdAndUpdate(materialId, {
                priceHistory: filteredHistory
            });
        }
        
        // Update the quantityReceived on the PO for each item immediately
        for (const item of processedItems) {
            const materialId = typeof item.material === 'object' ? item.material._id || item.material : item.material;
            await PurchaseOrder.updateOne(
                { "_id": purchaseOrderId, "items.material": materialId, "items.materialModel": item.materialModel },
                { "$inc": { "items.$.quantityReceived": item.receivedQuantity + (item.extraReceivedQty || 0) } }
            );
        }
        
        // Check if all quantities have been received across all GRNs for this PO and update PO status
        const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
        if (purchaseOrder) {
            let allItemsCompleted = true;
            
            // For each item in the PO, check if total received across all GRNs equals ordered quantity
            for (const poItem of purchaseOrder.items) {
                // Calculate total received for this material across all GRNs for this PO
                const existingGRNs = await GRN.find({ 
                    purchaseOrder: purchaseOrderId,
                    'items.material': poItem.material,
                    'items.materialModel': poItem.materialModel
                });
                
                let totalReceived = 0;
                for (const existingGRN of existingGRNs) {
                    for (const grnItem of existingGRN.items) {
                        const grnItemId = typeof grnItem.material === 'object' ? grnItem.material.toString() : grnItem.material;
                        const poItemId = typeof poItem.material === 'object' ? poItem.material.toString() : poItem.material;
                        if (grnItemId === poItemId && grnItem.materialModel === poItem.materialModel) {
                            totalReceived += (grnItem.receivedQuantity || 0) + (grnItem.extraReceivedQty || 0);
                        }
                    }
                }
                
                // If total received doesn't match ordered quantity, not all items are completed
                if (totalReceived !== poItem.quantity) {
                    allItemsCompleted = false;
                    break;
                }
            }
            
            if (allItemsCompleted) {
                // Update PO status to Completed
                await PurchaseOrder.findByIdAndUpdate(purchaseOrderId, { status: 'Completed' });
            }
        }
        
        return res.status(201).json(savedGRN);

    } catch (error) {
        console.error(`Error creating GRN: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        res.status(500).json({ message: `Server error while creating GRN: ${error.message}` });
    }
};

/**
 * @desc    Get all GRNs
 * @route   GET /api/grn
 * @access  Private
 */
const getGRNs = async (req, res) => {
    try {
        // Build query filter
        const filter = {};
        
        // Filter by source type if specified
        if (req.query.sourceType) {
            filter.sourceType = req.query.sourceType;
        }
        
        // Filter by purchase order if specified
        if (req.query.purchaseOrder) {
            filter.purchaseOrder = req.query.purchaseOrder;
        }
        
        // Filter by delivery challan if specified
        if (req.query.deliveryChallan) {
            filter.deliveryChallan = req.query.deliveryChallan;
        }
        
        // First get all GRNs with populated data
        let query = GRN.find(filter)
            .populate('supplier', 'name')
            .populate('purchaseOrder', 'poNumber')
            .populate('deliveryChallan', 'dc_no supplier_id person_name unit_type status') // Populate delivery challan for jobber GRNs
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        
        // Apply material type filter if specified
        if (req.query.materialType) {
            // Get all GRN IDs first
            const allGrns = await GRN.find(filter)
                .populate('supplier', 'name')
                .populate('purchaseOrder', 'poNumber')
                .populate('deliveryChallan', 'dc_no supplier_id person_name unit_type status') // Populate delivery challan for jobber GRNs
                .populate('approvedBy', 'name')
                .lean();
            
            // Filter GRNs based on material type
            let filteredGrnIds = [];
            if (req.query.materialType === 'packing') {
                filteredGrnIds = allGrns
                    .filter(grn => grn.items.some(item => item.materialModel === 'PackingMaterial'))
                    .map(grn => grn._id);
            } else if (req.query.materialType === 'raw') {
                filteredGrnIds = allGrns
                    .filter(grn => grn.items.some(item => item.materialModel === 'RawMaterial'))
                    .map(grn => grn._id);
            }
            
            query = GRN.find({ ...filter, _id: { $in: filteredGrnIds } })
                .populate('supplier', 'name')
                .populate('purchaseOrder', 'poNumber')
                .populate('deliveryChallan', 'dc_no supplier_id person_name unit_type status') // Populate delivery challan for jobber GRNs
                .populate('approvedBy', 'name')
                .sort({ createdAt: -1 })
                .lean();
        }
        
     // NEW CODE BLOCK TO USE INSTEAD

        const allGrns = await query;

        let grns = allGrns; // By default, use the full list of GRNs.

        // IMPORTANT: Only filter for the latest GRN if we are on the main list page.
        // If a specific deliveryChallan is being requested (from the Create page), we need ALL of them.
        if (!req.query.deliveryChallan && !req.query.purchaseOrder) {
            const latestGrnsPerReference = {};
            allGrns.forEach(grn => {
                // Use purchaseOrder for PO-based GRNs, deliveryChallan for jobber GRNs
                const referenceId = grn.sourceType === 'jobber' ? 
                    (grn.deliveryChallan ? grn.deliveryChallan._id || grn.deliveryChallan : null) :
                    (grn.purchaseOrder ? grn.purchaseOrder._id || grn.purchaseOrder : null);
                    
                if (referenceId) {
                    const referenceIdStr = referenceId.toString();
                    // If we haven't seen this reference yet, or if this GRN is more recent, keep it
                    if (!latestGrnsPerReference[referenceIdStr] || new Date(grn.createdAt) > new Date(latestGrnsPerReference[referenceIdStr].createdAt)) {
                        latestGrnsPerReference[referenceIdStr] = grn;
                    }
                } else {
                    // If no reference, just add it (shouldn't happen in normal cases)
                    latestGrnsPerReference[grn._id] = grn;
                }
            });
            
            // Overwrite the 'grns' variable with the filtered list
            grns = Object.values(latestGrnsPerReference);
        }

        // Process GRNs to ensure proper supplier name for jobber GRNs and add itemCode
        const processedGrns = await Promise.all(grns.map(async (grn) => {
            // For jobber GRNs, ensure we have the correct supplier name
            if (grn.sourceType === 'jobber') {
                // Check if we have all required DC info
                const hasDCInfo = grn.dcNumber && grn.supplierName;
                
                // If we already have supplierName and dcNumber fields, use them
                if (hasDCInfo) {
                    // Add itemCode for jobber GRNs
                    if (grn.productName) {
                        const productStock = await ProductStock.findOne({ productName: grn.productName });
                        if (productStock && productStock.itemCode) {
                            grn.itemCode = productStock.itemCode;
                        }
                    }
                    return grn;
                }
                
                // Otherwise, try to populate from delivery challan data
                if (grn.deliveryChallan) {
                    // Determine supplier name based on unit type
                    let supplierName = 'N/A';
                    if (grn.deliveryChallan.unit_type === 'Jobber' && grn.deliveryChallan.supplier_id) {
                        supplierName = typeof grn.deliveryChallan.supplier_id === 'object' 
                            ? grn.deliveryChallan.supplier_id.name 
                            : grn.deliveryChallan.supplier_id;
                    } else if (grn.deliveryChallan.unit_type === 'Own Unit') {
                        supplierName = grn.deliveryChallan.person_name || 'N/A';
                    }
                    
                    // Use dc_no from delivery challan if dcNumber is missing
                    const dcNumber = grn.dcNumber || grn.deliveryChallan.dc_no || 'N/A';
                    
                    // Add itemCode for jobber GRNs
                    let itemCode = 'N/A';
                    if (grn.productName) {
                        const productStock = await ProductStock.findOne({ productName: grn.productName });
                        if (productStock && productStock.itemCode) {
                            itemCode = productStock.itemCode;
                        }
                    }
                    
                    return {
                        ...grn,
                        supplierName: supplierName,
                        dcNumber: dcNumber,
                        itemCode: itemCode
                    };
                }
                
                // Fallback to existing supplier field if no delivery challan data
                // Add itemCode for jobber GRNs
                let itemCode = 'N/A';
                if (grn.productName) {
                    const productStock = await ProductStock.findOne({ productName: grn.productName });
                    if (productStock && productStock.itemCode) {
                        itemCode = productStock.itemCode;
                    }
                }
                
                return {
                    ...grn,
                    supplierName: grn.supplierName || grn.supplier?.name || 'N/A',
                    dcNumber: grn.dcNumber || 'N/A',
                    itemCode: itemCode
                };
            }
            
            // For non-jobber GRNs, manually add the Admin's name if needed
            if (grn.status === 'Approved' && !grn.approvedBy) {
                return { ...grn, approvedBy: { name: 'Admin User' } };
            }
            
            return grn;
        }));

        res.json(processedGrns);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching GRNs.' });
    }
};

/**
 * @desc    Get a single GRN by ID
 * @route   GET /api/grn/:id
 * @access  Private
 */
const getGRNById = async (req, res) => {
    try {
        // Validate that the ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid GRN ID format.' });
        }
        
        console.log(`Fetching GRN with ID: ${req.params.id}`); // Add logging for debugging
        const grn = await GRN.findById(req.params.id)
            .populate('supplier')
            .populate('purchaseOrder')
            .populate('deliveryChallan', 'dc_no supplier_id person_name unit_type status products') // Populate delivery challan with products for jobber GRNs
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');
        
        // For PO-based GRNs, populate material details
        if (grn && grn.sourceType === 'purchase_order' && grn.items) {
            // Populate material details for each item
            for (let i = 0; i < grn.items.length; i++) {
                const item = grn.items[i];
                if (item.material && mongoose.Types.ObjectId.isValid(item.material)) {
                    const Model = item.materialModel === 'PackingMaterial' ? PackingMaterial : RawMaterial;
                    const material = await Model.findById(item.material);
                    if (material) {
                        // Replace the material ID with the full material object
                        grn.items[i].material = material;
                    }
                }
            }
        }

        if (grn) {
            console.log(`Found GRN: ${grn.grnNumber}`); // Add logging for debugging
            
            // For jobber GRNs, recalculate carton details based on all GRNs linked to the same DC
            if (grn.sourceType === 'jobber' && grn.deliveryChallan) {
                // Find all GRNs linked to the same delivery challan
                const allGRNsForDC = await GRN.find({ 
                    deliveryChallan: grn.deliveryChallan._id,
                    sourceType: 'jobber'
                });
                
                // Calculate cumulative values
                let totalCartonsSent = 0;
                let totalCartonsReturned = 0;
                
                // Get cartons sent from the DC (handle both single and multiple products)
                if (grn.deliveryChallan.products && grn.deliveryChallan.products.length > 0) {
                    // Multiple products - sum all carton quantities
                    totalCartonsSent = grn.deliveryChallan.products.reduce((sum, product) => sum + (product.carton_qty || 0), 0);
                } else {
                    // Single product (backward compatibility)
                    totalCartonsSent = grn.deliveryChallan.carton_qty || 0;
                }
                
                // Sum cartons returned from all GRNs for this DC
                totalCartonsReturned = allGRNsForDC.reduce((sum, g) => sum + (g.cartonsReturned || 0), 0);
                
                // Recalculate balance and status
                const cartonBalance = totalCartonsSent - totalCartonsReturned;
                const status = totalCartonsReturned >= totalCartonsSent ? 'Completed' : (totalCartonsReturned > 0 ? 'Partial' : 'Pending');
                
                // Update the GRN object with recalculated values
                grn.cartonsSent = totalCartonsSent;
                grn.cartonsReturned = totalCartonsReturned;
                grn.cartonBalance = cartonBalance;
                grn.status = status;
            }
            
            // For jobber GRNs, also fetch the itemCode from ProductStock
            if (grn.sourceType === 'jobber' && grn.productName) {
                const productStock = await ProductStock.findOne({ productName: grn.productName });
                if (productStock && productStock.itemCode) {
                    grn.itemCode = productStock.itemCode;
                }
            }
            
            res.json(grn);
        } else {
            console.log(`GRN not found for ID: ${req.params.id}`); // Add logging for debugging
            res.status(404).json({ message: 'GRN not found.' });
        }
    } catch (error) {
        console.error(`Error fetching GRN: ${error.message}`); // Add logging for debugging
        res.status(500).json({ message: 'Server error.' });
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

            // Update GRN fields
            grn.items = processedItems;
            grn.status = status;
            grn.receivedBy = receivedBy;
            grn.dateReceived = dateReceived;
            grn.cartonsReturned = parseFloat(cartonsReturned.toFixed(3));
            grn.cartonBalance = balance;

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
                        return new DamagedStock({
                            grn_id: updatedGRN._id,
                            dc_no: grn.deliveryChallan.dc_no,
                            product_name: grn.deliveryChallan.product_name,
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
                
                // Use the new utility function to update product stock
                await updateProductStockWithNewQuantity(dc, cartonsReturned, req.user ? req.user.name : 'System');
            } catch (stockError) {
                console.error(`Error updating product stock: ${stockError.message}`);
                // Don't fail the GRN creation if stock update fails, just log it
            }

            return res.json(updatedGRN);
        }

        // If we reach here, it's not a jobber GRN with cartonsReturned, so process as regular GRN
        // For jobber GRNs without cartonsReturned, return an error
        if (grn.sourceType === 'jobber') {
            return res.status(400).json({ 
                message: 'Carton information is required for Delivery Challan-based GRN updates.' 
            });
        }
        for (const item of items) {
            const { material, materialModel, receivedQuantity, extraReceivedQty = 0, damagedQuantity = 0 } = item;
            
            // Check if price details are missing and fetch from PO if needed (only for PO-based GRNs)
            let unitPrice = item.unitPrice;
            let totalPrice = receivedQuantity * unitPrice;
            
            // Detect missing price (0 or null)
            if (!unitPrice || unitPrice === 0) {
                if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
                    const priceData = await fetchPriceFromPO(grn.purchaseOrder._id, material, materialModel);
                    unitPrice = priceData.unitPrice;
                    totalPrice = receivedQuantity * unitPrice;
                }
            }
            
            // For PO-based GRNs, find the corresponding item in the PO
            let poItem = null;
            if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
                poItem = grn.purchaseOrder.items.find(poItem => {
                    if (!poItem || !poItem.material) return false;
                    const poItemId = typeof poItem.material === 'object' ? poItem.material.toString() : poItem.material;
                    const itemMaterialId = typeof material === 'object' ? material.toString() : material;
                    return poItemId === itemMaterialId && poItem.materialModel === materialModel;
                });
                
                // Calculate total received quantities for this material from all previous GRNs for this PO (excluding current GRN)
                const existingGRNs = await GRN.find({ 
                    purchaseOrder: grn.purchaseOrder._id,
                    'items.material': material,
                    'items.materialModel': materialModel,
                    _id: { $ne: grn._id } // Exclude current GRN
                });
                
                let previousReceived = 0;
                let previousExtraReceived = 0;
                for (const existingGRN of existingGRNs) {
                    for (const grnItem of existingGRN.items) {
                        const grnItemId = typeof grnItem.material === 'object' ? grnItem.material.toString() : grnItem.material;
                        const itemMaterialId = typeof material === 'object' ? material.toString() : material;
                        if (grnItemId === itemMaterialId && grnItem.materialModel === materialModel) {
                            previousReceived += grnItem.receivedQuantity || 0;
                            previousExtraReceived += grnItem.extraReceivedQty || 0;
                        }
                    }
                }
                
                // Calculate pending quantity
                const pendingQuantity = poItem.quantity - previousReceived;
                
                // Check if received quantity exceeds pending quantity
                if (receivedQuantity > pendingQuantity) {
                    return res.status(400).json({ 
                        message: `Received quantity (${receivedQuantity}) cannot exceed pending quantity (${pendingQuantity}) for material ${poItem.material.name || material}.` 
                    });
                }
                
                // Calculate pending extra quantity
                const pendingExtraQuantity = poItem.extraAllowedQty - previousExtraReceived;
                
                // Check if extra received quantity exceeds pending extra quantity
                if (extraReceivedQty > pendingExtraQuantity) {
                    return res.status(400).json({ 
                        message: `Extra received quantity (${extraReceivedQty}) cannot exceed pending extra quantity (${pendingExtraQuantity}) for material ${poItem.material.name || material}.` 
                    });
                }
                
                // Check if all items are fully received to determine status
                if (previousReceived + receivedQuantity !== poItem.quantity) {
                    allItemsMatch = false;
                }
                
                // Check if all extra items are fully received to determine status
                if (previousExtraReceived + extraReceivedQty !== poItem.extraAllowedQty) {
                    allExtraItemsMatch = false;
                }
            } else if (grn.sourceType === 'jobber' && grn.deliveryChallan) {
                // For jobber GRNs, find the corresponding item in the delivery challan
                const dcItem = grn.deliveryChallan.materials.find(dcItem => {
                    if (!dcItem || !dcItem.material_name) return false;
                    // Match by material name for jobber GRNs
                    // The frontend sends the material name as a string in the material field
                    const materialName = typeof material === 'string' ? material : 
                                        (typeof material === 'object' && material.name) ? material.name : 
                                        String(material);
                    return dcItem.material_name === materialName;
                });
                
                // Check if received quantity exceeds sent quantity
                if (dcItem) {
                    const sentQty = dcItem.total_qty;
                    // Use a small tolerance for floating point comparison
                    if (receivedQuantity > sentQty + 0.001) {
                        return res.status(400).json({ 
                            message: `Received quantity cannot exceed sent quantity for ${dcItem.material_name}. Sent: ${sentQty}, Received: ${receivedQuantity}` 
                        });
                    }
                    
                    // Check if received quantity differs from sent quantity
                    if (Math.abs(receivedQuantity - sentQty) > 0.001) {
                        allItemsMatch = false;
                    }
                    
                    // Set ordered quantity to sent quantity for jobber GRNs
                    poItem = { quantity: sentQty };
                } else {
                    poItem = { quantity: receivedQuantity };
                }
            } else {
                // For jobber GRNs without delivery challan reference, use received quantity as ordered
                poItem = { quantity: receivedQuantity };
                
                // Check if received quantity exceeds ordered quantity (sent quantity)
                if (receivedQuantity > poItem.quantity + 0.001) {
                    return res.status(400).json({ 
                        message: `Received quantity cannot exceed sent quantity. Sent: ${poItem.quantity}, Received: ${receivedQuantity}` 
                    });
                }
                
                // Check if received quantity differs from ordered quantity (sent quantity)
                if (Math.abs(receivedQuantity - poItem.quantity) > 0.001) {
                    allItemsMatch = false;
                }
            }

            // Calculate price difference using the (possibly updated) unitPrice
            const priceData = await calculatePriceDifference(material, materialModel, unitPrice);
            
            // Preserve the original ordered quantity (sent quantity) and calculate balance
            const orderedQuantity = poItem ? poItem.quantity : receivedQuantity;
            // Calculate balance quantity (ordered - (previous received + current received))
            const balanceQuantity = orderedQuantity - (previousReceived + receivedQuantity);
            
            const totalReceived = previousReceived + receivedQuantity;
            
            processedItems.push({
                ...item,
                orderedQuantity,
                balanceQuantity,
                unitPrice,
                totalPrice,
                lastUnitPrice: priceData.lastUnitPrice,
                priceDifference: priceData.priceDifference,
                priceDifferencePercentage: priceData.priceDifferencePercentage,
                previousReceived: previousReceived || 0,
                receivedQuantity: parseFloat(receivedQuantity),
                totalReceived: totalReceived,
                pendingQty: pendingQuantity,
                extraAllowedQty: poItem.extraAllowedQty,
                previousExtraReceived: previousExtraReceived || 0,
                extraPending: pendingExtraQuantity
            });
        }
        
        // Determine GRN status based on quantity match:
        // 1. If all normal quantities are fully received → "Normal Completed"
        // 2. If all extra quantities are fully received → "Extra Completed"
        // 3. If both normal and extra quantities are fully received → "Completed"
        // 4. If quantities are partially received → "Partial"
        let status;
        if (allItemsMatch && allExtraItemsMatch) {
            // All quantities fully received - set to Completed
            status = 'Completed';
        } else if (allItemsMatch && !allExtraItemsMatch) {
            // Normal quantities fully received but extra not - set to Normal Completed
            status = 'Normal Completed';
        } else if (!allItemsMatch && allExtraItemsMatch) {
            // Extra quantities fully received but normal not - set to Extra Completed
            status = 'Extra Completed';
        } else {
            // Quantity partially received - set to Partial
            status = 'Partial';
        }

        // Update GRN fields
        grn.items = processedItems;
        grn.status = status;
        grn.receivedBy = receivedBy;
        grn.dateReceived = dateReceived;

        // If it is approved/partial, set the approver and date now
        if ((status === 'Completed' || status === 'Partial') && mongoose.Types.ObjectId.isValid(req.user._id)) {
            grn.approvedBy = req.user._id;
            grn.approvalDate = new Date();
        }

        const updatedGRN = await grn.save();
        
        // Update the quantityReceived on the PO for each item immediately (for PO-based GRNs)
        if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
            for (const item of processedItems) {
                const materialId = typeof item.material === 'object' ? item.material._id || item.material : item.material;
                // Update with total received quantity (normal + extra)
                const totalReceivedQuantity = item.receivedQuantity + item.extraReceivedQty;
                await PurchaseOrder.updateOne(
                    { "_id": grn.purchaseOrder._id, "items.material": materialId, "items.materialModel": item.materialModel },
                    { "$inc": { "items.$.quantityReceived": totalReceivedQuantity } }
                );
            }
        }

        // Create damaged stock records if any (for PO-based GRNs)
        if (damagedStock && Array.isArray(damagedStock) && damagedStock.length > 0) {
            try {
                const DamagedStock = require('../models/DamagedStock');
                
                // Filter out items with zero damaged quantity
                const damagedItems = damagedStock.filter(item => item.damaged_qty > 0);
                
                // Create damaged stock records for each item
                const damagedStockPromises = damagedItems.map(item => {
                    // Find the material name from the item
                    let materialName = '';
                    if (typeof item.material === 'string') {
                        materialName = item.material;
                    } else if (item.material && item.material.name) {
                        materialName = item.material.name;
                    }
                    
                    return new DamagedStock({
                        grn_id: updatedGRN._id,
                        dc_no: grn.purchaseOrder ? grn.purchaseOrder.poNumber : 'N/A',
                        product_name: 'N/A', // PO-based GRNs don't have a specific product
                        material_name: materialName,
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

        // Update stock for each item in the GRN immediately upon submission
        // This ensures that packing material stock is updated in real-time for every GRN submission,
        // including partial GRNs, and correctly increments the existing stock value
        for (const item of processedItems) {
            const Model = item.materialModel === 'PackingMaterial' ? PackingMaterial : RawMaterial;
            
            // Handle both ObjectId and string material references
            let material;
            if (typeof item.material === 'string') {
                // For jobber GRNs, item.material is a string (material name)
                material = await Model.findOne({ name: item.material });
            } else {
                // For PO-based GRNs, item.material is an ObjectId
                material = await Model.findById(item.material);
            }
            
            if (!material) continue;
            
            // Calculate weighted average price
            const existingQuantity = material.quantity || 0;
            const existingPrice = material.perQuantityPrice || 0;
            // Total quantity to add is normal received + extra received
            const newQuantity = item.receivedQuantity + item.extraReceivedQty;
            const newPrice = item.unitPrice || 0; // Use the provided unitPrice or 0
            
            // Calculate total values
            const existingTotalValue = existingQuantity * existingPrice;
            const newTotalValue = newQuantity * newPrice;
            const totalQuantityAfter = existingQuantity + newQuantity;
            const totalValueAfter = existingTotalValue + newTotalValue;
            
            // Calculate new weighted average price
            const newAveragePrice = totalQuantityAfter > 0 ? totalValueAfter / totalQuantityAfter : 0;
            
            // Update material quantity and price
            const materialId = typeof item.material === 'string' ? material._id : item.material;
            await Model.findByIdAndUpdate(materialId, { 
                quantity: totalQuantityAfter,
                perQuantityPrice: newAveragePrice
            });
            
            // Log the stock update for debugging purposes
            console.log(`Updated stock for ${item.materialModel} ${material.name || materialId}: ${existingQuantity} -> ${totalQuantityAfter}`);
            
            // Get the supplier info
            const supplierName = grn.purchaseOrder.supplier.name;
            
            // Create new GRN history entry with correct prices
            const grnHistoryEntry = {
                date: new Date(dateReceived), // Use the GRN date, not current date
                type: 'New GRN',
                supplier: supplierName,
                poNumber: grn.purchaseOrder.poNumber, // Use purchase order number
                grnNumber: grn.grnNumber,
                qty: newQuantity, // Use total quantity (normal + extra)
                unitPrice: newPrice,
                total: newTotalValue
            };
            
            // Update material history with the new logic
            // First, get the current material to work with its history
            const updatedMaterial = await Model.findById(materialId);
            
            // Filter out existing "New Average Price (Updated)" entries
            const filteredHistory = updatedMaterial.priceHistory.filter(entry => 
                entry.type !== 'New Average Price (Updated)'
            );
            
            // Add the new GRN entry
            filteredHistory.push(grnHistoryEntry);
            
            // Calculate new totals for all entries (Existing Stock + New GRN entries only)
            const entries = filteredHistory.filter(h => 
                h.type === 'Existing Stock' || h.type === 'New GRN'
            );
            
            // Calculate new weighted average price from all entries
            let totalQty = 0;
            let totalValue = 0;
            entries.forEach(entry => {
                totalQty += entry.qty || 0;
                totalValue += entry.total || 0;
            });
            
            const newWeightedAveragePrice = totalQty > 0 ? totalValue / totalQty : 0;
            
            // Add the "New Average Price (Updated)" entry
            filteredHistory.push({
                date: new Date(),
                type: 'New Average Price (Updated)',
                supplier: supplierName,
                poNumber: grn.purchaseOrder.poNumber,
                grnNumber: grn.grnNumber,
                qty: totalQty,
                unitPrice: newWeightedAveragePrice,
                total: totalValue
            });
            
            // Update the material with the new history
            await Model.findByIdAndUpdate(materialId, {
                priceHistory: filteredHistory
            });
        }
        
        // Update Delivery Challan quantities for jobber GRNs
        if (grn.deliveryChallan) {
            try {
                await updateDeliveryChallanQuantities(grn.deliveryChallan._id, processedItems);
            } catch (dcUpdateError) {
                console.error(`Error updating Delivery Challan quantities: ${dcUpdateError.message}`);
                // Don't fail the GRN update if DC update fails, just log it
            }
        }
        
        // Sync status with Delivery Challan (only for jobber GRNs)
        if (grn.sourceType === 'jobber' && grn.deliveryChallan) {
            const dcStatus = status; // Use the same status as the GRN
            await DeliveryChallan.findByIdAndUpdate(grn.deliveryChallan._id, { status: dcStatus });
            
            // If GRN is completed, update product stock
            if (status === 'Completed') {
                try {
                    await updateProductStockOnGRNCompletion(grn.deliveryChallan, req.user ? req.user.name : 'System');
                } catch (stockError) {
                    console.error(`Error updating product stock: ${stockError.message}`);
                    // Don't fail the GRN update if stock update fails, just log it
                }
            }
        }
        
        // For PO-based GRNs, check if all quantities have been received across all GRNs and update PO status
        if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
            // Check if all quantities have been received across all GRNs for this PO
            let allItemsCompleted = true;
            
            // Get the PO to check its items
            const purchaseOrder = await PurchaseOrder.findById(grn.purchaseOrder._id);
            if (purchaseOrder) {
                // For each item in the PO, check if total received across all GRNs equals ordered quantity
                for (const poItem of purchaseOrder.items) {
                    // Calculate total received for this material across all GRNs for this PO
                    const existingGRNs = await GRN.find({ 
                        purchaseOrder: grn.purchaseOrder._id,
                        'items.material': poItem.material,
                        'items.materialModel': poItem.materialModel
                    });
                    
                    let totalReceived = 0;
                    for (const existingGRN of existingGRNs) {
                        for (const grnItem of existingGRN.items) {
                            const grnItemId = typeof grnItem.material === 'object' ? grnItem.material.toString() : grnItem.material;
                            const poItemId = typeof poItem.material === 'object' ? poItem.material.toString() : poItem.material;
                            if (grnItemId === poItemId && grnItem.materialModel === poItem.materialModel) {
                                totalReceived += (grnItem.receivedQuantity || 0) + (grnItem.extraReceivedQty || 0);
                            }
                        }
                    }
                    
                    // If total received doesn't match ordered quantity, not all items are completed
                    if (totalReceived !== poItem.quantity) {
                        allItemsCompleted = false;
                        break;
                    }
                }
                
                if (allItemsCompleted) {
                    // Update PO status to Completed
                    await PurchaseOrder.findByIdAndUpdate(grn.purchaseOrder._id, { status: 'Completed' });
                }
            }
        }

        res.json(updatedGRN);
    } catch (error) {
        console.error(`Error updating GRN: ${error.message}`); // Add logging for debugging
        res.status(500).json({ message: 'Server error.' });
    }
};

/**
 * @desc    Approve or reject a GRN
 * @route   PUT /api/grn/:id/approve
 * @access  Private/Admin
 */
const approveOrRejectGRN = async (req, res) => {
    const { action, rejectionReason } = req.body;

    try {
        const grn = await GRN.findById(req.params.id)
            .populate('purchaseOrder')
            .populate('items.material');

        if (!grn) {
            return res.status(404).json({ message: 'GRN not found.' });
        }

        // Only allow approval/rejection of GRNs with "Pending Admin Approval" status
        if (grn.status !== 'Pending Admin Approval') {
            return res.status(400).json({ 
                message: 'Only GRNs with "Pending Admin Approval" status can be approved or rejected.' 
            });
        }

        // Check if PO is cancelled (only for PO-based GRNs)
        if (grn.sourceType === 'purchase_order' && grn.purchaseOrder && grn.purchaseOrder.status === 'Cancelled') {
            return res.status(400).json({ message: 'Cannot approve/reject GRN for a cancelled Purchase Order.' });
        }

        if (action === 'approve') {
            grn.status = 'Approved';
            grn.approvedBy = req.user._id;
            grn.approvalDate = Date.now();

            // Update the stock for approved GRNs immediately upon approval
            for (const item of grn.items) {
                const Model = item.materialModel === 'PackingMaterial' ? PackingMaterial : RawMaterial;
                
                // Handle both ObjectId and string material references
                let material;
                if (typeof item.material === 'string') {
                    // For jobber GRNs, item.material is a string (material name)
                    material = await Model.findOne({ name: item.material });
                } else {
                    // For PO-based GRNs, item.material is an ObjectId
                    material = await Model.findById(item.material);
                }
                
                if (!material) continue;
                
                // Calculate weighted average price
                const existingQuantity = material.quantity || 0;
                const existingPrice = material.perQuantityPrice || 0;
                // Total quantity to add is normal received + extra received
                const newQuantity = item.receivedQuantity + (item.extraReceivedQty || 0);
                const newPrice = item.unitPrice;
                
                // Calculate total values
                const existingTotalValue = existingQuantity * existingPrice;
                const newTotalValue = newQuantity * newPrice;
                const totalQuantityAfter = existingQuantity + newQuantity;
                const totalValueAfter = existingTotalValue + newTotalValue;
                
                // Calculate new weighted average price
                const newAveragePrice = totalQuantityAfter > 0 ? totalValueAfter / totalQuantityAfter : 0;
                
                // Update material quantity and price
                const materialId = typeof item.material === 'string' ? material._id : item.material;
                await Model.findByIdAndUpdate(materialId, { 
                    quantity: totalQuantityAfter,
                    perQuantityPrice: newAveragePrice
                });
                
                // Also update the quantityReceived on the PO (only for PO-based GRNs)
                if (grn.sourceType === 'purchase_order') {
                    // Update with total received quantity (normal + extra)
                    const totalReceivedQuantity = item.receivedQuantity + (item.extraReceivedQty || 0);
                    await PurchaseOrder.updateOne(
                        { "_id": grn.purchaseOrder._id, "items.material": item.material },
                        { "$inc": { "items.$.quantityReceived": totalReceivedQuantity } }
                    );
                }
                
                // Update Delivery Challan quantities for jobber GRNs
                if (grn.sourceType === 'jobber' && grn.deliveryChallan) {
                    try {
                        // Create a simplified item object for the update function
                        const simplifiedItem = {
                            material: typeof item.material === 'string' ? item.material : item.material.name,
                            receivedQuantity: item.receivedQuantity + (item.extraReceivedQty || 0)
                        };
                        await updateDeliveryChallanQuantities(grn.deliveryChallan._id, [simplifiedItem], grn._id);
                    } catch (dcUpdateError) {
                        console.error(`Error updating Delivery Challan quantities: ${dcUpdateError.message}`);
                        // Don't fail the GRN approval if DC update fails, just log it
                    }
                }
                
                // Get the reference info for history entry
                let supplierName, referenceNumber;
                if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
                    supplierName = grn.purchaseOrder.supplier.name;
                    referenceNumber = grn.purchaseOrder.poNumber;
                } else if (grn.sourceType === 'jobber' && grn.supplier) {
                    supplierName = grn.supplier.name;
                    referenceNumber = grn.deliveryChallan ? grn.deliveryChallan.dc_no : 'N/A';
                } else {
                    supplierName = 'Unknown';
                    referenceNumber = 'N/A';
                }
                
                // Create new GRN history entry with correct prices
                // Total quantity to add is normal received + extra received
                const totalQuantity = item.receivedQuantity + (item.extraReceivedQty || 0);
                const grnHistoryEntry = {
                    date: new Date(),
                    type: 'New GRN',
                    supplier: supplierName,
                    poNumber: referenceNumber,
                    grnNumber: grn.grnNumber,
                    qty: totalQuantity, // Use total quantity (normal + extra)
                    unitPrice: newPrice,
                    total: newTotalValue
                };
                
                // Update material history with the new logic
                // First, get the current material to work with its history
                const updatedMaterial = await Model.findById(materialId);
                
                // Filter out existing "New Average Price (Updated)" entries
                const filteredHistory = updatedMaterial.priceHistory.filter(entry => 
                    entry.type !== 'New Average Price (Updated)'
                );
                
                // Add the new GRN entry
                filteredHistory.push(grnHistoryEntry);
                
                // Calculate new totals for all entries (Existing Stock + New GRN entries only)
                const entries = filteredHistory.filter(h => 
                    h.type === 'Existing Stock' || h.type === 'New GRN'
                );
                
                // Calculate total quantity and value from the actual material data, not history entries
                const totalQty = existingQuantity + newQuantity;
                const totalValue = existingTotalValue + newTotalValue;
                const newUnitPrice = totalQty === 0 ? 0 : totalValue / totalQty;
                
                // Add the new average price entry
                const averagePriceEntry = {
                    date: new Date(),
                    type: 'New Average Price (Updated)',
                    qty: totalQty,
                    unitPrice: Number(newUnitPrice.toFixed(2)),
                    total: totalValue,
                    supplier: null
                };
                
                // Update the material with new history, quantity, and price
                await Model.findByIdAndUpdate(materialId, {
                    priceHistory: [...filteredHistory, averagePriceEntry],
                    quantity: totalQty,
                    perQuantityPrice: newUnitPrice
                });
            }

            // If it's a PO-based GRN, check if all quantities have been received across all GRNs and update PO status
            if (grn.sourceType === 'purchase_order') {
                // Check if all quantities have been received across all GRNs for this PO
                let allItemsCompleted = true;
                
                // For each item in the PO, check if total received across all GRNs equals ordered quantity
                for (const poItem of grn.purchaseOrder.items) {
                    // Calculate total received for this material across all GRNs for this PO
                    const existingGRNs = await GRN.find({ 
                        purchaseOrder: grn.purchaseOrder._id,
                        'items.material': poItem.material,
                        'items.materialModel': poItem.materialModel
                    });
                    
                    let totalReceived = 0;
                    for (const existingGRN of existingGRNs) {
                        for (const grnItem of existingGRN.items) {
                            const grnItemId = typeof grnItem.material === 'object' ? grnItem.material.toString() : grnItem.material;
                            const poItemId = typeof poItem.material === 'object' ? poItem.material.toString() : poItem.material;
                            if (grnItemId === poItemId && grnItem.materialModel === poItem.materialModel) {
                                totalReceived += (grnItem.receivedQuantity || 0) + (grnItem.extraReceivedQty || 0);
                            }
                        }
                    }
                    
                    // If total received doesn't match ordered quantity, not all items are completed
                    if (totalReceived !== poItem.quantity) {
                        allItemsCompleted = false;
                        break;
                    }
                }
                
                if (allItemsCompleted) {
                    // Update PO status to Completed
                    await PurchaseOrder.findByIdAndUpdate(grn.purchaseOrder._id, { status: 'Completed' });
                    
                    // Auto-lock all other GRNs for this PO
                    await GRN.updateMany(
                        { purchaseOrder: grn.purchaseOrder._id, _id: { $ne: grn._id } },
                        { $set: { isLocked: true, note: "Auto-locked due to completion of latest GRN" } }
                    );
                }
            }
        } else if (action === 'reject') {
            grn.status = 'Rejected';
            grn.rejectionReason = rejectionReason;
        } else {
            return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
        }

        const updatedGRN = await grn.save();
        res.json(updatedGRN);

    } catch (error) {
        console.error(`Error approving/rejecting GRN: ${error.message}`);
        res.status(500).json({ message: 'Server error while approving/rejecting GRN.' });
    }
};

/**
 * @desc    Get price history for a material
 * @route   GET /api/grn/price-history/:materialId/:materialModel
 * @access  Private
 */
const getMaterialPriceHistory = async (req, res) => {
    try {
        const { materialId, materialModel } = req.params;
        const Model = materialModel === 'PackingMaterial' ? PackingMaterial : RawMaterial;
        
        // Handle both ObjectId and string material references
        let material;
        if (mongoose.Types.ObjectId.isValid(materialId)) {
            // For PO-based materials, materialId is an ObjectId
            material = await Model.findById(materialId);
        } else {
            // For jobber DC materials, materialId is a string (material name)
            material = await Model.findOne({ name: materialId });
        }
        
        if (!material) {
            return res.status(404).json({ message: `${materialModel} not found.` });
        }
        
        res.json(material.priceHistory || []);
    } catch (error) {
        console.error(`Error fetching material price history: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching material price history.' });
    }
};

/**
 * @desc    Get supplier price comparison for a material
 * @route   GET /api/grn/supplier-comparison/:materialId/:materialModel
 * @access  Private
 */
const getSupplierPriceComparison = async (req, res) => {
    try {
        const { materialId, materialModel } = req.params;
        
        // Find all GRNs for this material
        // Handle both ObjectId and string material references in the query
        let query;
        if (mongoose.Types.ObjectId.isValid(materialId)) {
            // For PO-based materials, materialId is an ObjectId
            query = { 
                'items.material': materialId,
                'items.materialModel': materialModel
            };
        } else {
            // For jobber DC materials, materialId is a string (material name)
            query = { 
                'items.material': materialId,
                'items.materialModel': materialModel
            };
        }
        
        const grns = await GRN.find(query)
        .populate('supplier', 'name')
        .sort({ createdAt: -1 })
        .limit(10); // Limit to last 10 GRNs for performance
        
        // Extract supplier price data
        const supplierPrices = {};
        grns.forEach(grn => {
            const item = grn.items.find(item => {
                // Handle both ObjectId and string material references in comparison
                const itemMaterialId = typeof item.material === 'object' && item.material.toString ? 
                    item.material.toString() : 
                    String(item.material);
                return itemMaterialId === materialId && item.materialModel === materialModel;
            });
            
            if (item && grn.supplier) {
                const supplierName = grn.supplier.name;
                if (!supplierPrices[supplierName]) {
                    supplierPrices[supplierName] = [];
                }
                supplierPrices[supplierName].push({
                    date: grn.dateReceived,
                    unitPrice: item.unitPrice,
                    grnNumber: grn.grnNumber
                });
            }
        });
        
        res.json(supplierPrices);
    } catch (error) {
        console.error(`Error fetching supplier price comparison: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching supplier price comparison.' });
    }
};

/**
 * @desc    Get weekly GRN statistics
 * @route   GET /api/grn/weekly-stats
 * @access  Private
 */
const getWeeklyGRNStats = async (req, res) => {
    try {
        // Get the start of the current week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Adjust to Monday
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Get the start of each day for the past week
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        
        // Get GRN counts for each day
        const stats = await Promise.all(dates.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            
            const count = await GRN.countDocuments({
                createdAt: {
                    $gte: date,
                    $lt: nextDay
                }
            });
            
            return {
                date: date.toISOString().split('T')[0],
                count
            };
        }));
        
        res.json(stats);
    } catch (error) {
        console.error(`Error fetching weekly GRN stats: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching weekly GRN stats.' });
    }
};

/**
 * @desc    Get GRN items for damaged stock recording
 * @route   GET /api/grn/:id/damaged-items
 * @access  Private
 */
const getGRNItemsForDamagedStock = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate that the ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid GRN ID format.' });
        }
        
        const grn = await GRN.findById(id)
            .populate('deliveryChallan')
            .populate('purchaseOrder');
            
        if (!grn) {
            return res.status(404).json({ message: 'GRN not found.' });
        }
        
        // Get DC number based on source type
        let dcNo = '';
        let productName = '';
        
        if (grn.sourceType === 'jobber' && grn.deliveryChallan) {
            dcNo = grn.deliveryChallan.dc_no;
            productName = grn.deliveryChallan.product_name;
        } else if (grn.sourceType === 'purchase_order' && grn.purchaseOrder) {
            dcNo = grn.purchaseOrder.poNumber;
            productName = 'N/A'; // PO-based GRNs don't have a specific product
        }
        
        // Format items for damaged stock recording
        const damagedItems = grn.items.map(item => ({
            material_name: typeof item.material === 'string' ? item.material : item.material.name,
            received_qty: item.receivedQuantity,
            damaged_qty: 0, // Will be entered by user
            available_stock: 0 // Will be fetched from PackingMaterial
        }));
        
        res.json({
            grn_id: grn._id,
            dc_no: dcNo,
            product_name: productName,
            items: damagedItems
        });
    } catch (error) {
        console.error(`Error fetching GRN items for damaged stock: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching GRN items for damaged stock.' });
    }
};

module.exports = {
    // These functions are now in packingGRNController.js and fgGRNController.js
    // createGRN,
    // updateGRN,
    // approveOrRejectGRN,
    // checkPOForGRN,
    
    // These functions remain in this controller as they are shared
    getGRNs,
    getGRNById,
    getMaterialPriceHistory,
    getSupplierPriceComparison,
    getWeeklyGRNStats,
    getGRNItemsForDamagedStock
};
