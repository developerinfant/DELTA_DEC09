const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        unique: true,
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductStock',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    requiredQty: {
        type: Number,
        required: true,
        min: 1
    },
    requester: {
        type: String, // User ID or name
        required: true
    },
    remarks: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to update the updatedAt field before saving
materialRequestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);