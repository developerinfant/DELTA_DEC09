const DeliveryChallan = require('../models/DeliveryChallan');
const ProductMaterialMapping = require('../models/ProductMaterialMapping');
const PackingMaterial = require('../models/PackingMaterial');
const Supplier = require('../models/Supplier');
const ProductStock = require('../models/ProductStock'); // Add this line
const mongoose = require('mongoose');

// Helper function to generate DC number
const generateDCNumber = async () => {
    const year = new Date().getFullYear();
    const lastChallan = await DeliveryChallan.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    let nextNumber = 1;
    if (lastChallan) {
        const lastNumber = parseInt(lastChallan.dc_no.split('-').pop());
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return `DC-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

// Helper function to update product stock when DC is completed
const updateProductStockOnDCCompletion = async (dc, updatedBy) => {
    try {
        // Find or create product stock record
        let productStock = await ProductStock.findOne({ productName: dc.product_name });
        
        if (!productStock) {
            productStock = new ProductStock({
                productName: dc.product_name,
                ownUnitStock: 0,
                jobberStock: 0
            });
        }
        
        // Update stock based on unit type
        const stockHistoryEntry = {
            date: new Date(),
            unitType: dc.unit_type,
            cartonQty: dc.carton_qty,
            action: dc.unit_type === 'Jobber' ? 'TRANSFER' : 'ADD',
            updatedBy: updatedBy || 'System'
        };
        
        if (dc.unit_type === 'Own Unit') {
            // Add to own unit stock
            productStock.ownUnitStock += dc.carton_qty;
            productStock.lastUpdatedFrom = 'Own Unit';
        } else if (dc.unit_type === 'Jobber') {
            // Add to jobber stock (transfer from jobber to main warehouse)
            productStock.jobberStock += dc.carton_qty;
            productStock.lastUpdatedFrom = 'Jobber';
        }
        
        // Update last production details
        productStock.lastProductionDetails = {
            unitType: dc.unit_type,
            cartonQty: dc.carton_qty,
            date: new Date()
        };
        
        // Add to stock history
        productStock.stockHistory.push(stockHistoryEntry);
        
        // Update last updated timestamp
        productStock.lastUpdated = new Date();
        
        // Save the updated product stock
        await productStock.save();
        
        return productStock;
    } catch (error) {
        console.error(`Error updating product stock: ${error.message}`);
        throw error;
    }
};

/**
 * @desc    Create a new delivery challan
 * @route   POST /api/delivery-challan
 * @access  Private
 */
const createDeliveryChallan = async (req, res) => {
    const { unit_type, supplier_id, product_name, carton_qty, date, remarks, person_name } = req.body;

    try {
        // Validate required fields
        if (!product_name || !carton_qty || !unit_type || carton_qty < 1) {
            return res.status(400).json({ 
                message: 'Product name, carton quantity, and unit type are required. Carton quantity must be at least 1.' 
            });
        }

        // If Jobber, supplier_id is required
        if (unit_type === 'Jobber' && !supplier_id) {
            return res.status(400).json({ 
                message: 'Supplier is required for Jobber unit type.' 
            });
        }

        // Fetch product mapping
        const productMapping = await ProductMaterialMapping.findOne({ product_name });
        if (!productMapping) {
            return res.status(404).json({ 
                message: `Product mapping not found for ${product_name}` 
            });
        }

        // Calculate material requirements
        const materials = productMapping.materials.map(material => ({
            material_name: material.material_name,
            qty_per_carton: material.qty_per_carton,
            total_qty: material.qty_per_carton * carton_qty
        }));

        // Check stock availability
        const lowStockMaterials = [];
        for (const material of materials) {
            const packingMaterial = await PackingMaterial.findOne({ name: material.material_name });
            if (!packingMaterial) {
                return res.status(404).json({ 
                    message: `Packing material not found: ${material.material_name}` 
                });
            }

            if (packingMaterial.quantity < material.total_qty) {
                lowStockMaterials.push(material.material_name);
            }
        }

        // If any material has low stock, block save
        if (lowStockMaterials.length > 0) {
            return res.status(400).json({ 
                message: `Low Stock for ${lowStockMaterials.join(', ')}. Delivery Challan cannot be created.` 
            });
        }

        // Deduct stock from each material and create ledger entries
        for (const material of materials) {
            // Deduct stock
            const updatedMaterial = await PackingMaterial.findOneAndUpdate(
                { name: material.material_name },
                { 
                    $inc: { 
                        quantity: -material.total_qty,
                        usedQty: material.total_qty
                    }
                },
                { new: true }
            );
            
            // Create ledger entry in price history
            if (updatedMaterial) {
                // Get supplier name for Jobber units
                let supplierName = 'Own Unit';
                if (unit_type === 'Jobber' && supplier_id) {
                    try {
                        const supplier = await Supplier.findById(supplier_id);
                        if (supplier) {
                            supplierName = supplier.name;
                        }
                    } catch (supplierError) {
                        console.error(`Error fetching supplier: ${supplierError.message}`);
                        // Continue with default supplier name
                    }
                }
                
                const ledgerEntry = {
                    date: new Date(),
                    type: 'DC-OUT',
                    supplier: supplierName,
                    poNumber: 'N/A',
                    grnNumber: 'N/A',
                    qty: -material.total_qty, // Negative to indicate deduction
                    unitPrice: updatedMaterial.perQuantityPrice,
                    total: -material.total_qty * updatedMaterial.perQuantityPrice
                };
                
                updatedMaterial.priceHistory.push(ledgerEntry);
                await updatedMaterial.save();
            }
        }

        // Generate DC number
        const dc_no = await generateDCNumber();

        // Create delivery challan record
        const deliveryChallan = new DeliveryChallan({
            dc_no,
            unit_type,
            supplier_id: unit_type === 'Jobber' ? supplier_id : null,
            product_name,
            carton_qty,
            materials,
            status: 'Pending',
            reference_type: unit_type,
            date: date ? new Date(date) : new Date(),
            remarks,
            // Add person_name for Own Unit delivery challans
            person_name: unit_type === 'Own Unit' ? person_name || null : null
        });

        const createdChallan = await deliveryChallan.save();

        res.status(201).json({
            message: 'Delivery Challan created and stock reserved.',
            data: { 
                dc_no: createdChallan.dc_no, 
                status: createdChallan.status 
            }
        });
    } catch (error) {
        console.error(`Error creating delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating delivery challan' });
    }
};

