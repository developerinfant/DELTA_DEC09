const axios = require('axios');

// Test the product mapping API with detailed error logging
async function debugProductMapping() {
    const baseURL = 'http://localhost:5001/api';
    
    try {
        // Test creating a product mapping without authentication first
        const productMapping = {
            product_name: "Sampradayam 12 Cup Sambrani",
            materials: [
                { material_name: "Cup Sambrani", qty_per_carton: 1728 },
                { material_name: "Printing Box", qty_per_carton: 144 },
                { material_name: "Dozen Box", qty_per_carton: 12 },
                { material_name: "Master Cartons", qty_per_carton: 1 }
            ]
        };
        
        console.log('Testing product mapping endpoint...');
        const response = await axios.post(`${baseURL}/product-mapping`, productMapping);
        console.log('Success:', response.data);
    } catch (error) {
        console.log('Error details:');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Headers:', error.response?.headers);
        console.log('Data:', error.response?.data);
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
    }
}

debugProductMapping();