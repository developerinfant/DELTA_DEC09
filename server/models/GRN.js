const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
    material: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        // For PO-based GRNs, this will be an ObjectId referencing PackingMaterial or RawMaterial
        // For DC-based GRNs, this will be a string containing the material name
    },
    materialModel: {
        type: String,
        required: true,
        enum: ['PackingMaterial', 'RawMaterial'],
    },
    orderedQuantity: {
        type: Number,
        required: true,
    },
    receivedQuantity: {
        type: Number,
        required: true,
    },
    // Extra receiving field
    extraReceivedQty: {
        type: Number,
        default: 0,
    },
    unitPrice: {
        type: Number,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    damagedQuantity: {
        type: Number,
        default: 0,
    },
    remarks: {
        type: String,
        trim: true,
    },
    lastUnitPrice: {
        type: Number,
        default: 0,
    },
    priceDifference: {
        type: Number,
        default: 0,
    },
    // Add balance tracking field to keep track of remaining quantity
    balanceQuantity: {
        type: Number,
        default: 0
    },
    // Add fields for dynamic material usage calculation for jobber DCs
    usedQty: {
        type: Number,
        default: 0
    },
    remainingQty: {
        type: Number,
        default: 0
    }
});

const grnSchema = new mongoose.Schema({
    grnNumber: {
        type: String,
        required: true,
        unique: true,
    },
    purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        // Make purchaseOrder optional since jobber GRNs won't have a PO
        required: false,
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        // Make supplier optional since jobber GRNs might not have a supplier
        required: false,
    },
    items: [grnItemSchema],
    status: {
        type: String,
        enum: ['Approved', 'Pending Admin Approval', 'Rejected', 'Completed', 'Partial', 'Normal Completed', 'Extra Completed'],
        required: true,
    },
    receivedBy: {
        type: String,
        trim: true,
    },
    dateReceived: {
        type: Date,
        default: Date.now,
    },
    rejectionReason: {
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
    approvalDate: {
        type: Date,
    },
    isLocked: {
        type: Boolean,
        default: false,
    },
    isSubmitted: {
        type: Boolean,
        default: false,
    },
    // Add source_type field to distinguish between Purchase Order and Jobber Delivery Challan
    sourceType: {
        type: String,
        enum: ['purchase_order', 'jobber'],
        default: 'purchase_order',
    },
    // Add reference to delivery challan for jobber GRNs
    deliveryChallan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryChallan',
    },
    // Add reference number field to store either PO number or DC number
    referenceNumber: {
        type: String,
    },
    // Add carton-based tracking fields for Delivery Challans
    productName: {
        type: String,
        trim: true,
    },
    cartonsSent: {
        type: Number,
        default: 0,
    },
    cartonsReturned: {
        type: Number,
        default: 0,
    },
    cartonBalance: {
        type: Number,
        default: 0,
    },
    // Add field to store individual product carton quantities for multi-product DCs
    productCartonsReceived: [{
        type: Number,
        default: 0,
    }],
    // Add fields to store DC number and supplier name for proper display
    dcNumber: {
        type: String,
    },
    supplierName: {
        type: String,
    },
    unitType: {
        type: String,
        enum: ['Own Unit', 'Jobber'],
    },
    // Add reference document fields
    referenceType: {
        type: String,
        enum: ['invoice', 'dc'],
    },
    invoiceNo: {
        type: String,
    },
    invoiceDate: {
        type: Date,
    },
    dcNo: {
        type: String,
    },
    dcDate: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Add indexes for better query performance
grnSchema.index({ purchaseOrder: 1 });
grnSchema.index({ deliveryChallan: 1 });
grnSchema.index({ sourceType: 1 });
grnSchema.index({ status: 1 });
grnSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GRN', grnSchema);