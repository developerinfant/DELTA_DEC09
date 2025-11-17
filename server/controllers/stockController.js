const mongoose = require('mongoose');
const RawMaterial = require('../models/RawMaterial');
const JobberRecord = require('../models/JobberRecord');

// Helper function to generate unique item codes
const generateItemCode = async (type) => {
  const prefix = type === 'raw' ? 'RM' : 'PM';
  const Model = type === 'raw' ? RawMaterial : PackingMaterial;

  let counter = await Model.countDocuments() + 1;
  let itemCode;
  let exists = true;

  // Keep incrementing until we find a unique item code
  while (exists) {
    const nextNumber = String(counter).padStart(5, '0');
    itemCode = `${prefix}-${nextNumber}`;
    
    // Check if this item code already exists
    const existing = await Model.findOne({ itemCode });
    if (existing) {
      counter++;
    } else {
      exists = false;
    }
  }

  return itemCode;
};

// --- RAW MATERIALS ---

/**
 * @desc    Add a new raw material
 * @route   POST /api/stock/raw-materials
 * @access  Private
 */
const addRawMaterial = async (req, res) => {
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, itemCode, hsnCode } = req.body;

    try {
        // Check if user is admin or manager with a shop assigned
        // Removed the check that prevented adding materials without a shop
        
        // Check for existing material with same name
        const existingMaterial = await RawMaterial.findOne({ name, shop: shop || null });
        if (existingMaterial) {
            return res.status(400).json({ message: 'A raw material with this name already exists' });
        }
        
        // Generate item code if not provided
        let generatedItemCode = itemCode;
        if (!generatedItemCode) {
            generatedItemCode = await generateItemCode('raw');
        }
        
        // Check for existing material with same item code
        const existingItemCode = await RawMaterial.findOne({ itemCode: generatedItemCode });
        if (existingItemCode) {
            return res.status(400).json({ message: 'A raw material with this item code already exists' });
        }
        
        const materialData = { 
            itemCode: generatedItemCode,
            name, 
            quantity: Number(quantity), 
            perQuantityPrice: Number(perQuantityPrice), 
            stockAlertThreshold: Number(stockAlertThreshold),
            hsnCode: hsnCode || '',
            shop: shop || undefined // Only set shop if provided
        };
        
        const material = new RawMaterial(materialData);
        
        // Add initial stock entry to price history
        const initialHistoryEntry = {
            date: material.createdAt || new Date(), // For raw materials, we'll use createdAt since there's no date field
            type: 'Existing Stock',
            supplier: 'Initial Stock',
            poNumber: 'N/A',
            grnNumber: 'N/A',
            qty: Number(quantity),
            unitPrice: Number(perQuantityPrice),
            total: Number(quantity) * Number(perQuantityPrice)
        };
        
        material.priceHistory.push(initialHistoryEntry);
        
        const createdMaterial = await material.save();
        res.status(201).json(createdMaterial);
    } catch (error) {
        if (error.name === 'ValidationError') {
            // Extract and join Mongoose validation error messages
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        res.status(500).json({ message: 'Server error while adding raw material.' });
    }
};

/**
 * @desc    Get all raw materials
 * @route   GET /api/stock/raw-materials
 * @access  Private
 */
const getRawMaterials = async (req, res) => {
    try {
        // Show all materials regardless of shop
        const materials = await RawMaterial.find({});
        
        // Custom sort to maintain the required structure:
        // 1. Existing Stock (always first)
        // 2. New GRN entries (in chronological order)
        // 3. New Average Price (Updated) (always last)
        materials.forEach(material => {
            if (material.priceHistory && material.priceHistory.length > 0) {
                // Separate entries by type
                const existingStock = material.priceHistory.filter(entry => entry.type === 'Existing Stock');
                const newGRNs = material.priceHistory.filter(entry => entry.type === 'New GRN');
                const averagePrices = material.priceHistory.filter(entry => entry.type === 'New Average Price (Updated)');
                
                // Sort New GRN entries by date
                newGRNs.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Reconstruct history in the correct order
                material.priceHistory = [
                    ...existingStock,
                    ...newGRNs,
                    ...averagePrices
                ];
            }
        });
        
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching raw materials' });
    }
};

/**
 * @desc    Update a raw material
 * @route   PUT /api/stock/raw-materials/:id
 * @access  Private
 */
const updateRawMaterial = async (req, res) => {
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, hsnCode } = req.body;
    try {
        const material = await RawMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Raw material not found' });
        }
        
        // Check if name already exists (excluding current material)
        if (name) {
            const existingMaterial = await RawMaterial.findOne({ 
                name, 
                shop: shop || null,
                _id: { $ne: req.params.id }  // Exclude current material
            });
            
            if (existingMaterial) {
                return res.status(400).json({ message: 'A raw material with this name already exists' });
            }
        }
        
        material.name = name || material.name;
        material.quantity = quantity !== undefined ? quantity : material.quantity;
        material.perQuantityPrice = perQuantityPrice || material.perQuantityPrice;
        material.stockAlertThreshold = stockAlertThreshold !== undefined ? stockAlertThreshold : material.stockAlertThreshold;
        material.hsnCode = hsnCode || material.hsnCode;
        // Only update shop if provided in the request
        if (shop !== undefined) {
            material.shop = shop;
        }
        
        const updatedMaterial = await material.save();
        res.json(updatedMaterial);
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating raw material' });
    }
};

