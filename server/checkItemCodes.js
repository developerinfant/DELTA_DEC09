const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ProductStock = require('./models/ProductStock');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const checkItemCodes = async () => {
    try {
        await connectDB();
        
        // Get all product stocks
        const productStocks = await ProductStock.find({});
        console.log('Total products:', productStocks.length);
        
        // Count products without itemCode
        const withoutItemCode = productStocks.filter(s => !s.itemCode);
        console.log('Products without itemCode:', withoutItemCode.length);
        
        if (withoutItemCode.length > 0) {
            console.log('Sample products without itemCode:');
            withoutItemCode.slice(0, 5).forEach(s => {
                console.log(`  - ${s.productName}: ${s.itemCode || 'NULL'}`);
            });
        }
        
        // Count products with itemCode
        const withItemCode = productStocks.filter(s => s.itemCode);
        console.log('Products with itemCode:', withItemCode.length);
        
        if (withItemCode.length > 0) {
            console.log('Sample products with itemCode:');
            withItemCode.slice(0, 5).forEach(s => {
                console.log(`  - ${s.productName}: ${s.itemCode}`);
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

checkItemCodes();