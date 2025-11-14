const mongoose = require('mongoose');

const deliveryChallanSchema = new mongoose.Schema({
    dc_no: {
        type: String,
        required: [true, 'Delivery challan number is required'],
        unique: true,
        trim: true,
    },
    unit_type: {
        type: String,
        required: [true, 'Unit type is required'],
        enum: ['Own Unit', 'Jobber'],
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        default: null,
    },
    product_name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    carton_qty: {
        type: Number,
        required: [true, 'Carton quantity is required'],
        min: [1, 'Carton quantity must be at least 1'],
    },
    materials: [{
        material_name: {
            type: String,
            required: true,
            trim: true,
        },
        qty_per_carton: {
            type: Number,
            required: true,
            min: [1, 'Quantity per carton must be at least 1'],
        },
        total_qty: {
            type: Number,
            required: true,
            min: [1, 'Total quantity must be at least 1'],
        },
        received_qty: {
            type: Number,
            default: 0,
        },
        balance_qty: {
            type: Number,
            default: function() { return this.total_qty; },
        }
    }],
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Partial', 'Completed', 'Cancelled'],
    },
    reference_type: {
        type: String,
        required: true,
        enum: ['Own Unit', 'Jobber'],
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
    },
    remarks: {
        type: String,
        trim: true,
    },
    // Add person_name field for Own Unit delivery challans
    person_name: {
        type: String,
        trim: true,
        default: null,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

// Add indexes for better query performance
deliveryChallanSchema.index({ supplier_id: 1 });
deliveryChallanSchema.index({ unit_type: 1 });
deliveryChallanSchema.index({ status: 1 });
deliveryChallanSchema.index({ dc_no: 1 });

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema, 'delivery_challan');