const mongoose = require('mongoose');
const FinishedGood = require('../models/FinishedGood');
const ProductionRecord = require('../models/ProductionRecord');
const RawMaterial = require('../models/RawMaterial');
const PackingMaterial = require('../models/PackingMaterial');

// Helper function to generate batch number
const generateBatchNo = async (productCode) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the last batch number for this product code and date
    const lastBatch = await FinishedGood.findOne({
        batchNo: new RegExp(`^${productCode}-${year}${month}${day}-`)
    }).sort({ createdAt: -1 });
    
    let sequence = 1;
    if (lastBatch) {
        const lastSequence = parseInt(lastBatch.batchNo.split('-')[3], 10);
        sequence = lastSequence + 1;
    }
    
    return `${productCode}-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
};

/**
 * @desc    Create a new Finished Good entry
 * @route   POST /api/products/finished-goods
 * @access  Private
 */
const createFinishedGood = async (req, res) => {
    const {
        productName,
        productCode,
        quantityProduced,
        producedDate,
        jobberName,
        workOrderNo,
        remarks,
        rawMaterialsConsumed,
        packingMaterialsConsumed
    } = req.body;

    try {
        // Generate batch number
        const batchNo = await generateBatchNo(productCode);
        
        // Create finished good entry
        const finishedGood = new FinishedGood({
            productName,
            productCode,
            batchNo,
            quantityProduced,
            quantityAvailable: quantityProduced,
            producedDate,
            jobberName,
            workOrderNo,
            remarks
        });

        const createdFinishedGood = await finishedGood.save();

        // Create production record
        const productionRecord = new ProductionRecord({
            jobberName,
            workOrderNo,
            productName,
            productCode,
            batchNo,
            quantityProduced,
            producedDate,
            rawMaterialsConsumed,
            packingMaterialsConsumed,
            remarks,
            finishedGood: createdFinishedGood._id
        });

        const createdProductionRecord = await productionRecord.save();

        // Update raw material quantities
        if (rawMaterialsConsumed && rawMaterialsConsumed.length > 0) {
            for (const item of rawMaterialsConsumed) {
                await RawMaterial.findByIdAndUpdate(
                    item.material,
                    { $inc: { quantity: -item.quantityUsed } },
                    { new: true }
                );
            }
        }

        // Update packing material quantities
        if (packingMaterialsConsumed && packingMaterialsConsumed.length > 0) {
            for (const item of packingMaterialsConsumed) {
                await PackingMaterial.findByIdAndUpdate(
                    item.material,
                    { $inc: { quantity: -item.quantityUsed } },
                    { new: true }
                );
            }
        }

        res.status(201).json({
            finishedGood: createdFinishedGood,
            productionRecord: createdProductionRecord
        });
    } catch (error) {
        console.error(`Error creating finished good: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating finished good' });
    }
};

/**
 * @desc    Get all Finished Goods
 * @route   GET /api/products/finished-goods
 * @access  Private
 */
