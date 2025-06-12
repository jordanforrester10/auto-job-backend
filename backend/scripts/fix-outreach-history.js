const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/postgresql');

async function fixOutreachHistory() {
  try {
    console.log('🔧 Fixing outreach_history table...');
    
    // Check if constraint exists
    const constraintCheck = await db.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'outreach_history' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'outreach_history_recruiter_user_unique'
    `);
    
    if (constraintCheck.rows.length === 0) {
      console.log('📊 Adding unique constraint...');
      
      await db.query(`
        ALTER TABLE outreach_history 
        ADD CONSTRAINT outreach_history_recruiter_user_unique 
        UNIQUE (recruiter_id, mongodb_user_id)
      `);
      
      console.log('✅ Unique constraint added successfully');
    } else {
      console.log('✅ Unique constraint already exists');
    }
    
    // Verify table structure
    const tableInfo = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'outreach_history'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('✅ Outreach history table is ready');
    
  } catch (error) {
    console.error('❌ Error fixing outreach history:', error);
  } finally {
    process.exit(0);
  }
}

fixOutreachHistory();