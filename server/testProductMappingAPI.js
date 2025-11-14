const axios = require('axios');

// Test the product mapping API
async function testProductMapping() {
    const baseURL = 'http://localhost:5001/api';
    
    try {
        // Test creating a product mapping
        const productMapping = {
            product_name: "Sampradayam 12 Cup Sambrani",
            materials: [
                { material_name: "Cup Sambrani", qty_per_carton: 1728 },
                { material_name: "Printing Box", qty_per_carton: 144 },
                { material_name: "Dozen Box", qty_per_carton: 12 },
                { material_name: "Master Cartons", qty_per_carton: 1 }
            ]
        };
        
        console.log('Creating product mapping...');
        const createResponse = await axios.post(`${baseURL}/product-mapping`, productMapping);
        console.log('Create Response:', createResponse.data);
        
        // Test getting all product mappings
        console.log('\nGetting all product mappings...');
        const getAllResponse = await axios.get(`${baseURL}/product-mapping`);
        console.log('Get All Response:', getAllResponse.data);
        
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testProductMapping();