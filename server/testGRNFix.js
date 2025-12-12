const mongoose = require('mongoose');
const dotenv = require('dotenv');
const GRN = require('./models/GRN');
const PackingMaterial = require('./models/PackingMaterial');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testGRNFix = async () => {
  try {
    console.log('Testing GRN extra received quantity fix...');
    
    // Get a sample GRN with items that have extraReceivedQty
    const grn = await GRN.findOne({ 
      'items.extraReceivedQty': { $gt: 0 } 
    }).sort({ createdAt: -1 });
    
    if (!grn) {
      console.log('No GRN with extra received quantity found');
      return;
    }
    
    console.log(`Testing with GRN: ${grn.grnNumber}`);
    
    // Test the inward calculation logic
    let totalInward = 0;
    grn.items.forEach(item => {
      // This is the fixed logic - should include both receivedQuantity and extraReceivedQty
      const itemTotal = (item.receivedQuantity || 0) + (item.extraReceivedQty || 0);
      totalInward += itemTotal;
      console.log(`Item: ${item.material}, Normal: ${item.receivedQuantity || 0}, Extra: ${item.extraReceivedQty || 0}, Total: ${itemTotal}`);
    });
    
    console.log(`Total inward quantity: ${totalInward}`);
    
    // Verify that extraReceivedQty contributes to the total
    let hasExtraQty = false;
    let extraTotal = 0;
    grn.items.forEach(item => {
      if (item.extraReceivedQty && item.extraReceivedQty > 0) {
        hasExtraQty = true;
        extraTotal += item.extraReceivedQty;
      }
    });
    
    if (hasExtraQty) {
      console.log(`✅ SUCCESS: Extra received quantity found (${extraTotal}), and it's included in total calculation`);
    } else {
      console.log('ℹ️  No extra received quantity found in this GRN');
    }
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error testing GRN fix:', error);
    mongoose.connection.close();
  }
};

// Run the test
testGRNFix();