const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Remove deprecated options
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Generate supplier code
const generateSupplierCode = (index) => {
  return `SUP-${String(index).padStart(5, '0')}`;
};

// Update suppliers without supplierType
const updateSuppliers = async () => {
  try {
    // Find all suppliers
    const allSuppliers = await Supplier.find({});
    console.log(`Found ${allSuppliers.length} total suppliers`);
    
    // Find suppliers without supplierType or with null/undefined supplierType
    const suppliersToUpdate = await Supplier.find({
      $or: [
        { supplierType: { $exists: false } },
        { supplierType: null },
        { supplierType: { $in: [undefined, ""] } }
      ]
    });
    
    console.log(`Found ${suppliersToUpdate.length} suppliers to update for supplierType`);
    
    // Update each supplier
    for (const supplier of suppliersToUpdate) {
      // Set default supplierType based on materialType if it exists
      let defaultSupplierType = 'Packing'; // Default to Packing
      
      if (supplier.materialType) {
        if (supplier.materialType === 'raw') {
          defaultSupplierType = 'Raw';
        } else if (supplier.materialType === 'both') {
          defaultSupplierType = 'Both';
        }
        // For 'packing' or any other value, default to 'Packing'
      }
      
      supplier.supplierType = defaultSupplierType;
      console.log(`Updated supplier ${supplier.name} with supplierType: ${defaultSupplierType}`);
    }
    
    // Find suppliers without supplierCode or with null/undefined supplierCode
    const suppliersWithoutCode = await Supplier.find({
      $or: [
        { supplierCode: { $exists: false } },
        { supplierCode: null },
        { supplierCode: { $in: [undefined, ""] } }
      ]
    });
    
    console.log(`Found ${suppliersWithoutCode.length} suppliers to update for supplierCode`);
    
    // Update each supplier without a code
    let codeIndex = allSuppliers.length + 1; // Start from the next available number
    for (const supplier of suppliersWithoutCode) {
      // Generate a supplier code
      const supplierCode = generateSupplierCode(codeIndex);
      supplier.supplierCode = supplierCode;
      codeIndex++;
      console.log(`Updated supplier ${supplier.name} with supplierCode: ${supplierCode}`);
    }
    
    // Now save all updated suppliers
    for (const supplier of [...suppliersToUpdate, ...suppliersWithoutCode]) {
      // Use save with validation bypass to avoid issues
      await supplier.save({ validateBeforeSave: false });
    }
    
    console.log('Supplier update completed');
  } catch (error) {
    console.error('Error updating suppliers:', error);
  }
};

// Run the migration
const runMigration = async () => {
  await connectDB();
  await updateSuppliers();
  mongoose.connection.close();
  console.log('Migration completed. Database connection closed.');
};

runMigration();