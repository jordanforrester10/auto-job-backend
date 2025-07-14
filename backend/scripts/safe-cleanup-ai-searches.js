// backend/scripts/safe-cleanup-ai-searches.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/mongodb/user.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const Job = require('../models/mongodb/job.model');

async function safeCleanupAiSearches() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️ Starting SAFE AI Searches cleanup...');

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

    // 3. SAFELY reset AI job discovery counts to 0 (work with current schema)
    console.log('🔍 Resetting AI job discovery counts...');
    
    // Find all users
    const allUsers = await User.find({});
    console.log(`🔍 Found ${allUsers.length} users to update`);

    let updatedCount = 0;
    for (const user of allUsers) {
      try {
        console.log(`🔧 Resetting AI count for user ${user.email} (${user._id})`);
        
        // Reset ONLY the aiJobDiscovery field to 0 (keeping current schema)
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'currentUsage.aiJobDiscovery': 0
          }
        });
        
        updatedCount++;
        console.log(`✅ Reset user ${user.email}`);
        
      } catch (userError) {
        console.error(`❌ Error updating user ${user.email}:`, userError.message);
        
        // Try alternative approach - unset and set
        try {
          await User.findByIdAndUpdate(user._id, {
            $unset: { 'currentUsage.aiJobDiscovery': '' }
          });
          await User.findByIdAndUpdate(user._id, {
            $set: { 'currentUsage.aiJobDiscovery': 0 }
          });
          console.log(`✅ Fixed user ${user.email} with alternative approach`);
          updatedCount++;
        } catch (altError) {
          console.error(`❌ Alternative approach failed for ${user.email}:`, altError.message);
        }
      }
    }

    // 4. Verify the cleanup
    console.log('\n📊 Verification:');
    const remainingSearches = await AiJobSearch.countDocuments({});
    const remainingAiJobs = await Job.countDocuments({ isAiGenerated: true });
    
    console.log(`📊 Remaining AI searches: ${remainingSearches}`);
    console.log(`📊 Remaining AI jobs: ${remainingAiJobs}`);
    console.log(`📊 Users updated: ${updatedCount}/${allUsers.length}`);

    // 5. Test a few users to see their current structure
    console.log('\n🔍 Testing user data structures:');
    const testUsers = await User.find({}).limit(3);
    for (const user of testUsers) {
      console.log(`📊 User ${user.email}: aiJobDiscovery = ${user.currentUsage?.aiJobDiscovery}`);
    }

    console.log('\n✅ Safe cleanup completed!');
    console.log('🔄 All AI searches and jobs have been removed');
    console.log('🔧 User AI discovery counts have been reset to 0');
    console.log('💡 Users can now create new AI searches');

  } catch (error) {
    console.error('❌ Error during safe cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the safe cleanup
safeCleanupAiSearches();