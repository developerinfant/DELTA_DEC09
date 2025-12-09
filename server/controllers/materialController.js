const mongoose = require('mongoose'); // Add this line
const PackingMaterial = require('../models/PackingMaterial');
const DeliveryChallan = require('../models/DeliveryChallan');
const GRN = require('../models/GRN');
const PackingMaterialStockRecord = require('../models/PackingMaterialStockRecord');
const XLSX = require('xlsx');

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

/**
 * @desc    Add a new packing material
 * @route   POST /api/materials
 * @access  Private (Admin/Manager)
 */
const addMaterial = async (req, res) => {
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, date, availableQty, jobberQty, usedQty, isWithJobber, unit, brandType, hsnCode } = req.body;

    try {
        // Check if user is admin or manager with a shop assigned
        // Removed the check that prevented adding materials without a shop
        
        const materialExists = await PackingMaterial.findOne({ name, shop: shop || null, brandType: brandType || 'own' });
        if (materialExists) {
            return res.status(400).json({ message: 'A material with this name already exists' });
        }
        
        const itemCode = await generateItemCode('packing');
        
        const materialDate = date ? new Date(date) : new Date();
        
        const material = new PackingMaterial({ 
            itemCode,
            name, 
            quantity, 
            availableQty: availableQty !== undefined ? availableQty : quantity,
            jobberQty: jobberQty || 0,
            usedQty: usedQty || 0,
            isWithJobber: isWithJobber || false,
            perQuantityPrice, 
            stockAlertThreshold,
            hsnCode: hsnCode || '', // Add HSN Code
            unit: unit || 'pcs', // Default to 'pcs' if not provided
            brandType: brandType || 'own', // Default to 'own' if not provided
            shop: shop || undefined, // Only set shop if provided
            date: materialDate // Use provided date or current date
        });
        
        // Add initial stock entry to price history
        const initialHistoryEntry = {
            date: materialDate, // Use the specified date instead of createdAt
            type: 'Existing Stock',
            supplier: 'Initial Stock',
            poNumber: 'N/A',
            grnNumber: 'N/A',
            qty: quantity,
            unitPrice: perQuantityPrice,
            total: quantity * perQuantityPrice
        };
        
        material.priceHistory.push(initialHistoryEntry);
        
        const createdMaterial = await material.save();
        res.status(201).json(createdMaterial);
    } catch (error) {
        console.error(`Error adding material: ${error.message}`);
        res.status(500).json({ message: 'Server error while adding material' });
    }
};

/**
 * @desc    Get a single material by its ID
 * @route   GET /api/materials/:id
 * @access  Private (Admin/Manager)
 */
