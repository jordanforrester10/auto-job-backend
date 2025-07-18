// scripts/complete-ai-search-reset.js - Complete AI Search System Reset
// This script removes ALL existing AI searches and resets all related data
// for the new job titles-based system

require('dotenv').config();
const mongoose = require('mongoose');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');
const WeeklyJobTracking = require('../models/mongodb/weeklyJobTracking.model');
const User = require('../models/mongodb/user.model');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Main reset function
async function completeAiSearchReset() {
  console.log('🚀 Starting Complete AI Search System Reset...\n');
  
  const startTime = Date.now();
  const resetSummary = {
    aiSearchesDeleted: 0,
    usersReset: 0,
    weeklyTrackingDeleted: 0,
    errors: []
  };

  try {
    // Step 1: Count existing data
    console.log('📊 Analyzing existing data...');
    const existingSearches = await AiJobSearch.countDocuments();
    const existingWeeklyTracking = await WeeklyJobTracking.countDocuments();
    const usersWithAiUsage = await User.countDocuments({ 
      'usage.aiJobDiscoveryUsage': { $gt: 0 } 
    });
    
    console.log(`   • AI Searches: ${existingSearches}`);
    console.log(`   • Weekly Tracking Records: ${existingWeeklyTracking}`);
    console.log(`   • Users with AI Usage: ${usersWithAiUsage}\n`);

    // Step 2: Delete all AI job searches
    console.log('🗑️ Deleting all AI job searches...');
    try {
      const deleteResult = await AiJobSearch.deleteMany({});
      resetSummary.aiSearchesDeleted = deleteResult.deletedCount;
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} AI job searches`);
    } catch (error) {
      console.error('   ❌ Error deleting AI searches:', error.message);
      resetSummary.errors.push(`AI Search deletion: ${error.message}`);
    }

    // Step 3: Delete all weekly job tracking records
    console.log('🗑️ Deleting all weekly job tracking records...');
    try {
      const weeklyDeleteResult = await WeeklyJobTracking.deleteMany({});
      resetSummary.weeklyTrackingDeleted = weeklyDeleteResult.deletedCount;
      console.log(`   ✅ Deleted ${weeklyDeleteResult.deletedCount} weekly tracking records`);
    } catch (error) {
      console.error('   ❌ Error deleting weekly tracking:', error.message);
      resetSummary.errors.push(`Weekly tracking deletion: ${error.message}`);
    }

    // Step 4: Reset all user AI usage counters
    console.log('🔄 Resetting all user AI usage counters...');
    try {
      const userUpdateResult = await User.updateMany(
        {},
        {
          $set: {
            'usage.aiJobDiscoveryUsage': 0,
            'usage.lastAiJobDiscoveryReset': new Date()
          }
        }
      );
      resetSummary.usersReset = userUpdateResult.modifiedCount;
      console.log(`   ✅ Reset AI usage for ${userUpdateResult.modifiedCount} users`);
    } catch (error) {
      console.error('   ❌ Error resetting user usage:', error.message);
      resetSummary.errors.push(`User usage reset: ${error.message}`);
    }

    // Step 5: Verification
    console.log('🔍 Verifying cleanup...');
    const remainingSearches = await AiJobSearch.countDocuments();
    const remainingWeeklyTracking = await WeeklyJobTracking.countDocuments();
    const remainingUsage = await User.countDocuments({ 
      'usage.aiJobDiscoveryUsage': { $gt: 0 } 
    });

    console.log(`   • Remaining AI Searches: ${remainingSearches}`);
    console.log(`   • Remaining Weekly Tracking: ${remainingWeeklyTracking}`);
    console.log(`   • Users with AI Usage > 0: ${remainingUsage}\n`);

    // Step 6: Generate summary report
    const duration = Date.now() - startTime;
    console.log('📋 RESET SUMMARY REPORT');
    console.log('========================');
    console.log(`✅ AI Searches Deleted: ${resetSummary.aiSearchesDeleted}`);
    console.log(`✅ Weekly Tracking Deleted: ${resetSummary.weeklyTrackingDeleted}`);
    console.log(`✅ Users Reset: ${resetSummary.usersReset}`);
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)} seconds`);
    
    if (resetSummary.errors.length > 0) {
      console.log(`❌ Errors: ${resetSummary.errors.length}`);
      resetSummary.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No errors encountered');
    }

    console.log('\n🎉 Complete AI Search System Reset Completed Successfully!');
    console.log('📝 All users now have a clean slate for the new job titles system.');
    
    // Verification that cleanup was successful
    if (remainingSearches === 0 && remainingWeeklyTracking === 0 && remainingUsage === 0) {
      console.log('✅ VERIFICATION PASSED: All data successfully cleaned up');
      return true;
    } else {
      console.log('⚠️ VERIFICATION WARNING: Some data may remain');
      return false;
    }

  } catch (error) {
    console.error('❌ Critical error during reset:', error);
    resetSummary.errors.push(`Critical error: ${error.message}`);
    return false;
  }
}

// Execute the reset
async function main() {
  try {
    await connectDB();
    
    console.log('⚠️  WARNING: This will delete ALL AI searches for ALL users!');
    console.log('⚠️  This action cannot be undone!');
    console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    // 5 second delay for safety
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const success = await completeAiSearchReset();
    
    if (success) {
      console.log('\n🚀 System is now ready for the new job titles-based AI search!');
      process.exit(0);
    } else {
      console.log('\n❌ Reset completed with warnings. Please review the output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n⚠️ Script interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { completeAiSearchReset };
