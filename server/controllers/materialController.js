const mongoose = require('mongoose'); // Add this line
const PackingMaterial = require('../models/PackingMaterial');
const OutgoingRecord = require('../models/OutgoingRecord');
const RawMaterial = require('../models/RawMaterial'); // Import the RawMaterial model
const DeliveryChallan = require('../models/DeliveryChallan'); // Import the DeliveryChallan model
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
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, date, availableQty, jobberQty, usedQty, isWithJobber, unit } = req.body;

    try {
        // Check if user is admin or manager with a shop assigned
        // Removed the check that prevented adding materials without a shop
        
        const materialExists = await PackingMaterial.findOne({ name, shop: shop || null });
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
            unit: unit || 'pcs', // Default to 'pcs' if not provided
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
    const { name, quantity, perQuantityPrice, stockAlertThreshold, shop, date, availableQty, jobberQty, usedQty, isWithJobber, unit } = req.body;
    try {
        const material = await PackingMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        // Check if name already exists for this shop (excluding current material)
        const existingMaterial = await PackingMaterial.findOne({ 
            name, 
            shop: shop || null,
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
        material.unit = unit || material.unit;
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
        // Get all packing materials from the database
        const materials = await PackingMaterial.find({}).sort({ name: 1 });
        
        // Get all completed delivery challans for packing materials
        const deliveryChallans = await DeliveryChallan.find({ 
            status: 'Completed' 
        }).populate('supplier_id', 'name');
        
        // Process materials to calculate stock distribution
        const stockReport = materials.map(material => {
            // Initialize stock counts
            let ownUnitStock = 0;
            let jobberStock = 0;
            
            // Calculate stock distribution based on completed DCs
            deliveryChallans.forEach(dc => {
                // Find material in DC
                const dcMaterial = dc.materials.find(m => m.material_name === material.name);
                if (dcMaterial) {
                    if (dc.unit_type === 'Own Unit') {
                        ownUnitStock += dcMaterial.total_qty;
                    } else if (dc.unit_type === 'Jobber') {
                        jobberStock += dcMaterial.total_qty;
                    }
                }
            });
            
            // Our stock is the current quantity minus what's been issued
            const ourStock = material.quantity;
            
            // Calculate values
            const ourStockValue = ourStock * material.perQuantityPrice;
            const ownUnitValue = ownUnitStock * material.perQuantityPrice;
            const jobberValue = jobberStock * material.perQuantityPrice;
            
            // Calculate totals
            const totalQty = ourStock + ownUnitStock + jobberStock;
            const totalValue = ourStockValue + ownUnitValue + jobberValue;
            
            // Find the latest update timestamp
            let lastUpdated = material.updatedAt;
            
            // Check DCs for more recent updates
            deliveryChallans.forEach(dc => {
                const dcMaterial = dc.materials.find(m => m.material_name === material.name);
                if (dcMaterial && dc.updatedAt > lastUpdated) {
                    lastUpdated = dc.updatedAt;
                }
            });
            
            return {
                materialName: material.name,
                unit: material.unit || 'pcs',
                ourStock,
                ownUnitStock,
                jobberStock,
                ourStockValue,
                ownUnitValue,
                jobberValue,
                totalQty,
                totalValue,
                lastUpdated
            };
        });
        
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

        // Read the Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data from worksheet
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Smart column mapping configuration
        const columnMap = {
            name: ["particulars", "material name", "product name", "item name"],
            quantity: ["quantity", "qty", "stock qty", "closing qty"],
            perQuantityPrice: ["rate", "unit price", "per qty price", "price", "per quantity price (₹)"],
            alertThreshold: ["alert threshold", "stock alert threshold", "threshold"],
            unit: ["unit"]
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
                if (keywords.some(keyword => header.includes(keyword))) {
                    fieldMapping[field] = index;
                    break;
                }
            }
        });
        
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
                
                // Apply defaults for missing fields
                if (cleanRow.name === undefined) cleanRow.name = '';
                if (cleanRow.quantity === undefined) cleanRow.quantity = 0;
                if (cleanRow.perQuantityPrice === undefined) cleanRow.perQuantityPrice = 0;
                if (cleanRow.alertThreshold === undefined) cleanRow.alertThreshold = 20;
                
                return cleanRow;
            })
            .filter(row => row.name && row.name.trim() !== '' && !row.name.toLowerCase().includes('total')); // Remove rows without material names and skip "total" rows
        
        let importedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errors = [];
        
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
                
                // Check for duplicates
                const existingMaterial = await PackingMaterial.findOne({ 
                    name: row.name
                });
                
                if (existingMaterial) {
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
                
                // Create new material
                const material = new PackingMaterial({
                    itemCode: finalItemCode,
                    name: row.name,
                    quantity: row.quantity,
                    availableQty: row.quantity,
                    jobberQty: 0,
                    usedQty: 0,
                    isWithJobber: false,
                    perQuantityPrice: row.perQuantityPrice,
                    stockAlertThreshold: row.alertThreshold || 20, // Use provided value or default
                    unit: row.unit || 'pcs', // Use provided unit or default to 'pcs'
                    date: new Date()
                });
                
                // Add initial stock entry to price history
                const initialHistoryEntry = {
                    date: new Date(),
                    type: 'Existing Stock',
                    supplier: 'Initial Stock (Import)',
                    poNumber: 'N/A',
                    grnNumber: 'N/A',
                    qty: row.quantity,
                    unitPrice: row.perQuantityPrice,
                    total: row.quantity * row.perQuantityPrice
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
 * @desc    Export packing materials to Excel or PDF
 * @route   GET /api/materials/export?format=excel|pdf
 * @access  Private (Admin/Manager)
 */
const exportMaterials = async (req, res) => {
    try {
        const format = req.query.format || 'excel';
        
        // Get all packing materials
        const materials = await PackingMaterial.find({}).sort({ name: 1 });
        
        // Prepare data for export
        const exportData = materials.map(material => ({
            'Item Code': material.itemCode,
            'Material Name': material.name,
            'Quantity': material.quantity,
            'Unit': material.unit || 'pcs',
            'Per Quantity Price (₹)': material.perQuantityPrice,
            'Total Price (₹)': material.quantity * material.perQuantityPrice,
            'Alert Threshold': material.stockAlertThreshold,
            'Date Added': material.createdAt ? material.createdAt.toISOString().split('T')[0] : material.date.toISOString().split('T')[0]
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
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Packing_Materials_Report_${dateStr}.xlsx`);
            
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
    getPackingMaterialStockByName, // Add this new function
    importMaterials,
    exportMaterials
};