const mongoose = require('mongoose');
const RawMaterial = require('../models/RawMaterial');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');

  try {
    // Find all raw materials that don't have the perQuantityPrice field
    const materials = await RawMaterial.find({ perQuantityPrice: { $exists: false } });
    
    console.log(`Found ${materials.length} raw materials to update`);
    
    // Update each material to include the perQuantityPrice field
    for (const material of materials) {
      // Set perQuantityPrice to the same value as the old price field if it exists, otherwise set to 0
      material.perQuantityPrice = material.price || 0;
      // Remove the old price field
      delete material.price;
      await material.save();
      console.log(`Updated raw material: ${material.name}`);
    }
    
    console.log('All raw materials updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating raw materials:', error);
    process.exit(1);
  }
});