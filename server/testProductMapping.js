const axios = require('axios');

// Test the product mapping API
async function testProductMapping() {
    const baseURL = 'http://localhost:5001/api';
    
    try {
        // First, login to get a token
        console.log('Logging in...');
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
            email: 'techvaseegrah@gmail.com',
            password: 'your_password_here'  // Replace with actual password
        });
        
        const token = loginResponse.data.token;
        console.log('Login successful, token received.');
        
        // Set up axios with the authorization header
        const api = axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
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
        const createResponse = await api.post('/product-mapping', productMapping);
        console.log('Create Response:', createResponse.data);
        
        // Test getting all product mappings
        console.log('\nGetting all product mappings...');
        const getAllResponse = await api.get('/product-mapping');
        console.log('Get All Response:', getAllResponse.data);
        
        // Test getting a specific product mapping
        if (createResponse.data._id) {
            console.log('\nGetting specific product mapping...');
            const getResponse = await api.get(`/product-mapping/${createResponse.data._id}`);
            console.log('Get Response:', getResponse.data);
        }
        
        // Test updating a product mapping
        if (createResponse.data._id) {
            console.log('\nUpdating product mapping...');
            const updateData = {
                product_name: "Sampradayam 12 Cup Sambrani - Updated",
                materials: [
                    { material_name: "Cup Sambrani", qty_per_carton: 1728 },
                    { material_name: "Printing Box", qty_per_carton: 144 },
                    { material_name: "Dozen Box", qty_per_carton: 12 }
                ]
            };
            const updateResponse = await api.put(`/product-mapping/${createResponse.data._id}`, updateData);
            console.log('Update Response:', updateResponse.data);
        }
        
        // Test deleting a product mapping
        if (createResponse.data._id) {
            console.log('\nDeleting product mapping...');
            const deleteResponse = await api.delete(`/product-mapping/${createResponse.data._id}`);
            console.log('Delete Response:', deleteResponse.data);
        }
        
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testProductMapping();