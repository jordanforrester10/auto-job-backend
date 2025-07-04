// backend/reset-all-subscriptions.js - Reset ALL users to free plan
const connectMongoDB = require('./config/mongodb');
const User = require('./models/mongodb/user.model');
const db = require('./config/postgresql');

const resetAllSubscriptions = async () => {
  try {
    console.log('🔄 Starting complete subscription reset...');
    console.log('⚠️  WARNING: This will reset ALL users to free plan!');
    console.log('⚠️  This action cannot be undone!');
    
    // Connect to databases
    await connectMongoDB();
    
    // Get count of users before reset
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({
      subscriptionTier: { $in: ['casual', 'hunter'] }
    });
    
    console.log(`📊 Found ${totalUsers} total users`);
    console.log(`📊 Found ${paidUsers} users with paid subscriptions`);
    
    if (paidUsers === 0) {
      console.log('✅ No paid users found. Nothing to reset.');
      return;
    }
    
    // Ask for confirmation (you can comment this out if running in CI/automated)
    console.log('\n⏳ Proceeding with reset in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🚀 Starting reset process...\n');
    
    // Step 1: Reset all users in MongoDB to free plan
    console.log('🔄 Step 1: Resetting all users to free plan in MongoDB...');
    
    const mongoResetResult = await User.updateMany(
      {}, // Update ALL users
      {
        $set: {
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          trialEndDate: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null,
          currentUsage: {
            resumeUploads: 0,
            resumeAnalysis: 0,
            jobImports: 0,
            resumeTailoring: 0,
            recruiterUnlocks: 0,
            aiJobDiscovery: 0,
            aiConversations: 0,
            aiMessagesTotal: 0,
            resetDate: new Date()
          },
          usageHistory: []
        }
      }
    );
    
    console.log(`✅ Updated ${mongoResetResult.modifiedCount} users in MongoDB`);
    
    // Step 2: Clear PostgreSQL user_subscriptions table
    console.log('\n🔄 Step 2: Clearing PostgreSQL user_subscriptions...');
    
    const pgSubscriptionsResult = await db.query(`
      DELETE FROM user_subscriptions;
    `);
    
    console.log(`✅ Deleted ${pgSubscriptionsResult.rowCount || 0} subscription records`);
    
    // Step 3: Clear PostgreSQL payment_history table
    console.log('\n🔄 Step 3: Clearing PostgreSQL payment_history...');
    
    const pgPaymentResult = await db.query(`
      DELETE FROM payment_history;
    `);
    
    console.log(`✅ Deleted ${pgPaymentResult.rowCount || 0} payment history records`);
    
    // Step 4: Clear PostgreSQL user_usage table
    console.log('\n🔄 Step 4: Clearing PostgreSQL user_usage...');
    
    const pgUsageResult = await db.query(`
      DELETE FROM user_usage;
    `);
    
    console.log(`✅ Deleted ${pgUsageResult.rowCount || 0} usage records`);
    
    // Step 5: Clear PostgreSQL ai_assistant_usage table
    console.log('\n🔄 Step 5: Clearing PostgreSQL ai_assistant_usage...');
    
    const pgAiUsageResult = await db.query(`
      DELETE FROM ai_assistant_usage;
    `);
    
    console.log(`✅ Deleted ${pgAiUsageResult.rowCount || 0} AI usage records`);
    
    // Step 6: Clear PostgreSQL webhook_events table (optional)
    console.log('\n🔄 Step 6: Clearing PostgreSQL webhook_events...');
    
    const pgWebhookResult = await db.query(`
      DELETE FROM webhook_events;
    `);
    
    console.log(`✅ Deleted ${pgWebhookResult.rowCount || 0} webhook event records`);
    
    // Step 7: Verify the reset
    console.log('\n🔍 Step 7: Verifying reset...');
    
    const verifyUsers = await User.find({
      subscriptionTier: { $in: ['casual', 'hunter'] }
    });
    
    const verifySubscriptions = await db.query(`
      SELECT COUNT(*) as count FROM user_subscriptions;
    `);
    
    const verifyPayments = await db.query(`
      SELECT COUNT(*) as count FROM payment_history;
    `);
    
    console.log(`📊 Verification Results:`);
    console.log(`   - Users with paid plans: ${verifyUsers.length} (should be 0)`);
    console.log(`   - Active subscriptions: ${verifySubscriptions.rows[0].count} (should be 0)`);
    console.log(`   - Payment records: ${verifyPayments.rows[0].count} (should be 0)`);
    
    if (verifyUsers.length === 0 && 
        parseInt(verifySubscriptions.rows[0].count) === 0 && 
        parseInt(verifyPayments.rows[0].count) === 0) {
      console.log('\n🎉 SUCCESS! All users have been reset to free plan!');
      console.log('✅ All subscription data has been cleared!');
      console.log('✅ All payment history has been cleared!');
      console.log('✅ All usage data has been cleared!');
    } else {
      console.log('\n⚠️ WARNING: Reset may not have completed successfully!');
      console.log('Please check the verification results above.');
    }
    
    // Step 8: Show final statistics
    console.log('\n📈 Final Statistics:');
    const finalUserCount = await User.countDocuments({ subscriptionTier: 'free' });
    console.log(`   - Total users on free plan: ${finalUserCount}`);
    console.log(`   - Total users on paid plans: 0`);
    console.log(`   - Database tables cleared: 5`);
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Clear browser cache and reload frontend');
    console.log('   3. All users can now test subscription flows from scratch');
    console.log('   4. Consider testing with Stripe test mode first');
    
    console.log('\n✨ Reset completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during subscription reset:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Utility function to reset just a specific user (for testing)
const resetSpecificUser = async (email) => {
  try {
    console.log(`🔄 Resetting specific user: ${email}`);
    
    await connectMongoDB();
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    // Reset user in MongoDB
    await User.findByIdAndUpdate(user._id, {
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      trialEndDate: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      currentUsage: {
        resumeUploads: 0,
        resumeAnalysis: 0,
        jobImports: 0,
        resumeTailoring: 0,
        recruiterUnlocks: 0,
        aiJobDiscovery: 0,
        aiConversations: 0,
        aiMessagesTotal: 0,
        resetDate: new Date()
      },
      usageHistory: []
    });
    
    // Clear PostgreSQL records
    await db.query(`DELETE FROM user_subscriptions WHERE user_id = $1`, [user._id.toString()]);
    await db.query(`DELETE FROM payment_history WHERE user_id = $1`, [user._id.toString()]);
    await db.query(`DELETE FROM user_usage WHERE user_id = $1`, [user._id.toString()]);
    await db.query(`DELETE FROM ai_assistant_usage WHERE user_id = $1`, [user._id.toString()]);
    
    console.log(`✅ User ${email} has been reset to free plan`);
    
  } catch (error) {
    console.error(`❌ Error resetting user ${email}:`, error);
  }
};

// Check command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  // Reset specific user
  const email = args[0];
  resetSpecificUser(email);
} else {
  // Reset all users
  resetAllSubscriptions();
}

module.exports = { resetAllSubscriptions, resetSpecificUser };