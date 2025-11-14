const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('../models/PackingMaterial');
const RawMaterial = require('../models/RawMaterial');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const addShopToMaterials = async () => {
    try {
        await connectDB();
        console.log('Starting migration to add shop field to materials...');
        
        // For this migration, we'll assign all existing materials to a default shop
        // In a real scenario, you might want to assign them based on some business logic
        const defaultShop = 'Main Shop';
        
        // Update all packing materials
        const packingResult = await PackingMaterial.updateMany(
            { shop: { $exists: false } },
            { $set: { shop: defaultShop } }
        );
        console.log(`Updated ${packingResult.modifiedCount} packing materials with shop: ${defaultShop}`);
        
        // Update all raw materials
        const rawResult = await RawMaterial.updateMany(
            { shop: { $exists: false } },
            { $set: { shop: defaultShop } }
        );
        console.log(`Updated ${rawResult.modifiedCount} raw materials with shop: ${defaultShop}`);
        
        // Update all managers to have the default shop if they don't have one
        const managersResult = await User.updateMany(
            { role: 'Manager', shop: { $exists: false } },
            { $set: { shop: defaultShop } }
        );
        console.log(`Updated ${managersResult.modifiedCount} managers with shop: ${defaultShop}`);
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
};

// Run the migration
if (process.argv[2] === 'run') {
    addShopToMaterials();
}