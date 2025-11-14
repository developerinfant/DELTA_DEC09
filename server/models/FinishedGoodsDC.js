const mongoose = require('mongoose');

const finishedGoodsDCSchema = new mongoose.Schema({
    dc_no: {
        type: String,
        required: [true, 'Delivery challan number is required'],
        unique: true,
        trim: true,
    },
    dispatch_type: {
        type: String,
        required: [true, 'Dispatch type is required'],
        enum: ['Free Sample', 'Courier', 'E-Commerce', 'Sales'],
    },
    receiver_type: {
        type: String,
        required: true,
        enum: ['Customer', 'Dealer', 'E-Commerce Platform', 'Internal Transfer'],
    },
    receiver_name: {
        type: String,
        trim: true,
    },
    receiver_details: {
        type: String,
        trim: true,
    },
    product_name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    // New fields for carton/piece tracking
    issue_type: {
        type: String,
        required: [true, 'Issue type is required'],
        enum: ['Carton', 'Pieces', 'Both'],
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
    },
    // For "Both" issue type, we need to track cartons and pieces separately
    carton_quantity: {
        type: Number,
        default: 0,
        min: [0, 'Carton quantity cannot be negative'],
    },
    piece_quantity: {
        type: Number,
        default: 0,
        min: [0, 'Piece quantity cannot be negative'],
    },
    units_per_carton: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Units per carton must be at least 1'],
    },
    available_cartons: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Available cartons cannot be negative'],
    },
    available_pieces: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Available pieces cannot be negative'],
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
    },
    remarks: {
        type: String,
        trim: true,
    },
    created_by: {
        type: String,
        required: [true, 'Created by is required'],
        trim: true,
    },
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Dispatched', 'Cancelled'],
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
    completed_date: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true,
});

// Add indexes for better query performance
finishedGoodsDCSchema.index({ product_name: 1 });
finishedGoodsDCSchema.index({ dispatch_type: 1 });
finishedGoodsDCSchema.index({ status: 1 });
finishedGoodsDCSchema.index({ dc_no: 1 });
finishedGoodsDCSchema.index({ receiver_name: 1 });

module.exports = mongoose.model('FinishedGoodsDC', finishedGoodsDCSchema);