// backend/tests/test-neon-connection.js
require('dotenv').config();
const db = require('../config/postgresql');

const testNeonConnection = async () => {
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log('Current server time:', result.rows[0].current_time);
    
    // Test creating a simple table
    await db.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Test table created successfully');
    
    // Insert a test record
    const insertResult = await db.query(
      'INSERT INTO connection_test (test_message) VALUES ($1) RETURNING *',
      ['Connection test from job application platform']
    );
    console.log('Test record inserted:', insertResult.rows[0]);
    
    // Query the test record
    const records = await db.query('SELECT * FROM connection_test');
    console.log('All test records:', records.rows);
    
    console.log('Neon PostgreSQL connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Neon PostgreSQL connection test failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

testNeonConnection();