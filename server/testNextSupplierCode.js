const axios = require('axios');
require('dotenv').config();

// Test the next supplier code endpoint
const testNextSupplierCode = async () => {
  try {
    // First, let's login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Now test the next supplier code endpoint
    const response = await axios.get('http://localhost:5001/api/suppliers/next-supplier-code', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Next supplier code:', response.data);
  } catch (error) {
    console.error('Error testing next supplier code endpoint:', error.response?.data || error.message);
  }
};

testNextSupplierCode();