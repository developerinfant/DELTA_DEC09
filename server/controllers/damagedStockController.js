const DamagedStock = require('../models/DamagedStock');
const GRN = require('../models/GRN');
const PackingMaterial = require('../models/PackingMaterial');
const mongoose = require('mongoose');

// Add this line to import the new DamagedStockMaster model
const DamagedStockMaster = require('../models/DamagedStockMaster');

/**
 * @desc    Create a new damaged stock entry
 * @route   POST /api/damaged-stock
 * @access  Private
 */
const createDamagedStock = async (req, res) => {
    try {
        const { grn_id, dc_no, product_name, material_name, received_qty, damaged_qty, remarks } = req.body;
        
        // Validate required fields
        if (!dc_no || !product_name || !material_name || received_qty === undefined || damaged_qty === undefined) {
            return res.status(400).json({ message: 'Required fields: dc_no, product_name, material_name, received_qty, damaged_qty.' });
        }
        
        // Validate that damaged quantity doesn't exceed received quantity
        if (damaged_qty > received_qty) {
            return res.status(400).json({ message: 'Damaged quantity cannot exceed received quantity.' });
        }
        
        // Check if GRN exists (if provided)
        let grn = null;
        if (grn_id) {
            grn = await GRN.findById(grn_id);
            if (!grn) {
                return res.status(404).json({ message: 'GRN not found.' });
            }
        }
        
        // Create damaged stock entry
        const damagedStock = new DamagedStock({
            grn_id: grn_id || null,
            dc_no,
            product_name,
            material_name,
            received_qty,
            damaged_qty,
            entered_by: req.user.name,
            remarks
        });
        
        const savedDamagedStock = await damagedStock.save();
        
        // Update GRN status to "Damage Pending" only if GRN ID was provided
        if (grn_id && grn) {
            await GRN.findByIdAndUpdate(grn_id, { status: 'Damage Pending' });
        }
        
        res.status(201).json(savedDamagedStock);
    } catch (error) {
        console.error(`Error creating damaged stock entry: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating damaged stock entry.' });
    }
};

/**
 * @desc    Get all damaged stock entries with filtering
 * @route   GET /api/damaged-stock
 * @access  Private
 */
const getDamagedStockEntries = async (req, res) => {
    try {
        // Build query filter
        const filter = {};
        
        // Apply filters if provided
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        if (req.query.dc_no) {
            filter.dc_no = { $regex: req.query.dc_no, $options: 'i' };
        }
        
        if (req.query.product_name) {
            filter.product_name = { $regex: req.query.product_name, $options: 'i' };
        }
        
        if (req.query.material_name) {
            filter.material_name = { $regex: req.query.material_name, $options: 'i' };
        }
        
        if (req.query.supplier) {
            // We'll need to join with GRN to get supplier info
            // For now, we'll filter by material name which often contains supplier info
            filter.material_name = { $regex: req.query.supplier, $options: 'i' };
        }
        
        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.entered_on = {};
            if (req.query.startDate) {
                filter.entered_on.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.entered_on.$lte = new Date(req.query.endDate);
            }
        }
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Get total count for pagination
        const total = await DamagedStock.countDocuments(filter);
        
        // Get damaged stock entries with populated GRN data
        const damagedStockEntries = await DamagedStock.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'grn_id',
                select: 'grnNumber'
            })
            .lean();
        
        // Process entries to ensure proper GRN data structure
        const processedEntries = damagedStockEntries.map(entry => {
            // Ensure we have the correct structure for GRN data
            if (entry.grn_id && entry.grn_id.grnNumber) {
                return {
                    ...entry,
                    grnNumber: entry.grn_id.grnNumber,
                    grnId: entry.grn_id._id || entry.grn_id
                };
            } else {
                return {
                    ...entry,
                    grnNumber: 'N/A',
                    grnId: null
                };
            }
        });
        
        res.json({
            data: processedEntries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(`Error fetching damaged stock entries: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock entries.' });
    }
};

/**
 * @desc    Get a single damaged stock entry by ID
 * @route   GET /api/damaged-stock/:id
 * @access  Private
 */
const getDamagedStockById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid damaged stock ID.' });
        }
        
        const damagedStock = await DamagedStock.findById(id);
        
        if (!damagedStock) {
            return res.status(404).json({ message: 'Damaged stock entry not found.' });
        }
        
        res.json(damagedStock);
    } catch (error) {
        console.error(`Error fetching damaged stock entry: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock entry.' });
    }
};

/**
 * @desc    Update a damaged stock entry (admin only)
 * @route   PUT /api/damaged-stock/:id
 * @access  Private/Admin
 */
const updateDamagedStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, remarks } = req.body;
        
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid damaged stock ID.' });
        }
        
        // Validate action
        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be "accept" or "reject".' });
        }
        
        // Find the damaged stock entry
        const damagedStock = await DamagedStock.findById(id);
        if (!damagedStock) {
            return res.status(404).json({ message: 'Damaged stock entry not found.' });
        }
        
        // Check if already processed
        if (damagedStock.status !== 'Pending') {
            return res.status(400).json({ message: 'This entry has already been processed.' });
        }
        
        // Process based on action
        if (action === 'accept') {
            // Deduct damaged quantity from Packing Material stock
            const material = await PackingMaterial.findOne({ name: damagedStock.material_name });
            if (material) {
                // Check if we have enough stock
                if (material.quantity < damagedStock.damaged_qty) {
                    return res.status(400).json({ message: 'Insufficient stock to deduct damaged quantity.' });
                }
                
                // Deduct the damaged quantity
                material.quantity -= damagedStock.damaged_qty;
                await material.save();
                
                // Add to price history
                material.priceHistory.push({
                    date: new Date(),
                    type: 'DC-OUT',
                    supplier: 'Damaged Stock',
                    qty: damagedStock.damaged_qty,
                    unitPrice: material.perQuantityPrice,
                    total: damagedStock.damaged_qty * material.perQuantityPrice
                });
                await material.save();
            }
            
            // Update damaged stock entry
            damagedStock.status = 'Approved';
            damagedStock.deducted_from_stock = true;
            damagedStock.approved_by = req.user.name;
            damagedStock.approved_on = new Date();
            if (remarks) damagedStock.remarks = remarks;
            
            // Update GRN status
            await GRN.findByIdAndUpdate(damagedStock.grn_id, { status: 'Damage Completed' });
            
            // NEW: Record in DamagedStockMaster table
            try {
                // Find existing record or create new one
                let masterRecord = await DamagedStockMaster.findOne({ 
                    materialName: damagedStock.material_name 
                });
                
                if (masterRecord) {
                    // Update existing record
                    masterRecord.totalDamagedQty += damagedStock.damaged_qty;
                    masterRecord.lastDamagedQty = damagedStock.damaged_qty;
                    masterRecord.lastApprovedDate = new Date();
                    // Update brand and unit if they exist in the material
                    if (material) {
                        masterRecord.brand = material.brandType || '';
                        masterRecord.unit = material.unit || '';
                    }
                } else {
                    // Create new record
                    const packingMaterial = await PackingMaterial.findOne({ name: damagedStock.material_name });
                    
                    masterRecord = new DamagedStockMaster({
                        itemCode: packingMaterial ? packingMaterial.itemCode : '',
                        materialName: damagedStock.material_name,
                        totalDamagedQty: damagedStock.damaged_qty,
                        lastDamagedQty: damagedStock.damaged_qty,
                        lastApprovedDate: new Date(),
                        brand: packingMaterial ? packingMaterial.brandType : '',
                        unit: packingMaterial ? packingMaterial.unit : ''
                    });
                }
                
                await masterRecord.save();
            } catch (masterError) {
                console.error('Error updating DamagedStockMaster:', masterError);
                // Don't fail the main operation if master record update fails
            }
        } else if (action === 'reject') {
            // Update damaged stock entry
            damagedStock.status = 'Rejected';
            damagedStock.deducted_from_stock = false;
            damagedStock.approved_by = req.user.name;
            damagedStock.approved_on = new Date();
            if (remarks) damagedStock.remarks = remarks;
            
            // Update GRN status
            await GRN.findByIdAndUpdate(damagedStock.grn_id, { status: 'Replaced' });
        }
        
        const updatedDamagedStock = await damagedStock.save();
        res.json(updatedDamagedStock);
    } catch (error) {
        console.error(`Error updating damaged stock entry: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating damaged stock entry.' });
    }
};