/**
 * @desc    Delete a raw material
 * @route   DELETE /api/stock/raw-materials/:id
 * @access  Private
 */
const deleteRawMaterial = async (req, res) => {
    try {
        const material = await RawMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Raw material not found' });
        }
        
        await material.deleteOne();
        res.json({ message: 'Raw material removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting raw material' });
    }
};

/**
 * @desc    Get next available raw material item code
 * @route   GET /api/stock/raw-materials/next-item-code
 * @access  Private
 */
const getNextRawItemCode = async (req, res) => {
    try {
        // Find the latest raw material item
        const latestItem = await RawMaterial.findOne().sort({ createdAt: -1 });
        
        if (!latestItem) {
            // If no items exist, start with RM001
            return res.json({ nextItemCode: 'RM001' });
        }
        
        // Extract the numeric part and increment
        const lastCode = latestItem.itemCode;
        const numericPart = parseInt(lastCode.replace('RM', ''));
        const nextNumericPart = numericPart + 1;
        const nextItemCode = `RM${nextNumericPart.toString().padStart(3, '0')}`;
        
        res.json({ nextItemCode });
    } catch (error) {
        console.error('Error in getNextRawItemCode:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// --- JOBBER UNIT ---

/**
 * @desc    Send raw materials to a jobber
 * @route   POST /api/stock/jobber/outgoing
 * @access  Private
 */
const sendToJobber = async (req, res) => {
    const { materialId, quantitySent, notes, jobberName } = req.body;
    try {
        const material = await RawMaterial.findById(materialId);
        if (!material) {
            return res.status(404).json({ message: 'Raw material not found' });
        }
        
        if (material.quantity < quantitySent) {
            return res.status(400).json({ message: 'Not enough stock for this operation' });
        }

        // 1. Decrease stock
        material.quantity -= Number(quantitySent);
        await material.save();

        // 2. Create an outgoing record
        const outgoingData = {
            material: materialId,
            quantitySent: Number(quantitySent),
            notes,
        };

        // Only add recordedBy if it's a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(req.user._id)) {
            outgoingData.recordedBy = req.user._id;
        }

        const outgoingRecord = await OutgoingRawMaterial.create(outgoingData);


        // 3. Create a jobber record
        const jobberRecord = await JobberRecord.create({
            jobberName,
            rawMaterial: materialId,
            outgoingRecord: outgoingRecord._id,
            quantitySent: Number(quantitySent),
        });

        res.status(201).json({ message: 'Material sent to jobber successfully', updatedMaterial: material, jobberRecord });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Reconcile a jobber's return
 * @route   PUT /api/stock/jobber/reconcile/:id
 * @access  Private
 */
const reconcileJobberRecord = async (req, res) => {
    const { quantityProduced, quantityReturned, notes, status } = req.body;
    try {
        const jobberRecord = await JobberRecord.findById(req.params.id);
        if (!jobberRecord) {
            return res.status(404).json({ message: 'Jobber record not found' });
        }

        // Check if the user is authorized to reconcile this jobber record
        const material = await RawMaterial.findById(jobberRecord.rawMaterial);
        if (!material) {
            return res.status(404).json({ message: 'Raw material not found for this jobber record' });
        }

        const totalAccounted = Number(quantityProduced) + Number(quantityReturned);
        const quantityStillWithJobber = jobberRecord.quantitySent - totalAccounted;
        
        if (quantityStillWithJobber < 0) {
            return res.status(400).json({ message: 'Returned and produced quantity cannot exceed quantity sent.' });
        }

        // Update Jobber Record
        jobberRecord.quantityProduced = quantityProduced;
        jobberRecord.quantityReturned = quantityReturned;
        jobberRecord.notes = notes || jobberRecord.notes;
        jobberRecord.status = status || jobberRecord.status;

        // If returned quantity exists, add it back to stock
        if (Number(quantityReturned) > 0) {
            material.quantity += Number(quantityReturned);
            await material.save();
        }

        const updatedRecord = await jobberRecord.save();
        res.json({ message: 'Jobber record reconciled', updatedRecord });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during reconciliation' });
    }
};

/**
 * @desc    Get all jobber records
 * @route   GET /api/stock/jobber
 * @access  Private
 */
const getJobberRecords = async (req, res) => {
    try {
        // Show all records regardless of shop
        const records = await JobberRecord.find({})
            .populate('rawMaterial', 'name itemCode')
            .sort({ createdAt: -1 });
        
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


// --- HISTORY AND ALERTS ---

/**
 * @desc    Get the history of all outgoing raw materials
 * @route   GET /api/stock/outgoing-history
 * @access  Private
 */
const getOutgoingRawHistory = async (req, res) => {
    try {
        // Show all history regardless of shop
        const history = await OutgoingRawMaterial.find({})
            .populate('material', 'name perQuantityPrice shop itemCode')
            .sort({ createdAt: -1 });
        
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get raw materials that are below their stock alert threshold
 * @route   GET /api/stock/alerts
 * @access  Private
 */
const getRawStockAlerts = async (req, res) => {
    try {
        // Show all alerts regardless of shop
        const alerts = await RawMaterial.find({ $expr: { $lt: ["$quantity", "$stockAlertThreshold"] } });
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    addRawMaterial,
    getRawMaterials,
    updateRawMaterial,
    deleteRawMaterial,
    sendToJobber,
    reconcileJobberRecord,
    getJobberRecords,
    getOutgoingRawHistory,
    getRawStockAlerts,
    getNextRawItemCode
};