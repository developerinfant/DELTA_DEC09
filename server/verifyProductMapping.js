const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import the model
const ProductMaterialMapping = require('./models/ProductMaterialMapping');

// Test creating a product mapping
async function testProductMapping() {
  try {
    // Clear existing data
    await ProductMaterialMapping.deleteMany({});
    console.log('Cleared existing product mappings');
    
    // Create a new product mapping
    const productMapping = new ProductMaterialMapping({
      product_name: "Sampradayam 12 Cup Sambrani",
      materials: [
        { material_name: "Cup Sambrani", qty_per_carton: 1728 },
        { material_name: "Printing Box", qty_per_carton: 144 },
        { material_name: "Dozen Box", qty_per_carton: 12 },
        { material_name: "Master Cartons", qty_per_carton: 1 }
      ]
    });
    
    const savedMapping = await productMapping.save();
    console.log('Product mapping saved successfully:', savedMapping);
    
    // Try to create a duplicate (should fail)
    try {
      const duplicateMapping = new ProductMaterialMapping({
        product_name: "Sampradayam 12 Cup Sambrani",
        materials: [
          { material_name: "Cup Sambrani", qty_per_carton: 1728 }
        ]
      });
      
      await duplicateMapping.save();
      console.log('ERROR: Duplicate mapping was saved when it should have failed');
    } catch (error) {
      console.log('SUCCESS: Duplicate mapping correctly rejected with error:', error.message);
    }
    
    // Verify the collection name
    const collectionName = ProductMaterialMapping.collection.name;
    console.log('Collection name:', collectionName);
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testProductMapping();