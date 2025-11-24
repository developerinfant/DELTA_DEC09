const mongoose = require('mongoose');
const ProductStock = require('../models/ProductStock');
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
const addHsnCodeField = async () => {
  try {
    // Add hsnCode field to all existing product stocks that don't have it
    const result = await ProductStock.updateMany(
      { hsnCode: { $exists: false } },
      { $set: { hsnCode: '' } }
    );
    
    console.log(`Migration completed. Updated ${result.modifiedCount} product stocks with hsnCode field.`);
  } catch (err) {
    console.error('Migration error:', err);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await addHsnCodeField();
  mongoose.connection.close();
  console.log('Migration finished. Database connection closed.');
};

runMigration();