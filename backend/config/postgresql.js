// backend/config/postgresql.js
const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: {
    rejectUnauthorized: false // Required for Neon and many other cloud PostgreSQL providers
  }
});

// Test connection function
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    return false;
  } finally {
    if (client) client.release();
  }
};

// Execute when module is loaded to test the connection
testConnection();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};