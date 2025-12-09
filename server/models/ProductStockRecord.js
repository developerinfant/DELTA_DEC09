const mongoose = require('mongoose');

const productStockRecordSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductStock',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    openingStock: {
        type: Number,
        required: true,
        default: 0
    },
    closingStock: {
        type: Number,
        required: true,
        default: 0
    },
    inward: {
        type: Number,
        required: true,
        default: 0
    },
    outward: {
        type: Number,
        required: true,
        default: 0
    },
    outwardCartons: {
        type: Number,
        required: true,
        default: 0
    },
    outwardPieces: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        required: false,
        default: 'cartons'
    }
}, {
    timestamps: true
});

// Add compound index for efficient querying
productStockRecordSchema.index({ product: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ProductStockRecord', productStockRecordSchema);