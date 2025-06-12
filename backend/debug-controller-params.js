// backend/debug-controller-params.js - Debug what's happening with parameters
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugControllerParams() {
  try {
    console.log('🐛 DEBUGGING CONTROLLER PARAMETERS');
    console.log('====================================');
    
    // Simulate the exact request parameters from your log
    const userId = '68161f881e8f530e01bef870';
    const query = 'Sarah';
    const company = '';
    const industry = '';
    const location = '';
    const title = '';
    const experience_min = '';
    const experience_max = '20'; // This is what's in your query string
    const limit = 20;
    const offset = 0;
    const sort_by = 'last_active_date';
    const sort_order = 'DESC';

    console.log('📋 Input Parameters:');
    console.log(`   userId: ${userId}`);
    console.log(`   query: "${query}"`);
    console.log(`   company: "${company}"`);
    console.log(`   industry: "${industry}"`);
    console.log(`   location: "${location}"`);
    console.log(`   title: "${title}"`);
    console.log(`   experience_min: "${experience_min}"`);
    console.log(`   experience_max: "${experience_max}"`);
    console.log(`   limit: ${limit}`);
    console.log(`   offset: ${offset}`);

    // Build query exactly like the controller
    let sqlQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.email,
        r.direct_phone as phone,
        r.title,
        r.linkedin_profile_url as linkedin_url,
        r.experience_years,
        r.last_active_date,
        r.rating,
        c.name as company_name,
        c.website as company_website,
        c.employee_range as company_size,
        c.logo_url as company_logo,
        i.name as industry_name,
        l.city,
        l.state,
        l.country,
        -- Check if user has contacted this recruiter
        oh.last_contact_date,
        oh.status as outreach_status
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      WHERE r.is_active = true
    `;

    const queryParams = [userId.toString()];
    let paramIndex = 2;

    console.log('\n🔧 Building Query Step by Step:');
    console.log(`1. Base query with userId: ${userId}`);

    // Add search filters with COALESCE to handle NULL values
    if (query) {
      sqlQuery += ` AND (
        (COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $${paramIndex} OR
        COALESCE(r.title, '') ILIKE $${paramIndex} OR
        COALESCE(c.name, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${query.toLowerCase()}%`);
      console.log(`2. Added query filter: %${query.toLowerCase()}% (param $${paramIndex})`);
      paramIndex++;
    }

    if (company) {
      sqlQuery += ` AND COALESCE(c.name, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${company.toLowerCase()}%`);
      console.log(`3. Added company filter: %${company.toLowerCase()}% (param $${paramIndex})`);
      paramIndex++;
    }

    if (industry) {
      sqlQuery += ` AND COALESCE(i.name, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${industry.toLowerCase()}%`);
      console.log(`4. Added industry filter: %${industry.toLowerCase()}% (param $${paramIndex})`);
      paramIndex++;
    }

    if (location) {
      sqlQuery += ` AND (
        COALESCE(l.city, '') ILIKE $${paramIndex} OR
        COALESCE(l.state, '') ILIKE $${paramIndex} OR
        COALESCE(l.country, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${location.toLowerCase()}%`);
      console.log(`5. Added location filter: %${location.toLowerCase()}% (param $${paramIndex})`);
      paramIndex++;
    }

    if (title) {
      sqlQuery += ` AND COALESCE(r.title, '') ILIKE $${paramIndex}`;
      queryParams.push(`%${title.toLowerCase()}%`);
      console.log(`6. Added title filter: %${title.toLowerCase()}% (param $${paramIndex})`);
      paramIndex++;
    }

    // ⚠️ CRITICAL: Check if experience filters are being applied
    console.log(`\n⚠️  EXPERIENCE FILTER CHECK:`);
    console.log(`   experience_min: "${experience_min}" (truthy: ${!!experience_min})`);
    console.log(`   experience_max: "${experience_max}" (truthy: ${!!experience_max})`);

    if (experience_min) {
      sqlQuery += ` AND r.experience_years >= $${paramIndex}`;
      queryParams.push(parseInt(experience_min));
      console.log(`7. Added experience_min filter: >= ${experience_min} (param $${paramIndex})`);
      paramIndex++;
    }

    if (experience_max) {
      sqlQuery += ` AND r.experience_years <= $${paramIndex}`;
      queryParams.push(parseInt(experience_max));
      console.log(`8. ⚠️  Added experience_max filter: <= ${experience_max} (param $${paramIndex})`);
      paramIndex++;
    }

    // Add ordering
    const validSortFields = ['last_active_date', 'rating', 'experience_years', 'first_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'last_active_date';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    sqlQuery += ` ORDER BY r.${sortField} ${sortDirection}`;
    console.log(`9. Added sorting: ORDER BY r.${sortField} ${sortDirection}`);
    
    // Add pagination
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    console.log(`10. Added pagination: LIMIT ${limit} OFFSET ${offset} (params $${paramIndex}, $${paramIndex + 1})`);

    console.log('\n📝 FINAL QUERY:');
    console.log(sqlQuery);
    console.log('\n📋 FINAL PARAMETERS:');
    console.log(queryParams);

    // Execute the query
    console.log('\n🗄️ EXECUTING QUERY...');
    const result = await pool.query(sqlQuery, queryParams);
    console.log(`✅ Query executed successfully: ${result.rows.length} rows returned`);

    if (result.rows.length > 0) {
      console.log('\n👥 SAMPLE RESULTS:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name} - ${row.title} (Experience: ${row.experience_years || 'N/A'} years)`);
      });
    }

    // Test without experience_max filter
    console.log('\n🧪 TESTING WITHOUT EXPERIENCE_MAX FILTER:');
    
    let testQuery = `
      SELECT COUNT(*) as count
      FROM recruiters r
      LEFT JOIN companies c ON r.current_company_id = c.id
      LEFT JOIN industries i ON r.industry_id = i.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN outreach_history oh ON (r.id = oh.recruiter_id AND oh.mongodb_user_id = $1)
      WHERE r.is_active = true
      AND ((COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $2 OR
           COALESCE(r.title, '') ILIKE $2 OR
           COALESCE(c.name, '') ILIKE $2)
    `;
    
    const testResult = await pool.query(testQuery, [userId, `%${query.toLowerCase()}%`]);
    console.log(`📊 Without experience_max filter: ${testResult.rows[0].count} matches`);

    // Test with experience_max filter
    testQuery += ` AND r.experience_years <= $3`;
    const testResult2 = await pool.query(testQuery, [userId, `%${query.toLowerCase()}%`, parseInt(experience_max)]);
    console.log(`📊 With experience_max <= ${experience_max}: ${testResult2.rows[0].count} matches`);

    // Check experience_years distribution
    console.log('\n📈 EXPERIENCE YEARS DISTRIBUTION FOR SARAH:');
    const expQuery = `
      SELECT 
        r.experience_years,
        COUNT(*) as count,
        array_agg(r.first_name || ' ' || r.last_name) as names
      FROM recruiters r
      WHERE r.is_active = true
      AND ((COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $1)
      GROUP BY r.experience_years
      ORDER BY r.experience_years
    `;
    
    const expResult = await pool.query(expQuery, [`%${query.toLowerCase()}%`]);
    expResult.rows.forEach(row => {
      console.log(`   ${row.experience_years || 'NULL'} years: ${row.count} people`);
      if (row.count <= 3) {
        console.log(`      Names: ${row.names.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugControllerParams();