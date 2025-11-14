const axios = require('axios');

// Test the product mapping API endpoints
async function testAPIEndpoint() {
    const baseURL = 'http://localhost:5001/api';
    
    try {
        // Test creating a product mapping
        const productMapping1 = {
            product_name: "Sampradayam 12 Cup Sambrani",
            materials: [
                { material_name: "Cup Sambrani", qty_per_carton: 1728 },
                { material_name: "Printing Box", qty_per_carton: 144 },
                { material_name: "Dozen Box", qty_per_carton: 12 },
                { material_name: "Master Cartons", qty_per_carton: 1 }
            ]
        };
        
        console.log('Creating first product mapping...');
        const response1 = await axios.post(`${baseURL}/product-mapping`, productMapping1);
        console.log('First mapping created successfully:', response1.data.product_name);
        
        // Try to create a duplicate (should fail)
        console.log('\nTrying to create duplicate product mapping...');
        try {
            const response2 = await axios.post(`${baseURL}/product-mapping`, productMapping1);
            console.log('ERROR: Duplicate mapping was saved when it should have failed');
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message === 'Duplicate product mapping already exists.') {
                console.log('SUCCESS: Duplicate mapping correctly rejected with message:', error.response.data.message);
            } else {
                console.log('ERROR: Unexpected error:', error.response ? error.response.data : error.message);
            }
        }
        
        // Test getting all product mappings
        console.log('\nGetting all product mappings...');
        const getAllResponse = await axios.get(`${baseURL}/product-mapping`);
        console.log(`Found ${getAllResponse.data.length} product mappings`);
        
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.log('Test failed with error:');
        console.log('Status:', error.response?.status);
        console.log('Data:', error.response?.data);
        console.log('Message:', error.message);
    }
}

testAPIEndpoint();