/**
 * @desc    Delete a damaged stock entry (admin only)
 * @route   DELETE /api/damaged-stock/:id
 * @access  Private/Admin
 */
const deleteDamagedStock = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid damaged stock ID.' });
        }
        
        const damagedStock = await DamagedStock.findById(id);
        if (!damagedStock) {
            return res.status(404).json({ message: 'Damaged stock entry not found.' });
        }
        
        // Only allow deletion of pending entries
        if (damagedStock.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending entries can be deleted.' });
        }
        
        await DamagedStock.findByIdAndDelete(id);
        
        // Reset GRN status if no other pending damaged entries exist for this GRN
        const otherPendingEntries = await DamagedStock.findOne({
            grn_id: damagedStock.grn_id,
            status: 'Pending'
        });
        
        if (!otherPendingEntries) {
            await GRN.findByIdAndUpdate(damagedStock.grn_id, { status: 'Completed' });
        }
        
        res.json({ message: 'Damaged stock entry deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting damaged stock entry: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting damaged stock entry.' });
    }
};

/**
 * @desc    Get summary statistics for damaged stock
 * @route   GET /api/damaged-stock/summary
 * @access  Private
 */
const getDamagedStockSummary = async (req, res) => {
    try {
        // Get total pending requests
        const pendingCount = await DamagedStock.countDocuments({ status: 'Pending' });
        
        // Get total damaged quantity
        const totalDamagedResult = await DamagedStock.aggregate([
            {
                $group: {
                    _id: null,
                    totalDamagedQty: { $sum: '$damaged_qty' }
                }
            }
        ]);
        
        const totalDamagedQty = totalDamagedResult.length > 0 ? totalDamagedResult[0].totalDamagedQty : 0;
        
        // Get last updated timestamp
        const lastUpdatedEntry = await DamagedStock.findOne().sort({ updatedAt: -1 });
        const lastUpdated = lastUpdatedEntry ? lastUpdatedEntry.updatedAt : null;
        
        res.json({
            pendingRequests: pendingCount,
            totalDamagedQty,
            lastUpdated
        });
    } catch (error) {
        console.error(`Error fetching damaged stock summary: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock summary.' });
    }
};

module.exports = {
    createDamagedStock,
    getDamagedStockEntries,
    getDamagedStockById,
    updateDamagedStock,
    deleteDamagedStock,
    getDamagedStockSummary
};