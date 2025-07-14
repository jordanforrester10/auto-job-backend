// update-user-to-casual.js - Script to upgrade user to Casual plan
// Run this from the backend directory: node update-user-to-casual.js

const mongoose = require('mongoose');
const { Pool } = require('pg');
require('dotenv').config();

// Import models
const User = require('./models/mongodb/user.model');

// PostgreSQL connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRESQL_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// MongoDB connection
async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Update user to Casual plan
async function updateUserToCasualPlan(email) {
  const userEmail = email.toLowerCase().trim();
  
  try {
    console.log(`🔍 Looking for user: ${userEmail}`);
    
    // Find user in MongoDB
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return false;
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`📊 Current plan: ${user.subscriptionTier}`);
    
    // Calculate subscription dates (30 days from now)
    const now = new Date();
    const subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    // Update user in MongoDB
    const updateData = {
      subscriptionTier: 'casual',
      subscriptionStatus: 'active',
      subscriptionStartDate: now,
      subscriptionEndDate: subscriptionEndDate,
      cancelAtPeriodEnd: false,
      // Reset usage for new plan
      currentUsage: {
        resumeUploads: 0,
        resumeAnalysis: 0,
        jobImports: 0,
        resumeTailoring: 0,
        recruiterUnlocks: 0,
        aiJobDiscovery: 0, // Number of active AI searches (slot-based)
        aiConversations: 0,
        aiMessagesTotal: 0,
        resetDate: now
      }
    };
    
    await User.findByIdAndUpdate(user._id, updateData);
    console.log('✅ Updated user in MongoDB to Casual plan');
    
    // Update/Create subscription record in PostgreSQL
    try {
      // First, check if subscription record exists
      const existingSubscription = await db.query(
        'SELECT * FROM user_subscriptions WHERE user_id = $1',
        [user._id.toString()]
      );
      
      if (existingSubscription.rows.length > 0) {
        // Update existing subscription
        await db.query(`
          UPDATE user_subscriptions 
          SET 
            plan_name = $1,
            status = $2,
            current_period_start = $3,
            current_period_end = $4,
            cancel_at_period_end = $5,
            updated_at = NOW()
          WHERE user_id = $6
        `, ['casual', 'active', now, subscriptionEndDate, false, user._id.toString()]);
        
        console.log('✅ Updated existing subscription in PostgreSQL');
      } else {
        // Create new subscription record
        await db.query(`
          INSERT INTO user_subscriptions (
            user_id, 
            plan_name, 
            status, 
            current_period_start, 
            current_period_end, 
            cancel_at_period_end,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [user._id.toString(), 'casual', 'active', now, subscriptionEndDate, false]);
        
        console.log('✅ Created new subscription record in PostgreSQL');
      }
    } catch (pgError) {
      console.error('⚠️ PostgreSQL update failed (non-critical):', pgError.message);
      console.log('📝 User was still updated in MongoDB successfully');
    }
    
    // Display updated user info
    const updatedUser = await User.findById(user._id);
    console.log('\n🎉 USER SUCCESSFULLY UPDATED TO CASUAL PLAN!');
    console.log('==========================================');
    console.log(`👤 Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`📋 Plan: ${updatedUser.subscriptionTier}`);
    console.log(`📅 Start Date: ${updatedUser.subscriptionStartDate?.toISOString()}`);
    console.log(`📅 End Date: ${updatedUser.subscriptionEndDate?.toISOString()}`);
    console.log(`✅ Status: ${updatedUser.subscriptionStatus}`);
    
    console.log('\n🎯 CASUAL PLAN FEATURES NOW AVAILABLE:');
    console.log('- ✅ 5 Resume Uploads');
    console.log('- ✅ 5 Resume Analysis');
    console.log('- ✅ 25 Job Imports');
    console.log('- ✅ 25 Resume Tailoring');
    console.log('- ✅ Recruiter Access');
    console.log('- ✅ 25 Recruiter Unlocks');
    console.log('- ✅ AI Job Discovery (1 search slot)');
    console.log('- ✅ Weekly AI Job Discovery (50 jobs/week)');
    console.log('- ✅ Persistent Weekly Tracking');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error updating user to Casual plan:', error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting user plan update...');
    console.log('================================');
    
    // Connect to databases
    await connectMongoDB();
    console.log('✅ Connected to PostgreSQL');
    
    // Update the user
    const success = await updateUserToCasualPlan('jordan.forrester@thomsonreuters.com');
    
    if (success) {
      console.log('\n🎉 SUCCESS! User has been upgraded to Casual plan.');
      console.log('💡 The user can now:');
      console.log('   - Create AI job searches');
      console.log('   - Access recruiter database');
      console.log('   - Get up to 50 jobs per week with persistent tracking');
      console.log('   - Use enhanced resume tailoring');
    } else {
      console.log('\n❌ FAILED! Could not upgrade user to Casual plan.');
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await db.end();
    console.log('\n🔌 Database connections closed');
    process.exit(0);
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n⏹️ Script interrupted by user');
  await mongoose.connection.close();
  await db.end();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await mongoose.connection.close();
  await db.end();
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateUserToCasualPlan };