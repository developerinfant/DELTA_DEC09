const mongoose = require('mongoose');

const productDCSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: [true, 'Invoice number is required'],
        unique: true,
        trim: true,
    },
    invoiceDate: {
        type: Date,
        required: [true, 'Invoice date is required'],
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },
    customerAddress: {
        type: String,
        required: [true, 'Customer address is required'],
        trim: true,
    },
    customerGST: {
        type: String,
        trim: true,
    },
    contactNo: {
        type: String,
        trim: true,
    },
    transport: {
        type: String,
        trim: true,
    },
    vehicleNo: {
        type: String,
        trim: true,
    },
    destination: {
        type: String,
        trim: true,
    },
    paymentTerms: {
        type: String,
        trim: true,
    },
    items: [{
        productCode: {
            type: String,
            required: true,
            trim: true,
        },
        productName: {
            type: String,
            required: true,
            trim: true,
        },
        qty: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
        },
        rate: {
            type: Number,
            required: true,
            min: [0, 'Rate cannot be negative'],
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
        },
        gst: {
            type: Number,
            default: 0,
            min: [0, 'GST cannot be negative'],
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Amount cannot be negative'],
        }
    }],
    totalTaxable: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Total taxable cannot be negative'],
    },
    totalGST: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Total GST cannot be negative'],
    },
    grandTotal: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Grand total cannot be negative'],
    },
    remarks: {
        type: String,
        trim: true,
    },
    generatedBy: {
        type: String,
        trim: true,
    },
    // Reference to the finished goods that were dispatched
    dispatchedItems: [{
        finishedGood: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FinishedGood',
            required: true,
        },
        qtySent: {
            type: Number,
            required: true,
            min: [1, 'Quantity sent must be at least 1'],
        }
    }]
}, {
    timestamps: true,
});

module.exports = mongoose.model('ProductDC', productDCSchema);