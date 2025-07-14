// backend/scripts/fix-ai-search-count.js
// Script to fix AI search count discrepancy
const mongoose = require('mongoose');
require('dotenv').config();

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

async function fixAiSearchCount() {
  try {
    console.log('🔍 Analyzing AI search count discrepancy...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');
    
    // Get all AI searches grouped by user
    const userSearches = await collection.aggregate([
      {
        $group: {
          _id: '$userId',
          totalSearches: { $sum: 1 },
          activeSearches: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'running'] },
                1,
                0
              ]
            }
          },
          pausedSearches: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'paused'] },
                1,
                0
              ]
            }
          },
          cancelledSearches: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'cancelled'] },
                1,
                0
              ]
            }
          },
          problemSearches: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$searchType', 'adzuna_api'] },
                    { $eq: ['$schedule.frequency', 'daily'] },
                    { $regexMatch: { input: '$searchApproach', regex: 'adzuna' } },
                    { $regexMatch: { input: '$qualityLevel', regex: 'adzuna' } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();
    
    console.log('\n📊 AI Search Analysis by User:');
    console.log('=' .repeat(60));
    
    for (const userStats of userSearches) {
      console.log(`User ID: ${userStats._id}`);
      console.log(`  Total: ${userStats.totalSearches}`);
      console.log(`  Active: ${userStats.activeSearches}`);
      console.log(`  Paused: ${userStats.pausedSearches}`);
      console.log(`  Cancelled: ${userStats.cancelledSearches}`);
      console.log(`  Problematic: ${userStats.problemSearches}`);
      console.log('');
      
      // If there are problematic searches, show details
      if (userStats.problemSearches > 0) {
        console.log(`🔍 Problematic searches for user ${userStats._id}:`);
        
        const problemDocs = await collection.find({
          userId: userStats._id,
          $or: [
            { searchType: 'adzuna_api' },
            { 'schedule.frequency': 'daily' },
            { searchApproach: { $regex: /adzuna/ } },
            { qualityLevel: { $regex: /adzuna/ } }
          ]
        }, {
          projection: {
            _id: 1,
            resumeName: 1,
            searchType: 1,
            status: 1,
            searchApproach: 1,
            qualityLevel: 1,
            createdAt: 1
          }
        }).toArray();
        
        problemDocs.forEach((doc, index) => {
          console.log(`    ${index + 1}. ${doc.resumeName || 'Unknown'} (${doc.status})`);
          console.log(`       Type: ${doc.searchType}, Approach: ${doc.searchApproach}`);
          console.log(`       Created: ${doc.createdAt}`);
        });
        console.log('');
      }
    }
    
    return userSearches;
    
  } catch (error) {
    console.error('❌ Error analyzing AI search counts:', error);
    throw error;
  }
}

async function cleanupAllProblematicSearches() {
  try {
    console.log('🧹 Cleaning up ALL problematic AI searches...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');
    
    // Count what we're about to delete
    const deleteCount = await collection.countDocuments({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' },
        // Also delete cancelled searches that are old
        { 
          status: 'cancelled',
          createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Older than 7 days
        }
      ]
    });
    
    console.log(`📊 Found ${deleteCount} problematic/old searches to delete`);
    
    if (deleteCount > 0) {
      // Delete them
      const result = await collection.deleteMany({
        $or: [
          { searchType: 'adzuna_api' },
          { 'schedule.frequency': 'daily' },
          { searchApproach: { $regex: /adzuna/ } },
          { qualityLevel: { $regex: /adzuna/ } },
          { 'jobsFound.apiSource': 'adzuna_aggregator' },
          {
            status: 'cancelled',
            createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        ]
      });
      
      console.log(`✅ Successfully deleted ${result.deletedCount} problematic AI searches`);
    } else {
      console.log('✅ No problematic searches found to delete');
    }
    
    return deleteCount;
    
  } catch (error) {
    console.error('❌ Error cleaning up problematic searches:', error);
    throw error;
  }
}

async function verifyCleanup() {
  try {
    console.log('🔍 Verifying cleanup results...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');
    
    // Count remaining searches by status
    const statusCounts = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📊 Remaining AI searches by status:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id}: ${status.count}`);
    });
    
    // Count by search approach
    const approachCounts = await collection.aggregate([
      {
        $group: {
          _id: '$searchApproach',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📊 Remaining AI searches by approach:');
    approachCounts.forEach(approach => {
      console.log(`  ${approach._id}: ${approach.count}`);
    });
    
    // Check for any remaining problematic searches
    const remainingProblems = await collection.countDocuments({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' }
      ]
    });
    
    if (remainingProblems > 0) {
      console.log(`⚠️  WARNING: ${remainingProblems} problematic searches still remain`);
    } else {
      console.log('✅ No problematic searches remaining');
    }
    
    return statusCounts;
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
    throw error;
  }
}

async function runCountFix() {
  try {
    await connectToDatabase();
    
    console.log('🚀 AI Search Count Fix');
    console.log('=' .repeat(50));
    
    // Step 1: Analyze current state
    const userSearches = await fixAiSearchCount();
    
    // Step 2: Clean up problematic searches
    const deletedCount = await cleanupAllProblematicSearches();
    
    // Step 3: Verify results
    const finalCounts = await verifyCleanup();
    
    console.log('=' .repeat(50));
    console.log('✅ AI Search count fix completed!');
    console.log(`🗑️  Deleted ${deletedCount} problematic searches`);
    console.log('🔄 Restart your backend server and check the AI Searches page');
    console.log('📝 The counts should now be synchronized');
    
  } catch (error) {
    console.error('❌ Count fix failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Export for standalone use
module.exports = {
  fixAiSearchCount,
  cleanupAllProblematicSearches,
  verifyCleanup,
  runCountFix
};

// Run if executed directly
if (require.main === module) {
  runCountFix();
}