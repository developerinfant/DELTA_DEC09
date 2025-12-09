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

const fixMaterial32Stock = async () => {
  try {
    console.log('Fixing stock records for material "32"...');
    
    // Find material named "32"
    const material = await PackingMaterial.findOne({ name: "32" });
    if (!material) {
      console.log('Material "32" not found in database');
      // Try to find any material with "32" in the name
      const materials = await PackingMaterial.find({ name: { $regex: "32" } });
      if (materials.length > 0) {
        console.log(`Found materials with "32" in name:`);
        materials.forEach(m => console.log(`- ${m.name} (ID: ${m._id}, Quantity: ${m.quantity})`));
        // Use the first one for fixing
        if (materials.length > 0) {
          console.log(`\nUsing first material for fixing: ${materials[0].name}`);
          await fixMaterialStockRecords(materials[0]);
        }
      }
      return;
    }
    
    await fixMaterialStockRecords(material);
    
    console.log('\nFix process completed');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fixing material "32" stock records:', error);
    mongoose.connection.close();
  }
};

const fixMaterialStockRecords = async (material) => {
  console.log(`\nFixing stock records for material: ${material.name}`);
  console.log(`ID: ${material._id}`);
  console.log(`Current PM Store quantity: ${material.quantity}`);
  
  // Get all stock records for this material, sorted by date
  const allRecords = await PackingMaterialStockRecord.find({
    materialId: material._id
  }).sort({ date: 1 });
  
  console.log(`\nFound ${allRecords.length} stock records for this material`);
  
  if (allRecords.length === 0) {
    console.log('No stock records found. Nothing to fix.');
    return;
  }
  
  // Get all GRNs and DCs for proper calculation
  const grns = await GRN.find({}).populate('supplier', 'name');
  const deliveryChallans = await DeliveryChallan.find({});
  
  // Recalculate each record
  for (let i = 0; i < allRecords.length; i++) {
    const record = allRecords[i];
    console.log(`\nProcessing record for ${record.date.toISOString().split('T')[0]}:`);
    
    let openingStock = 0;
    
    // For the first record, use PM Store value
    if (i === 0) {
      openingStock = material.quantity;
      console.log(`  First record - using PM Store value as opening stock: ${openingStock}`);
    } else {
      // For subsequent records, use previous day's closing stock
      openingStock = allRecords[i-1].closingStock;
      console.log(`  Using previous record's closing stock as opening stock: ${openingStock}`);
    }
    
    // Calculate inward stock (GRN) for this date
    let inward = 0;
    grns.forEach(grn => {
      const grnDate = new Date(grn.dateReceived);
      grnDate.setHours(0, 0, 0, 0);
      
      // Count all GRNs except those marked as Draft or Cancelled
      if (!['Draft', 'Cancelled'].includes(grn.status) && grnDate.getTime() === record.date.getTime()) {
        grn.items.forEach(item => {
          // Properly match materials
          let isMatchingMaterial = false;
          
          if (item.material) {
            // If item.material is an ObjectId, convert to string for comparison
            if (typeof item.material === 'object' && item.material.toString) {
              isMatchingMaterial = item.material.toString() === material._id.toString();
            } 
            // If item.material is already a string, compare directly
            else if (typeof item.material === 'string') {
              isMatchingMaterial = item.material === material.name || item.material === material._id.toString();
            }
          }
          
          if (isMatchingMaterial) {
            inward += item.receivedQuantity;
          }
        });
      }
    });
    
    // Calculate outward stock (Delivery Challan) for this date
    let outward = 0;
    deliveryChallans.forEach(dc => {
      const dcDate = new Date(dc.date);
      dcDate.setHours(0, 0, 0, 0);
      
      if (dcDate.getTime() === record.date.getTime()) {
        dc.materials.forEach(dcMaterial => {
          if (dcMaterial.material_name === material.name) {
            outward += dcMaterial.total_qty;
          }
        });
      }
    });
    
    // Calculate closing stock
    const closingStock = openingStock + inward - outward;
    
    console.log(`  Inward: ${inward}, Outward: ${outward}`);
    console.log(`  Calculated closing stock: ${openingStock} + ${inward} - ${outward} = ${closingStock}`);
    console.log(`  Previous closing stock: ${record.closingStock}`);
    
    // Update the record if it doesn't match
    if (record.closingStock !== closingStock || record.openingStock !== openingStock || record.inward !== inward || record.outward !== outward) {
      console.log(`  *** UPDATING RECORD ***`);
      record.openingStock = openingStock;
      record.closingStock = closingStock;
      record.inward = inward;
      record.outward = outward;
      await record.save();
      console.log(`  Record updated successfully`);
    } else {
      console.log(`  Record is already correct`);
    }
  }
  
  console.log(`\nFinished processing all records for ${material.name}`);
};

// Run the fix
fixMaterial32Stock();