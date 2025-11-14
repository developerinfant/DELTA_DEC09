const mongoose = require('mongoose');

const finishedGoodSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    productCode: {
        type: String,
        required: [true, 'Product code is required'],
        trim: true,
    },
    batchNo: {
        type: String,
        required: [true, 'Batch number is required'],
        unique: true,
        trim: true,
    },
    lotNo: {
        type: String,
        trim: true,
    },
    quantityProduced: {
        type: Number,
        required: [true, 'Quantity produced is required'],
        min: [0, 'Quantity cannot be negative'],
    },
    quantityAvailable: {
        type: Number,
        required: [true, 'Available quantity is required'],
        min: [0, 'Available quantity cannot be negative'],
    },
    producedDate: {
        type: Date,
        required: [true, 'Production date is required'],
    },
    jobberName: {
        type: String,
        required: [true, 'Jobber name is required'],
        trim: true,
    },
    workOrderNo: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Available', 'Reserved', 'Dispatched'],
        default: 'Available',
    },
    remarks: {
        type: String,
        trim: true,
    },
    // New fields for pricing and tax
    perUnitPrice: {
        type: Number,
        default: 0,
        min: [0, 'Price cannot be negative'],
    },
    gst: {
        type: Number,
        default: 0,
        min: [0, 'GST cannot be negative'],
    },
    totalValue: {
        type: Number,
        default: 0,
        min: [0, 'Total value cannot be negative'],
    },
    // Add materials used information
    materialsUsed: [{
        materialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },
        materialName: {
            type: String,
            trim: true
        },
        itemCode: {
            type: String,
            trim: true
        },
        quantityUsed: {
            type: Number,
            min: 0
        }
    }]
}, {
    timestamps: true,
});

// Middleware to calculate total value before saving
finishedGoodSchema.pre('save', function(next) {
    // Calculate total value = quantityAvailable * perUnitPrice
    this.totalValue = this.quantityAvailable * this.perUnitPrice;
    next();
});

module.exports = mongoose.model('FinishedGood', finishedGoodSchema);