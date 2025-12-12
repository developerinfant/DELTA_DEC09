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

const debugMaterial32Specific = async () => {
  try {
    console.log('Debugging material "32" specific stock calculation issue...');
    
    // Find material named "32"
    const material = await PackingMaterial.findOne({ name: "32" });
    if (!material) {
      console.log('Material "32" not found in database');
      // Try to find any material with "32" in the name
      const materials = await PackingMaterial.find({ name: { $regex: "32" } });
      if (materials.length > 0) {
        console.log(`Found materials with "32" in name:`);
        materials.forEach(m => console.log(`- ${m.name} (ID: ${m._id}, Quantity: ${m.quantity})`));
        // Use the first one for debugging
        if (materials.length > 0) {
          console.log(`\nUsing first material for detailed debugging: ${materials[0].name}`);
          await debugMaterialDetails(materials[0]);
        }
      }
      return;
    }
    
    await debugMaterialDetails(material);
    
    console.log('\nDebug completed');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error debugging material "32":', error);
    mongoose.connection.close();
  }
};

const debugMaterialDetails = async (material) => {
  console.log(`\nFound material: ${material.name}`);
  console.log(`ID: ${material._id}`);
  console.log(`Current PM Store quantity: ${material.quantity}`);
  console.log(`Unit: ${material.unit || 'pcs'}`);
  
  // Check recent stock records
  const recentRecords = await PackingMaterialStockRecord.find({
    materialId: material._id
  }).sort({ date: -1 }).limit(10);
  
  console.log('\nRecent stock records:');
  if (recentRecords.length === 0) {
    console.log('No stock records found for this material');
  } else {
    recentRecords.forEach(record => {
      console.log(`Date: ${record.date.toISOString().split('T')[0]}, Opening: ${record.openingStock}, Closing: ${record.closingStock}, Inward: ${record.inward}, Outward: ${record.outward}`);
    });
  }
  
  // Check a specific date (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayRecord = await PackingMaterialStockRecord.findOne({
    materialId: material._id,
    date: today
  });
  
  console.log(`\nToday's record (${today.toISOString().split('T')[0]}):`);
  if (todayRecord) {
    console.log(`Opening: ${todayRecord.openingStock}, Closing: ${todayRecord.closingStock}, Inward: ${todayRecord.inward}, Outward: ${todayRecord.outward}`);
  } else {
    console.log('No record found for today');
  }
  
  // Check previous day's record
  const previousDate = new Date(today);
  previousDate.setDate(previousDate.getDate() - 1);
  
  const previousRecord = await PackingMaterialStockRecord.findOne({
    materialId: material._id,
    date: previousDate
  });
  
  console.log(`\nPrevious day's record (${previousDate.toISOString().split('T')[0]}):`);
  if (previousRecord) {
    console.log(`Opening: ${previousRecord.openingStock}, Closing: ${previousRecord.closingStock}, Inward: ${previousRecord.inward}, Outward: ${previousRecord.outward}`);
  } else {
    console.log('No record found for previous day');
  }
  
  // Check GRNs for this material
  console.log('\nChecking GRNs for this material:');
  const grns = await GRN.find({}).populate('supplier', 'name');
  let totalInward = 0;
  
  grns.forEach(grn => {
    const grnDate = new Date(grn.dateReceived);
    grnDate.setHours(0, 0, 0, 0);
    
    // Check if this GRN is for today
    if (grnDate.getTime() === today.getTime()) {
      console.log(`GRN ${grn.grnNumber} dated ${grn.dateReceived.toISOString().split('T')[0]}:`);
      
      grn.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Material field type: ${typeof item.material}`);
        console.log(`    Material field value: ${JSON.stringify(item.material)}`);
        
        // Check if this item matches our material
        let isMatchingMaterial = false;
        
        if (item.material) {
          // If item.material is an ObjectId, convert to string for comparison
          if (typeof item.material === 'object' && item.material.toString) {
            isMatchingMaterial = item.material.toString() === material._id.toString();
            console.log(`    ObjectId comparison: ${item.material.toString()} === ${material._id.toString()} = ${isMatchingMaterial}`);
          } 
          // If item.material is already a string, compare directly
          else if (typeof item.material === 'string') {
            isMatchingMaterial = item.material === material.name || item.material === material._id.toString();
            console.log(`    String comparison: "${item.material}" === "${material.name}" OR "${item.material}" === "${material._id.toString()}" = ${isMatchingMaterial}`);
          }
        }
        
        if (isMatchingMaterial) {
          console.log(`    MATCH FOUND: +${item.receivedQuantity}`);
          totalInward += item.receivedQuantity;
        } else {
          console.log(`    No match`);
        }
      });
    }
  });
  
  console.log(`\nTotal inward movement for today: ${totalInward}`);
  
  // Check DCs for this material
  console.log('\nChecking Delivery Challans for this material:');
  const deliveryChallans = await DeliveryChallan.find({});
  let totalOutward = 0;
  
  deliveryChallans.forEach(dc => {
    const dcDate = new Date(dc.date);
    dcDate.setHours(0, 0, 0, 0);
    
    // Check if this DC is for today
    if (dcDate.getTime() === today.getTime()) {
      console.log(`DC ${dc.dc_no} dated ${dc.date.toISOString().split('T')[0]}:`);
      
      dc.materials.forEach((dcMaterial, index) => {
        console.log(`  Material ${index + 1}: ${dcMaterial.material_name} (${dcMaterial.total_qty})`);
        
        if (dcMaterial.material_name === material.name) {
          console.log(`    MATCH FOUND: -${dcMaterial.total_qty}`);
          totalOutward += dcMaterial.total_qty;
        }
      });
    }
  });
  
  console.log(`\nTotal outward movement for today: ${totalOutward}`);
  
  // Calculate expected closing stock
  let openingStock = 0;
  if (previousRecord) {
    openingStock = previousRecord.closingStock;
  } else {
    // Opening Stock should be taken ONLY from the previous day's closing stock (no fallback)
    openingStock = 0;
  }
  
  const expectedClosingStock = openingStock + totalInward - totalOutward;
  console.log(`\nExpected stock calculation:`);
  console.log(`  Opening Stock: ${openingStock}`);
  console.log(`  + Inward (GRN): ${totalInward}`);
  console.log(`  - Outward (DC): ${totalOutward}`);
  console.log(`  = Expected Closing Stock: ${expectedClosingStock}`);
  
  if (todayRecord) {
    console.log(`\nActual today's record closing stock: ${todayRecord.closingStock}`);
    if (todayRecord.closingStock !== expectedClosingStock) {
      console.log(`  *** MISMATCH DETECTED! ***`);
    } else {
      console.log(`  ✓ Calculation is correct`);
    }
  }
};

// Run the debug
debugMaterial32Specific();