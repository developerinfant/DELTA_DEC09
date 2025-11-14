const mongoose = require('mongoose');

// Define the price history sub-schema
const priceHistorySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    type: {
        type: String,
        required: true,
        enum: ['Existing Stock', 'New GRN', 'New Average Price']
    },
    supplier: {
        type: String,
        required: false
    },
    poNumber: {
        type: String,
        required: false
    },
    grnNumber: {
        type: String,
        required: false
    },
    qty: {
        type: Number,
        required: false
    },
    unitPrice: {
        type: Number,
        required: false
    },
    total: {
        type: Number,
        required: false
    },
    // Fields for backward compatibility with existing entries
    oldQty: {
        type: Number,
        required: false
    },
    oldPrice: {
        type: Number,
        required: false
    },
    newQty: {
        type: Number,
        required: false
    },
    newPrice: {
        type: Number,
        required: false
    },
    newAveragePrice: {
        type: Number,
        required: false
    },
    totalValue: {
        type: Number,
        required: false
    }
});

const rawMaterialSchema = new mongoose.Schema({
    itemCode: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Raw material name is required'],
        unique: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        default: 0,
        min: [0, 'Quantity cannot be negative'],
    },
    perQuantityPrice: {
        type: Number,
        required: [true, 'Per quantity price is required'],
        min: [0, 'Per quantity price cannot be negative'],
    },
    stockAlertThreshold: {
        type: Number,
        required: [true, 'Stock alert threshold is required'],
        default: 0,
        min: [0, 'Threshold cannot be negative'],
    },
    shop: {
        type: String,
        required: false, // Changed from true to false to make it optional
        trim: true,
    },
    priceHistory: [priceHistorySchema]
}, {
    timestamps: true,
});

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);