const getFinishedGoods = async (req, res) => {
    try {
        const { product, jobber, startDate, endDate } = req.query;
        
        let filter = {};
        
        if (product) {
            filter.productName = { $regex: product, $options: 'i' };
        }
        
        if (jobber) {
            filter.jobberName = { $regex: jobber, $options: 'i' };
        }
        
        if (startDate || endDate) {
            filter.producedDate = {};
            if (startDate) {
                filter.producedDate.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.producedDate.$lte = new Date(endDate);
            }
        }
        
        const finishedGoods = await FinishedGood.find(filter).sort({ createdAt: -1 });
        res.json(finishedGoods);
    } catch (error) {
        console.error(`Error fetching finished goods: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching finished goods' });
    }
};

/**
 * @desc    Update finished good pricing and tax details
 * @route   PATCH /api/products/finished-goods/:id
 * @access  Private
 */
const updateFinishedGoodPricing = async (req, res) => {
    const { id } = req.params;
    const { perUnitPrice, gst, remarks } = req.body;

    try {
        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid finished good ID' });
        }

        // Find the finished good
        const finishedGood = await FinishedGood.findById(id);
        if (!finishedGood) {
            return res.status(404).json({ message: 'Finished good not found' });
        }

        // Update fields
        if (perUnitPrice !== undefined) {
            finishedGood.perUnitPrice = Number(perUnitPrice);
        }
        if (gst !== undefined) {
            finishedGood.gst = Number(gst);
        }
        if (remarks !== undefined) {
            finishedGood.remarks = remarks;
        }

        // Save the updated finished good
        const updatedFinishedGood = await finishedGood.save();

        res.json({
            message: 'Finished good updated successfully',
            finishedGood: updatedFinishedGood
        });
    } catch (error) {
        console.error(`Error updating finished good: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating finished good' });
    }
};

/**
 * @desc    Get all Production Records
 * @route   GET /api/products/production-records
 * @access  Private
 */
const getProductionRecords = async (req, res) => {
    try {
        const { product, jobber, startDate, endDate } = req.query;
        
        let filter = {};
        
        if (product) {
            filter.productName = { $regex: product, $options: 'i' };
        }
        
        if (jobber) {
            filter.jobberName = { $regex: jobber, $options: 'i' };
        }
        
        if (startDate || endDate) {
            filter.producedDate = {};
            if (startDate) {
                filter.producedDate.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.producedDate.$lte = new Date(endDate);
            }
        }
        
        const productionRecords = await ProductionRecord.find(filter)
            .populate('rawMaterialsConsumed.material')
            .populate('packingMaterialsConsumed.material')
            .sort({ createdAt: -1 });
        res.json(productionRecords);
    } catch (error) {
        console.error(`Error fetching production records: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching production records' });
    }
};

/**
 * @desc    Get jobber productivity report
 * @route   GET /api/products/reports/jobber-productivity
 * @access  Private
 */
const getJobberProductivityReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.producedDate = {};
            if (startDate) {
                dateFilter.producedDate.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.producedDate.$lte = new Date(endDate);
            }
        }
        
        const report = await ProductionRecord.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$jobberName",
                    totalProduced: { $sum: "$quantityProduced" },
                    productionCount: { $sum: 1 },
                    products: { $addToSet: "$productName" }
                }
            },
            {
                $project: {
                    jobberName: "$_id",
                    totalProduced: 1,
                    productionCount: 1,
                    products: 1,
                    _id: 0
                }
            }
        ]);
        
        res.json(report);
    } catch (error) {
        console.error(`Error generating jobber productivity report: ${error.message}`);
        res.status(500).json({ message: 'Server error while generating jobber productivity report' });
    }
};

/**
 * @desc    Get daily production report
 * @route   GET /api/products/reports/daily-production
 * @access  Private
 */
const getDailyProductionReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.producedDate = {};
            if (startDate) {
                dateFilter.producedDate.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.producedDate.$lte = new Date(endDate);
            }
        }
        
        const report = await ProductionRecord.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$producedDate" }
                    },
                    totalProduced: { $sum: "$quantityProduced" },
                    productionCount: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $project: {
                    date: "$_id",
                    totalProduced: 1,
                    productionCount: 1,
                    _id: 0
                }
            }
        ]);
        
        res.json(report);
    } catch (error) {
        console.error(`Error generating daily production report: ${error.message}`);
        res.status(500).json({ message: 'Server error while generating daily production report' });
    }
};

/**
 * @desc    Get product-wise FG report
 * @route   GET /api/products/reports/product-wise
 * @access  Private
 */
const getProductWiseReport = async (req, res) => {
    try {
        const report = await FinishedGood.aggregate([
            {
                $group: {
                    _id: "$productName",
                    totalAvailable: { $sum: "$quantityAvailable" },
                    totalProduced: { $sum: "$quantityProduced" },
                    batchCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    productName: "$_id",
                    totalAvailable: 1,
                    totalProduced: 1,
                    batchCount: 1,
                    _id: 0
                }
            }
        ]);
        
        res.json(report);
    } catch (error) {
        console.error(`Error generating product-wise report: ${error.message}`);
        res.status(500).json({ message: 'Server error while generating product-wise report' });
    }
};

module.exports = {
    createFinishedGood,
    getFinishedGoods,
    updateFinishedGoodPricing,
    getProductionRecords,
    getJobberProductivityReport,
    getDailyProductionReport,
    getProductWiseReport
};