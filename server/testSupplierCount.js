const mongoose = require('mongoose');
const Supplier = require('./models/Supplier');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Remove deprecated options
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Test supplier count
const testSupplierCount = async () => {
  const conn = await connectDB();
  
  try {
    console.log('Testing Supplier.countDocuments()');
    const count = await Supplier.countDocuments();
    console.log('Supplier count:', count);
    
    const nextCode = `SUP-${String(count + 1).padStart(5, '0')}`;
    console.log('Next code:', nextCode);
    
    // Also test finding suppliers
    console.log('Testing Supplier.find()');
    const suppliers = await Supplier.find({});
    console.log('Found suppliers:', suppliers.length);
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

testSupplierCount();