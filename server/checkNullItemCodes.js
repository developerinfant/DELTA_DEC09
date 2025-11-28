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

const checkNullItemCodes = async () => {
    try {
        await connectDB();
        
        // Find all product stocks with null itemCode
        const productStocksWithNullCode = await ProductStock.find({ itemCode: null });
        console.log(`Found ${productStocksWithNullCode.length} products with null itemCode`);
        
        if (productStocksWithNullCode.length > 0) {
            console.log('Products with null itemCode:');
            productStocksWithNullCode.forEach(s => {
                console.log(`  - ${s.productName}`);
            });
        }
        
        // Find all product stocks with empty string itemCode
        const productStocksWithEmptyCode = await ProductStock.find({ itemCode: "" });
        console.log(`Found ${productStocksWithEmptyCode.length} products with empty string itemCode`);
        
        if (productStocksWithEmptyCode.length > 0) {
            console.log('Products with empty string itemCode:');
            productStocksWithEmptyCode.forEach(s => {
                console.log(`  - ${s.productName}`);
            });
        }
        
        // Disconnect
        mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkNullItemCodes();