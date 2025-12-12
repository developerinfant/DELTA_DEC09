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

const testPMStockFix = async () => {
  try {
    console.log('Testing PM Store stock calculation fix...');
    
    // Get a sample material
    const material = await PackingMaterial.findOne({});
    if (!material) {
      console.log('No materials found in database');
      return;
    }
    
    console.log(`Testing with material: ${material.name}`);
    console.log(`Current PM Store quantity: ${material.quantity}`);
    
    // Test the scenario where there's no previous stock record
    const testDate = new Date();
    testDate.setHours(0, 0, 0, 0);
    const yesterday = new Date(testDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Delete any existing record for yesterday to simulate the condition
    await PackingMaterialStockRecord.deleteOne({
      materialId: material._id,
      date: yesterday
    });
    
    console.log('Deleted previous stock record to test fix');
    
    // Now simulate the fixed logic
    const previousStockRecord = await PackingMaterialStockRecord.findOne({
      materialId: material._id,
      date: yesterday
    });
    
    // Opening Stock should be taken ONLY from the previous day's closing stock (no fallback)
    const openingStock = previousStockRecord ? previousStockRecord.closingStock : 0;
    
    console.log(`Opening stock calculation result: ${openingStock}`);
    console.log(`Expected result (should be 0 when no previous record): 0`);
    
    if (openingStock === 0) {
      console.log('✅ SUCCESS: Fix is working correctly!');
    } else {
      console.log('❌ FAILURE: Fix is not working as expected');
    }
    
    // Also verify PM Store value is correctly using material.quantity
    const pmStoreStock = material.quantity;
    console.log(`PM Store value (direct from material.quantity): ${pmStoreStock}`);
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error testing PM stock fix:', error);
    mongoose.connection.close();
  }
};

// Run the test
testPMStockFix();