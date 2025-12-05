const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const PackingMaterial = require('../models/PackingMaterial');
const RawMaterial = require('../models/RawMaterial');
const mongoose = require('mongoose');
const { getNextGRNNumber } = require('../utils/grnUtils');
const { updateProductStockOnGRNCompletion, updateProductStockWithNewQuantity } = require('../utils/stockUpdate');

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
 * @desc    Create a new Goods Receipt Note (GRN) from Purchase Order
 * @route   POST /api/grn
 * @access  Private
 */
const createGRN = async (req, res) => {
    let { purchaseOrderId, items, receivedBy, dateReceived, referenceType, invoiceNo, invoiceDate, dcNo } = req.body;
        
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated.' });
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
                totalReceived: totalReceived,
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
        for (const item of processedItems) {
    if (item.materialModel === 'PackingMaterial') {
        await PackingMaterial.findByIdAndUpdate(
            item.material,
            { $inc: { quantity: item.receivedQuantity } }
        );
    }
}
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
                { "$inc": { "items.$.quantityReceived": item.receivedQuantity } }
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
                            totalReceived += grnItem.receivedQuantity || 0;
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
 * @desc    Update an existing GRN (for Partial status GRNs)
 * @route   PUT /api/grn/:id
 * @access  Private
 */
const updateGRN = async (req, res) => {
    let { items, receivedBy, dateReceived } = req.body;

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

        // Process items for PO-based GRNs
        const processedItems = [];
        let allItemsMatch = true; // Flag to check if all items match exactly
        let allExtraItemsMatch = true; // Flag to check if all extra items match exactly

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

            // Check if received quantity exceeds pending quantity
            if (receivedQuantity > pendingQuantity) {
                return res.status(400).json({ 
                    message: `Received quantity cannot exceed pending quantity. Pending: ${pendingQuantity}, Received: ${receivedQuantity}` 
                });
            }
            
            // Check if extra received quantity exceeds pending extra quantity
            if (extraReceivedQty > pendingExtraQuantity) {
                return res.status(400).json({ 
                    message: `Extra received quantity cannot exceed pending extra quantity. Pending: ${pendingExtraQuantity}, Received: ${extraReceivedQty}` 
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
                                totalReceived += grnItem.receivedQuantity || 0;
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
                                totalReceived += grnItem.receivedQuantity || 0;
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

module.exports = {
    createGRN,
    updateGRN,
    approveOrRejectGRN,
    checkPOForGRN
};