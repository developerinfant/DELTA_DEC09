const mongoose = require('mongoose');
const ProductMaterialMapping = require('./models/ProductMaterialMapping');

// Test creating a product mapping with units per carton
async function testUnitsPerCarton() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/delta07_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Clear existing mappings
        await ProductMaterialMapping.deleteMany({});
        console.log('Cleared existing product mappings');
        
        // Create a new product mapping with units per carton
        const productMapping = new ProductMaterialMapping({
            product_name: "Yoga Tree Premium Incense",
            units_per_carton: 144, // 144 pieces per carton
            materials: [
                { material_name: "Film", qty_per_carton: 144 },
                { material_name: "Box", qty_per_carton: 144 },
                { material_name: "Sticker", qty_per_carton: 144 }
            ]
        });
        
        const savedMapping = await productMapping.save();
        console.log('Product mapping saved successfully:', savedMapping);
        
        // Test retrieving the mapping
        const retrievedMapping = await ProductMaterialMapping.findById(savedMapping._id);
        console.log('Retrieved mapping:', retrievedMapping);
        
        // Test updating the mapping
        retrievedMapping.units_per_carton = 150;
        const updatedMapping = await retrievedMapping.save();
        console.log('Updated mapping:', updatedMapping);
        
        console.log('Test completed successfully!');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

testUnitsPerCarton();