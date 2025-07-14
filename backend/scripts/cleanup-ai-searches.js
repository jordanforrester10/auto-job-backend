// backend/scripts/cleanup-ai-searches.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/mongodb/user.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const Job = require('../models/mongodb/job.model');

async function cleanupAiSearches() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️ Starting AI Searches cleanup...');

    // 1. Delete ALL AI job searches
    console.log('🔍 Deleting all AI job searches...');
    const deletedSearches = await AiJobSearch.deleteMany({});
    console.log(`✅ Deleted ${deletedSearches.deletedCount} AI job searches`);

    // 2. Delete all AI-generated jobs
    console.log('🔍 Deleting all AI-generated jobs...');
    const deletedJobs = await Job.deleteMany({ 
      $or: [
        { isAiGenerated: true },
        { aiSearchId: { $exists: true } },
        { sourcePlatform: { $regex: /AI_FOUND|ACTIVE_JOBS_DB/i } }
      ]
    });
    console.log(`✅ Deleted ${deletedJobs.deletedCount} AI-generated jobs`);

    // 3. Fix user currentUsage data structure
    console.log('🔍 Fixing user currentUsage data structure...');
    
    // Find users with problematic data structure
    const usersWithBadData = await User.find({
      $or: [
        { 'currentUsage.aiJobDiscovery': { $type: 'number' } },
        { 'currentUsage.aiJobDiscovery': { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${usersWithBadData.length} users with data structure issues`);

    for (const user of usersWithBadData) {
      console.log(`🔧 Fixing user ${user.email} (${user._id})`);
      
      // Reset the entire currentUsage structure with proper format
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'currentUsage': {
            resumeUploads: 0,
            resumeAnalysis: 0,
            jobImports: 0,
            resumeTailoring: 0,
            recruiterUnlocks: 0,
            aiJobDiscovery: {
              used: 0,
              lastUsed: null,
              lastUpdated: new Date()
            },
            aiConversations: 0,
            aiMessagesTotal: 0,
            resetDate: new Date()
          }
        }
      });
      
      console.log(`✅ Fixed user ${user.email}`);
    }

    // 4. Verify the cleanup
    console.log('\n📊 Verification:');
    const remainingSearches = await AiJobSearch.countDocuments({});
    const remainingAiJobs = await Job.countDocuments({ isAiGenerated: true });
    const usersWithCorrectStructure = await User.countDocuments({
      'currentUsage.aiJobDiscovery.used': { $exists: true }
    });

    console.log(`📊 Remaining AI searches: ${remainingSearches}`);
    console.log(`📊 Remaining AI jobs: ${remainingAiJobs}`);
    console.log(`📊 Users with correct structure: ${usersWithCorrectStructure}`);

    console.log('\n✅ Cleanup completed successfully!');
    console.log('🔄 All AI searches and jobs have been removed');
    console.log('🔧 User data structures have been fixed');
    console.log('💡 Users can now create new AI searches with correct slot counting');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
cleanupAiSearches();