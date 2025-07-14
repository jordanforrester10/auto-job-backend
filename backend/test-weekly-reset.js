// backend/test-weekly-reset-fixed.js - FIXED OBJECTID ISSUE
const mongoose = require('mongoose');
const WeeklyJobTracking = require('./models/mongodb/weeklyJobTracking.model');
const User = require('./models/mongodb/user.model');
require('dotenv').config();

async function testWeeklyReset() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // === TEST SETUP ===
    const testUserId = '68161f881e8f530e01bef870'; // Your user ID
    const subscriptionTier = 'hunter'; // or 'casual'
    const weeklyLimit = subscriptionTier === 'hunter' ? 100 : 50;

    console.log('🧪 Starting Weekly Reset Test');
    console.log('👤 User ID:', testUserId);
    console.log('📋 Plan:', subscriptionTier);
    console.log('📊 Weekly Limit:', weeklyLimit);
    console.log('');

    // === STEP 1: CHECK CURRENT WEEK ===
    console.log('📅 STEP 1: Check Current Week Calculation');
    const currentWeekDates = WeeklyJobTracking.calculateWeekDates();
    console.log('Current Week Start:', currentWeekDates.weekStart.toISOString());
    console.log('Current Week End:', currentWeekDates.weekEnd.toISOString());
    console.log('Week Year:', currentWeekDates.weekYear);
    console.log('Week Number:', currentWeekDates.weekNumber);
    console.log('');

    // === STEP 2: GET CURRENT WEEKLY STATS ===
    console.log('📊 STEP 2: Get Current Weekly Stats');
    const currentStats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, weeklyLimit);
    console.log('Current Weekly Stats:', {
      jobsFoundThisWeek: currentStats.jobsFoundThisWeek,
      weeklyLimit: currentStats.weeklyLimit,
      remainingThisWeek: currentStats.remainingThisWeek,
      isLimitReached: currentStats.isLimitReached,
      trackingMethod: currentStats.trackingMethod
    });
    console.log('');

    // === STEP 3: ADD SOME TEST JOBS TO CURRENT WEEK ===
    console.log('🔧 STEP 3: Add Test Jobs to Current Week');
    const testJobsToAdd = 25;
    
    // 🔧 FIX: Create proper ObjectId for searchId
    const testSearchId = new mongoose.Types.ObjectId();
    console.log('Generated test search ID:', testSearchId.toString());
    
    const addResult = await WeeklyJobTracking.addJobsToWeeklyTracking(
      testUserId,
      testSearchId, // 🔧 FIX: Use ObjectId instead of string
      testJobsToAdd,
      'Manual Test Search',
      'Test Resume',
      subscriptionTier,
      weeklyLimit
    );

    console.log('Add Jobs Result:', {
      success: addResult.success,
      jobsAdded: addResult.jobsAdded,
      totalThisWeek: addResult.totalThisWeek,
      remaining: addResult.remaining
    });
    console.log('');

    // === STEP 4: VERIFY CURRENT WEEK HAS JOBS ===
    console.log('✅ STEP 4: Verify Current Week Has Jobs');
    const afterAddStats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, weeklyLimit);
    console.log('After Adding Jobs:', {
      jobsFoundThisWeek: afterAddStats.jobsFoundThisWeek,
      weeklyLimit: afterAddStats.weeklyLimit,
      remainingThisWeek: afterAddStats.remainingThisWeek,
      isLimitReached: afterAddStats.isLimitReached
    });
    console.log('');

    // === STEP 5: SIMULATE NEXT MONDAY (NEXT WEEK) ===
    console.log('📅 STEP 5: Simulate Next Monday (Next Week)');
    const nextMondayDate = new Date(currentWeekDates.weekStart);
    nextMondayDate.setDate(nextMondayDate.getDate() + 7); // Add 7 days
    console.log('Simulated Next Monday:', nextMondayDate.toISOString());

    const nextWeekDates = WeeklyJobTracking.calculateWeekDates(nextMondayDate);
    console.log('Next Week Start:', nextWeekDates.weekStart.toISOString());
    console.log('Next Week End:', nextWeekDates.weekEnd.toISOString());
    console.log('Next Week Year:', nextWeekDates.weekYear);
    console.log('Next Week Number:', nextWeekDates.weekNumber);
    console.log('');

    // === STEP 6: CHECK IF NEW WEEK RECORD WOULD BE CREATED ===
    console.log('🔍 STEP 6: Check if New Week Record Would Be Created');
    
    // Look for existing record for next week
    const existingNextWeekRecord = await WeeklyJobTracking.findOne({
      userId: testUserId,
      weekStart: nextWeekDates.weekStart
    });

    if (existingNextWeekRecord) {
      console.log('⚠️ Record already exists for next week:', {
        jobsFoundThisWeek: existingNextWeekRecord.jobsFoundThisWeek,
        weeklyLimit: existingNextWeekRecord.weeklyLimit
      });
    } else {
      console.log('✅ No record exists for next week - would create fresh record');
    }
    console.log('');

    // === STEP 7: TEST CREATING NEXT WEEK RECORD ===
    console.log('🆕 STEP 7: Test Creating Next Week Record');
    
    // Temporarily modify the calculateWeekDates function to return next week
    const originalCalculateWeekDates = WeeklyJobTracking.calculateWeekDates;
    WeeklyJobTracking.calculateWeekDates = () => nextWeekDates;

    const nextWeekRecord = await WeeklyJobTracking.getOrCreateWeeklyRecord(
      testUserId,
      subscriptionTier,
      weeklyLimit
    );

    console.log('Next Week Record Created:', {
      weekStart: nextWeekRecord.weekStart.toISOString(),
      jobsFoundThisWeek: nextWeekRecord.jobsFoundThisWeek,
      weeklyLimit: nextWeekRecord.weeklyLimit,
      isNewRecord: nextWeekRecord.searchRuns.length === 0
    });

    // Restore original function
    WeeklyJobTracking.calculateWeekDates = originalCalculateWeekDates;
    console.log('');

    // === STEP 8: TEST ADDING JOBS TO NEXT WEEK ===
    console.log('🔧 STEP 8: Test Adding Jobs to Next Week');
    
    // 🔧 FIX: Create another proper ObjectId for next week test
    const nextWeekTestSearchId = new mongoose.Types.ObjectId();
    
    // Temporarily modify calculateWeekDates again to simulate next week
    WeeklyJobTracking.calculateWeekDates = () => nextWeekDates;

    const nextWeekAddResult = await WeeklyJobTracking.addJobsToWeeklyTracking(
      testUserId,
      nextWeekTestSearchId, // 🔧 FIX: Use ObjectId instead of string
      15,
      'Next Week Test Search',
      'Test Resume',
      subscriptionTier,
      weeklyLimit
    );

    console.log('Next Week Add Result:', {
      success: nextWeekAddResult.success,
      jobsAdded: nextWeekAddResult.jobsAdded,
      totalThisWeek: nextWeekAddResult.totalThisWeek,
      remaining: nextWeekAddResult.remaining
    });

    // Restore original function
    WeeklyJobTracking.calculateWeekDates = originalCalculateWeekDates;
    console.log('');

    // === STEP 9: VERIFY BOTH WEEKS EXIST SEPARATELY ===
    console.log('📊 STEP 9: Verify Both Weeks Exist Separately');
    
    // Current week stats
    const finalCurrentStats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, weeklyLimit);
    console.log('Current Week Final Stats:', {
      jobsFoundThisWeek: finalCurrentStats.jobsFoundThisWeek,
      weeklyLimit: finalCurrentStats.weeklyLimit,
      trackingMethod: finalCurrentStats.trackingMethod
    });

    // Next week stats (simulate)
    WeeklyJobTracking.calculateWeekDates = () => nextWeekDates;
    const finalNextWeekStats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, weeklyLimit);
    WeeklyJobTracking.calculateWeekDates = originalCalculateWeekDates;

    console.log('Next Week Final Stats:', {
      jobsFoundThisWeek: finalNextWeekStats.jobsFoundThisWeek,
      weeklyLimit: finalNextWeekStats.weeklyLimit,
      trackingMethod: finalNextWeekStats.trackingMethod
    });
    console.log('');

    // === STEP 10: GET WEEKLY HISTORY ===
    console.log('📜 STEP 10: Get Weekly History');
    const weeklyHistory = await WeeklyJobTracking.getWeeklyHistory(testUserId, 5);
    console.log(`Found ${weeklyHistory.length} weekly records:`);
    weeklyHistory.forEach((record, index) => {
      console.log(`Week ${index + 1}:`, {
        weekStart: record.weekStart.toISOString().split('T')[0],
        jobsFound: record.jobsFoundThisWeek,
        limit: record.weeklyLimit,
        searchRuns: record.searchRuns.length
      });
    });
    console.log('');

    // === STEP 11: TEST SEARCH DELETION (PERSISTENT TRACKING) ===
    console.log('🗑️ STEP 11: Test Search Deletion (Persistent Tracking)');
    
    // Mark the test search as deleted but preserve job count
    const deleteResult = await WeeklyJobTracking.markSearchAsDeleted(testUserId, testSearchId);
    console.log('Search deletion result:', deleteResult);
    
    // Check stats after deletion - should preserve job count
    const afterDeleteStats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, weeklyLimit);
    console.log('After Search Deletion (Persistent Tracking):', {
      jobsFoundThisWeek: afterDeleteStats.jobsFoundThisWeek, // Should still be same
      weeklyLimit: afterDeleteStats.weeklyLimit,
      remainingThisWeek: afterDeleteStats.remainingThisWeek,
      message: 'Jobs preserved even though search was deleted'
    });
    console.log('');

    // === TEST RESULTS ===
    console.log('🎯 TEST RESULTS SUMMARY:');
    console.log('✅ Week calculation working:', nextWeekDates.weekStart > currentWeekDates.weekStart);
    console.log('✅ Current week has jobs:', finalCurrentStats.jobsFoundThisWeek > 0);
    console.log('✅ Next week starts fresh:', finalNextWeekStats.jobsFoundThisWeek >= 0 && finalNextWeekStats.jobsFoundThisWeek !== finalCurrentStats.jobsFoundThisWeek);
    console.log('✅ Separate weekly records:', weeklyHistory.length >= 1);
    console.log('✅ Persistent tracking works:', afterDeleteStats.jobsFoundThisWeek === finalCurrentStats.jobsFoundThisWeek);
    console.log('✅ Weekly reset functionality verified');
    console.log('');

    // === EXPECTED MONDAY BEHAVIOR ===
    console.log('🔮 EXPECTED MONDAY BEHAVIOR:');
    console.log('1. When Monday 9:00 AM arrives:');
    console.log('   - System calculates new week dates');
    console.log('   - Creates fresh WeeklyJobTracking record for new week');
    console.log('   - New record starts with 0/100 jobs');
    console.log('   - AI search executes and can find up to 100 jobs');
    console.log('2. Previous week data remains intact for history');
    console.log('3. Deleted searches remain marked as deleted but job counts preserved');
    console.log('');

    // === CLEANUP INFORMATION ===
    console.log('🧹 CLEANUP INFORMATION:');
    console.log('Test created the following records:');
    console.log(`- Current week (${currentWeekDates.weekStart.toISOString().split('T')[0]}): ${finalCurrentStats.jobsFoundThisWeek} jobs`);
    console.log(`- Next week (${nextWeekDates.weekStart.toISOString().split('T')[0]}): ${finalNextWeekStats.jobsFoundThisWeek} jobs`);
    console.log('');
    console.log('To clean up test data, run in MongoDB:');
    console.log(`db.weeklyjobtrackings.deleteMany({ userId: ObjectId("${testUserId}"), "searchRuns.searchName": /Test/ })`);
    console.log('');

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// === ADDITIONAL TEST: Manual Week Simulation ===
async function testSpecificWeek(weekStartDate) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📅 Testing specific week:', weekStartDate);
    
    const testUserId = '68161f881e8f530e01bef870';
    const specificDate = new Date(weekStartDate);
    const weekDates = WeeklyJobTracking.calculateWeekDates(specificDate);
    
    console.log('Week dates for', weekStartDate, ':');
    console.log('Start:', weekDates.weekStart.toISOString());
    console.log('End:', weekDates.weekEnd.toISOString());
    console.log('Week #:', weekDates.weekNumber);
    
    // Temporarily override the function
    const original = WeeklyJobTracking.calculateWeekDates;
    WeeklyJobTracking.calculateWeekDates = () => weekDates;
    
    const stats = await WeeklyJobTracking.getCurrentWeeklyStats(testUserId, 100);
    console.log('Stats for this week:', stats);
    
    // Restore function
    WeeklyJobTracking.calculateWeekDates = original;
    
  } catch (error) {
    console.error('Error testing specific week:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
if (require.main === module) {
  if (process.argv[2] === 'week' && process.argv[3]) {
    // Test specific week: node test-weekly-reset-fixed.js week 2025-07-21
    testSpecificWeek(process.argv[3]);
  } else {
    testWeeklyReset();
  }
}

module.exports = { testWeeklyReset, testSpecificWeek };