/**
 * @desc    Get delivery challans with filters
 * @route   GET /api/delivery-challan
 * @access  Private
 */
const getDeliveryChallans = async (req, res) => {
    try {
        const { unitType, status } = req.query;
        let filter = {};

        // If unitType provided, filter specific type, else fetch both Own Unit + Jobber
        if (unitType) {
            filter.unit_type = unitType;
        } else {
            // Fetch both Own Unit and Jobber challans
            filter.unit_type = { $in: ["Own Unit", "Jobber"] };
        }

        if (status) {
            filter.status = status;
        }

        const challans = await DeliveryChallan.find(filter)
            .sort({ createdAt: -1 })
            .populate('supplier_id', 'name supplierCode');

        res.json(challans);
    } catch (error) {
        console.error(`Error fetching delivery challans: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching delivery challans' });
    }
};

/**
 * @desc    Get a single delivery challan by ID
 * @route   GET /api/delivery-challan/:id
 * @access  Private
 */
const getDeliveryChallanById = async (req, res) => {
    try {
        const challan = await DeliveryChallan.findById(req.params.id)
            .populate('supplier_id', 'name supplierCode');

        if (challan) {
            // Populate GRN data to get actual received quantities
            const GRN = require('../models/GRN');
            const grns = await GRN.find({ deliveryChallan: challan._id });
            
            // Calculate actual received quantities from GRNs
            const materialReceivedTotals = {};
            
            // Sum up received quantities for each material from all GRNs
            for (const grn of grns) {
                for (const item of grn.items) {
                    const materialName = typeof item.material === 'string' ? item.material : item.material.name;
                    const receivedQty = item.receivedQuantity || 0;
                    
                    if (!materialReceivedTotals[materialName]) {
                        materialReceivedTotals[materialName] = 0;
                    }
                    materialReceivedTotals[materialName] += receivedQty;
                }
            }
            
            // Update materials with actual received quantities
            const updatedMaterials = challan.materials.map(material => {
                const materialName = material.material_name;
                const actualReceivedQty = materialReceivedTotals[materialName] || 0;
                const balanceQty = material.total_qty - actualReceivedQty;
                
                return {
                    ...material.toObject(),
                    received_qty: actualReceivedQty,
                    balance_qty: balanceQty
                };
            });
            
            // Create a new object with updated materials
            const updatedChallan = {
                ...challan.toObject(),
                materials: updatedMaterials
            };
            
            res.json(updatedChallan);
        } else {
            res.status(404).json({ message: 'Delivery challan not found' });
        }
    } catch (error) {
        console.error(`Error fetching delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching delivery challan' });
    }
};

/**
 * @desc    Update a delivery challan
 * @route   PUT /api/delivery-challan/:id
 * @access  Private/Admin
 */
const updateDeliveryChallan = async (req, res) => {
    const { materials, status } = req.body;

    try {
        const dc = await DeliveryChallan.findById(req.params.id);
        if (!dc) {
            return res.status(404).json({ message: 'Delivery Challan not found.' });
        }

        // Prevent editing if DC is completed
        if (dc.status === 'Completed') {
            return res.status(400).json({ 
                message: 'Cannot modify a completed Delivery Challan.' 
            });
        }

        // Check if user is admin when trying to change status to Completed
        if (status === 'Completed' && (!req.user || req.user.role !== 'Admin')) {
            return res.status(403).json({ 
                message: 'Only Admin users can mark Delivery Challans as Completed.' 
            });
        }

        // Handle status update
        if (status && status !== dc.status) {
            // Only allow updating to Partial or Completed status
            if (status !== 'Partial' && status !== 'Completed') {
                return res.status(400).json({ 
                    message: 'Status can only be updated to Partial or Completed.' 
                });
            }
            
            // If changing to Completed, update product stock
            if (status === 'Completed') {
                try {
                    await updateProductStockOnDCCompletion(dc, req.user ? req.user.name : 'System');
                    
                    // Emit socket event for real-time updates
                    const io = req.app.get('io');
                    if (io) {
                        io.emit('dcCompleted', { 
                            dcId: dc._id,
                            dcNo: dc.dc_no,
                            unitType: dc.unit_type,
                            productName: dc.product_name,
                            materials: dc.materials
                        });
                    }
                } catch (stockError) {
                    console.error(`Error updating product stock: ${stockError.message}`);
                    return res.status(500).json({ 
                        message: 'Error updating product stock. Please try again.' 
                    });
                }
            }
            
            dc.status = status;
        }

        // Handle materials update (only for Partial status)
        if (materials && dc.status === 'Partial') {
            // Validate materials
            if (!Array.isArray(materials)) {
                return res.status(400).json({ message: 'Materials must be an array.' });
            }

            // Validate that received quantity doesn't exceed sent quantity
            for (const material of materials) {
                const expectedQty = material.qty_per_carton * dc.carton_qty;
                if (material.total_qty > expectedQty) {
                    return res.status(400).json({ 
                        message: `Received quantity cannot exceed sent quantity for ${material.material_name}.` 
                    });
                }
            }

            // Update materials
            dc.materials = materials;

            // Check if all quantities match to determine status
            let allItemsMatch = true;
            for (const material of dc.materials) {
                // For delivery challans, we compare with the original qty_per_carton * carton_qty
                const expectedQty = material.qty_per_carton * dc.carton_qty;
                if (material.total_qty !== expectedQty) {
                    allItemsMatch = false;
                    break;
                }
            }

            // Update status based on quantity match if not explicitly set
            if (!status) {
                dc.status = allItemsMatch ? 'Completed' : 'Partial';
                
                // If status changed to Completed, update product stock
                if (dc.status === 'Completed') {
                    try {
                        await updateProductStockOnDCCompletion(dc, req.user ? req.user.name : 'System');
                        
                        // Emit socket event for real-time updates
                        const io = req.app.get('io');
                        if (io) {
                            io.emit('dcCompleted', { 
                                dcId: dc._id,
                                dcNo: dc.dc_no,
                                unitType: dc.unit_type,
                                productName: dc.product_name,
                                materials: dc.materials
                            });
                        }
                    } catch (stockError) {
                        console.error(`Error updating product stock: ${stockError.message}`);
                        return res.status(500).json({ 
                            message: 'Error updating product stock. Please try again.' 
                        });
                    }
                }
            }
        }

        const updatedDC = await dc.save();

        res.json(updatedDC);
    } catch (error) {
        console.error(`Error updating delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating delivery challan.' });
    }
};

module.exports = {
    createDeliveryChallan,
    getDeliveryChallans,
    getDeliveryChallanById,
    updateDeliveryChallan
};