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
        enum: ['Existing Stock', 'New GRN', 'New Average Price', 'New Average Price (Updated)', 'DC-OUT']
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

// 1. Define the Packing Material Schema
const packingMaterialSchema = new mongoose.Schema({
    itemCode: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Material name is required'],
        unique: true, // Ensures no two materials have the same name
        trim: true,   // Removes any leading or trailing whitespace from the name
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        default: 0, // Sets a default value of 0 if none is provided
        min: [0, 'Quantity cannot be negative'], // Ensures stock cannot go below zero
    },
    // New fields for jobber stock management
    availableQty: {
        type: Number,
        required: [true, 'Available quantity is required'],
        default: 0,
        min: [0, 'Available quantity cannot be negative'],
    },
    jobberQty: {
        type: Number,
        required: [true, 'Jobber quantity is required'],
        default: 0,
        min: [0, 'Jobber quantity cannot be negative'],
    },
    usedQty: {
        type: Number,
        required: [true, 'Used quantity is required'],
        default: 0,
        min: [0, 'Used quantity cannot be negative'],
    },
    isWithJobber: {
        type: Boolean,
        default: false,
    },
    perQuantityPrice: {
        type: Number,
        required: [true, 'Per quantity price is required'],
        min: [0, 'Per quantity price cannot be negative'],
    },
    unit: {
        type: String,
        required: false,
        trim: true,
        default: 'pcs'
    },
    stockAlertThreshold: {
        type: Number,
        required: [true, 'Stock alert threshold is required'],
        default: 0,
        min: [0, 'Threshold cannot be negative'],
    },
    // HSN Code field
    hsnCode: {
        type: String,
        required: false,
        trim: true,
        default: ''
    },
    // Brand Type field for Own Brand / Other Brand distinction
    brandType: {
        type: String,
        required: false,
        enum: ['own', 'other'],
        default: 'own'
    },
    shop: {
        type: String,
        required: false, // Changed from true to false to make it optional
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now
    },
    priceHistory: [priceHistorySchema]
}, {
    // 2. Options: Automatically add 'createdAt' and 'updatedAt' fields
    timestamps: true,
});

// 3. Create and Export the Model
// Mongoose will create a collection named 'packingmaterials' in the database based on this model.
module.exports = mongoose.model('PackingMaterial', packingMaterialSchema);