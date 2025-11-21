const mongoose = require('mongoose');
const PackingMaterial = require('../models/PackingMaterial');
const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const ProductStock = require('../models/ProductStock');
const FinishedGoodsDC = require('../models/FinishedGoodsDC');
const FGInvoice = require('../models/FGInvoice');

/**
 * @desc    Get packing materials summary data
 * @route   GET /api/dashboard/packing-summary
 * @access  Private
 */
const getPackingSummary = async (req, res) => {
    try {
        // (A) Active SKUs - Count all packing material items
        const activeSKUs = await PackingMaterial.countDocuments({
            category: "Packing Materials"
        });

        // (B) Total Stock (PM Store) - Sum stock_qty of all materials (only Own Brand)
        const totalStockResult = await PackingMaterial.aggregate([
            { $match: { brandType: "own" } },
            { $group: { _id: null, totalStock: { $sum: "$quantity" } } }
        ]);
        const totalStock = totalStockResult.length > 0 ? totalStockResult[0].totalStock : 0;

        // (C) Stock Alerts - Count items where stock_qty <= stock_alert
        const stockAlerts = await PackingMaterial.countDocuments({
            $expr: { $lte: ["$quantity", "$stockAlertThreshold"] }
        });

        // (D) Total GRNs Created This Month - Count GRNs created in current month (PO-based)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        const totalGRNsThisMonth = await GRN.countDocuments({
            sourceType: "purchase_order",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        res.json({
            activeSKUs,
            totalStock,
            stockAlerts,
            totalGRNsThisMonth
        });
    } catch (error) {
        console.error(`Error fetching packing summary: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching packing summary' });
    }
};

/**
 * @desc    Get finished goods summary data
 * @route   GET /api/dashboard/finished-summary
 * @access  Private
 */
const getFinishedSummary = async (req, res) => {
    try {
        // (A) Active FG Products - Count FG item master products
        const activeFGProducts = await ProductStock.countDocuments({});

        // (B) Total FG Stock - Sum finished goods stock across all units
        const totalStockResult = await ProductStock.aggregate([
            { $group: { _id: null, totalStock: { $sum: "$totalAvailable" } } }
        ]);
        const totalFGStock = totalStockResult.length > 0 ? totalStockResult[0].totalStock : 0;

        // (C) Active Orders - Count all ongoing FG jobs where status != completed
        const activeOrders = await FinishedGoodsDC.countDocuments({
            status: { $ne: "Completed" }
        });

        // (D) Monthly Revenue - Sum of FG invoice amounts for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        const monthlyRevenueResult = await FGInvoice.aggregate([
            { 
                $match: { 
                    invoiceDate: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $ne: "Cancelled" }
                } 
            },
            { $group: { _id: null, totalRevenue: { $sum: "$grandTotal" } } }
        ]);
        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].totalRevenue : 0;

        res.json({
            activeFGProducts,
            totalFGStock,
            activeOrders,
            monthlyRevenue
        });
    } catch (error) {
        console.error(`Error fetching finished summary: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching finished summary' });
    }
};

/**
 * @desc    Get GRN analytics for last 7 days
 * @route   GET /api/dashboard/grn-analytics
 * @access  Private
 */
const getGRNAnalytics = async (req, res) => {
    try {
        // Get the date 7 days ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);

        // Get all PO-based GRNs from the last week
        const grns = await GRN.find({
            sourceType: 'purchase_order',
            createdAt: { $gte: oneWeekAgo }
        }).select('createdAt status');

        // Initialize data structure for each day of the week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const stats = {};

        // Initialize each day with default values
        for (let i = 0; i < 7; i++) {
            const date = new Date(oneWeekAgo);
            date.setDate(date.getDate() + i);
            const dayName = days[date.getDay()];
            const dateString = date.toISOString().split('T')[0];
            stats[dateString] = {
                date: dateString,
                pending: 0,
                completed: 0
            };
        }

        // Process GRNs and populate stats
        grns.forEach(grn => {
            const dateString = grn.createdAt.toISOString().split('T')[0];
            if (stats[dateString]) {
                if (grn.status === 'Completed' || grn.status === 'Normal Completed' || grn.status === 'Extra Completed') {
                    stats[dateString].completed += 1;
                } else {
                    stats[dateString].pending += 1;
                }
            }
        });

        // Convert to array and sort by date
        const result = Object.values(stats).sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(result);
    } catch (error) {
        console.error(`Error fetching GRN analytics: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching GRN analytics' });
    }
};

/**
 * @desc    Get Purchase Orders stats for last 7 days
 * @route   GET /api/dashboard/po-stats
 * @access  Private
 */
const getPOStats = async (req, res) => {
    try {
        // Get the date 7 days ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);

        // Get all POs from the last week
        const pos = await PurchaseOrder.find({
            createdAt: { $gte: oneWeekAgo }
        }).select('createdAt status');

        // Initialize data structure for each day of the week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const stats = {};

        // Initialize each day with default values
        for (let i = 0; i < 7; i++) {
            const date = new Date(oneWeekAgo);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            stats[dateString] = {
                date: dateString,
                created: 0,
                approved: 0,
                pending: 0
            };
        }

        // Process POs and populate stats
        pos.forEach(po => {
            const dateString = po.createdAt.toISOString().split('T')[0];
            if (stats[dateString]) {
                stats[dateString].created += 1;
                if (po.status === 'Approved') {
                    stats[dateString].approved += 1;
                } else if (po.status === 'Pending' || po.status === 'Ordered') {
                    stats[dateString].pending += 1;
                }
            }
        });

        // Convert to array and sort by date
        const result = Object.values(stats).sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(result);
    } catch (error) {
        console.error(`Error fetching PO stats: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching PO stats' });
    }
};

/**
 * @desc    Get Stock Distribution data
 * @route   GET /api/dashboard/stock-distribution
 * @access  Private
 */
const getStockDistribution = async (req, res) => {
    try {
        // Get total stock for Packing Materials
        const packingStockResult = await PackingMaterial.aggregate([
            { $group: { _id: null, totalStock: { $sum: "$quantity" } } }
        ]);
        const packingStock = packingStockResult.length > 0 ? packingStockResult[0].totalStock : 0;

        // Get total stock for Raw Materials
        const rawStockResult = await PackingMaterial.aggregate([
            { $group: { _id: null, totalStock: { $sum: "$quantity" } } }
        ]);
        const rawStock = rawStockResult.length > 0 ? rawStockResult[0].totalStock : 0;

        res.json([
            { name: "Packing Materials", value: packingStock },
            { name: "Raw Materials", value: rawStock }
        ]);
    } catch (error) {
        console.error(`Error fetching stock distribution: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching stock distribution' });
    }
};

/**
 * @desc    Get Real-Time Stock Alerts (top 5 lowest stock items)
 * @route   GET /api/dashboard/stock-alerts
 * @access  Private
 */
const getStockAlerts = async (req, res) => {
    try {
        // Get the top 5 lowest stock items
        const lowStockItems = await PackingMaterial.find({
            $expr: { $lte: ["$quantity", "$stockAlertThreshold"] }
        })
        .select('itemCode name quantity stockAlertThreshold updatedAt')
        .sort({ quantity: 1 })
        .limit(5);

        res.json(lowStockItems);
    } catch (error) {
        console.error(`Error fetching stock alerts: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching stock alerts' });
    }
};

module.exports = {
    getPackingSummary,
    getFinishedSummary,
    getGRNAnalytics,
    getPOStats,
    getStockDistribution,
    getStockAlerts
};