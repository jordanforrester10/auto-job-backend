// Quick script to check current AI searches in database
const mongoose = require('mongoose');
const AiJobSearch = require('./models/mongodb/aiJobSearch.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-application-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAiSearches() {
  try {
    console.log('🔍 Checking current AI searches in database...');
    
    const searches = await AiJobSearch.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${searches.length} AI searches:`);
    
    searches.forEach((search, index) => {
      console.log(`\n${index + 1}. Search ID: ${search._id}`);
      console.log(`   Status: ${search.status}`);
      console.log(`   Job Titles: ${search.searchCriteria?.jobTitles?.join(', ') || 'N/A'}`);
      console.log(`   Locations: ${search.searchCriteria?.searchLocations?.map(l => l.name).join(', ') || 'N/A'}`);
      console.log(`   User ID: ${search.userId}`);
      console.log(`   Created: ${search.createdAt}`);
      console.log(`   Weekly Limit: ${search.weeklyLimit}`);
    });
    
    if (searches.length === 0) {
      console.log('❌ No AI searches found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking AI searches:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

// Run the check
checkAiSearches();
