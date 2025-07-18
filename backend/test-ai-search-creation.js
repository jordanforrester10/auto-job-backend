// Test script to debug AI search creation
const mongoose = require('mongoose');
const AiJobSearch = require('./models/mongodb/aiJobSearch.model');
const Resume = require('./models/mongodb/resume.model');
const User = require('./models/mongodb/user.model');
const jobSearchService = require('./services/jobSearch.service');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-application-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAiSearchCreation() {
  try {
    console.log('🧪 Testing AI Search Creation...');
    
    // Find a test user (you can replace with your actual user ID)
    const testUser = await User.findOne().limit(1);
    if (!testUser) {
      console.error('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Using test user: ${testUser._id} (${testUser.email})`);
    
    // Find a test resume for this user
    const testResume = await Resume.findOne({ userId: testUser._id }).limit(1);
    if (!testResume) {
      console.error('❌ No resumes found for test user');
      return;
    }
    
    console.log(`📄 Using test resume: ${testResume._id} (${testResume.name})`);
    
    // Test search criteria with job titles
    const searchCriteria = {
      jobTitles: ['Software Engineer', 'Frontend Developer'], // 🆕 NEW: Job titles
      searchLocations: [
        { name: 'Remote', type: 'remote' },
        { name: 'San Francisco, CA', type: 'city' }
      ],
      includeRemote: true,
      experienceLevel: 'mid',
      jobTypes: ['FULL_TIME'],
      salaryRange: null,
      workEnvironment: 'any'
    };
    
    console.log('🎯 Test search criteria:', JSON.stringify(searchCriteria, null, 2));
    
    // Test the findJobsWithAi function
    console.log('🚀 Calling jobSearchService.findJobsWithAi...');
    
    const result = await jobSearchService.findJobsWithAi(
      testUser._id.toString(),
      testResume._id.toString(),
      searchCriteria
    );
    
    console.log('✅ AI Search creation successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    // Check if the search was actually created in the database
    const createdSearch = await AiJobSearch.findById(result.searchId);
    if (createdSearch) {
      console.log('✅ AI Search found in database:');
      console.log(`   - ID: ${createdSearch._id}`);
      console.log(`   - Status: ${createdSearch.status}`);
      console.log(`   - Job Titles: ${createdSearch.searchCriteria.jobTitles}`);
      console.log(`   - Locations: ${createdSearch.searchCriteria.searchLocations.map(l => l.name).join(', ')}`);
      console.log(`   - Weekly Limit: ${createdSearch.weeklyLimit}`);
    } else {
      console.error('❌ AI Search not found in database despite success response');
    }
    
  } catch (error) {
    console.error('❌ AI Search creation failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for specific validation errors
    if (error.name === 'ValidationError') {
      console.error('📋 Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAiSearchCreation();
