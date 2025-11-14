const mongoose = require('mongoose');

const productionRecordSchema = new mongoose.Schema({
    jobberName: {
        type: String,
        required: [true, 'Jobber name is required'],
        trim: true,
    },
    workOrderNo: {
        type: String,
        required: [true, 'Work order number is required'],
        trim: true,
    },
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
    producedDate: {
        type: Date,
        required: [true, 'Production date is required'],
    },
    rawMaterialsConsumed: [
        {
            material: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'RawMaterial',
                required: true,
            },
            materialName: {
                type: String,
                required: true,
            },
            quantityUsed: {
                type: Number,
                required: true,
                min: [0, 'Quantity used cannot be negative'],
            },
        }
    ],
    packingMaterialsConsumed: [
        {
            material: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PackingMaterial',
                required: true,
            },
            materialName: {
                type: String,
                required: true,
            },
            quantityUsed: {
                type: Number,
                required: true,
                min: [0, 'Quantity used cannot be negative'],
            },
        }
    ],
    remarks: {
        type: String,
        trim: true,
    },
    finishedGood: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinishedGood',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('ProductionRecord', productionRecordSchema);