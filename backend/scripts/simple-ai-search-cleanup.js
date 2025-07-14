// backend/scripts/simple-ai-search-cleanup.js
// Simple script to delete problematic AI searches
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

async function simpleCleanup() {
  try {
    console.log('🧹 Starting simple AI search cleanup...');
    
    // Get direct access to MongoDB collection
    const db = mongoose.connection.db;
    const collection = db.collection('aijobsearches');
    
    // Count all AI search documents
    const totalCount = await collection.countDocuments();
    console.log(`📊 Total AI search documents: ${totalCount}`);
    
    // Count problematic documents
    const problematicCount = await collection.countDocuments({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' }
      ]
    });
    
    console.log(`❌ Problematic documents: ${problematicCount}`);
    
    if (problematicCount === 0) {
      console.log('✅ No problematic documents found');
      return;
    }
    
    // Show what will be deleted
    const problematicDocs = await collection.find({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' }
      ]
    }, { projection: { _id: 1, resumeName: 1, searchType: 1, createdAt: 1 } }).toArray();
    
    console.log('\n📋 Documents that will be deleted:');
    problematicDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.resumeName || 'Unknown'} (${doc.searchType}) - Created: ${doc.createdAt}`);
    });
    
    console.log('\n⚠️  These are old AI searches using the deprecated Adzuna API');
    console.log('⚠️  Deleting them will not affect your jobs or resumes');
    console.log('⚠️  You can create new weekly AI searches after cleanup');
    
    // Delete the problematic documents
    console.log('\n🗑️ Deleting problematic AI search documents...');
    
    const deleteResult = await collection.deleteMany({
      $or: [
        { searchType: 'adzuna_api' },
        { 'schedule.frequency': 'daily' },
        { searchApproach: { $regex: /adzuna/ } },
        { qualityLevel: { $regex: /adzuna/ } },
        { 'jobsFound.apiSource': 'adzuna_aggregator' }
      ]
    });
    
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} problematic AI search documents`);
    
    // Count remaining documents
    const remainingCount = await collection.countDocuments();
    console.log(`📊 Remaining AI search documents: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('✅ Remaining AI searches should work correctly');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

async function runSimpleCleanup() {
  try {
    await connectToDatabase();
    
    console.log('🚀 Simple AI Search Cleanup');
    console.log('=' .repeat(40));
    
    await simpleCleanup();
    
    console.log('=' .repeat(40));
    console.log('✅ Cleanup completed successfully!');
    console.log('🔄 Restart your backend server');
    console.log('📝 You can now create new weekly AI searches');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  runSimpleCleanup();
}

module.exports = { simpleCleanup, runSimpleCleanup };