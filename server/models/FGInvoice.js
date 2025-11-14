const mongoose = require('mongoose');

const fgInvoiceItemSchema = new mongoose.Schema({
    sn: {
        type: Number,
        required: true
    },
    itemCode: {
        type: String,
        trim: true
    },
    product: {
        type: String,
        required: true,
        trim: true
    },
    hsn: {
        type: String,
        trim: true
    },
    gstPercent: {
        type: Number,
        default: 0
    },
    scheme: {
        type: String,
        trim: true
    },
    uom: {
        type: String,
        trim: true
    },
    qty: {
        type: Number,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    discPercent: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        required: true
    }
});

const fgInvoiceSchema = new mongoose.Schema({
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
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FGBuyer',
        required: [true, 'Buyer is required'],
    },
    buyerName: {
        type: String,
        required: [true, 'Buyer name is required'],
        trim: true,
    },
    buyerGstin: {
        type: String,
        trim: true,
    },
    buyerContactNo: {
        type: String,
        trim: true,
    },
    billedTo: {
        type: String,
        required: [true, 'Billed to address is required'],
        trim: true,
    },
    shippedTo: {
        type: String,
        trim: true,
    },
    dispatchFrom: {
        type: String,
        trim: true,
    },
    noOfPackages: {
        type: Number,
    },
    transportName: {
        type: String,
        trim: true,
    },
    termsOfPayment: {
        type: String,
        enum: ['Advance', 'Credit', 'Partial'],
        trim: true,
    },
    destination: {
        type: String,
        trim: true,
    },
    poNoDate: {
        type: String,
        trim: true,
    },
    deliveryChallanNoDate: {
        type: String,
        trim: true,
    },
    salesman: {
        type: String,
        trim: true,
    },
    items: [fgInvoiceItemSchema],
    schemeDiscount: {
        type: Number,
        default: 0
    },
    taxableAmount: {
        type: Number,
        required: true
    },
    // Dynamic GST fields based on buyer state
    gstType: {
        type: String,
        enum: ['CGST+SGST', 'IGST'],
        required: true
    },
    cgstPercent: {
        type: Number,
        default: 2.5
    },
    sgstPercent: {
        type: Number,
        default: 2.5
    },
    igstPercent: {
        type: Number,
        default: 5
    },
    cgstAmount: {
        type: Number,
        required: true
    },
    sgstAmount: {
        type: Number,
        required: true
    },
    igstAmount: {
        type: Number,
        required: true
    },
    roundOff: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    amountInWords: {
        type: String,
        trim: true,
    },
    // E-Invoice & E-Way Bill fields
    irn: {
        type: String,
        trim: true,
    },
    ackNo: {
        type: String,
        trim: true,
    },
    ackDate: {
        type: Date,
    },
    eWayBillNo: {
        type: String,
        trim: true,
    },
    eWayBillDate: {
        type: Date,
    },
    vehicleNo: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Draft', 'Generated', 'Cancelled'],
        default: 'Draft',
    },
    createdBy: {
        type: String,
        required: true,
        trim: true,
    }
}, {
    timestamps: true,
});

// Add indexes for better query performance
fgInvoiceSchema.index({ invoiceNo: 1 });
fgInvoiceSchema.index({ buyerName: 1 });
fgInvoiceSchema.index({ invoiceDate: -1 });
fgInvoiceSchema.index({ status: 1 });

module.exports = mongoose.model('FGInvoice', fgInvoiceSchema, 'fg_invoices');