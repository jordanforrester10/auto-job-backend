require('dotenv').config();
const axios = require('axios');

async function discoverWorkingEndpoint() {
  const baseUrl = 'https://active-jobs-db.p.rapidapi.com';
  const headers = {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'active-jobs-db.p.rapidapi.com'
  };

  const endpointsToTest = [
    '/get-jobs-7-days',
    '/get-jobs-24h', 
    '/jobs',
    '',  // Root endpoint
    '/search',
    '/api/jobs',
    '/v1/jobs'
  ];

  console.log('🔍 Testing Active Jobs DB endpoints...\n');

  for (const endpoint of endpointsToTest) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Testing: ${url}`);
      
      const response = await axios.get(url, {
        params: { limit: 1 },
        headers,
        timeout: 10000
      });

      console.log(`✅ SUCCESS: ${endpoint || 'ROOT'}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response keys: ${Object.keys(response.data)}`);
      console.log(`   Sample data: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
      
      return endpoint; // Return first working endpoint

    } catch (error) {
      console.log(`❌ FAILED: ${endpoint || 'ROOT'} - ${error.response?.status || error.message}`);
    }
  }

  console.log('\n❌ No working endpoints found!');
  return null;
}

discoverWorkingEndpoint();