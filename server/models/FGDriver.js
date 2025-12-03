const mongoose = require('mongoose');

const fgDriverSchema = new mongoose.Schema({
    driverCode: {
        type: String,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Driver name is required'],
        trim: true,
    },
    transportName: {
        type: String,
        trim: true,
    },
    vehicleNo: {
        type: String,
        trim: true,
    },
    vehicleType: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
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
    }
}, {
    timestamps: true,
});

// Add indexes for better query performance
fgDriverSchema.index({ name: 1 });
fgDriverSchema.index({ driverCode: 1 });
fgDriverSchema.index({ status: 1 });

// Pre-save middleware to generate driver code
fgDriverSchema.pre('save', async function(next) {
    if (!this.driverCode) {
        // Find the highest existing driver code
        const lastDriver = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
        
        let nextNumber = 1;
        if (lastDriver && lastDriver.driverCode) {
            const lastNumber = parseInt(lastDriver.driverCode.replace('D', ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        this.driverCode = `D${nextNumber.toString().padStart(4, '0')}`;
    }
    
    next();
});

module.exports = mongoose.model('FGDriver', fgDriverSchema, 'fg_driver_master');