const getMaterialById = async (req, res) => {
    try {
        const material = await PackingMaterial.findById(req.params.id);
        if (material) {
            // Custom sort to maintain the required structure:
            // 1. Existing Stock (always first)
            // 2. New GRN entries (in chronological order)
            // 3. New Average Price (Updated) (always last)
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
            
            // Ensure new fields have default values if not set
            if (material.availableQty === undefined) {
                material.availableQty = material.quantity;
            }
            if (material.jobberQty === undefined) {
                material.jobberQty = 0;
            }
            if (material.usedQty === undefined) {
                material.usedQty = 0;
            }
            if (material.isWithJobber === undefined) {
                material.isWithJobber = false;
            }
            
            res.json(material);
        } else {
            res.status(404).json({ message: 'Material not found' });
        }
    } catch (error) {
        console.error(`Error fetching material by ID: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get all packing materials
 * @route   GET /api/materials
 * @access  Private (Admin/Manager)
 */
const getMaterials = async (req, res) => {
    try {
        // Build query filter
        const filter = {};
        
        // If name parameter is provided, add it to the filter
        if (req.query.name) {
            filter.name = { $regex: req.query.name, $options: 'i' }; // Case-insensitive search
        }
        
        // If brandType parameter is provided, add it to the filter
        if (req.query.brandType) {
            filter.brandType = req.query.brandType;
        }
        
        // Show all materials regardless of shop
        const materials = await PackingMaterial.find(filter).sort({ createdAt: -1 });
        
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
            
            // Ensure new fields have default values if not set
            if (material.availableQty === undefined) {
                material.availableQty = material.quantity;
            }
            if (material.jobberQty === undefined) {
                material.jobberQty = 0;
            }
            if (material.usedQty === undefined) {
                material.usedQty = 0;
            }
            if (material.isWithJobber === undefined) {
                material.isWithJobber = false;
            }
            
            // Debug: Log material data to check field values
            console.log('Material data from DB:', {
                _id: material._id,
                name: material.name,
                quantity: material.quantity,
                perQuantityPrice: material.perQuantityPrice,
                typeOfQuantity: typeof material.quantity,
                typeOfPrice: typeof material.perQuantityPrice
            });
        });
        
        res.json(materials);
    } catch (error) {
        console.error(`Error fetching materials: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching materials' });
    }
};

/**
 * @desc    Update a packing material's details
 * @route   PUT /api/materials/:id
 * @access  Private (Admin/Manager)
 */
const updateMaterial = async (req, res) => {
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, date, availableQty, jobberQty, usedQty, isWithJobber, unit, brandType, hsnCode } = req.body;
    try {
        const material = await PackingMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        // Check if name already exists for this shop and brandType (excluding current material)
        const existingMaterial = await PackingMaterial.findOne({ 
            name, 
            shop: shop || null,
            brandType: brandType || 'own',
            _id: { $ne: req.params.id }  // Exclude current material
        });
        
        if (existingMaterial) {
            return res.status(400).json({ message: 'A material with this name already exists' });
        }
        
        material.name = name || material.name;
        material.quantity = quantity !== undefined ? quantity : material.quantity;
        material.availableQty = availableQty !== undefined ? availableQty : material.availableQty;
        material.jobberQty = jobberQty !== undefined ? jobberQty : material.jobberQty;
        material.usedQty = usedQty !== undefined ? usedQty : material.usedQty;
        material.isWithJobber = isWithJobber !== undefined ? isWithJobber : material.isWithJobber;
        material.perQuantityPrice = perQuantityPrice || material.perQuantityPrice;
        material.stockAlertThreshold = stockAlertThreshold || material.stockAlertThreshold;
        material.hsnCode = hsnCode !== undefined ? hsnCode : material.hsnCode; // Update HSN Code
        material.unit = unit || material.unit;
        material.brandType = brandType || material.brandType;
        // Only update shop if provided in the request
        if (shop !== undefined) {
            material.shop = shop;
        }
        // Update date if provided
        if (date !== undefined) {
            material.date = new Date(date);
        }
        
        const updatedMaterial = await material.save();
        res.json(updatedMaterial);
    } catch (error) {
        console.error(`Error updating material: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating material' });
    }
};

/**
 * @desc    Delete a packing material
 * @route   DELETE /api/materials/:id
 * @access  Private (Admin/Manager)
 */
const deleteMaterial = async (req, res) => {
    try {
        const material = await PackingMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        // Check if the user is authorized to delete this material
        if (req.user.role === 'Manager' && req.user.shop !== material.shop) {
            return res.status(403).json({ message: 'Not authorized to delete this material' });
        }
        
        await material.deleteOne();
        res.json({ message: 'Material removed successfully' });
    } catch (error) {
        console.error(`Error deleting material: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting material' });
    }
};

/**
 * @desc    Record an outgoing use of packing material
 * @route   POST /api/materials/outgoing
 * @access  Private (Admin/Manager)
 */
const recordOutgoing = async (req, res) => {
    const { materialId, quantityUsed, notes } = req.body;
    try {
        // Find the material
        const material = await PackingMaterial.findById(materialId);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        // Check if the user is authorized to record outgoing for this material
        if (req.user && req.user.role === 'Manager' && req.user.shop !== material.shop) {
            return res.status(403).json({ message: 'Not authorized to record outgoing for this material' });
        }
        
        if (material.quantity < quantityUsed) {
            return res.status(400).json({ message: 'Not enough stock for this operation' });
        }
        
        material.quantity -= Number(quantityUsed);
        material.availableQty -= Number(quantityUsed);
        material.usedQty += Number(quantityUsed);
        await material.save();
        
        // Create the outgoing record with the user who recorded it
        const outgoingData = { 
            material: materialId, 
            quantityUsed: Number(quantityUsed), 
            notes
        };
        
        // Only add recordedBy if it's a valid MongoDB ObjectId and req.user exists
        if (req.user && mongoose.Types.ObjectId.isValid(req.user._id)) {
            outgoingData.recordedBy = req.user._id;
        }
        
        const outgoingRecord = await OutgoingRecord.create(outgoingData);
        
        res.status(201).json({ 
            message: 'Outgoing material recorded successfully', 
            updatedMaterial: material,
            outgoingRecord
        });
    } catch (error) {
        console.error(`Error recording outgoing material: ${error.message}`);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get the history of all outgoing materials
 * @route   GET /api/materials/outgoing/history
 * @access  Private (Admin/Manager)
 */
const getOutgoingHistory = async (req, res) => {
    try {
        // Show all history regardless of shop
        const history = await OutgoingRecord.find({}).populate('material', 'name perQuantityPrice shop').sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        console.error(`Error fetching outgoing history: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get materials that are below their stock alert threshold
 * @route   GET /api/materials/alerts
 * @access  Private (Admin/Manager)
 */
const getStockAlerts = async (req, res) => {
    try {
        // Show all alerts regardless of shop
        const alerts = await PackingMaterial.find({ $expr: { $lt: ["$quantity", "$stockAlertThreshold"] } });
        res.json(alerts);
    } catch (error) {
        console.error(`Error fetching stock alerts: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/materials/stats
 * @access  Private (Admin/Manager)
 */
const getStats = async (req, res) => {
    try {
        // Fetch counts for both packing and raw materials
        const totalPackingMaterialTypes = await PackingMaterial.countDocuments();
        const totalRawMaterialTypes = await RawMaterial.countDocuments();

        // The rest of the stats remain as they were
        const lowStockCount = await PackingMaterial.countDocuments({ $expr: { $lt: ["$quantity", "$stockAlertThreshold"] } });
        
        // Calculate total stock value using perQuantityPrice
        const materials = await PackingMaterial.find({});
        let totalStockValue = 0;
        materials.forEach(material => {
            totalStockValue += material.quantity * material.perQuantityPrice;
        });

        const totalItems = await PackingMaterial.aggregate([
            { $group: { _id: null, totalItems: { $sum: "$quantity" } } }
        ]);

        return res.json({
            totalPackingMaterialTypes,
            totalRawMaterialTypes,
            lowStockCount,
            totalStockValue: totalStockValue,
            totalItems: totalItems[0]?.totalItems || 0,
        });
    } catch (error) {
        console.error(`Error fetching stats: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get packing material stock report with real-time calculations
 * @route   GET /api/packing/material-stock-report
 * @access  Private (Admin/Manager)
 */
const getPackingMaterialStockReport = async (req, res) => {
    try {
        // Get date filter from query params, default to today
        const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
        // Set to start of day for consistent comparison
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get all packing materials from the database
        const materials = await PackingMaterial.find({}).sort({ name: 1 });
        
        // Get all delivery challans for packing materials (not just completed ones)
        const deliveryChallans = await DeliveryChallan.find({}).populate('supplier_id', 'name');
        
        // Get all GRNs for packing materials
        const grns = await GRN.find({}).populate('supplier', 'name');
        
        // Process materials to calculate stock distribution
        const stockReport = [];
        
        for (const material of materials) {
            // Get WIP stock directly from material fields
            const ownUnitStock = material.ownUnitWIP || 0;
            const jobberStock = material.jobberWIP || 0;
            
            // Calculate opening stock (previous day's closing stock)
            const yesterday = new Date(selectedDate);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const previousStockRecord = await PackingMaterialStockRecord.findOne({
                materialId: material._id,
                date: yesterday
            });
            
            const openingStock = previousStockRecord ? previousStockRecord.closingStock : 0;
            
            // Calculate inward stock from GRNs for the selected date
            let inward = 0;
            grns.forEach(grn => {
              const grnDate = new Date(grn.dateReceived);
              grnDate.setHours(0, 0, 0, 0);
              
              // Count all GRNs except those marked as Draft or Cancelled
              // This ensures real-time stock addition when GRN is submitted, not just when completed
              if (!['Draft', 'Cancelled'].includes(grn.status) && grnDate.getTime() === selectedDate.getTime()) {
                grn.items.forEach(item => {
                  // Handle both string and object formats for material
                  const materialId = typeof item.material === 'string' ? item.material : item.material._id;
                  if (materialId.toString() === material._id.toString()) {
                    inward += item.receivedQuantity || 0;
                  }
                });
              }
            });

            // Calculate outward stock from Delivery Challans for the selected date
            let outward = 0;
            deliveryChallans.forEach(dc => {
              const dcDate = new Date(dc.date);
              dcDate.setHours(0, 0, 0, 0);
              
              // Count all DCs except those marked as Draft or Cancelled
              // This ensures real-time stock deduction when DC is created, not just when completed
              if (!['Draft', 'Cancelled'].includes(dc.status) && dcDate.getTime() === selectedDate.getTime()) {
                // Handle multiple products in DC
                if (dc.products && Array.isArray(dc.products)) {
                  dc.products.forEach(product => {
                    if (product.materials) {
                      product.materials.forEach(dcMaterial => {
                        if (dcMaterial.material_name === material.name) {
                          outward += dcMaterial.total_qty;
                        }
                      });
                    }
                  });
                } else if (dc.materials) {
                  // For old single product DCs
                  dc.materials.forEach(dcMaterial => {
                    if (dcMaterial.material_name === material.name) {
                      outward += dcMaterial.total_qty;
                    }
                  });
                }
              }
            });
            
            // Calculate closing stock using the correct formula
            // ClosingStock = OpeningStock + Today's GRN - Today's Delivery Challan
            let closingStock = openingStock + inward - outward;

            // Ensure closing stock is never negative
            if (closingStock < 0) {
              closingStock = 0;
            }

            // Calculate PM Store stock (pmStoreStock) as opening stock + inward - outward
            // PM Store should NOT subtract Own Unit WIP or Job Work WIP
            let pmStoreStock = openingStock + inward - outward;
            // Ensure pmStoreStock is never negative
            if (pmStoreStock < 0) {
              pmStoreStock = 0;
            }

            // Calculate total quantity and value
            const totalQty = closingStock;
            const ourStockValue = pmStoreStock * material.perQuantityPrice;
            const ownUnitValue = ownUnitStock * material.perQuantityPrice;
            const jobberValue = jobberStock * material.perQuantityPrice;
            const totalValue = ourStockValue + ownUnitValue + jobberValue;
            
            // Determine last updated timestamp
            let lastUpdated = material.updatedAt || material.createdAt || new Date();
            
            // Check if there were any transactions today that might have updated the material
            const todayTransactions = [...grns, ...deliveryChallans].filter(item => {
                const itemDate = new Date(item.dateReceived || item.date || item.createdAt);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === selectedDate.getTime();
            });
            
            if (todayTransactions.length > 0) {
                // Find the latest transaction timestamp
                const latestTransaction = todayTransactions.reduce((latest, current) => {
                    const currentDate = new Date(current.dateReceived || current.date || current.createdAt);
                    const latestDate = new Date(latest.dateReceived || latest.date || latest.createdAt);
                    return currentDate > latestDate ? current : latest;
                });
                lastUpdated = latestTransaction.dateReceived || latestTransaction.date || latestTransaction.createdAt;
            }
            
            // Save or update the stock record for the selected date
            await PackingMaterialStockRecord.findOneAndUpdate(
                {
                    materialId: material._id,
                    date: selectedDate
                },
                {
                    materialName: material.name,
                    openingStock: openingStock,
                    closingStock: closingStock,
                    inward: inward,
                    outward: outward,
                    unit: material.unit || 'pcs'
                },
                {
                    upsert: true,
                    new: true
                }
            );
            
            stockReport.push({
                materialName: material.name,
                unit: material.unit || 'pcs',
                openingStock: openingStock,
                ourStock: pmStoreStock,
                ownUnitStock,
                jobberStock,
                ourStockValue,
                ownUnitValue,
                jobberValue,
                closingStock: closingStock,
                inward: inward,
                outward: outward,
                totalQty,
                totalValue,
                lastUpdated
            });
        }
        
        res.json(stockReport);
    } catch (error) {
        console.error(`Error fetching packing material stock report: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching stock report' });
    }
};

/**
 * @desc    Get next item code for preview
 * @route   GET /api/materials/next-item-code
 * @access  Private (Admin/Manager)
 */
const getNextItemCode = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type) return res.status(400).json({ error: "Missing 'type' parameter" });

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

        res.json({ nextItemCode: itemCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate next item code' });
    }
};

/**
 * @desc    Get packing material stock by name
 * @route   GET /api/packing/material-stock/:materialName
 * @access  Private (Admin/Manager)
 */
const getPackingMaterialStockByName = async (req, res) => {
    try {
        const { materialName } = req.params;
        
        // Decode the material name in case it contains special characters
        const decodedMaterialName = decodeURIComponent(materialName);
        
        // Find the packing material by name
        const material = await PackingMaterial.findOne({ name: decodedMaterialName });
        
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        // Return the material with stock information
        res.json({
            materialName: material.name,
            quantity: material.quantity,
            availableQty: material.availableQty,
            jobberQty: material.jobberQty,
            usedQty: material.usedQty,
            perQuantityPrice: material.perQuantityPrice,
            unit: material.unit || 'pcs'
        });
    } catch (error) {
        console.error(`Error fetching packing material stock by name: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching material stock' });
    }
};

/**
 * @desc    Get packing material stock report with date range filter
 * @route   GET /api/packing/material-stock-report-range
 * @access  Private (Admin/Manager)
 */
const getPackingMaterialStockReportByDateRange = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        
        // Validate date parameters
        if (!fromDate || !toDate) {
            return res.status(400).json({ message: 'Both fromDate and toDate are required' });
        }
        
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        
        // Set to start of day for fromDate and end of day for toDate
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Validate date range
        if (startDate > endDate) {
            return res.status(400).json({ message: 'fromDate must be before toDate' });
        }
        
        // Get all packing material stock records within the date range
        const stockRecords = await PackingMaterialStockRecord.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1, materialName: 1 });
        
        // Group records by date
        const reportData = {};
        
        stockRecords.forEach(record => {
            const dateStr = record.date.toISOString().split('T')[0];
            
            if (!reportData[dateStr]) {
                reportData[dateStr] = [];
            }
            
            reportData[dateStr].push({
                materialName: record.materialName,
                openingStock: record.openingStock,
                inward: record.inward,
                outward: record.outward,
                closingStock: record.closingStock,
                unit: record.unit || 'pcs',
                date: record.date
            });
        });
        
        res.json(reportData);
    } catch (error) {
        console.error(`Error fetching packing material stock report by date range: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching stock report' });
    }
};

/**
 * @desc    Import packing materials from Excel with smart column mapping
 * @route   POST /api/materials/import
 * @access  Private (Admin/Manager)
 * 
 * @description
 * Smart column mapping features:
 * - Automatically detects header rows containing keywords like 'Particulars', 'Quantity', etc.
 * - Flexible column recognition that works with variations like 'Qty' instead of 'Quantity'
 * - Data normalization that strips units like 'Nos', 'Kgs', 'Rolls' from quantities
 * - Auto-calculation of total price if not provided
 * - Sequential item code generation (PM-00001, PM-00002, etc.)
 * - Skips duplicates based on material name matching
 * - Handles missing fields with appropriate defaults
 */
const importMaterials = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get brandType from request body, default to 'own'
        const brandType = req.body.brandType || 'own';

        // Read the Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data from worksheet
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Smart column mapping configuration
        const columnMap = {
            name: ["particulars", "material name", "product name", "item name", "name", "material", "material name"],
            quantity: ["quantity", "qty", "stock qty", "closing qty", "quantity"],
            perQuantityPrice: ["rate", "unit price", "per qty price", "price", "per quantity price (₹)", "unit price (₹)", "unit price", "unit price"],
            alertThreshold: ["alert threshold", "stock alert threshold", "threshold", "stock alert threshold"],
            unit: ["unit", "unit"],
            hsnCode: ["hsn", "hsn code", "hsn number", "hsn code"]
        };
        
        // Helper function to convert values to numbers
        const toNumber = (val) => {
            if (!val) return 0;
            return Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
        };
        
        // Helper function to detect unit from material name
        const detectUnitFromName = (name) => {
            if (!name) return 'pcs';
            
            // Common unit patterns
            const unitPatterns = [
                { pattern: /\d+\s*(mm)/i, unit: 'mm' },
                { pattern: /\d+\s*(cm)/i, unit: 'cm' },
                { pattern: /\d+\s*(meter|m)/i, unit: 'm' },
                { pattern: /\d+\s*(kg|kilogram)/i, unit: 'kg' },
                { pattern: /\d+\s*(gm|gms|gram)/i, unit: 'gms' },
                { pattern: /\d+\s*(mg)/i, unit: 'mg' },
                { pattern: /\d+\s*(litre|liter|ltr)/i, unit: 'ltr' },
                { pattern: /\d+\s*(ml)/i, unit: 'ml' },
                { pattern: /\d+\s*(pcs|pieces|piece|nos)/i, unit: 'pcs' },
                { pattern: /\d+\s*(box|boxes)/i, unit: 'box' },
                { pattern: /\d+\s*(roll|rolls)/i, unit: 'roll' },
                { pattern: /\d+\s*(pkt|packets)/i, unit: 'pkt' },
                { pattern: /\d+\s*(set|sets)/i, unit: 'set' },
                { pattern: /\d+\s*(bundle|bundles)/i, unit: 'bundle' }
            ];
            
            for (const { pattern, unit } of unitPatterns) {
                if (pattern.test(name)) {
                    return unit;
                }
            }
            
            return 'pcs'; // Default unit
        };
        
        // Find header row
        let headerRowIndex = 0;
        let headers = [];
        
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => {
                if (typeof cell === 'string') {
                    const cellLower = cell.toLowerCase().trim();
                    return columnMap.name.some(name => cellLower.includes(name)) ||
                           columnMap.quantity.some(qty => cellLower.includes(qty)) ||
                           columnMap.perQuantityPrice.some(price => cellLower.includes(price));
                }
                return false;
            })) {
                headerRowIndex = i;
                headers = row.map(cell => {
                    if (typeof cell === 'string') {
                        // Normalize header: remove extra spaces and convert to lowercase
                        return cell.toLowerCase().replace(/\s+/g, ' ').trim();
                    }
                    return '';
                });
                break;
            }
        }
        
        // Create reverse mapping from Excel columns to database fields
        const fieldMapping = {};
        headers.forEach((header, index) => {
            // Try to match each header with our known fields
            for (const [field, keywords] of Object.entries(columnMap)) {
                // Make sure we don't map the same column index to multiple fields
                if (keywords.some(keyword => header.includes(keyword))) {
                    // Only set if not already mapped to prevent conflicts
                    if (fieldMapping[field] === undefined) {
                        fieldMapping[field] = index;
                    }
                }
            }
        });
        
        // Debug: Log the field mapping
        console.log('Field mapping:', fieldMapping);
        
        // Process data rows (skip header row)
        const dataRows = rawData.slice(headerRowIndex + 1);
        
        // Clean and filter data
        const cleanData = dataRows
            .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map(row => {
                const cleanRow = {};
                
                // Map fields based on detected mapping
                if (fieldMapping.name !== undefined) {
                    cleanRow.name = String(row[fieldMapping.name] || '').trim();
                }
                
                if (fieldMapping.quantity !== undefined) {
                    // Extract numeric value from quantity (remove units like Nos, Kgs, Rolls)
                    const qtyValue = row[fieldMapping.quantity];
                    cleanRow.quantity = toNumber(qtyValue);
                }
                
                if (fieldMapping.perQuantityPrice !== undefined) {
                    // Extract numeric value from price
                    const priceValue = row[fieldMapping.perQuantityPrice];
                    cleanRow.perQuantityPrice = toNumber(priceValue);
                }
                
                if (fieldMapping.alertThreshold !== undefined) {
                    // Extract numeric value from alert threshold
                    const thresholdValue = row[fieldMapping.alertThreshold];
                    cleanRow.alertThreshold = toNumber(thresholdValue);
                }
                
                // Handle unit field
                if (fieldMapping.unit !== undefined) {
                    // Get unit value from Excel, default to 'pcs' if blank or undefined
                    const unitValue = row[fieldMapping.unit];
                    cleanRow.unit = (unitValue !== undefined && unitValue !== null && unitValue !== '') ? 
                                   String(unitValue).trim() : 'pcs';
                } else {
                    // Auto-detect unit from material name if no unit column
                    cleanRow.unit = detectUnitFromName(cleanRow.name);
                }
                
                // Handle HSN Code field
                if (fieldMapping.hsnCode !== undefined) {
                    const hsnValue = row[fieldMapping.hsnCode];
                    cleanRow.hsnCode = (hsnValue !== undefined && hsnValue !== null) ? 
                                      String(hsnValue).trim() : '';
                } else {
                    cleanRow.hsnCode = '';
                }
                
                // Apply defaults for missing fields
                if (cleanRow.name === undefined) cleanRow.name = '';
                if (cleanRow.quantity === undefined) cleanRow.quantity = 0;
                if (cleanRow.perQuantityPrice === undefined) cleanRow.perQuantityPrice = 0;
                if (cleanRow.alertThreshold === undefined) cleanRow.alertThreshold = 20;
                if (cleanRow.hsnCode === undefined) cleanRow.hsnCode = '';
                
                // Debug: Log each row mapping
                console.log('Row mapping - Raw row:', row);
                console.log('Row mapping - Clean row:', cleanRow);
                
                return cleanRow;
            })
            .filter(row => row.name && row.name.trim() !== '' && !row.name.toLowerCase().includes('total')); // Remove rows without material names and skip "total" rows
        
        let importedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errors = [];
        const duplicates = []; // Store duplicate materials for confirmation
        
        // Get the latest item code to continue numbering
        const latestMaterial = await PackingMaterial
            .findOne({}, {}, { sort: { 'createdAt': -1 } })
            .select('itemCode');
        
        let nextCounter = 1;
        if (latestMaterial && latestMaterial.itemCode) {
            const lastNumber = parseInt(latestMaterial.itemCode.split('-')[1]);
            if (!isNaN(lastNumber)) {
                nextCounter = lastNumber + 1;
            }
        }
        
        // Process each clean row
        for (const row of cleanData) {
            try {
                // Skip empty rows or rows with "total" in the name
                if (!row.name || row.name.toLowerCase().includes('total')) {
                    continue;
                }
                
                // Check for duplicates within the same brandType
                const existingMaterial = await PackingMaterial.findOne({ 
                    name: row.name,
                    brandType: brandType
                });
                
                if (existingMaterial) {
                    // Instead of skipping, add to duplicates list for confirmation
                    duplicates.push({
                        name: row.name,
                        quantity: row.quantity,
                        perQuantityPrice: row.perQuantityPrice,
                        existingQuantity: existingMaterial.quantity,
                        existingPrice: existingMaterial.perQuantityPrice
                    });
                    duplicateCount++;
                    continue;
                }
                
                // Generate sequential item code
                let finalItemCode;
                let exists = true;
                let counter = nextCounter;
                
                while (exists) {
                    const nextNumber = String(counter).padStart(5, '0');
                    finalItemCode = `PM-${nextNumber}`;
                    const existing = await PackingMaterial.findOne({ itemCode: finalItemCode });
                    if (existing) {
                        counter++;
                    } else {
                        exists = false;
                    }
                }
                
                // Update next counter for efficiency
                nextCounter = counter + 1;
                
                // Validate data to ensure quantity and price are numbers
                const validatedQuantity = typeof row.quantity === 'number' ? row.quantity : 0;
                const validatedPrice = typeof row.perQuantityPrice === 'number' ? row.perQuantityPrice : 0;
                const validatedHsnCode = typeof row.hsnCode === 'string' ? row.hsnCode : '';
                
                // Create new material with brandType
                const material = new PackingMaterial({
                    itemCode: finalItemCode,
                    name: row.name,
                    quantity: validatedQuantity,
                    availableQty: validatedQuantity,
                    jobberQty: 0,
                    usedQty: 0,
                    isWithJobber: false,
                    perQuantityPrice: validatedPrice,
                    stockAlertThreshold: row.alertThreshold || 20, // Use provided value or default
                    unit: row.unit || 'pcs', // Use provided unit or default to 'pcs'
                    hsnCode: validatedHsnCode, // Add HSN code
                    brandType: brandType, // Include brandType
                    date: new Date()
                });
                
                // Add initial stock entry to price history
                const initialHistoryEntry = {
                    date: new Date(),
                    type: 'Existing Stock',
                    supplier: 'Initial Stock (Import)',
                    poNumber: 'N/A',
                    grnNumber: 'N/A',
                    qty: validatedQuantity,
                    unitPrice: validatedPrice,
                    total: validatedQuantity * validatedPrice
                };
                
                material.priceHistory.push(initialHistoryEntry);
                await material.save();
                importedCount++;
            } catch (error) {
                errorCount++;
                errors.push(`Row import failed: ${error.message}`);
                console.error(`Error importing row: ${error.message}`);
            }
        }
        
        // If there are duplicates, return them for confirmation
        if (duplicates.length > 0) {
            return res.json({
                message: 'Duplicates found',
                duplicates: duplicates,
                imported: importedCount,
                duplicateCount: duplicateCount,
                errors: errorCount,
                errorDetails: errors
            });
        }
        
        res.json({
            message: `Import completed successfully`,
            imported: importedCount,
            duplicates: duplicateCount,
            errors: errorCount,
            errorDetails: errors
        });
    } catch (error) {
        console.error(`Error importing materials: ${error.message}`);
        res.status(500).json({ message: 'Server error while importing materials', error: error.message });
    }
};

/**
 * @desc    Import packing materials from Excel with confirmation for duplicates
 * @route   POST /api/materials/import-with-duplicates
 * @access  Private (Admin/Manager)
 */
const importMaterialsWithDuplicates = async (req, res) => {
    try {
        const { duplicates, action, brandType = 'own' } = req.body; // action can be 'add' or 'skip'
        
        if (!duplicates || !Array.isArray(duplicates)) {
            return res.status(400).json({ message: 'Invalid duplicates data' });
        }
        
        if (action !== 'add' && action !== 'skip') {
            return res.status(400).json({ message: 'Invalid action. Must be "add" or "skip"' });
        }
        
        let importedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Process each duplicate based on action
        for (const duplicate of duplicates) {
            try {
                const existingMaterial = await PackingMaterial.findOne({ 
                    name: duplicate.name,
                    brandType: brandType // Filter by brandType
                });
                
                if (!existingMaterial) {
                    // This shouldn't happen, but just in case
                    errorCount++;
                    errors.push(`Material not found: ${duplicate.name}`);
                    continue;
                }
                
                if (action === 'add') {
                    // Add quantities to existing material
                    const newQuantity = existingMaterial.quantity + duplicate.quantity;
                    const newAvailableQty = existingMaterial.availableQty + duplicate.quantity;
                    
                    // Update the material
                    existingMaterial.quantity = newQuantity;
                    existingMaterial.availableQty = newAvailableQty;
                    
                    // Add to price history
                    const historyEntry = {
                        date: new Date(),
                        type: 'New GRN',
                        supplier: 'Duplicate Import',
                        poNumber: 'N/A',
                        grnNumber: 'N/A',
                        qty: duplicate.quantity,
                        unitPrice: duplicate.perQuantityPrice,
                        total: duplicate.quantity * duplicate.perQuantityPrice
                    };
                    
                    existingMaterial.priceHistory.push(historyEntry);
                    await existingMaterial.save();
                    updatedCount++;
                } else {
                    // Skip the duplicate
                    skippedCount++;
                }
            } catch (error) {
                errorCount++;
                errors.push(`Failed to process duplicate ${duplicate.name}: ${error.message}`);
                console.error(`Error processing duplicate: ${error.message}`);
            }
        }
        
        // Prepare success message based on action
        let message = 'Import completed successfully';
        if (action === 'add') {
            message = `Import completed successfully. Added quantities to ${updatedCount} existing materials.`;
        } else {
            message = `Import completed successfully. Skipped ${skippedCount} duplicate materials.`;
        }
        
        res.json({
            message: message,
            imported: importedCount,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount,
            errorDetails: errors
        });
    } catch (error) {
        console.error(`Error importing materials with duplicates: ${error.message}`);
        res.status(500).json({ message: 'Server error while importing materials', error: error.message });
    }
};

/**
 * @desc    Configure opening and closing stock capture times
 * @route   POST /api/packing/configure-stock-times
 * @access  Private (Admin)
 */
const configureStockCaptureTimes = async (req, res) => {
    try {
        const { openingTime, closingTime } = req.body;
        
        // Validate input
        if (!openingTime || !closingTime) {
            return res.status(400).json({ message: 'Both openingTime and closingTime are required' });
        }
        
        // Import and update scheduler configuration
        const { setStockCaptureTimes } = require('../utils/stockScheduler');
        await setStockCaptureTimes(openingTime, closingTime);
        
        res.json({ message: 'Stock capture times configured successfully' });
    } catch (error) {
        console.error(`Error configuring stock capture times: ${error.message}`);
        res.status(500).json({ message: 'Server error while configuring stock capture times' });
    }
};

/**
 * @desc    Get current stock capture configuration
 * @route   GET /api/packing/stock-config
 * @access  Private (Admin)
 */
const getStockCaptureConfig = async (req, res) => {
    try {
        const StockCaptureConfig = require('../models/StockCaptureConfig');
        const config = await StockCaptureConfig.getConfig();
        
        res.json({
            openingTime: config.openingTime,
            closingTime: config.closingTime
        });
    } catch (error) {
        console.error(`Error fetching stock capture configuration: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching stock capture configuration' });
    }
};

/**
 * @desc    Export packing materials to Excel or PDF
 * @route   GET /api/materials/export?format=excel|pdf
 * @access  Private (Admin/Manager)
 */
const exportMaterials = async (req, res) => {
    try {
        const format = req.query.format || 'excel';
        const brandType = req.query.brandType || 'own'; // Default to 'own' brand
        
        // Get packing materials filtered by brandType
        const materials = await PackingMaterial.find({ brandType }).sort({ name: 1 });
        
        // Prepare data for export
        const exportData = materials.map(material => ({
            'Item Code': material.itemCode,
            'Material Name': material.name,
            'Quantity': material.quantity,
            'Unit': material.unit || 'pcs',
            'Unit Price': material.perQuantityPrice,
            'Total Price': material.quantity * material.perQuantityPrice,
            'Stock Alert Threshold': material.stockAlertThreshold,
            'HSN Code': material.hsnCode || '', // Add HSN Code to export
            'Brand Type': material.brandType === 'own' ? 'Own Brand' : 'Other Brand',
            'View History': 'Click View History button'
        }));

        if (format === 'excel') {
            // Create workbook and worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Packing Materials');
            
            // Generate buffer
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            // Set headers for download
            const dateStr = new Date().toISOString().split('T')[0];
            const brandLabel = brandType === 'own' ? 'OwnBrand' : 'OtherBrand';
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Packing_Materials_${brandLabel}_${dateStr}.xlsx`);
            
            // Send buffer
            res.send(buf);
        } else if (format === 'pdf') {
            // For PDF export, we'll send the data as JSON and let the frontend handle PDF generation
            res.json(exportData);
        } else {
            res.status(400).json({ message: 'Invalid format. Use "excel" or "pdf"' });
        }
    } catch (error) {
        console.error(`Error exporting materials: ${error.message}`);
        res.status(500).json({ message: 'Server error while exporting materials' });
    }
};

module.exports = {
    addMaterial,
    getMaterials,
    getMaterialById,
    updateMaterial,
    deleteMaterial,
    recordOutgoing,
    getOutgoingHistory,
    getStockAlerts,
    getStats,
    getNextItemCode,
    getPackingMaterialStockReport,
    getPackingMaterialStockReportByDateRange, // Add this new function
    getPackingMaterialStockByName, // Add this new function
    configureStockCaptureTimes, // Add this new function
    getStockCaptureConfig, // Add this new function
    importMaterials,
    importMaterialsWithDuplicates, // Add the new function
    exportMaterials
};