const mongoose = require('mongoose');

const productStockSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        unique: true
    },
    // Add the new itemCode field
    itemCode: {
        type: String,
        required: false, // Will be generated automatically
        unique: true,
        sparse: true // Allows null values while maintaining uniqueness for non-null values
    },
    // Existing carton-based stock tracking
    ownUnitStock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    jobberStock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    totalAvailable: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    // New carton + piece tracking fields
    available_cartons: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Cartons cannot be negative']
    },
    available_pieces: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Pieces cannot be negative']
    },
    broken_carton_pieces: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Broken carton pieces cannot be negative']
    },
    units_per_carton: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Units per carton must be at least 1']
    },
    alertThreshold: {
        type: Number,
        required: true,
        default: 10,
        min: [0, 'Alert threshold cannot be negative']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    lastUpdatedFrom: {
        type: String,
        enum: ['Own Unit', 'Jobber'],
        default: null
    },
    lastProductionDetails: {
        unitType: {
            type: String,
            enum: ['Own Unit', 'Jobber'],
            default: null
        },
        cartonQty: {
            type: Number,
            default: 0
        },
        date: {
            type: Date,
            default: null
        }
    },
    // Track history of stock updates
    stockHistory: [{
        date: {
            type: Date,
            required: true
        },
        unitType: {
            type: String,
            required: true,
            enum: ['Own Unit', 'Jobber']
        },
        cartonQty: {
            type: Number,
            required: true
        },
        action: {
            type: String,
            required: true,
            enum: ['ADD', 'TRANSFER', 'ADJUST']
        },
        updatedBy: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
});

// Middleware to calculate total available stock before saving
productStockSchema.pre('save', function(next) {
    // Calculate total available based on carton + piece logic
    // Include broken carton pieces in the total available calculation
    this.totalAvailable = (this.available_cartons * this.units_per_carton) + this.available_pieces + this.broken_carton_pieces;
    this.lastUpdated = new Date(); // Update lastUpdated timestamp on every save
    next();
});

module.exports = mongoose.model('ProductStock', productStockSchema);