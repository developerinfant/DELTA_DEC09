const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/delta_tv', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Migration function
const addApprovedByNameField = async () => {
  try {
    // Add approvedByName field to all existing purchase orders that don't have it
    const result = await PurchaseOrder.updateMany(
      { approvedByName: { $exists: false } },
      { $set: { approvedByName: '' } }
    );
    
    console.log(`Migration completed. Updated ${result.modifiedCount} purchase orders with approvedByName field.`);
  } catch (err) {
    console.error('Migration error:', err);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await addApprovedByNameField();
  mongoose.connection.close();
  console.log('Migration finished. Database connection closed.');
};

runMigration();