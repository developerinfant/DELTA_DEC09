const axios = require('axios');

// Test the jobber batch endpoint
async function testAPI() {
    try {
        console.log('Testing jobber batch endpoint...');
        
        const response = await axios.post('http://localhost:5001/api/stock/jobber/batch', {
            productName: 'Test Product',
            jobberName: 'Test Jobber',
            rawMaterials: [],
            packingMaterials: [],
            notes: 'Test notes'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testAPI();