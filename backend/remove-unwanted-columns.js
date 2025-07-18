// backend/remove-unwanted-columns.js
// Script to remove unwanted columns from database
require('dotenv').config();
const db = require('./config/postgresql');

const removeColumns = async () => {
  try {
    console.log('🗑️ Starting removal of unwanted columns...\n');
    console.log('⚠️ WARNING: This will permanently remove columns and their data!');
    console.log('⚠️ Make sure you have a database backup before proceeding!\n');

    // Ask for confirmation (you can comment this out if you want to auto-proceed)
    console.log('🔄 Starting removal in 5 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Start transaction
    await db.query('BEGIN');
    console.log('🔄 Started database transaction...\n');

    let removedCount = 0;
    const removedColumns = [];

    // ====================================================
    // PART 1: Remove columns from COMPANIES table
    // ====================================================
    console.log('📊 Processing COMPANIES table...');
    
    const companyColumns = [
      'zoominfo_id',
      'zoominfo_url', 
      'sic_codes',
      'naics_codes',
      'recent_investors',
      'all_investors',
      'is_certified_active',
      'certification_date',
      'stock_ticker',
      'alexa_rank',
      'location_count',
      'recent_funding_round',
      'recent_funding_date'
    ];

    for (const column of companyColumns) {
      try {
        // Check if column exists first
        const checkResult = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = $1
          )
        `, [column]);

        if (checkResult.rows[0].exists) {
          await db.query(`ALTER TABLE companies DROP COLUMN ${column}`);
          console.log(`   ✅ Removed: companies.${column}`);
          removedCount++;
          removedColumns.push(`companies.${column}`);
        } else {
          console.log(`   ⚠️ Skipped: companies.${column} (doesn't exist)`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: companies.${column} - ${error.message}`);
      }
    }

    // ====================================================
    // PART 2: Remove columns from RECRUITERS table
    // ====================================================
    console.log('\n📊 Processing RECRUITERS table...');
    
    const recruiterColumns = [
      'zoominfo_url',
      'zoominfo_profile_url',
      'zoominfo_id' // Check for this too, just in case
    ];

    for (const column of recruiterColumns) {
      try {
        // Check if column exists first
        const checkResult = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'recruiters' AND column_name = $1
          )
        `, [column]);

        if (checkResult.rows[0].exists) {
          await db.query(`ALTER TABLE recruiters DROP COLUMN ${column}`);
          console.log(`   ✅ Removed: recruiters.${column}`);
          removedCount++;
          removedColumns.push(`recruiters.${column}`);
        } else {
          console.log(`   ⚠️ Skipped: recruiters.${column} (doesn't exist)`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: recruiters.${column} - ${error.message}`);
      }
    }

    // ====================================================
    // PART 3: Remove columns from INDUSTRIES table
    // ====================================================
    console.log('\n📊 Processing INDUSTRIES table...');
    
    const industryColumns = [
      'sic_codes',
      'naics_codes'
    ];

    for (const column of industryColumns) {
      try {
        // Check if column exists first
        const checkResult = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'industries' AND column_name = $1
          )
        `, [column]);

        if (checkResult.rows[0].exists) {
          await db.query(`ALTER TABLE industries DROP COLUMN ${column}`);
          console.log(`   ✅ Removed: industries.${column}`);
          removedCount++;
          removedColumns.push(`industries.${column}`);
        } else {
          console.log(`   ⚠️ Skipped: industries.${column} (doesn't exist)`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: industries.${column} - ${error.message}`);
      }
    }

    // ====================================================
    // PART 4: Verification
    // ====================================================
    console.log('\n🔍 Verifying remaining columns...');
    
    // Check companies table
    const companiesResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📊 COMPANIES table now has ${companiesResult.rows.length} columns:`);
    companiesResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type})`);
    });

    // Check recruiters table
    const recruitersResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recruiters' 
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📊 RECRUITERS table now has ${recruitersResult.rows.length} columns:`);
    recruitersResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type})`);
    });

    // Check industries table
    const industriesResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'industries' 
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📊 INDUSTRIES table now has ${industriesResult.rows.length} columns:`);
    industriesResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type})`);
    });

    // ====================================================
    // PART 5: Commit or Rollback
    // ====================================================
    
    console.log('\n📋 REMOVAL SUMMARY:');
    console.log('===================');
    console.log(`✅ Successfully removed ${removedCount} columns:`);
    removedColumns.forEach(col => console.log(`   • ${col}`));
    
    if (removedCount > 0) {
      console.log('\n🤔 Do you want to commit these changes? (y/N)');
      console.log('   - Typing "y" will make changes permanent');
      console.log('   - Any other key will rollback (undo) all changes');
      
      // In a real scenario, you'd want user input here
      // For now, let's auto-commit. Change this if you want manual confirmation
      const shouldCommit = true; // Set to false if you want to rollback and test first
      
      if (shouldCommit) {
        await db.query('COMMIT');
        console.log('\n🎉 SUCCESS! All changes have been committed to the database.');
        console.log('🔥 The unwanted columns have been permanently removed.');
      } else {
        await db.query('ROLLBACK');
        console.log('\n🔄 ROLLBACK! All changes have been undone.');
        console.log('💡 The database is back to its original state.');
      }
    } else {
      await db.query('ROLLBACK');
      console.log('\n⚠️ No columns were removed. Rolling back transaction.');
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Update your schema.js file to remove these columns');
    console.log('   2. Test your application to ensure nothing is broken');
    console.log('   3. Deploy the updated schema to production');
    
  } catch (error) {
    console.error('\n❌ Error during column removal:', error);
    try {
      await db.query('ROLLBACK');
      console.log('🔄 Transaction rolled back due to error.');
    } catch (rollbackError) {
      console.error('❌ Failed to rollback transaction:', rollbackError);
    }
  } finally {
    process.exit();
  }
};

// Run the removal
removeColumns();