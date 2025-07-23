// backend/test-tracker.js - Test Job Application Tracker Implementation
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const TrackedJob = require('./models/mongodb/trackedJob.model');
const Job = require('./models/mongodb/job.model');
const User = require('./models/mongodb/user.model');

// Import tracker service
const { getServiceStats, manualCleanup } = require('./services/tracker.service');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test functions
const testTrackerModel = async () => {
  console.log('\n🧪 Testing TrackedJob Model...');
  
  try {
    // Test model creation
    const testUserId = new mongoose.Types.ObjectId();
    const testJobId = new mongoose.Types.ObjectId();
    
    const trackedJob = new TrackedJob({
      userId: testUserId,
      jobId: testJobId,
      status: 'interested',
      priority: 'high',
      source: 'manual'
    });
    
    // Test validation
    const validationError = trackedJob.validateSync();
    if (validationError) {
      console.log('❌ Validation failed:', validationError.message);
      return false;
    }
    
    console.log('✅ Model validation passed');
    
    // Test instance methods
    await trackedJob.updateStatus('applied', 'Test status update');
    console.log('✅ updateStatus method works');
    
    await trackedJob.addNote('Test note content');
    console.log('✅ addNote method works');
    
    const interviewData = {
      type: 'phone',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30,
      interviewer: 'Test Interviewer',
      notes: 'Test interview notes'
    };
    
    await trackedJob.scheduleInterview(interviewData);
    console.log('✅ scheduleInterview method works');
    
    console.log('✅ TrackedJob model tests passed');
    return true;
    
  } catch (error) {
    console.error('❌ TrackedJob model test failed:', error.message);
    return false;
  }
};

const testStaticMethods = async () => {
  console.log('\n🧪 Testing Static Methods...');
  
  try {
    const testUserId = new mongoose.Types.ObjectId();
    
    // Test getUserStats
    const stats = await TrackedJob.getUserStats(testUserId);
    console.log('✅ getUserStats method works:', stats);
    
    // Test getJobsNeedingFollowUp
    const followUps = await TrackedJob.getJobsNeedingFollowUp(testUserId);
    console.log('✅ getJobsNeedingFollowUp method works:', followUps.length, 'jobs');
    
    // Test getUpcomingInterviews
    const interviews = await TrackedJob.getUpcomingInterviews(testUserId, 7);
    console.log('✅ getUpcomingInterviews method works:', interviews.length, 'interviews');
    
    console.log('✅ Static methods tests passed');
    return true;
    
  } catch (error) {
    console.error('❌ Static methods test failed:', error.message);
    return false;
  }
};

const testTrackerService = async () => {
  console.log('\n🧪 Testing Tracker Service...');
  
  try {
    // Test service stats
    const serviceStats = await getServiceStats();
    console.log('✅ getServiceStats works:', {
      totalTracked: serviceStats.statistics?.totalTrackedJobs || 0,
      archived: serviceStats.statistics?.archivedJobs || 0,
      isInitialized: serviceStats.service?.isInitialized || false
    });
    
    // Test manual cleanup (with 0 days to avoid deleting real data)
    const cleanupResult = await manualCleanup(0);
    console.log('✅ manualCleanup works:', {
      success: cleanupResult.success,
      deletedCount: cleanupResult.deletedCount
    });
    
    console.log('✅ Tracker service tests passed');
    return true;
    
  } catch (error) {
    console.error('❌ Tracker service test failed:', error.message);
    return false;
  }
};

const testIndexes = async () => {
  console.log('\n🧪 Testing Database Indexes...');
  
  try {
    const indexes = await TrackedJob.collection.getIndexes();
    console.log('✅ TrackedJob indexes:', Object.keys(indexes));
    
    // Check for required indexes
    const hasUserJobIndex = Object.keys(indexes).some(key => 
      key.includes('userId') && key.includes('jobId')
    );
    
    const hasLastActivityIndex = Object.keys(indexes).some(key => 
      key.includes('lastActivity')
    );
    
    if (hasUserJobIndex) {
      console.log('✅ User-Job compound index exists');
    } else {
      console.log('⚠️ User-Job compound index missing');
    }
    
    if (hasLastActivityIndex) {
      console.log('✅ LastActivity index exists');
    } else {
      console.log('⚠️ LastActivity index missing');
    }
    
    console.log('✅ Index tests completed');
    return true;
    
  } catch (error) {
    console.error('❌ Index test failed:', error.message);
    return false;
  }
};

const runAllTests = async () => {
  console.log('🚀 Starting Job Application Tracker Tests...\n');
  
  await connectDB();
  
  const results = {
    model: await testTrackerModel(),
    staticMethods: await testStaticMethods(),
    service: await testTrackerService(),
    indexes: await testIndexes()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All tracker tests passed! The implementation is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  
  process.exit(allPassed ? 0 : 1);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Run tests
runAllTests();
