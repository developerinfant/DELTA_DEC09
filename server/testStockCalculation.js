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

const testStockCalculation = async () => {
  try {
    console.log('Testing stock calculation logic...');
    
    // Test with a specific date
    const testDate = new Date('2023-10-15');
    testDate.setHours(0, 0, 0, 0);
    
    console.log(`Testing for date: ${testDate.toISOString().split('T')[0]}`);
    
    // Get a sample material
    const material = await PackingMaterial.findOne({});
    if (!material) {
      console.log('No materials found in database');
      return;
    }
    
    console.log(`Testing with material: ${material.name}`);
    console.log(`Current PM Store quantity: ${material.quantity}`);
    
    // Check previous day's record
    const previousDate = new Date(testDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const previousRecord = await PackingMaterialStockRecord.findOne({
      materialId: material._id,
      date: previousDate
    });
    
    let openingStock = 0;
    if (previousRecord) {
      openingStock = previousRecord.closingStock;
      console.log(`Found previous record with closing stock: ${openingStock}`);
    } else {
      openingStock = material.quantity;
      console.log(`No previous record found, using PM Store value: ${openingStock}`);
    }
    
    // Calculate inward stock (GRN) for the test date
    let inward = 0;
    const grns = await GRN.find({});
    grns.forEach(grn => {
      const grnDate = new Date(grn.dateReceived);
      grnDate.setHours(0, 0, 0, 0);
      
      // Count all GRNs except those marked as Draft or Cancelled
      if (!['Draft', 'Cancelled'].includes(grn.status) && grnDate.getTime() === testDate.getTime()) {
        grn.items.forEach(item => {
          if ((item.material && item.material.toString() === material._id.toString()) || 
              (typeof item.material === 'string' && item.material === material.name)) {
            inward += item.receivedQuantity;
          }
        });
      }
    });
    
    console.log(`Inward stock (GRN) for test date: ${inward}`);
    
    // Calculate outward stock (Delivery Challan) for the test date
    let outward = 0;
    const deliveryChallans = await DeliveryChallan.find({});
    deliveryChallans.forEach(dc => {
      const dcDate = new Date(dc.date);
      dcDate.setHours(0, 0, 0, 0);
      
      if (dcDate.getTime() === testDate.getTime()) {
        dc.materials.forEach(dcMaterial => {
          if (dcMaterial.material_name === material.name) {
            outward += dcMaterial.total_qty;
          }
        });
      }
    });
    
    console.log(`Outward stock (DC) for test date: ${outward}`);
    
    // Calculate closing stock
    const closingStock = openingStock + inward - outward;
    console.log(`Calculated closing stock: ${openingStock} + ${inward} - ${outward} = ${closingStock}`);
    
    console.log('Stock calculation test completed successfully');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error testing stock calculation:', error);
    mongoose.connection.close();
  }
};

// Run the test
testStockCalculation();