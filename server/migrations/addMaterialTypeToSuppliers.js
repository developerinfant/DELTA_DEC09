const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');

async function addMaterialTypeToSuppliers() {
    try {
        // Connect to MongoDB (adjust the connection string as needed)
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Get all suppliers
        const suppliers = await Supplier.find({});
        console.log(`Found ${suppliers.length} suppliers`);

        // Process each supplier
        for (const supplier of suppliers) {
            // Check if materialType is already set
            if (supplier.materialType) {
                console.log(`Supplier ${supplier.name} already has materialType: ${supplier.materialType}`);
                continue;
            }

            // Find purchase orders associated with this supplier
            const pos = await PurchaseOrder.find({ supplier: supplier._id });
            
            // Determine material type based on purchase order items
            let materialType = null;
            for (const po of pos) {
                if (po.items && po.items.length > 0) {
                    // Check the first item's materialModel to determine type
                    const item = po.items[0];
                    if (item.materialModel === 'PackingMaterial') {
                        materialType = 'packing';
                        break;
                    } else if (item.materialModel === 'RawMaterial') {
                        materialType = 'raw';
                        break;
                    }
                }
            }

            // If we couldn't determine from POs, default to packing
            if (!materialType) {
                materialType = 'packing';
            }

            // Update the supplier with the determined materialType
            supplier.materialType = materialType;
            await supplier.save();
            console.log(`Updated supplier ${supplier.name} with materialType: ${materialType}`);
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
addMaterialTypeToSuppliers();