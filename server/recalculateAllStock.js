const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PackingMaterial = require('./models/PackingMaterial');
const PackingMaterialStockRecord = require('./models/PackingMaterialStockRecord');
const DeliveryChallan = require('./models/DeliveryChallan');
const GRN = require('./models/GRN');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const recalculateAllStock = async () => {
  try {
    console.log('Recalculating all stock records...');
    
    // Get all packing materials
    const materials = await PackingMaterial.find({}).sort({ name: 1 });
    console.log(`Found ${materials.length} packing materials`);
    
    // Get all GRNs and DCs for proper calculation
    const grns = await GRN.find({}).populate('supplier', 'name');
    const deliveryChallans = await DeliveryChallan.find({});
    
    // Delete all existing stock records to start fresh
    await PackingMaterialStockRecord.deleteMany({});
    console.log('Deleted all existing stock records');
    
    // Get all unique dates from GRNs and DCs
    const dates = new Set();
    
    // Add dates from GRNs
    grns.forEach(grn => {
      const date = new Date(grn.dateReceived);
      date.setHours(0, 0, 0, 0);
      dates.add(date.getTime());
    });
    
    // Add dates from DCs
    deliveryChallans.forEach(dc => {
      const date = new Date(dc.date);
      date.setHours(0, 0, 0, 0);
      dates.add(date.getTime());
    });
    
    // Convert to sorted array
    const sortedDates = Array.from(dates).sort((a, b) => a - b);
    console.log(`Found ${sortedDates.length} unique dates with transactions`);
    
    let totalRecordsCreated = 0;
    
    // Process each material
    for (const material of materials) {
      console.log(`\nProcessing material: ${material.name}`);
      
      // Process each date in chronological order
      for (let i = 0; i < sortedDates.length; i++) {
        const dateTimestamp = sortedDates[i];
        const recordDate = new Date(dateTimestamp);
        
        // Calculate opening stock
        let openingStock = 0;
        if (i === 0) {
          // For the first date, use PM Store value
          openingStock = material.quantity;
        } else {
          // For subsequent dates, get the previous date's closing stock
          const previousDateTimestamp = sortedDates[i - 1];
          const previousRecord = await PackingMaterialStockRecord.findOne({
            materialId: material._id,
            date: new Date(previousDateTimestamp)
          });
          
          if (previousRecord) {
            openingStock = previousRecord.closingStock;
          } else {
            // Fallback to PM Store value if no previous record
            openingStock = material.quantity;
          }
        }
        
        // Calculate inward stock (GRN) for this date
        let inward = 0;
        grns.forEach(grn => {
          const grnDate = new Date(grn.dateReceived);
          grnDate.setHours(0, 0, 0, 0);
          
          if (grnDate.getTime() === dateTimestamp) {
            grn.items.forEach(item => {
              // Properly match materials
              let isMatchingMaterial = false;
              
              if (item.material) {
                // If item.material is an ObjectId, convert to string for comparison
                if (typeof item.material === 'object' && item.material.toString) {
                  isMatchingMaterial = item.material.toString() === material._id.toString();
                } 
                // If item.material is already a string, compare directly
                else if (typeof item.material === 'string') {
                  isMatchingMaterial = item.material === material.name || item.material === material._id.toString();
                }
              }
              
              if (isMatchingMaterial) {
                inward += item.receivedQuantity;
              }
            });
          }
        });
        
        // Calculate outward stock (Delivery Challan) for this date
        let outward = 0;
        deliveryChallans.forEach(dc => {
          const dcDate = new Date(dc.date);
          dcDate.setHours(0, 0, 0, 0);
          
          if (dcDate.getTime() === dateTimestamp) {
            dc.materials.forEach(dcMaterial => {
              if (dcMaterial.material_name === material.name) {
                outward += dcMaterial.total_qty;
              }
            });
          }
        });
        
        // Calculate closing stock using the correct formula
        // ClosingStock = OpeningStock + Today's GRN - Today's Delivery Challan
        // Ensure it's never negative
        const closingStock = Math.max(0, openingStock + inward - outward);
        
        // Create or update the stock record
        const stockRecord = new PackingMaterialStockRecord({
          materialId: material._id,
          materialName: material.name,
          date: recordDate,
          openingStock: openingStock,
          closingStock: closingStock,
          inward: inward,
          outward: outward,
          unit: material.unit || 'pcs'
        });
        
        await stockRecord.save();
        totalRecordsCreated++;
        
        console.log(`  Created record for ${recordDate.toISOString().split('T')[0]}: Opening=${openingStock}, Inward=${inward}, Outward=${outward}, Closing=${closingStock}`);
      }
    }
    
    console.log(`\nRecalculation completed. Created ${totalRecordsCreated} stock records.`);
    console.log('All stock records have been recalculated using the correct logic.');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error recalculating stock records:', error);
    mongoose.connection.close();
  }
};

// Run the recalculation
recalculateAllStock();