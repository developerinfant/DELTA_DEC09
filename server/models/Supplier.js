const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Supplier name is required'],
        unique: true,
        trim: true,
    },
    supplierCode: {
        type: String,
        unique: true,
        required: true,
    },
    supplierType: {
        type: String,
        enum: [
            'Packing Material Purchase Order',
            'Raw Material Purchase Order',
            'Both (Packing + Raw) PO',
            'Jobber Packing Material',
            'Jobber Raw Material',
            'Both Jobber (Packing + Raw)',
            'All (Global)'
        ],
        required: true,
    },
    contactPerson: {
        type: String,
        required: [true, 'Contact person is required'],
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
    },
    gstin: {
        type: String,
        trim: true,
    },
    panNumber: {
        type: String,
        trim: true,
    },
    businessCategory: {
        type: String,
        trim: true,
    },
    state: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    bankName: {
        type: String,
        trim: true,
    },
    branch: {
        type: String,
        trim: true,
    },
    accountNumber: {
        type: String,
        trim: true,
    },
    ifscCode: {
        type: String,
        trim: true,
    },
    upiId: {
        type: String,
        trim: true,
    },
    paymentTerms: {
        type: String,
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    materialType: {
        type: String,
        enum: ['packing', 'raw', 'both'],
        required: false
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Supplier', supplierSchema);