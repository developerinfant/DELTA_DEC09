const mongoose = require('mongoose');
const ProductStock = require('./models/ProductStock');
const { updateProductStockWithNewQuantity } = require('./utils/stockUpdate');

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/delta_tv_test';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

// Mock delivery challan object
const mockDC = {
    product_name: 'Test Product FG-001',
    unit_type: 'Own Unit',
    carton_qty: 40
};

// Mock delivery challan object for jobber
const mockDCJobber = {
    product_name: 'Test Product FG-002',
    unit_type: 'Jobber',
    carton_qty: 20
};

async function testStockUpdate() {
    try {
        console.log('Testing stock update functionality...');
        
        // Test 1: Create initial stock
        console.log('\nTest 1: Creating initial stock with 40 cartons');
        const result1 = await updateProductStockWithNewQuantity(mockDC, 40, 'Test User');
        console.log(`Initial stock created: ${result1.available_cartons} cartons`);
        
        // Test 2: Add more stock to existing product
        console.log('\nTest 2: Adding 20 more cartons to existing product');
        const result2 = await updateProductStockWithNewQuantity(mockDC, 20, 'Test User');
        console.log(`Stock after increment: ${result2.available_cartons} cartons`);
        
        // Test 3: Create stock for jobber unit
        console.log('\nTest 3: Creating stock for jobber unit with 20 cartons');
        const result3 = await updateProductStockWithNewQuantity(mockDCJobber, 20, 'Test User');
        console.log(`Jobber stock created: ${result3.available_cartons} cartons`);
        
        // Test 4: Add more stock to jobber product
        console.log('\nTest 4: Adding 30 more cartons to jobber product');
        const result4 = await updateProductStockWithNewQuantity(mockDCJobber, 30, 'Test User');
        console.log(`Jobber stock after increment: ${result4.available_cartons} cartons`);
        
        // Verify the results
        console.log('\nVerification:');
        console.log(`Test Product FG-001 should have 60 cartons (40 + 20): ${result2.available_cartons === 60 ? 'PASS' : 'FAIL'}`);
        console.log(`Test Product FG-002 should have 50 cartons (20 + 30): ${result4.available_cartons === 50 ? 'PASS' : 'FAIL'}`);
        
        // Clean up test data
        await ProductStock.deleteMany({ 
            productName: { $in: ['Test Product FG-001', 'Test Product FG-002'] } 
        });
        
        console.log('\nTest completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testStockUpdate();