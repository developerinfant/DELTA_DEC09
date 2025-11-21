const mongoose = require('mongoose');

const packingMaterialStockRecordSchema = new mongoose.Schema({
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PackingMaterial',
        required: true
    },
    materialName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    openingStock: {
        type: Number,
        required: true,
        default: 0
    },
    closingStock: {
        type: Number,
        required: true,
        default: 0
    },
    inward: {
        type: Number,
        required: true,
        default: 0
    },
    outward: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        required: false,
        default: 'pcs'
    }
}, {
    timestamps: true
});

// Add compound index for efficient querying
packingMaterialStockRecordSchema.index({ materialId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PackingMaterialStockRecord', packingMaterialStockRecordSchema);