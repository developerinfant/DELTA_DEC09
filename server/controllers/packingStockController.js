const GRN = require('../models/GRN');
const OutgoingRecord = require('../models/OutgoingRecord');
const PackingMaterial = require('../models/PackingMaterial');
const PackingMaterialStockRecord = require('../models/PackingMaterialStockRecord');

// Get Detailed Stock Report
exports.getDetailedStockReport = async (req, res) => {
    try {
        const { startDate, endDate, openingTime, closingTime } = req.query;

        // 1. Set up Date Objects based on user configuration
        // Default to 00:00 and 23:59 if times are not provided
        const startDateTime = new Date(`${startDate}T${openingTime || '00:00'}:00.000Z`);
        const endDateTime = new Date(`${endDate}T${closingTime || '23:59'}:59.999Z`);

        // 2. Fetch all packing materials
        const materials = await PackingMaterial.find({}).lean();

        // 3. Process each material to calculate stock values
        const reportData = await Promise.all(materials.map(async (material) => {
            
            // --- A. Calculate Opening Stock ---
            // Find the most recent stock snapshot taken BEFORE the start date/time
            const previousStockRecord = await PackingMaterialStockRecord.findOne({
                material: material._id,
                date: { $lt: startDateTime }
            }).sort({ date: -1 });

            // If a record exists, use its closing stock as our opening. 
            // Otherwise, fall back to the material's master opening stock.
            let calculatedOpeningStock = previousStockRecord ? previousStockRecord.closingStock : (material.openingStock || 0);

            // --- B. Calculate Inward (GRNs) ---
            // Sum of all GRNs strictly within the selected Date & Time range
            const inwardAgg = await GRN.aggregate([
                {
                    $match: {
                        'items.material': material._id,
                        date: { $gte: startDateTime, $lte: endDateTime },
                        status: { $nin: ['Draft', 'Cancelled'] } // Count all GRNs except Draft or Cancelled
                    }
                },
                { $unwind: '$items' },
                { $match: { 'items.material': material._id } },
                { $group: { _id: null, total: { $sum: { $add: ['$items.receivedQuantity', { $ifNull: ['$items.extraReceivedQty', 0] }] } } }
 }
            ]);
            const inward = inwardAgg.length > 0 ? inwardAgg[0].total : 0;

            // --- C. Calculate Outward (Usage/DC) ---
            // Sum of all Outgoing Records strictly within the selected Date & Time range
            const outwardAgg = await OutgoingRecord.aggregate([
                {
                    $match: {
                        material: material._id,
                        date: { $gte: startDateTime, $lte: endDateTime }
                    }
                },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            const outward = outwardAgg.length > 0 ? outwardAgg[0].total : 0;

            // --- D. Calculate Closing Stock ---
            // As per user request: Closing Stock = pmStoreCount (material.quantity)
            const closingStock = material.quantity || 0;

            return {
                _id: material._id,
                name: material.name,
                unit: material.unit,
                openingStock: calculatedOpeningStock,
                inward: inward,
                outward: outward,
                closingStock: closingStock
            };
        }));

        res.status(200).json({ success: true, data: reportData });

    } catch (error) {
        console.error('Error generating stock report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};