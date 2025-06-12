// backend/tests/test-auth.js
require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const connectMongoDB = require('../config/mongodb');

const API_URL = 'http://localhost:5000/api';

// Helper function to make API requests
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Test user details
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: `testuser${Date.now()}@example.com`,
  password: 'Test@123456'
};

let token = null;

const runTests = async () => {
  try {
    console.log('Starting authentication tests...');
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Clean up any previous test users
    await mongoose.connection.collection('users').deleteMany({
      email: { $regex: /testuser.*@example.com/ }
    });
    
    // Test registration
    console.log('\nTesting user registration...');
    const registrationResponse = await api.post('/auth/register', testUser);
    console.log('Registration response status:', registrationResponse.status);
    console.log('Registration data:', registrationResponse.data);
    
    // Save token
    token = registrationResponse.data.token;
    
    // Test get current user
    console.log('\nTesting get current user...');
    const meResponse = await api.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Get me response status:', meResponse.status);
    console.log('User data:', meResponse.data);
    
    // Test logout
    console.log('\nTesting logout...');
    const logoutResponse = await api.post('/auth/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Logout response status:', logoutResponse.status);
    console.log('Logout data:', logoutResponse.data);
    
    // Test login
    console.log('\nTesting login...');
    const loginResponse = await api.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    console.log('Login response status:', loginResponse.status);
    console.log('Login data:', loginResponse.data);
    
    // Save new token
    token = loginResponse.data.token;
    
    // Test updating user details
    console.log('\nTesting update user details...');
    const updateResponse = await api.put('/auth/update-details', 
      { firstName: 'Updated', lastName: 'User' },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Update details response status:', updateResponse.status);
    console.log('Updated user data:', updateResponse.data);
    
    // Test updating password
    console.log('\nTesting update password...');
    const updatePasswordResponse = await api.put('/auth/update-password', 
      { 
        currentPassword: testUser.password,
        newPassword: 'NewTest@123456'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Update password response status:', updatePasswordResponse.status);
    console.log('Update password data:', updatePasswordResponse.data);
    
    // Test login with new password
    console.log('\nTesting login with new password...');
    const newLoginResponse = await api.post('/auth/login', {
      email: testUser.email,
      password: 'NewTest@123456'
    });
    console.log('New login response status:', newLoginResponse.status);
    console.log('New login data:', newLoginResponse.data);
    
    console.log('\nAll authentication tests completed successfully!');
  } catch (error) {
    console.error('Error in authentication tests:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  } finally {
    // Clean up test user
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.collection('users').deleteMany({
        email: testUser.email
      });
      console.log('\nTest user cleaned up');
      
      // Close the MongoDB connection
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    process.exit(0);
  }
};

runTests();