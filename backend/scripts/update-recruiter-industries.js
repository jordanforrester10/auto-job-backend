const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/postgresql');

async function updateRecruiterIndustries() {
  try {
    console.log('🔍 Checking current state...');
    
    // Check current state
    const beforeCount = await db.query(`
      SELECT COUNT(*) as count
      FROM recruiters 
      WHERE industry_id IS NULL
    `);
    
    console.log(`📊 Recruiters without industry: ${beforeCount.rows[0].count}`);
    
    // Check how many can be updated
    const canUpdateCount = await db.query(`
      SELECT COUNT(*) as count
      FROM recruiters r
      JOIN companies c ON r.current_company_id = c.id
      WHERE r.industry_id IS NULL 
      AND c.industry_id IS NOT NULL
    `);
    
    console.log(`📊 Recruiters that can get industry from company: ${canUpdateCount.rows[0].count}`);
    
    // Perform the update
    console.log('🔄 Updating recruiter industries...');
    
    const updateResult = await db.query(`
      UPDATE recruiters 
      SET 
        industry_id = companies.industry_id,
        updated_at = NOW()
      FROM companies 
      WHERE recruiters.current_company_id = companies.id 
        AND recruiters.industry_id IS NULL
        AND companies.industry_id IS NOT NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} recruiters with industries`);
    
    // Check final state
    const afterCount = await db.query(`
      SELECT COUNT(*) as count
      FROM recruiters 
      WHERE industry_id IS NOT NULL
    `);
    
    console.log(`📊 Recruiters with industry after update: ${afterCount.rows[0].count}`);
    
    // Show sample results
    console.log('📋 Sample results:');
    const sampleResults = await db.query(`
      SELECT 
        r.first_name,
        r.last_name,
        r.title,
        c.name as company_name,
        i.name as industry_name
      FROM recruiters r
      JOIN companies c ON r.current_company_id = c.id
      JOIN industries i ON r.industry_id = i.id
      LIMIT 5
    `);
    
    sampleResults.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.first_name} ${row.last_name} (${row.title}) at ${row.company_name} - Industry: ${row.industry_name}`);
    });
    
    console.log('✅ Update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating recruiter industries:', error);
  } finally {
    process.exit(0);
  }
}

updateRecruiterIndustries();