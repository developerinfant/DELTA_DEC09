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
        // Handle multiple products
        for (const product of dc.products) {
            // Find or create product stock record
            let productStock = await ProductStock.findOne({ productName: product.product_name });
            
            if (!productStock) {
                productStock = new ProductStock({
                    productName: product.product_name,
                    ownUnitStock: 0,
                    jobberStock: 0
                });
            }
            
            // Update stock based on unit type
            const stockHistoryEntry = {
                date: new Date(),
                unitType: dc.unit_type,
                cartonQty: product.carton_qty,
                action: dc.unit_type === 'Jobber' ? 'TRANSFER' : 'ADD',
                updatedBy: updatedBy || 'System'
            };
            
            if (dc.unit_type === 'Own Unit') {
                // Add to own unit stock
                productStock.ownUnitStock += product.carton_qty;
                productStock.lastUpdatedFrom = 'Own Unit';
            } else if (dc.unit_type === 'Jobber') {
                // Add to jobber stock (transfer from jobber to main warehouse)
                productStock.jobberStock += product.carton_qty;
                productStock.lastUpdatedFrom = 'Jobber';
            }
            
            // Update last production details
            productStock.lastProductionDetails = {
                unitType: dc.unit_type,
                cartonQty: product.carton_qty,
                date: new Date()
            };
            
            // Add to stock history
            productStock.stockHistory.push(stockHistoryEntry);
            
            // Update last updated timestamp
            productStock.lastUpdated = new Date();
            
            // Save the updated product stock
            await productStock.save();
        }
        
        return true;
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
    // Accept either single product (backward compatibility) or multiple products
    const { unit_type, supplier_id, product_name, carton_qty, products, date, remarks, person_name } = req.body;

    try {
        let productsToProcess = [];
        
        // Handle backward compatibility - if single product fields are provided
        if (product_name && carton_qty) {
            productsToProcess = [{
                product_name,
                carton_qty: parseInt(carton_qty)
            }];
        } 
        // Handle new multiple products format
        else if (products && Array.isArray(products) && products.length > 0) {
            productsToProcess = products.map(p => ({
                product_name: p.product_name,
                carton_qty: parseInt(p.carton_qty)
            }));
        } else {
            return res.status(400).json({ 
                message: 'Either single product details or multiple products array is required.' 
            });
        }

        // Validate required fields
        for (const product of productsToProcess) {
            if (!product.product_name || !product.carton_qty || product.carton_qty < 1) {
                return res.status(400).json({ 
                    message: 'Product name and carton quantity are required for all products. Carton quantity must be at least 1.' 
                });
            }
        }

        // If Jobber, supplier_id is required
        if (unit_type === 'Jobber' && !supplier_id) {
            return res.status(400).json({ 
                message: 'Supplier is required for Jobber unit type.' 
            });
        }

        // Process materials for all products
        const allMaterials = [];
        const productMaterialsMap = {}; // To track which materials belong to which product
        
        for (const product of productsToProcess) {
            // Fetch product mapping
            const productMapping = await ProductMaterialMapping.findOne({ product_name: product.product_name });
            if (!productMapping) {
                return res.status(404).json({ 
                    message: `Product mapping not found for ${product.product_name}` 
                });
            }

            // Calculate material requirements for this product
            const productMaterials = productMapping.materials.map(material => ({
                material_name: material.material_name,
                qty_per_carton: material.qty_per_carton,
                total_qty: material.qty_per_carton * product.carton_qty,
                product_name: product.product_name // Track which product this material belongs to
            }));
            
            // Add to all materials array
            allMaterials.push(...productMaterials);
            
            // Store in map for later reference
            productMaterialsMap[product.product_name] = productMaterials;
        }

        // Aggregate materials by name and sum quantities (in case same material is used in multiple products)
        const aggregatedMaterials = {};
        for (const material of allMaterials) {
            if (!aggregatedMaterials[material.material_name]) {
                aggregatedMaterials[material.material_name] = {
                    material_name: material.material_name,
                    qty_per_carton: 0, // This will be recalculated
                    total_qty: 0
                };
            }
            aggregatedMaterials[material.material_name].total_qty += material.total_qty;
        }

        // Convert aggregated materials back to array
        const finalMaterials = Object.values(aggregatedMaterials);

        // Check stock availability
        const lowStockMaterials = [];
        for (const material of finalMaterials) {
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
        for (const material of finalMaterials) {
            // Prepare update object
            const updateObj = {
                $inc: { 
                    quantity: -material.total_qty,
                    usedQty: material.total_qty
                }
            };
            
            // Add WIP tracking based on unit type
            if (unit_type === 'Own Unit') {
                updateObj.$inc.ownUnitWIP = material.total_qty;
            } else if (unit_type === 'Jobber') {
                updateObj.$inc.jobberWIP = material.total_qty;
            }
            
            // Deduct stock and update WIP
            const updatedMaterial = await PackingMaterial.findOneAndUpdate(
                { name: material.material_name },
                updateObj,
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

        // Create delivery challan record with multiple products
        const deliveryChallan = new DeliveryChallan({
            dc_no,
            unit_type,
            supplier_id: unit_type === 'Jobber' ? supplier_id : null,
            products: productsToProcess.map(product => ({
                product_name: product.product_name,
                carton_qty: product.carton_qty,
                materials: productMaterialsMap[product.product_name]
            })),
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
            
            // Handle backward compatibility - if single product fields exist
            let updatedProducts = [];
            if (challan.products && challan.products.length > 0) {
                // New format with multiple products
                updatedProducts = challan.products.map(product => {
                    // Update materials with actual received quantities
                    const updatedMaterials = product.materials.map(material => {
                        const materialName = material.material_name;
                        const actualReceivedQty = materialReceivedTotals[materialName] || 0;
                        const balanceQty = material.total_qty - actualReceivedQty;
                        
                        return {
                            ...material.toObject ? material.toObject() : material,
                            received_qty: actualReceivedQty,
                            balance_qty: balanceQty
                        };
                    });
                    
                    return {
                        ...product.toObject ? product.toObject() : product,
                        materials: updatedMaterials
                    };
                });
            }
            
            // Create a new object with updated products
            const updatedChallan = {
                ...challan.toObject(),
                products: updatedProducts
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
    const { materials, status, products } = req.body;

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
                        // Emit event with all products
                        const productNames = dc.products.map(p => p.product_name).join(', ');
                        io.emit('dcCompleted', { 
                            dcId: dc._id,
                            dcNo: dc.dc_no,
                            unitType: dc.unit_type,
                            productNames: productNames,
                            products: dc.products
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

            // For backward compatibility, we'll update the first product's materials
            if (dc.products && dc.products.length > 0) {
                // Update materials for the first product
                dc.products[0].materials = materials;
            }
        }

        // Handle products update
        if (products && Array.isArray(products)) {
            // Update products array
            dc.products = products;
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