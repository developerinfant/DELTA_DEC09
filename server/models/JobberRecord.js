const mongoose = require('mongoose');

const jobberRecordSchema = new mongoose.Schema({
    jobberName: {
        type: String,
        required: [true, 'Jobber name or ID is required'],
        trim: true,
    },
    productName: {
        type: String,
        required: false,
        trim: true,
    },
    rawMaterial: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RawMaterial',
    },
    outgoingRecord: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'OutgoingRawMaterial',
    },
    quantitySent: {
        type: Number,
        required: true,
    },
    quantityProduced: {
        type: Number,
        default: 0,
    },
    quantityReturned: {
        type: Number,
        default: 0,
    },
    quantityStillWithJobber: {
        type: Number,
        default: function() {
            return this.quantitySent - (this.quantityProduced + this.quantityReturned);
        }
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending',
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobberBatch',
        required: false,
    }
}, {
    timestamps: true,
});

// Middleware to update quantityStillWithJobber before saving
jobberRecordSchema.pre('save', function(next) {
    this.quantityStillWithJobber = this.quantitySent - (this.quantityProduced + this.quantityReturned);
    next();
});

module.exports = mongoose.model('JobberRecord', jobberRecordSchema);