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

// Helper function to generate item code
const generateItemCode = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const yearPrefix = `FG-${currentYear}-`;
        
        // Find the latest item code for the current year
        const latestProductStock = await ProductStock
            .findOne({ itemCode: new RegExp(`^${yearPrefix}`) })
            .sort({ itemCode: -1 });
        
        let nextSequence = 1;
        
        if (latestProductStock && latestProductStock.itemCode) {
            // Extract the sequence number from the last code
            const lastSequence = parseInt(latestProductStock.itemCode.split('-')[2]);
            if (!isNaN(lastSequence)) {
                nextSequence = lastSequence + 1;
            }
        }
        
        // Format the sequence with leading zeros (4 digits)
        const sequence = nextSequence.toString().padStart(4, '0');
        return `${yearPrefix}${sequence}`;
    } catch (error) {
        console.error('Error generating item code:', error);
        throw error;
    }
};

const fixMissingItemCodes = async () => {
    try {
        await connectDB();
        
        // Find all product stocks without itemCode
        const productStocksWithoutCode = await ProductStock.find({ itemCode: { $exists: false } });
        console.log(`Found ${productStocksWithoutCode.length} products without itemCode`);
        
        // Update each product with a new itemCode
        for (const productStock of productStocksWithoutCode) {
            const newItemCode = await generateItemCode();
            productStock.itemCode = newItemCode;
            await productStock.save();
            console.log(`Assigned itemCode ${newItemCode} to product ${productStock.productName}`);
        }
        
        console.log('All missing itemCodes have been fixed!');
        
        // Disconnect
        mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

fixMissingItemCodes();