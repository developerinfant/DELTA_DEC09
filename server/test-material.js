const axios = require('axios');

// Test adding a new material
async function testAddMaterial() {
  try {
    const response = await axios.post('http://localhost:5001/api/materials', {
      name: 'Test Material',
      quantity: 2,
      perQuantityPrice: 5,
      stockAlertThreshold: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2ZjQ3ZjQwYjQ1YjQ0YjFiYjQ0YjQ0YiIsImlhdCI6MTcyNzI4MzIwMCwiZXhwIjoxNzI3MzY5NjAwfQ.5Z7X5Z7X5Z7X5Z7X5Z7X5Z7X5Z7X5Z7X5Z7X5Z7X5Z7'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAddMaterial();