const axios = require('axios');

// Test the product mapping API endpoints
async function testProductMappings() {
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
        
        // Test getting all product mappings
        console.log('\nGetting all product mappings...');
        const getAllResponse = await axios.get(`${baseURL}/product-mapping`);
        console.log(`Found ${getAllResponse.data.length} product mappings`);
        
        // Display all mappings
        getAllResponse.data.forEach((mapping, index) => {
            console.log(`${index + 1}. ${mapping.product_name}`);
            mapping.materials.forEach(material => {
                console.log(`   - ${material.material_name} (${material.qty_per_carton})`);
            });
        });
        
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.log('Test failed with error:');
        console.log('Status:', error.response?.status);
        console.log('Data:', error.response?.data);
        console.log('Message:', error.message);
    }
}

testProductMappings();