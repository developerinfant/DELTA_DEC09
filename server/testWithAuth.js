const axios = require('axios');

// Test the product mapping API with authentication
async function testWithAuth() {
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

testWithAuth();