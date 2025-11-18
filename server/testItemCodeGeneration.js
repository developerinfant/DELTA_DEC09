const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('./models/PackingMaterial');

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

// Test item code generation for different brands
const testItemCodeGeneration = async () => {
    try {
        await connectDB();
        console.log('Testing item code generation for different brands...');
        
        // Clean up any existing test materials
        await PackingMaterial.deleteMany({ name: { $regex: 'Item Code Test*' } });
        console.log('Cleaned up existing test materials');
        
        // Create first material for own brand
        const ownBrandMaterial1 = new PackingMaterial({
            itemCode: 'PM-00001',
            name: 'Item Code Test - Own Brand 1',
            quantity: 100,
            perQuantityPrice: 10,
            stockAlertThreshold: 20,
            unit: 'pcs',
            brandType: 'own'
        });
        
        await ownBrandMaterial1.save();
        console.log('Created first own brand material with item code:', ownBrandMaterial1.itemCode);
        
        // Create first material for other brand
        const otherBrandMaterial1 = new PackingMaterial({
            itemCode: 'PM-00001',
            name: 'Item Code Test - Other Brand 1',
            quantity: 50,
            perQuantityPrice: 15,
            stockAlertThreshold: 10,
            unit: 'pcs',
            brandType: 'other'
        });
        
        await otherBrandMaterial1.save();
        console.log('Created first other brand material with item code:', otherBrandMaterial1.itemCode);
        
        // Create second material for own brand (should get PM-00002)
        const latestOwnBrand = await PackingMaterial
            .findOne({ brandType: 'own' }, {}, { sort: { 'createdAt': -1 } })
            .select('itemCode');
        
        let nextCounter = 1;
        if (latestOwnBrand && latestOwnBrand.itemCode) {
            const lastNumber = parseInt(latestOwnBrand.itemCode.split('-')[1]);
            if (!isNaN(lastNumber)) {
                nextCounter = lastNumber + 1;
            }
        }
        
        const formattedCounter = nextCounter.toString().padStart(5, '0');
        const nextItemCode = `PM-${formattedCounter}`;
        
        const ownBrandMaterial2 = new PackingMaterial({
            itemCode: nextItemCode,
            name: 'Item Code Test - Own Brand 2',
            quantity: 75,
            perQuantityPrice: 12,
            stockAlertThreshold: 15,
            unit: 'pcs',
            brandType: 'own'
        });
        
        await ownBrandMaterial2.save();
        console.log('Created second own brand material with item code:', ownBrandMaterial2.itemCode);
        
        // Create second material for other brand (should get PM-00002)
        const latestOtherBrand = await PackingMaterial
            .findOne({ brandType: 'other' }, {}, { sort: { 'createdAt': -1 } })
            .select('itemCode');
        
        let nextOtherCounter = 1;
        if (latestOtherBrand && latestOtherBrand.itemCode) {
            const lastNumber = parseInt(latestOtherBrand.itemCode.split('-')[1]);
            if (!isNaN(lastNumber)) {
                nextOtherCounter = lastNumber + 1;
            }
        }
        
        const formattedOtherCounter = nextOtherCounter.toString().padStart(5, '0');
        const nextOtherItemCode = `PM-${formattedOtherCounter}`;
        
        const otherBrandMaterial2 = new PackingMaterial({
            itemCode: nextOtherItemCode,
            name: 'Item Code Test - Other Brand 2',
            quantity: 60,
            perQuantityPrice: 18,
            stockAlertThreshold: 12,
            unit: 'pcs',
            brandType: 'other'
        });
        
        await otherBrandMaterial2.save();
        console.log('Created second other brand material with item code:', otherBrandMaterial2.itemCode);
        
        // Verify that both brands have their own sequence
        const ownBrandMaterials = await PackingMaterial.find({ brandType: 'own', name: { $regex: 'Item Code Test*' } });
        const otherBrandMaterials = await PackingMaterial.find({ brandType: 'other', name: { $regex: 'Item Code Test*' } });
        
        console.log('\nOwn Brand Materials:');
        ownBrandMaterials.forEach(material => {
            console.log(`  ${material.name}: ${material.itemCode}`);
        });
        
        console.log('\nOther Brand Materials:');
        otherBrandMaterials.forEach(material => {
            console.log(`  ${material.name}: ${material.itemCode}`);
        });
        
        // Verification
        const ownBrandCodes = ownBrandMaterials.map(m => m.itemCode).sort();
        const otherBrandCodes = otherBrandMaterials.map(m => m.itemCode).sort();
        
        console.log('\nVerification:');
        console.log(`Own Brand Item Codes: ${ownBrandCodes.join(', ')}`);
        console.log(`Other Brand Item Codes: ${otherBrandCodes.join(', ')}`);
        
        const isCorrect = 
            ownBrandCodes.length === 2 && 
            ownBrandCodes[0] === 'PM-00001' && 
            ownBrandCodes[1] === 'PM-00002' &&
            otherBrandCodes.length === 2 && 
            otherBrandCodes[0] === 'PM-00001' && 
            otherBrandCodes[1] === 'PM-00002';
        
        if (isCorrect) {
            console.log('\n✅ SUCCESS: Item codes are correctly generated for each brand!');
        } else {
            console.log('\n❌ FAILURE: Item codes are not correctly generated for each brand.');
        }
        
        // Clean up test materials
        await PackingMaterial.deleteMany({ name: { $regex: 'Item Code Test*' } });
        console.log('\nCleaned up test materials');
        
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
};

testItemCodeGeneration();