// backend/test-controller.js - Simple test to verify our controller works
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testController() {
  try {
    console.log('🧪 TESTING BACKEND CONTROLLER');
    console.log('==============================');

    const userId = '68161f881e8f530e01bef870';
    const query = 'Sarah';

    // Simulate the exact query from the controller
    const sqlQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.email,
        r.direct_phone,
        r.mobile_phone,
        r.title,
        r.linkedin_url,
        r.experience_years,
        r.last_active_date,
        r.rating,
        r.current_company_id,
        r.industry_id,
        r.location_id,
        -- Check if user has contacted this recruiter
        oh.last_contact_date,
        oh.status as outreach_status
      FROM recruiters r
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      WHERE r.is_active = true
        AND (
          COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '') ILIKE $2 OR
          COALESCE(r.title, '') ILIKE $2
        )
      ORDER BY r.first_name ASC
      LIMIT 20 OFFSET 0
    `;

    const queryParams = [userId, `%${query}%`];

    console.log('🗄️ Testing exact controller query...');
    console.log('📝 SQL Query:', sqlQuery.replace(/\s+/g, ' ').trim());
    console.log('📝 Query Params:', queryParams);

    const result = await pool.query(sqlQuery, queryParams);
    
    console.log(`📊 Query returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log('✅ SUCCESS: Found results!');
      console.log('👥 Sample results:');
      result.rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name} - ${row.title}`);
      });
    } else {
      console.log('❌ PROBLEM: No results found');
    }

    // Test count query
    const countQuery = `
      SELECT COUNT(*) as count FROM recruiters r 
      WHERE r.is_active = true
        AND (
          COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '') ILIKE $1 OR
          COALESCE(r.title, '') ILIKE $1
        )
    `;

    const countResult = await pool.query(countQuery, [`%${query}%`]);
    console.log(`📊 Count query returned: ${countResult.rows[0].count}`);

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testController();