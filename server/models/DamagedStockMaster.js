const mongoose = require('mongoose');

const damagedStockMasterSchema = new mongoose.Schema({
    itemCode: {
        type: String,
        required: true,
        trim: true
    },
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    totalDamagedQty: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    lastDamagedQty: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    lastApprovedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    brand: {
        type: String,
        required: false,
        trim: true
    },
    unit: {
        type: String,
        required: false,
        trim: true
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
damagedStockMasterSchema.index({ itemCode: 1 });
damagedStockMasterSchema.index({ materialName: 1 });
damagedStockMasterSchema.index({ totalDamagedQty: -1 });
damagedStockMasterSchema.index({ lastApprovedDate: -1 });

module.exports = mongoose.model('DamagedStockMaster', damagedStockMasterSchema);