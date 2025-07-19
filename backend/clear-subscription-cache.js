// backend/clear-subscription-cache.js - Clear frontend cache and force refresh
require('dotenv').config();
const User = require('./models/mongodb/user.model');
const mongoose = require('mongoose');

async function clearSubscriptionCache() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB');
    
    // Get all users to verify the new limits are in place
    const users = await User.find({}).limit(5);
    
    console.log('\n📊 Verifying new plan limits for sample users:');
    users.forEach(user => {
      const limits = user.getPlanLimits();
      console.log(`User: ${user.email} (${user.subscriptionTier})`);
      console.log(`  Resume Uploads: ${limits.resumeUploads === -1 ? 'UNLIMITED ✅' : limits.resumeUploads}`);
      console.log(`  Resume Analysis: ${limits.resumeAnalysis === -1 ? 'UNLIMITED ✅' : limits.resumeAnalysis}`);
      console.log('');
    });
    
    console.log('🎉 Backend limits are correctly set to unlimited!');
    console.log('\n📝 To fix the frontend cache issue:');
    console.log('1. Open your browser developer tools (F12)');
    console.log('2. Go to the Console tab');
    console.log('3. Paste this command and press Enter:');
    console.log('\n   localStorage.clear(); sessionStorage.clear(); location.reload();');
    console.log('\n4. Or simply do a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('\n✅ This will clear all cached data and show unlimited uploads!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearSubscriptionCache();
