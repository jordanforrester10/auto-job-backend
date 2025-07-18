// backend/check-columns.js
// Script to check which columns exist before removal
require('dotenv').config();
const db = require('./config/postgresql');

const checkColumns = async () => {
  try {
    console.log('🔍 Checking existing columns in database...\n');

    // Check companies table
    console.log('📊 COMPANIES TABLE:');
    console.log('==================');
    
    const companiesQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        CASE 
          WHEN column_name IN (
            'zoominfo_id', 'zoominfo_url', 'sic_codes', 'naics_codes', 
            'recent_investors', 'all_investors', 'is_certified_active', 
            'certification_date', 'stock_ticker', 'alexa_rank', 
            'location_count', 'recent_funding_round', 'recent_funding_date'
          ) THEN 'WILL BE REMOVED'
          ELSE 'WILL REMAIN'
        END as status
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY 
        CASE WHEN column_name IN (
          'zoominfo_id', 'zoominfo_url', 'sic_codes', 'naics_codes', 
          'recent_investors', 'all_investors', 'is_certified_active', 
          'certification_date', 'stock_ticker', 'alexa_rank', 
          'location_count', 'recent_funding_round', 'recent_funding_date'
        ) THEN 1 ELSE 2 END,
        ordinal_position;
    `;
    
    const companiesResult = await db.query(companiesQuery);
    
    companiesResult.rows.forEach(row => {
      const icon = row.status === 'WILL BE REMOVED' ? '🗑️' : '✅';
      console.log(`${icon} ${row.column_name.padEnd(25)} ${row.data_type.padEnd(15)} ${row.status}`);
    });

    console.log('\n📊 RECRUITERS TABLE:');
    console.log('====================');
    
    const recruitersQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        CASE 
          WHEN column_name IN ('zoominfo_id', 'zoominfo_url', 'zoominfo_profile_url') 
          THEN 'WILL BE REMOVED'
          ELSE 'WILL REMAIN'
        END as status
      FROM information_schema.columns 
      WHERE table_name = 'recruiters' 
      ORDER BY 
        CASE WHEN column_name IN ('zoominfo_id', 'zoominfo_url', 'zoominfo_profile_url') 
        THEN 1 ELSE 2 END,
        ordinal_position;
    `;
    
    const recruitersResult = await db.query(recruitersQuery);
    
    recruitersResult.rows.forEach(row => {
      const icon = row.status === 'WILL BE REMOVED' ? '🗑️' : '✅';
      console.log(`${icon} ${row.column_name.padEnd(25)} ${row.data_type.padEnd(15)} ${row.status}`);
    });

    console.log('\n📊 INDUSTRIES TABLE:');
    console.log('====================');
    
    const industriesQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        CASE 
          WHEN column_name IN ('sic_codes', 'naics_codes') 
          THEN 'WILL BE REMOVED'
          ELSE 'WILL REMAIN'
        END as status
      FROM information_schema.columns 
      WHERE table_name = 'industries' 
      ORDER BY 
        CASE WHEN column_name IN ('sic_codes', 'naics_codes') 
        THEN 1 ELSE 2 END,
        ordinal_position;
    `;
    
    const industriesResult = await db.query(industriesQuery);
    
    industriesResult.rows.forEach(row => {
      const icon = row.status === 'WILL BE REMOVED' ? '🗑️' : '✅';
      console.log(`${icon} ${row.column_name.padEnd(25)} ${row.data_type.padEnd(15)} ${row.status}`);
    });

    // Summary of what will be removed
    console.log('\n📋 SUMMARY OF COLUMNS TO BE REMOVED:');
    console.log('=====================================');
    
    const summaryQuery = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE 
        (table_name = 'companies' AND column_name IN (
          'zoominfo_id', 'zoominfo_url', 'sic_codes', 'naics_codes', 
          'recent_investors', 'all_investors', 'is_certified_active', 
          'certification_date', 'stock_ticker', 'alexa_rank', 
          'location_count', 'recent_funding_round', 'recent_funding_date'
        ))
        OR 
        (table_name = 'recruiters' AND column_name IN (
          'zoominfo_id', 'zoominfo_url', 'zoominfo_profile_url'
        ))
        OR 
        (table_name = 'industries' AND column_name IN (
          'sic_codes', 'naics_codes'
        ))
      ORDER BY table_name, column_name;
    `;
    
    const summaryResult = await db.query(summaryQuery);
    
    if (summaryResult.rows.length === 0) {
      console.log('✅ No target columns found - nothing to remove!');
    } else {
      console.log(`🗑️ Found ${summaryResult.rows.length} columns that will be removed:\n`);
      
      let currentTable = '';
      summaryResult.rows.forEach(row => {
        if (row.table_name !== currentTable) {
          currentTable = row.table_name;
          console.log(`\n📊 ${currentTable.toUpperCase()} table:`);
        }
        console.log(`   • ${row.column_name} (${row.data_type})`);
      });
    }

    console.log('\n✅ Column check completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review the columns marked for removal above');
    console.log('   2. If you want to proceed, run the removal script');
    console.log('   3. Make sure no application code uses these columns');
    
  } catch (error) {
    console.error('❌ Error checking columns:', error);
  } finally {
    process.exit();
  }
};

// Run the check
checkColumns();