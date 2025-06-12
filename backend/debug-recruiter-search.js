// backend/debug-recruiter-search.js - Debug script to check recruiter data
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugRecruiterSearch() {
  try {
    console.log('🔍 DEBUGGING RECRUITER SEARCH');
    console.log('================================');

    // 1. Check basic table counts
    console.log('\n1️⃣ CHECKING TABLE COUNTS:');
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM recruiters'),
      pool.query('SELECT COUNT(*) as count FROM companies'),
      pool.query('SELECT COUNT(*) as count FROM industries'),
      pool.query('SELECT COUNT(*) as count FROM locations')
    ]);

    console.log(`   Recruiters: ${counts[0].rows[0].count}`);
    console.log(`   Companies: ${counts[1].rows[0].count}`);
    console.log(`   Industries: ${counts[2].rows[0].count}`);
    console.log(`   Locations: ${counts[3].rows[0].count}`);

    // 2. Check for active recruiters
    console.log('\n2️⃣ CHECKING ACTIVE RECRUITERS:');
    const activeCount = await pool.query('SELECT COUNT(*) as count FROM recruiters WHERE is_active = true');
    const inactiveCount = await pool.query('SELECT COUNT(*) as count FROM recruiters WHERE is_active = false OR is_active IS NULL');
    
    console.log(`   Active recruiters: ${activeCount.rows[0].count}`);
    console.log(`   Inactive/NULL recruiters: ${inactiveCount.rows[0].count}`);

    // 3. Sample recruiter data
    console.log('\n3️⃣ SAMPLE RECRUITER DATA:');
    const sampleRecruiters = await pool.query(`
      SELECT 
        r.id, r.first_name, r.last_name, r.email, r.title, r.is_active,
        c.name as company_name,
        i.name as industry_name
      FROM recruiters r 
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LIMIT 10
    `);

    sampleRecruiters.rows.forEach((recruiter, index) => {
      console.log(`   ${index + 1}. ${recruiter.first_name} ${recruiter.last_name} (${recruiter.email}) - Active: ${recruiter.is_active}`);
      console.log(`      Title: ${recruiter.title}`);
      console.log(`      Company: ${recruiter.company_name}`);
      console.log(`      Industry: ${recruiter.industry_name}`);
      console.log('');
    });

    // 4. Check for "Sarah" specifically (case insensitive)
    console.log('\n4️⃣ SEARCHING FOR "SARAH" (CASE INSENSITIVE):');
    const sarahSearch = await pool.query(`
      SELECT 
        r.first_name, r.last_name, r.email, r.is_active,
        c.name as company_name
      FROM recruiters r 
      LEFT JOIN companies c ON r.current_company_id = c.id
      WHERE LOWER(r.first_name) LIKE LOWER('%sarah%') 
         OR LOWER(r.last_name) LIKE LOWER('%sarah%')
      LIMIT 5
    `);

    if (sarahSearch.rows.length > 0) {
      console.log(`   Found ${sarahSearch.rows.length} results for "Sarah":`);
      sarahSearch.rows.forEach((recruiter, index) => {
        console.log(`   ${index + 1}. ${recruiter.first_name} ${recruiter.last_name} (${recruiter.email}) - Active: ${recruiter.is_active}`);
        console.log(`      Company: ${recruiter.company_name}`);
      });
    } else {
      console.log('   ❌ No results found for "Sarah"');
    }

    // 5. Check the exact search query that's failing
    console.log('\n5️⃣ TESTING EXACT SEARCH QUERY:');
    
    const testQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.email,
        r.title,
        r.is_active,
        c.name as company_name
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      WHERE r.is_active = true
        AND (
          LOWER(r.first_name || ' ' || r.last_name) LIKE LOWER('%sarah%') OR
          LOWER(r.title) LIKE LOWER('%sarah%') OR
          LOWER(c.name) LIKE LOWER('%sarah%')
        )
      LIMIT 5
    `;

    const exactSearch = await pool.query(testQuery);
    
    if (exactSearch.rows.length > 0) {
      console.log(`   ✅ Found ${exactSearch.rows.length} results with exact query:`);
      exactSearch.rows.forEach((recruiter, index) => {
        console.log(`   ${index + 1}. ${recruiter.first_name} ${recruiter.last_name} - ${recruiter.title}`);
        console.log(`      Company: ${recruiter.company_name}`);
        console.log(`      Active: ${recruiter.is_active}`);
      });
    } else {
      console.log('   ❌ No results with exact search query');
    }

    // 6. Check for null values that might cause issues
    console.log('\n6️⃣ CHECKING FOR NULL VALUES:');
    const nullCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(first_name) as has_first_name,
        COUNT(last_name) as has_last_name,
        COUNT(title) as has_title,
        COUNT(is_active) as has_is_active
      FROM recruiters
    `);

    const nullStats = nullCheck.rows[0];
    console.log(`   Total recruiters: ${nullStats.total}`);
    console.log(`   With first_name: ${nullStats.has_first_name}`);
    console.log(`   With last_name: ${nullStats.has_last_name}`);
    console.log(`   With title: ${nullStats.has_title}`);
    console.log(`   With is_active: ${nullStats.has_is_active}`);

    // 7. Check industry data specifically
    console.log('\n7️⃣ CHECKING INDUSTRY DATA:');
    const industryData = await pool.query(`
      SELECT i.name, COUNT(r.id) as recruiter_count
      FROM industries i
      LEFT JOIN recruiters r ON i.id = r.industry_id AND r.is_active = true
      GROUP BY i.id, i.name
      ORDER BY recruiter_count DESC
      LIMIT 10
    `);

    if (industryData.rows.length > 0) {
      console.log('   Top industries:');
      industryData.rows.forEach((industry, index) => {
        console.log(`   ${index + 1}. ${industry.name}: ${industry.recruiter_count} recruiters`);
      });
    } else {
      console.log('   ❌ No industry data found');
    }

    // 8. Test if the issue is with the is_active column
    console.log('\n8️⃣ TESTING WITHOUT is_active FILTER:');
    const noActiveFilter = await pool.query(`
      SELECT COUNT(*) as count
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      WHERE LOWER(r.first_name || ' ' || r.last_name) LIKE LOWER('%sarah%')
    `);

    console.log(`   Results without is_active filter: ${noActiveFilter.rows[0].count}`);

    // 9. Check schema for is_active column
    console.log('\n9️⃣ CHECKING SCHEMA FOR is_active COLUMN:');
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'recruiters' AND column_name = 'is_active'
    `);

    if (schemaCheck.rows.length > 0) {
      const col = schemaCheck.rows[0];
      console.log(`   is_active column exists: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    } else {
      console.log('   ❌ is_active column does not exist!');
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugRecruiterSearch();