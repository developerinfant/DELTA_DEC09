const mongoose = require('mongoose');

// This sub-schema defines the structure for each item within a purchase order.
const poItemSchema = new mongoose.Schema({
    material: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // 'refPath' allows this to dynamically refer to either 'PackingMaterial' or 'RawMaterial'
        refPath: 'items.materialModel'
    },
    materialModel: {
        type: String,
        required: true,
        enum: ['PackingMaterial', 'RawMaterial']
    },
    itemCode: {
        type: String,
        trim: true,
    },
    hsn: {
        type: String,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
    },
    uom: {
        type: String,
        trim: true,
    },
    rate: {
        type: Number,
        required: true,
    },
    discountPercent: {
        type: Number,
        default: 0,
    },
    gstPercent: {
        type: Number,
        default: 0,
    },
    cgst: {
        type: Number,
        default: 0,
    },
    sgst: {
        type: Number,
        default: 0,
    },
    lineTotal: {
        type: Number,
        required: true,
    },
    quantityReceived: {
        type: Number,
        default: 0,
    }
});

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true,
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Supplier',
    },
    supplierGSTIN: {
        type: String,
        trim: true,
    },
    supplierAddress: {
        type: String,
        trim: true,
    },
    supplierPhone: {
        type: String,
        trim: true,
    },
    supplierEmail: {
        type: String,
        trim: true,
    },
    dispatchFrom: {
        type: String,
        trim: true,
    },
    destination: {
        type: String,
        trim: true,
    },

    vehicleNo: {
        type: String,
        trim: true,
    },
    noOfPacks: {
        type: Number,
    },
    transport: {
        type: String,
        trim: true,
    },
    salesman: {
        type: String,
        trim: true,
    },
    dcNo: {
        type: String,
        trim: true,
    },
    dcDate: {
        type: Date,
    },
    deliveryTerms: {
        type: String,
        trim: true,
    },
    items: [poItemSchema],
    taxableAmount: {
        type: Number,
        default: 0,
    },
    totalCGST: {
        type: Number,
        default: 0,
    },
    totalSGST: {
        type: Number,
        default: 0,
    },
    grandTotal: {
        type: Number,
        default: 0,
    },
    roundOff: {
        type: Number,
        default: 0,
    },
    amountInWords: {
        type: String,
        trim: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Ordered', 'Partially Received', 'Completed', 'Cancelled'],
        default: 'Pending',
    },
    expectedDeliveryDate: {
        type: Date,
    },
    paymentTerms: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedByName: {
        type: String,
        trim: true,
    },
    preparedBy: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);