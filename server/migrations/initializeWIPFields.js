const mongoose = require('mongoose');
const PackingMaterial = require('../models/PackingMaterial');
const DeliveryChallan = require('../models/DeliveryChallan');

// Load environment variables
require('dotenv').config();

const initializeWIPFields = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Get all packing materials
    const materials = await PackingMaterial.find({});
    console.log(`Found ${materials.length} packing materials`);
    
    // Get all delivery challans
    const deliveryChallans = await DeliveryChallan.find({}).populate('supplier_id', 'name');
    console.log(`Found ${deliveryChallans.length} delivery challans`);
    
    // Process each material
    for (const material of materials) {
      let ownUnitWIP = 0;
      let jobberWIP = 0;
      
      // Calculate WIP from all DCs for this material
      deliveryChallans.forEach(dc => {
        const dcMaterial = dc.materials.find(m => m.material_name === material.name);
        if (dcMaterial) {
          if (dc.unit_type === 'Own Unit') {
            ownUnitWIP += dcMaterial.total_qty;
          } else if (dc.unit_type === 'Jobber') {
            jobberWIP += dcMaterial.total_qty;
          }
        }
      });
      
      // Update the material with calculated WIP values
      await PackingMaterial.findByIdAndUpdate(material._id, {
        ownUnitWIP: ownUnitWIP,
        jobberWIP: jobberWIP
      });
      
      console.log(`Updated ${material.name}: Own Unit WIP = ${ownUnitWIP}, Jobber WIP = ${jobberWIP}`);
    }
    
    console.log('WIP fields initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing WIP fields:', error);
    process.exit(1);
  }
};

// Run the migration
initializeWIPFields();