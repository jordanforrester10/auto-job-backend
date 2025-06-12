// backend/scripts/import-recruiters.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createTables, seedInitialData } = require('../models/postgresql/schema');
const RecruiterImportService = require('../services/recruiterImport.service');

async function main() {
  try {
    console.log('🚀 Starting recruiter database setup...');
    
    // Create/update tables
    await createTables();
    
    // Seed initial data
    await seedInitialData();
    
    // Import from CSV if file exists
    const csvPath = process.argv[2];
    if (csvPath) {
      if (!require('fs').existsSync(csvPath)) {
        console.error('❌ CSV file not found:', csvPath);
        process.exit(1);
      }
      
      console.log(`📥 Importing from CSV: ${csvPath}`);
      const result = await RecruiterImportService.importFromCSV(csvPath);
      
      console.log('✅ Import Results:');
      console.log(`   Companies: ${result.companiesImported}`);
      console.log(`   Recruiters: ${result.recruitersImported}`);
      console.log(`   Total Processed: ${result.totalProcessed}`);
      console.log(`   Errors: ${result.errors}`);
    } else {
      console.log('ℹ️  Tables created. To import data, run:');
      console.log('   node scripts/import-recruiters.js /path/to/your/csv/file.csv');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main();