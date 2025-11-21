const mongoose = require('mongoose');

const personNameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Person name is required'],
        trim: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for better query performance
personNameSchema.index({ name: 1 });

module.exports = mongoose.model('PersonName', personNameSchema);