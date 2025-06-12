// backend/debug-search-query.js - Debug the exact search query
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugSearchQuery() {
  try {
    console.log('🔍 DEBUGGING SEARCH QUERY FOR "SARAH"');
    console.log('===========================================');

    const userId = '68161f881e8f530e01bef870';
    const query = 'Sarah';

    // Test 1: Basic recruiter count
    console.log('\n1️⃣ TOTAL ACTIVE RECRUITERS:');
    const totalActiveResult = await pool.query(`
      SELECT COUNT(*) as count FROM recruiters WHERE is_active = true
    `);
    console.log(`   Active recruiters: ${totalActiveResult.rows[0].count}`);

    // Test 2: Sarah search without joins
    console.log('\n2️⃣ SARAH SEARCH WITHOUT JOINS:');
    const sarahBasicResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM recruiters r
      WHERE r.is_active = true 
        AND ((r.first_name || ' ' || r.last_name) ILIKE $1 OR r.title ILIKE $1)
    `, [`%${query}%`]);
    console.log(`   Sarah matches without joins: ${sarahBasicResult.rows[0].count}`);

    // Test 3: Exact query from controller
    console.log('\n3️⃣ EXACT CONTROLLER QUERY (with outreach join):');
    const exactQuery = `
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
        AND ((r.first_name || ' ' || r.last_name) ILIKE $2 OR r.title ILIKE $2)
      ORDER BY r.first_name ASC
      LIMIT 20 OFFSET 0
    `;

    const exactResult = await pool.query(exactQuery, [userId, `%${query}%`]);
    console.log(`   Exact controller query results: ${exactResult.rows.length}`);

    if (exactResult.rows.length > 0) {
      console.log('\n   📋 Sample results:');
      exactResult.rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name} - ${row.title}`);
      });
    }

    // Test 4: Check the count query specifically
    console.log('\n4️⃣ CONTROLLER COUNT QUERY:');
    const countQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      WHERE r.is_active = true
      AND ((r.first_name || ' ' || r.last_name) ILIKE '%${query}%' OR r.title ILIKE '%${query}%')
    `;
    console.log('   Count query SQL:');
    console.log(`   ${countQuery}`);
    
    const countResult = await pool.query(countQuery);
    console.log(`   Count query result: ${countResult.rows[0].count}`);

    // Test 5: Check if there's a parameter binding issue
    console.log('\n5️⃣ PARAMETER BINDING TEST:');
    const parameterTestQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      WHERE r.is_active = true
        AND ((r.first_name || ' ' || r.last_name) ILIKE $1 OR r.title ILIKE $1)
    `;
    const parameterTestResult = await pool.query(parameterTestQuery, [`%${query}%`]);
    console.log(`   Parameterized count result: ${parameterTestResult.rows[0].count}`);

    // Test 6: Check outreach_history table
    console.log('\n6️⃣ OUTREACH HISTORY CHECK:');
    const outreachHistoryResult = await pool.query(`
      SELECT COUNT(*) as count FROM outreach_history WHERE mongodb_user_id = $1
    `, [userId]);
    console.log(`   Outreach history records for user: ${outreachHistoryResult.rows[0].count}`);

    // Test 7: Check if the issue is with the name concatenation
    console.log('\n7️⃣ NAME CONCATENATION TEST:');
    const nameTestResult = await pool.query(`
      SELECT first_name, last_name, (first_name || ' ' || last_name) as full_name
      FROM recruiters 
      WHERE is_active = true
        AND LOWER(first_name) LIKE LOWER('%sarah%')
      LIMIT 5
    `);
    console.log('   Sample name concatenation results:');
    nameTestResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. "${row.first_name}" + "${row.last_name}" = "${row.full_name}"`);
    });

    // Test 8: Check for NULL values that might break concatenation
    console.log('\n8️⃣ NULL VALUE CHECK:');
    const nullCheckResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(first_name) as has_first_name,
        COUNT(last_name) as has_last_name,
        COUNT(CASE WHEN first_name IS NULL OR last_name IS NULL THEN 1 END) as has_null_names
      FROM recruiters 
      WHERE is_active = true
    `);
    const nullStats = nullCheckResult.rows[0];
    console.log(`   Total active: ${nullStats.total}`);
    console.log(`   Has first_name: ${nullStats.has_first_name}`);
    console.log(`   Has last_name: ${nullStats.has_last_name}`);
    console.log(`   Has NULL names: ${nullStats.has_null_names}`);

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugSearchQuery();