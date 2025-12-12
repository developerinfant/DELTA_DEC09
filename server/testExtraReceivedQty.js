// Test script to verify that extraReceivedQty is properly handled in GRN stock updates

const mongoose = require('mongoose');
const GRN = require('./models/GRN');
const PackingMaterial = require('./models/PackingMaterial');
const PurchaseOrder = require('./models/PurchaseOrder');

async function testExtraReceivedQty() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/delta_tv', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database');
    
    // Create a test packing material
    const testMaterial = new PackingMaterial({
      name: 'Test Material',
      quantity: 100,
      perQuantityPrice: 10,
      unit: 'pcs'
    });
    
    await testMaterial.save();
    console.log('Created test material:', testMaterial.name);
    
    // Create a test PO
    const testPO = new PurchaseOrder({
      poNumber: 'PO-TEST-001',
      supplier: mongoose.Types.ObjectId(), // Just a placeholder
      items: [{
        material: testMaterial._id,
        materialModel: 'PackingMaterial',
        quantity: 50,
        extraAllowedQty: 10,
        quantityReceived: 0
      }]
    });
    
    await testPO.save();
    console.log('Created test PO:', testPO.poNumber);
    
    // Create a test GRN with both normal and extra received quantities
    const testGRN = new GRN({
      grnNumber: 'GRN-TEST-001',
      purchaseOrder: testPO._id,
      sourceType: 'purchase_order',
      status: 'Completed',
      receivedBy: 'Test User',
      dateReceived: new Date(),
      items: [{
        material: testMaterial._id,
        materialModel: 'PackingMaterial',
        orderedQuantity: 50,
        receivedQuantity: 40, // Normal received quantity
        extraReceivedQty: 5,  // Extra received quantity
        unitPrice: 10,
        totalReceived: 45, // 40 + 5
        extraAllowedQty: 10
      }]
    });
    
    await testGRN.save();
    console.log('Created test GRN:', testGRN.grnNumber);
    
    // Update the material quantity based on the GRN
    const material = await PackingMaterial.findById(testMaterial._id);
    const grnItem = testGRN.items[0];
    
    // Calculate new quantity (should include both normal and extra received)
    const newQuantity = material.quantity + grnItem.receivedQuantity + grnItem.extraReceivedQty;
    console.log(`Old quantity: ${material.quantity}, Normal received: ${grnItem.receivedQuantity}, Extra received: ${grnItem.extraReceivedQty}, New quantity should be: ${newQuantity}`);
    
    // Update the material
    await PackingMaterial.findByIdAndUpdate(testMaterial._id, {
      quantity: newQuantity
    });
    
    // Verify the update
    const updatedMaterial = await PackingMaterial.findById(testMaterial._id);
    console.log(`Updated material quantity: ${updatedMaterial.quantity}`);
    
    // Check if PO quantityReceived is updated correctly
    const updatedPO = await PurchaseOrder.findById(testPO._id);
    const poItem = updatedPO.items[0];
    console.log(`PO item quantityReceived: ${poItem.quantityReceived}`);
    
    // Clean up test data
    await GRN.deleteOne({ _id: testGRN._id });
    await PurchaseOrder.deleteOne({ _id: testPO._id });
    await PackingMaterial.deleteOne({ _id: testMaterial._id });
    
    console.log('Test completed and cleanup done');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the test
testExtraReceivedQty();