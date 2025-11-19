// Test script to verify WIP update functionality
const mongoose = require('mongoose');
const PackingMaterial = require('./models/PackingMaterial');
const DeliveryChallan = require('./models/DeliveryChallan');

// Load environment variables
require('dotenv').config();

const testWIPUpdate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Create a test material if it doesn't exist
    let material = await PackingMaterial.findOne({ name: 'Test Material' });
    if (!material) {
      material = new PackingMaterial({
        itemCode: 'PM-99999',
        name: 'Test Material',
        quantity: 100,
        availableQty: 100,
        jobberQty: 0,
        usedQty: 0,
        ownUnitWIP: 0,
        jobberWIP: 0,
        isWithJobber: false,
        perQuantityPrice: 10,
        unit: 'pcs',
        stockAlertThreshold: 10,
        brandType: 'own',
        date: new Date()
      });
      
      // Add initial stock entry to price history
      material.priceHistory.push({
        date: new Date(),
        type: 'Existing Stock',
        supplier: 'Initial Stock (Test)',
        poNumber: 'N/A',
        grnNumber: 'N/A',
        qty: 100,
        unitPrice: 10,
        total: 1000
      });
      
      await material.save();
      console.log('Created test material:', material.name);
    } else {
      console.log('Using existing test material:', material.name);
    }
    
    // Display initial WIP values
    console.log('Initial WIP values:');
    console.log('  Own Unit WIP:', material.ownUnitWIP);
    console.log('  Jobber WIP:', material.jobberWIP);
    console.log('  PM Store Quantity:', material.quantity);
    
    // Create a test delivery challan
    const testDC = new DeliveryChallan({
      dc_no: 'DC-TEST-001',
      unit_type: 'Own Unit',
      product_name: 'Test Product',
      carton_qty: 2,
      materials: [{
        material_name: 'Test Material',
        qty_per_carton: 5,
        total_qty: 10
      }],
      status: 'Pending',
      reference_type: 'Own Unit',
      date: new Date(),
      remarks: 'Test DC for WIP verification'
    });
    
    await testDC.save();
    console.log('Created test delivery challan:', testDC.dc_no);
    
    // Manually update the material's WIP fields (simulating what happens in createDeliveryChallan)
    const updatedMaterial = await PackingMaterial.findOneAndUpdate(
      { name: 'Test Material' },
      {
        $inc: {
          quantity: -10,
          usedQty: 10,
          ownUnitWIP: 10
        }
      },
      { new: true }
    );
    
    console.log('Updated material after DC creation:');
    console.log('  Own Unit WIP:', updatedMaterial.ownUnitWIP);
    console.log('  Jobber WIP:', updatedMaterial.jobberWIP);
    console.log('  PM Store Quantity:', updatedMaterial.quantity);
    
    // Verify the WIP values are correct
    if (updatedMaterial.ownUnitWIP === 10 && updatedMaterial.quantity === 90) {
      console.log('✅ WIP update test PASSED');
    } else {
      console.log('❌ WIP update test FAILED');
      console.log('Expected Own Unit WIP: 10, Actual:', updatedMaterial.ownUnitWIP);
      console.log('Expected PM Store Quantity: 90, Actual:', updatedMaterial.quantity);
    }
    
    // Clean up test data
    await DeliveryChallan.deleteOne({ dc_no: 'DC-TEST-001' });
    await PackingMaterial.deleteOne({ name: 'Test Material' });
    console.log('Cleaned up test data');
    
    process.exit(0);
  } catch (error) {
    console.error('Error in WIP update test:', error);
    process.exit(1);
  }
};

// Run the test
testWIPUpdate();