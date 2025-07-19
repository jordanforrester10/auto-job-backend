// backend/test-unlimited-uploads.js - Test script to verify unlimited uploads are working
require('dotenv').config();
const User = require('./models/mongodb/user.model');
const mongoose = require('mongoose');

async function testUnlimitedUploads() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB');
    
    // Test with multiple users to verify all tiers have unlimited uploads
    const testUsers = await User.find({}).limit(5);
    
    if (testUsers.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`\n📊 Testing unlimited uploads for ${testUsers.length} users:`);
    
    for (const user of testUsers) {
      console.log(`\n👤 User: ${user.email} (${user.subscriptionTier})`);
      
      // Test the plan limits
      const limits = user.getPlanLimits();
      console.log('Plan Limits:', {
        resumeUploads: limits.resumeUploads === -1 ? 'UNLIMITED ✅' : limits.resumeUploads,
        resumeAnalysis: limits.resumeAnalysis === -1 ? 'UNLIMITED ✅' : limits.resumeAnalysis
      });
      
      // Test the canPerformAction method
      const uploadPermission = user.canPerformAction('resumeUploads', 1);
      const analysisPermission = user.canPerformAction('resumeAnalysis', 1);
      
      console.log('Permission Tests:');
      console.log('Resume Upload Permission:', {
        allowed: uploadPermission.allowed ? '✅ ALLOWED' : '❌ BLOCKED',
        reason: uploadPermission.reason || 'No restrictions'
      });
      
      console.log('Resume Analysis Permission:', {
        allowed: analysisPermission.allowed ? '✅ ALLOWED' : '❌ BLOCKED', 
        reason: analysisPermission.reason || 'No restrictions'
      });
      
      // Test with multiple uploads to ensure no blocking
      console.log('Testing Multiple Upload Scenarios:');
      for (let i = 1; i <= 3; i++) {
        const permission = user.canPerformAction('resumeUploads', i);
        console.log(`  ${i} upload(s): ${permission.allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
      }
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('2. Or run: localStorage.clear(); sessionStorage.clear(); location.reload(); in browser console');
    console.log('3. Try uploading a resume - you should see "Unlimited" instead of limits');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testUnlimitedUploads();
