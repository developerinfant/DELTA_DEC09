const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ProductStock = require('./models/ProductStock');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const simpleItemCodeTest = async () => {
    try {
        await connectDB();
        
        // Get all product stocks
        const productStocks = await ProductStock.find({});
        console.log('Total products:', productStocks.length);
        
        let hasMissingItemCodes = false;
        
        console.log('\nProduct Item Codes:');
        productStocks.forEach(product => {
            const itemCode = product.itemCode || 'N/A';
            if (itemCode === 'N/A') {
                hasMissingItemCodes = true;
            }
            console.log(`${itemCode} - ${product.productName}`);
        });
        
        if (hasMissingItemCodes) {
            console.log('\n❌ ISSUE: Found products with missing item codes!');
        } else {
            console.log('\n✅ SUCCESS: All products have valid item codes!');
        }
        
        // Disconnect
        mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

simpleItemCodeTest();