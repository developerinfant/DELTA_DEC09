const mongoose = require('mongoose');

const fgBuyerSchema = new mongoose.Schema({
    buyerCode: {
        type: String,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Buyer name is required'],
        unique: true,
        trim: true,
    },
    contactPerson: {
        type: String,
        trim: true,
    },
    phoneNumber: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
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
    city: {
        type: String,
        trim: true,
    },
    state: {
        type: String,
        trim: true,
    },
    pincode: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        default: 'India',
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
    transportName: {
        type: String,
        trim: true,
    },
    paymentTerms: {
        type: String,
        enum: ['Net 15', 'Net 30', 'Advance'],
        default: 'Net 30',
        trim: true,
    },
    destination: {
        type: String,
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    // Add GST type field for automatic GST calculation
    gstType: {
        type: String,
        enum: ['CGST+SGST', 'IGST'],
        default: 'CGST+SGST', // Default to CGST+SGST (Tamil Nadu)
        trim: true,
    }
}, {
    timestamps: true,
});

// Add indexes for better query performance
fgBuyerSchema.index({ name: 1 });
fgBuyerSchema.index({ buyerCode: 1 });
fgBuyerSchema.index({ gstin: 1 });
fgBuyerSchema.index({ status: 1 });

// Pre-save middleware to generate buyer code and auto-set GST type based on state
fgBuyerSchema.pre('save', async function(next) {
    if (!this.buyerCode) {
        // Find the highest existing buyer code
        const lastBuyer = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
        
        let nextNumber = 1;
        if (lastBuyer && lastBuyer.buyerCode) {
            const lastNumber = parseInt(lastBuyer.buyerCode.replace('B', ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        this.buyerCode = `B${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Auto-set GST type based on state
    // If Buyer State = Tamil Nadu → GST type = CGST + SGST (2.5% + 2.5%) = 5% total
    // If Buyer State ≠ Tamil Nadu → GST type = IGST (5%)
    if (this.state) {
        if (this.state.trim().toLowerCase() === 'tamil nadu') {
            this.gstType = 'CGST+SGST';
        } else {
            this.gstType = 'IGST';
        }
    }
    
    next();
});

module.exports = mongoose.model('FGBuyer', fgBuyerSchema, 'fg_buyer_master');