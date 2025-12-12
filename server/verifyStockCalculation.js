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

const verifyStockCalculation = async () => {
  try {
    console.log('Verifying stock calculations for all materials...');
    
    // Get all packing materials
    const materials = await PackingMaterial.find({}).sort({ name: 1 });
    console.log(`Found ${materials.length} packing materials`);
    
    // Get all GRNs and DCs for proper calculation
    const grns = await GRN.find({}).populate('supplier', 'name');
    const deliveryChallans = await DeliveryChallan.find({});
    
    let issuesFound = 0;
    
    // Process each material
    for (const material of materials) {
      console.log(`\nVerifying material: ${material.name}`);
      
      // Get all stock records for this material, sorted by date
      const allRecords = await PackingMaterialStockRecord.find({
        materialId: material._id
      }).sort({ date: 1 });
      
      console.log(`  Found ${allRecords.length} stock records`);
      
      if (allRecords.length === 0) {
        console.log('  No stock records found. Skipping.');
        continue;
      }
      
      // Verify each record
      for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i];
        console.log(`  Verifying record for ${record.date.toISOString().split('T')[0]}:`);
        
        let expectedOpeningStock = 0;
        
        // For the first record, use 0 as opening stock (no fallback to PM Store value)
        if (i === 0) {
          expectedOpeningStock = 0;
          console.log(`    First record - expected opening stock (no fallback): ${expectedOpeningStock}`);
        } else {
          // For subsequent records, use previous day's closing stock
          expectedOpeningStock = allRecords[i-1].closingStock;
          console.log(`    Expected opening stock (previous closing): ${expectedOpeningStock}`);
        }
        
        // Check if opening stock matches
        if (record.openingStock !== expectedOpeningStock) {
          console.log(`    *** ISSUE FOUND: Opening stock mismatch!`);
          console.log(`      Expected: ${expectedOpeningStock}, Actual: ${record.openingStock}`);
          issuesFound++;
        } else {
          console.log(`    ✓ Opening stock is correct: ${record.openingStock}`);
        }
        
        // Calculate expected inward stock (GRN) for this date
        let expectedInward = 0;
        grns.forEach(grn => {
          const grnDate = new Date(grn.dateReceived);
          grnDate.setHours(0, 0, 0, 0);
          
          if (grnDate.getTime() === record.date.getTime()) {
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
                // Add both normal received quantity and extra received quantity
                expectedInward += (item.receivedQuantity || 0) + (item.extraReceivedQty || 0);
              }
            });
          }
        });
        
        // Check if inward stock matches
        if (record.inward !== expectedInward) {
          console.log(`    *** ISSUE FOUND: Inward stock mismatch!`);
          console.log(`      Expected: ${expectedInward}, Actual: ${record.inward}`);
          issuesFound++;
        } else {
          console.log(`    ✓ Inward stock is correct: ${record.inward}`);
        }
        
        // Calculate expected outward stock (Delivery Challan) for this date
        let expectedOutward = 0;
        deliveryChallans.forEach(dc => {
          const dcDate = new Date(dc.date);
          dcDate.setHours(0, 0, 0, 0);
          
          if (dcDate.getTime() === record.date.getTime()) {
            dc.materials.forEach(dcMaterial => {
              if (dcMaterial.material_name === material.name) {
                expectedOutward += dcMaterial.total_qty;
              }
            });
          }
        });
        
        // Check if outward stock matches
        if (record.outward !== expectedOutward) {
          console.log(`    *** ISSUE FOUND: Outward stock mismatch!`);
          console.log(`      Expected: ${expectedOutward}, Actual: ${record.outward}`);
          issuesFound++;
        } else {
          console.log(`    ✓ Outward stock is correct: ${record.outward}`);
        }
        
        // Calculate expected closing stock
        const expectedClosingStock = expectedOpeningStock + expectedInward - expectedOutward;
        
        // Check if closing stock matches
        if (record.closingStock !== expectedClosingStock) {
          console.log(`    *** ISSUE FOUND: Closing stock mismatch!`);
          console.log(`      Expected: ${expectedClosingStock}, Actual: ${record.closingStock}`);
          console.log(`      Calculation: ${expectedOpeningStock} + ${expectedInward} - ${expectedOutward} = ${expectedClosingStock}`);
          issuesFound++;
        } else {
          console.log(`    ✓ Closing stock is correct: ${record.closingStock}`);
          console.log(`      Calculation: ${expectedOpeningStock} + ${expectedInward} - ${expectedOutward} = ${expectedClosingStock}`);
        }
      }
    }
    
    console.log(`\nVerification completed.`);
    if (issuesFound === 0) {
      console.log('✓ All stock calculations are correct!');
    } else {
      console.log(`*** ${issuesFound} issues found in stock calculations ***`);
    }
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error verifying stock calculations:', error);
    mongoose.connection.close();
  }
};

// Run the verification
verifyStockCalculation();