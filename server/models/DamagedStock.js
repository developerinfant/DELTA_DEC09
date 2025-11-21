const mongoose = require('mongoose');

const damagedStockSchema = new mongoose.Schema({
    grn_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GRN',
        required: false // Changed from true to false to make it optional
    },
    dc_no: {
        type: String,
        required: true,
        trim: true
    },
    product_name: {
        type: String,
        required: true,
        trim: true
    },
    material_name: {
        type: String,
        required: true,
        trim: true
    },
    received_qty: {
        type: Number,
        required: true,
        min: 0
    },
    damaged_qty: {
        type: Number,
        required: true,
        min: 0
    },
    deducted_from_stock: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    entered_by: {
        type: String,
        required: true,
        trim: true
    },
    entered_on: {
        type: Date,
        default: Date.now
    },
    approved_by: {
        type: String,
        trim: true
    },
    approved_on: {
        type: Date
    },
    remarks: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
damagedStockSchema.index({ grn_id: 1 });
damagedStockSchema.index({ dc_no: 1 });
damagedStockSchema.index({ product_name: 1 });
damagedStockSchema.index({ material_name: 1 });
damagedStockSchema.index({ status: 1 });
damagedStockSchema.index({ entered_on: -1 });

module.exports = mongoose.model('DamagedStock', damagedStockSchema);