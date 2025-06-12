// backend/scripts/fix-missing-columns.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../config/postgresql');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to recruiters table...');
    
    const columnsToAdd = [
      'ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS highest_education VARCHAR(100);',
      'ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS contact_accuracy_score INTEGER;',
      'ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS contact_accuracy_grade VARCHAR(10);',
      'ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS zoominfo_profile_url TEXT;',
      'ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;'
    ];
    
    for (const sql of columnsToAdd) {
      try {
        await db.query(sql);
        console.log(`✅ Executed: ${sql}`);
      } catch (error) {
        console.log(`Column might already exist: ${error.message}`);
      }
    }
    
    console.log('✅ All missing columns added to recruiters table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addMissingColumns();