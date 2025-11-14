const axios = require('axios');
require('dotenv').config();

// Test creating a supplier
const testCreateSupplier = async () => {
  try {
    // First, let's login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // First, let's get the next supplier code
    const nextCodeResponse = await axios.get('http://localhost:5001/api/suppliers/next-supplier-code', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Next supplier code:', nextCodeResponse.data);
    
    // Now test creating a supplier
    const supplierData = {
      name: "Test Supplier " + Date.now(), // Make it unique
      supplierType: "Packing",
      contactPerson: "John Doe",
      phoneNumber: "1234567890",
      email: "john" + Date.now() + "@example.com", // Make it unique
      address: "123 Main St"
    };
    
    console.log('Creating supplier with data:', supplierData);
    
    const response = await axios.post('http://localhost:5001/api/suppliers', supplierData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Supplier created:', response.data);
  } catch (error) {
    console.error('Error creating supplier:', error.response?.data || error.message);
  }
};

testCreateSupplier();