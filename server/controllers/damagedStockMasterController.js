const DamagedStockMaster = require('../models/DamagedStockMaster');
const DamagedStock = require('../models/DamagedStock');
const mongoose = require('mongoose');

/**
 * @desc    Get all damaged stock master entries
 * @route   GET /api/damaged-stock-master
 * @access  Private
 */
const getDamagedStockMasterEntries = async (req, res) => {
    try {
        // Build query filter
        const filter = {};
        
        // Apply filters if provided
        if (req.query.search) {
            filter.$or = [
                { itemCode: { $regex: req.query.search, $options: 'i' } },
                { materialName: { $regex: req.query.search, $options: 'i' } },
                { brand: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        if (req.query.brand) {
            filter.brand = req.query.brand;
        }
        
        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.lastApprovedDate = {};
            if (req.query.startDate) {
                filter.lastApprovedDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.lastApprovedDate.$lte = new Date(req.query.endDate);
            }
        }
        
        // Get all damaged stock master entries without pagination
        const damagedStockMasterEntries = await DamagedStockMaster.find(filter)
            .sort({ lastApprovedDate: -1 })
            .lean();
        
        res.json({
            data: damagedStockMasterEntries
        });
    } catch (error) {
        console.error(`Error fetching damaged stock master entries: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock master entries.' });
    }
};

/**
 * @desc    Get a single damaged stock master entry by ID
 * @route   GET /api/damaged-stock-master/:id
 * @access  Private
 */
const getDamagedStockMasterById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid damaged stock master ID.' });
        }
        
        const damagedStockMaster = await DamagedStockMaster.findById(id);
        
        if (!damagedStockMaster) {
            return res.status(404).json({ message: 'Damaged stock master entry not found.' });
        }
        
        res.json(damagedStockMaster);
    } catch (error) {
        console.error(`Error fetching damaged stock master entry: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock master entry.' });
    }
};

/**
 * @desc    Get damaged stock history for a specific material
 * @route   GET /api/damaged-stock-master/:id/history
 * @access  Private
 */
const getDamagedStockHistory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid damaged stock master ID.' });
        }
        
        // Find the master record to get the material name
        const masterRecord = await DamagedStockMaster.findById(id);
        if (!masterRecord) {
            return res.status(404).json({ message: 'Damaged stock master entry not found.' });
        }
        
        // Find all damaged stock entries for this material
        const historyEntries = await DamagedStock.find({ 
            material_name: masterRecord.materialName 
        }).sort({ entered_on: -1 });
        
        res.json(historyEntries);
    } catch (error) {
        console.error(`Error fetching damaged stock history: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock history.' });
    }
};

/**
 * @desc    Get damaged stock history by material name
 * @route   GET /api/damaged-stock-master/history/:materialName
 * @access  Private
 */
const getDamagedStockHistoryByMaterial = async (req, res) => {
    try {
        const { materialName } = req.params;
        
        if (!materialName) {
            return res.status(400).json({ message: 'Material name is required.' });
        }
        
        // Find all damaged stock entries for this material
        const historyEntries = await DamagedStock.find({ 
            material_name: materialName 
        }).sort({ entered_on: -1 });
        
        res.json(historyEntries);
    } catch (error) {
        console.error(`Error fetching damaged stock history: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching damaged stock history.' });
    }
};

module.exports = {
    getDamagedStockMasterEntries,
    getDamagedStockMasterById,
    getDamagedStockHistory,
    getDamagedStockHistoryByMaterial
};