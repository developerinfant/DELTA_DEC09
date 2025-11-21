const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('./models/PackingMaterial');
const PackingMaterialStockRecord = require('./models/PackingMaterialStockRecord');
const DeliveryChallan = require('./models/DeliveryChallan');
const GRN = require('./models/GRN');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const debugMaterial32 = async () => {
  try {
    console.log('Debugging material "32" stock calculation...');
    
    // Find material named "32"
    const material = await PackingMaterial.findOne({ name: "32" });
    if (!material) {
      console.log('Material "32" not found in database');
      // Try to find any material with "32" in the name
      const materials = await PackingMaterial.find({ name: { $regex: "32" } });
      if (materials.length > 0) {
        console.log(`Found materials with "32" in name:`);
        materials.forEach(m => console.log(`- ${m.name} (ID: ${m._id}, Quantity: ${m.quantity})`));
        return;
      }
      return;
    }
    
    console.log(`Found material: ${material.name}`);
    console.log(`ID: ${material._id}`);
    console.log(`Current PM Store quantity: ${material.quantity}`);
    console.log(`Unit: ${material.unit || 'pcs'}`);
    
    // Check recent stock records
    const recentRecords = await PackingMaterialStockRecord.find({
      materialId: material._id
    }).sort({ date: -1 }).limit(5);
    
    console.log('\nRecent stock records:');
    recentRecords.forEach(record => {
      console.log(`Date: ${record.date.toISOString().split('T')[0]}, Opening: ${record.openingStock}, Closing: ${record.closingStock}, Inward: ${record.inward}, Outward: ${record.outward}`);
    });
    
    // Check GRNs for this material
    const grns = await GRN.find({}).populate('supplier', 'name');
    console.log('\nGRNs for this material:');
    grns.forEach(grn => {
      grn.items.forEach(item => {
        if ((item.material && item.material.toString() === material._id.toString()) || 
            (typeof item.material === 'string' && item.material === material.name)) {
          console.log(`GRN ${grn.grnNumber} on ${grn.dateReceived.toISOString().split('T')[0]}: +${item.receivedQuantity}`);
        }
      });
    });
    
    // Check DCs for this material
    const deliveryChallans = await DeliveryChallan.find({});
    console.log('\nDelivery Challans for this material:');
    deliveryChallans.forEach(dc => {
      dc.materials.forEach(dcMaterial => {
        if (dcMaterial.material_name === material.name) {
          console.log(`DC ${dc.dc_no} on ${dc.date.toISOString().split('T')[0]}: -${dcMaterial.total_qty}`);
        }
      });
    });
    
    console.log('\nDebug completed');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error debugging material "32":', error);
    mongoose.connection.close();
  }
};

// Run the debug
debugMaterial32();