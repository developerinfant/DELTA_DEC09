const cron = require('node-cron');
const PackingMaterial = require('../models/PackingMaterial');
const PackingMaterialStockRecord = require('../models/PackingMaterialStockRecord');
const StockCaptureConfig = require('../models/StockCaptureConfig');

// Configuration for opening and closing stock capture times
// Will be loaded from database
let openingTime = '0 9 * * *'; // 9:00 AM daily
let closingTime = '0 21 * * *'; // 9:00 PM daily

// Function to load configuration from database
const loadConfig = async () => {
  try {
    const config = await StockCaptureConfig.getConfig();
    openingTime = config.openingTime;
    closingTime = config.closingTime;
    console.log(`Stock capture configuration loaded: Opening at ${openingTime}, Closing at ${closingTime}`);
  } catch (error) {
    console.error('Error loading stock capture configuration:', error);
  }
};

// Function to set custom opening and closing times
const setStockCaptureTimes = async (opening, closing) => {
  openingTime = opening;
  closingTime = closing;
  
  // Save to database
  try {
    let config = await StockCaptureConfig.getConfig();
    config.openingTime = opening;
    config.closingTime = closing;
    await config.save();
    console.log(`Stock capture times updated in database: Opening at ${opening}, Closing at ${closing}`);
  } catch (error) {
    console.error('Error saving stock capture configuration:', error);
  }
};

// Function to capture opening stock for all packing materials
const captureOpeningStock = async () => {
  try {
    console.log('Capturing opening stock for all packing materials...');
    
    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all packing materials
    const materials = await PackingMaterial.find({});
    
    // For each material, capture the current quantity as opening stock
    for (const material of materials) {
      // Check if a record already exists for today
      const existingRecord = await PackingMaterialStockRecord.findOne({
        materialId: material._id,
        date: today
      });
      
      if (existingRecord) {
        // If record exists, update the opening stock
        existingRecord.openingStock = material.quantity;
        await existingRecord.save();
      } else {
        // If no record exists, create a new one
        const stockRecord = new PackingMaterialStockRecord({
          materialId: material._id,
          materialName: material.name,
          date: today,
          openingStock: material.quantity,
          closingStock: material.quantity, // Initialize closing stock to same value
          inward: 0,
          outward: 0,
          unit: material.unit || 'pcs'
        });
        
        await stockRecord.save();
      }
    }
    
    console.log('Opening stock capture completed successfully.');
  } catch (error) {
    console.error('Error capturing opening stock:', error);
  }
};

// Function to capture closing stock for all packing materials
const captureClosingStock = async () => {
  try {
    console.log('Capturing closing stock for all packing materials...');
    
    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all packing materials
    const materials = await PackingMaterial.find({});
    
    // For each material, capture the current quantity as closing stock
    for (const material of materials) {
      // Check if a record already exists for today
      const existingRecord = await PackingMaterialStockRecord.findOne({
        materialId: material._id,
        date: today
      });
      
      if (existingRecord) {
        // If record exists, update the closing stock
        existingRecord.closingStock = material.quantity;
        await existingRecord.save();
      } else {
        // If no record exists, create a new one
        const stockRecord = new PackingMaterialStockRecord({
          materialId: material._id,
          materialName: material.name,
          date: today,
          openingStock: material.quantity, // Initialize opening stock to current value
          closingStock: material.quantity,
          inward: 0,
          outward: 0,
          unit: material.unit || 'pcs'
        });
        
        await stockRecord.save();
      }
    }
    
    console.log('Closing stock capture completed successfully.');
  } catch (error) {
    console.error('Error capturing closing stock:', error);
  }
};

// Schedule the jobs
const scheduleStockCapture = async () => {
  // Load configuration from database
  await loadConfig();
  
  // Schedule opening stock capture
  cron.schedule(openingTime, captureOpeningStock, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  // Schedule closing stock capture
  cron.schedule(closingTime, captureClosingStock, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  console.log(`Stock capture scheduled: Opening at ${openingTime}, Closing at ${closingTime}`);
};

module.exports = {
  scheduleStockCapture,
  setStockCaptureTimes,
  captureOpeningStock,
  captureClosingStock
};