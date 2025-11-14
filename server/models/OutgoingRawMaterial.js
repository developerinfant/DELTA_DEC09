const mongoose = require('mongoose');

const outgoingRawMaterialSchema = new mongoose.Schema({
    material: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RawMaterial',
    },
    quantitySent: {
        type: Number,
        required: [true, 'The quantity sent is required'],
        min: [1, 'Quantity sent must be at least 1'],
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('OutgoingRawMaterial', outgoingRawMaterialSchema);