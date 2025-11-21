const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('../models/PackingMaterial');
const PackingMaterialStockRecord = require('../models/PackingMaterialStockRecord');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const initializeStockRecords = async () => {
  try {
    console.log('Connected to MongoDB');
    
    // Get all packing materials
    const materials = await PackingMaterial.find({});
    console.log(`Found ${materials.length} packing materials`);
    
    // Initialize stock records for each material with today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let initializedCount = 0;
    
    for (const material of materials) {
      // Check if a record already exists for today
      const existingRecord = await PackingMaterialStockRecord.findOne({
        materialId: material._id,
        date: today
      });
      
      if (!existingRecord) {
        // Create initial stock record with PM Store value as both opening and closing stock
        const stockRecord = new PackingMaterialStockRecord({
          materialId: material._id,
          materialName: material.name,
          date: today,
          openingStock: material.quantity,
          closingStock: material.quantity,
          inward: 0,
          outward: 0,
          unit: material.unit || 'pcs'
        });
        
        await stockRecord.save();
        initializedCount++;
        console.log(`Initialized stock record for ${material.name}`);
      }
    }
    
    console.log(`Initialized ${initializedCount} stock records`);
    console.log('Stock records initialization completed');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error initializing stock records:', error);
    mongoose.connection.close();
  }
};

// Run the initialization
initializeStockRecords();