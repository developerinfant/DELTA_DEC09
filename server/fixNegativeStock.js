const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('./models/PackingMaterial');
const PackingMaterialStockRecord = require('./models/PackingMaterialStockRecord');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fixNegativeStock = async () => {
  try {
    console.log('Fixing negative stock records...');
    
    // Get all stock records with negative closing stock
    const negativeRecords = await PackingMaterialStockRecord.find({
      closingStock: { $lt: 0 }
    });
    
    console.log(`Found ${negativeRecords.length} records with negative closing stock`);
    
    let fixedCount = 0;
    
    for (const record of negativeRecords) {
      console.log(`\nFixing record for material ${record.materialName} on ${record.date.toISOString().split('T')[0]}`);
      console.log(`  Current closing stock: ${record.closingStock}`);
      
      // Set negative closing stock to 0
      record.closingStock = 0;
      await record.save();
      
      console.log(`  Fixed closing stock to: ${record.closingStock}`);
      fixedCount++;
    }
    
    console.log(`\nFixed ${fixedCount} records with negative closing stock`);
    
    // Also check for any inconsistencies in the stock records
    console.log('\nChecking for stock calculation inconsistencies...');
    
    // Get all packing materials
    const materials = await PackingMaterial.find({}).sort({ name: 1 });
    console.log(`Found ${materials.length} packing materials`);
    
    let inconsistencyCount = 0;
    
    for (const material of materials) {
      // Get all stock records for this material, sorted by date
      const allRecords = await PackingMaterialStockRecord.find({
        materialId: material._id
      }).sort({ date: 1 });
      
      if (allRecords.length === 0) continue;
      
      // Verify each record follows the correct formula
      for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i];
        
        let expectedOpeningStock = 0;
        
        // For the first record, use PM Store value
        if (i === 0) {
          expectedOpeningStock = material.quantity;
        } else {
          // For subsequent records, use previous day's closing stock
          expectedOpeningStock = allRecords[i-1].closingStock;
        }
        
        // Check if opening stock matches expected
        if (record.openingStock !== expectedOpeningStock) {
          console.log(`\nInconsistency found for ${material.name} on ${record.date.toISOString().split('T')[0]}`);
          console.log(`  Opening stock mismatch: Expected ${expectedOpeningStock}, Actual ${record.openingStock}`);
          
          // Fix the opening stock
          record.openingStock = expectedOpeningStock;
          await record.save();
          inconsistencyCount++;
        }
        
        // Recalculate closing stock to ensure it follows the formula
        const expectedClosingStock = Math.max(0, record.openingStock + record.inward - record.outward);
        if (record.closingStock !== expectedClosingStock) {
          console.log(`\nInconsistency found for ${material.name} on ${record.date.toISOString().split('T')[0]}`);
          console.log(`  Closing stock mismatch: Expected ${expectedClosingStock}, Actual ${record.closingStock}`);
          console.log(`  Formula: ${record.openingStock} + ${record.inward} - ${record.outward} = ${expectedClosingStock}`);
          
          // Fix the closing stock
          record.closingStock = expectedClosingStock;
          await record.save();
          inconsistencyCount++;
        }
      }
    }
    
    console.log(`\nFixed ${inconsistencyCount} stock calculation inconsistencies`);
    console.log('\nStock fix process completed successfully');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fixing negative stock:', error);
    mongoose.connection.close();
  }
};

// Run the fix
fixNegativeStock();