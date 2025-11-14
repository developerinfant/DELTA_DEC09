const mongoose = require('mongoose');

// 1. Define the Outgoing Record Schema
const outgoingRecordSchema = new mongoose.Schema({
    material: {
        // This creates a reference to a document in the 'PackingMaterial' collection.
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PackingMaterial', // The model to link to.
    },
    quantityUsed: {
        type: Number,
        required: [true, 'The quantity used is required'],
        min: [1, 'Quantity used must be at least 1'],
    },
    notes: {
        type: String,
        trim: true, // Removes whitespace from the beginning and end.
        default: '', // Optional field for notes about the transaction.
    },
    // Optional: To track which user (Admin/Manager) made the entry.
    // This assumes you would pass the user's ID from the auth middleware when creating a record.
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    // 2. Options: Automatically adds 'createdAt' and 'updatedAt' fields.
    // The 'createdAt' field serves as the "Date Used" for the record.
    timestamps: true,
});


// 3. Create and Export the Model
// Mongoose will create a collection named 'outgoingrecords' in the database.
module.exports = mongoose.model('OutgoingRecord', outgoingRecordSchema);