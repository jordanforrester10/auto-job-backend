// backend/verify-controller.js - Test if the controller changes are working
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyControllerFix() {
  try {
    console.log('🧪 VERIFYING CONTROLLER FIX');
    console.log('=============================');

    const userId = '68161f881e8f530e01bef870';
    const query = 'Sarah';

    // Test the EXACT query from the controller (with COALESCE)
    console.log('\n1️⃣ TESTING MAIN QUERY WITH COALESCE:');
    
    let sqlQuery = `
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
    `;

    const queryParams = [userId.toString()];
    let paramIndex = 2;

    // Add the search filter exactly as it should be in the controller
    sqlQuery += ` AND (
      COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '') ILIKE $${paramIndex} OR
      COALESCE(r.title, '') ILIKE $${paramIndex}
    )`;
    queryParams.push(`%${query}%`);
    paramIndex++;

    // Add ordering
    sqlQuery += ` ORDER BY r.first_name ASC`;
    
    // Add pagination
    sqlQuery += ` LIMIT 20 OFFSET 0`;

    console.log('📝 Executing exact controller query...');
    console.log('📋 Params:', queryParams);
    
    const result = await pool.query(sqlQuery, queryParams);
    console.log(`📊 Main query result: ${result.rows.length} rows`);

    if (result.rows.length > 0) {
      console.log('✅ SUCCESS: Main query found results!');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name} - ${row.title}`);
      });
    } else {
      console.log('❌ PROBLEM: Main query returned 0 results');
    }

    // Test the count query
    console.log('\n2️⃣ TESTING COUNT QUERY:');
    const countQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      WHERE r.is_active = true
      AND ((COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE '%${query}%' OR COALESCE(r.title, '') ILIKE '%${query}%')
    `;

    console.log('📝 Count query:', countQuery);
    const countResult = await pool.query(countQuery);
    console.log(`📊 Count query result: ${countResult.rows[0].count}`);

    // Test without COALESCE to see the difference
    console.log('\n3️⃣ TESTING WITHOUT COALESCE (old version):');
    const oldQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      WHERE r.is_active = true
        AND ((r.first_name || ' ' || r.last_name) ILIKE '%${query}%' OR r.title ILIKE '%${query}%')
    `;

    try {
      const oldResult = await pool.query(oldQuery);
      console.log(`📊 Old query result: ${oldResult.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Old query failed: ${error.message}`);
    }

    // Test if there's an issue with the outreach_history join
    console.log('\n4️⃣ TESTING WITHOUT OUTREACH JOIN:');
    const noJoinQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      WHERE r.is_active = true
        AND ((COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE '%${query}%' OR COALESCE(r.title, '') ILIKE '%${query}%')
    `;

    const noJoinResult = await pool.query(noJoinQuery);
    console.log(`📊 No join query result: ${noJoinResult.rows[0].count}`);

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifyControllerFix();