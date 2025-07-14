// backend/scripts/migrate-ai-searches-to-weekly.js - FIXED VERSION
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Simple direct MongoDB operations to fix enum issues
async function fixEnumValidationIssues() {
  try {
    console.log('🔧 Fixing enum validation issues directly in MongoDB...');

    // Get the raw MongoDB collection (bypass Mongoose validation)
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');

    // Count documents that need fixing
    const problemDocs = await collection.countDocuments({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' }
      ]
    });

    console.log(`📊 Found ${problemDocs} documents with enum validation issues`);

    if (problemDocs === 0) {
      console.log('✅ No documents need fixing');
      return 0;
    }

    // Fix enum values directly using MongoDB operations
    const result = await collection.updateMany(
      {
        $or: [
          { searchType: 'adzuna_api' },
          { 'schedule.frequency': 'daily' },
          { searchApproach: { $regex: /adzuna/ } },
          { qualityLevel: { $regex: /adzuna/ } },
          { 'jobsFound.apiSource': 'adzuna_aggregator' }
        ]
      },
      {
        $set: {
          searchType: 'weekly_active_jobs',
          'schedule.frequency': 'weekly',
          searchApproach: '3-phase-intelligent-active-jobs-weekly',
          qualityLevel: 'active-jobs-weekly-enhanced',
          approachVersion: '5.0-weekly-active-jobs-location-salary',
          lastUpdateMessage: 'Auto-migrated to weekly Active Jobs model',
          lastUpdated: new Date(),
          'jobsFound.$[elem].apiSource': 'active_jobs_db'
        }
      },
      {
        arrayFilters: [{ 'elem.apiSource': 'adzuna_aggregator' }]
      }
    );

    console.log(`✅ Fixed enum values in ${result.modifiedCount} documents`);

    // Also fix any schema conflicts that might cause MongoDB errors
    await fixSchemaConflicts(collection);

    return result.modifiedCount;

  } catch (error) {
    console.error('❌ Error fixing enum validation issues:', error);
    throw error;
  }
}

// Fix schema conflicts in existing documents
async function fixSchemaConflicts(collection) {
  try {
    console.log('🔧 Fixing schema conflicts in existing documents...');

    // Fix the locationOptimization array issue
    const locationOptimizationFix = await collection.updateMany(
      { 'optimization.locationOptimization': { $type: 'array' } },
      {
        $set: {
          'optimization.locationOptimization': {
            bestPerformingLocations: [],
            worstPerformingLocations: [],
            remoteJobsPercentage: 0,
            avgSalaryByLocation: []
          }
        }
      }
    );

    console.log(`✅ Fixed locationOptimization in ${locationOptimizationFix.modifiedCount} documents`);

    // Fix any other potential schema conflicts
    const otherFixes = await collection.updateMany(
      {
        $or: [
          { 'searchCriteria.searchLocations': { $exists: false } },
          { weeklyLimit: { $exists: false } },
          { jobsFoundThisWeek: { $exists: false } }
        ]
      },
      {
        $set: {
          'searchCriteria.searchLocations': [{ name: 'Remote', type: 'remote' }],
          'searchCriteria.remoteWork': true,
          weeklyLimit: 50,
          jobsFoundThisWeek: 0,
          currentWeekStart: null,
          'activeJobsConfig.apiCallsUsed': 0,
          'activeJobsConfig.monthlyLimit': 1000,
          'activeJobsConfig.apiHealth': 'not_configured'
        }
      }
    );

    console.log(`✅ Fixed missing fields in ${otherFixes.modifiedCount} documents`);

  } catch (error) {
    console.error('❌ Error fixing schema conflicts:', error);
    throw error;
  }
}

// Clean up any completely broken documents
async function cleanupBrokenDocuments() {
  try {
    console.log('🧹 Cleaning up any broken documents...');

    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');

    // Find documents that might be causing issues
    const brokenDocs = await collection.find({
      $or: [
        { searchType: null },
        { searchType: { $exists: false } },
        { status: null },
        { status: { $exists: false } }
      ]
    }).toArray();

    if (brokenDocs.length > 0) {
      console.log(`Found ${brokenDocs.length} broken documents, fixing them...`);

      for (const doc of brokenDocs) {
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              searchType: 'weekly_active_jobs',
              status: 'cancelled',
              'schedule.frequency': 'weekly',
              searchApproach: '3-phase-intelligent-active-jobs-weekly',
              qualityLevel: 'active-jobs-weekly-enhanced',
              lastUpdateMessage: 'Fixed broken document structure',
              lastUpdated: new Date()
            }
          }
        );
      }

      console.log(`✅ Fixed ${brokenDocs.length} broken documents`);
    } else {
      console.log('✅ No broken documents found');
    }

  } catch (error) {
    console.error('❌ Error cleaning up broken documents:', error);
    throw error;
  }
}

// Alternative: Direct deletion of problematic documents
async function deleteProblematicDocuments() {
  try {
    console.log('🗑️ Option: Delete problematic AI search documents');
    console.log('This will remove old AI searches that have enum validation issues');
    
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');

    // Count problematic documents
    const problemCount = await collection.countDocuments({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } }
      ]
    });

    console.log(`📊 Found ${problemCount} problematic documents`);

    if (problemCount > 0) {
      // Delete the problematic documents
      const deleteResult = await collection.deleteMany({
        $or: [
          { searchType: 'adzuna_api' },
          { 'schedule.frequency': 'daily' },
          { searchApproach: { $regex: /adzuna/ } },
          { qualityLevel: { $regex: /adzuna/ } }
        ]
      });

      console.log(`🗑️ Deleted ${deleteResult.deletedCount} problematic AI search documents`);
      return deleteResult.deletedCount;
    } else {
      console.log('✅ No problematic documents to delete');
      return 0;
    }

  } catch (error) {
    console.error('❌ Error deleting problematic documents:', error);
    throw error;
  }
}

// Main migration function with multiple options
async function runMigration() {
  try {
    await connectToDatabase();
    
    console.log('🚀 Starting AI Search Fix');
    console.log('=' .repeat(50));
    
    // Option 1: Try to fix the enum values
    try {
      const fixedCount = await fixEnumValidationIssues();
      console.log(`✅ Successfully fixed ${fixedCount} documents`);
    } catch (fixError) {
      console.error('❌ Could not fix enum values:', fixError.message);
      
      // Option 2: If fixing fails, offer to delete problematic documents
      console.log('\n🔄 Attempting alternative: Delete problematic documents');
      try {
        const deletedCount = await deleteProblematicDocuments();
        console.log(`✅ Deleted ${deletedCount} problematic documents`);
      } catch (deleteError) {
        console.error('❌ Could not delete problematic documents:', deleteError.message);
        throw deleteError;
      }
    }
    
    // Clean up any remaining issues
    await cleanupBrokenDocuments();
    
    console.log('=' .repeat(50));
    console.log('✅ AI Search fix completed successfully!');
    console.log('🔄 Restart your backend server and try deleting/pausing AI searches again');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Export functions for standalone use
module.exports = {
  fixEnumValidationIssues,
  fixSchemaConflicts,
  cleanupBrokenDocuments,
  deleteProblematicDocuments,
  runMigration
};

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}