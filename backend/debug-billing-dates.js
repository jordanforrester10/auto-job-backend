// backend/debug-billing-dates.js - Debug script to check billing history dates
const connectMongoDB = require('./config/mongodb');
const User = require('./models/mongodb/user.model');
const db = require('./config/postgresql');
const stripeService = require('./services/stripe.service');

const debugBillingDates = async () => {
  try {
    console.log('🔍 Starting billing dates debug...');
    
    // Connect to databases
    await connectMongoDB();
    
    // Find all users with paid subscriptions
    const users = await User.find({
      subscriptionTier: { $in: ['casual', 'hunter'] },
      stripeCustomerId: { $exists: true, $ne: null }
    }).limit(5); // Limit to first 5 users for debugging
    
    console.log(`📊 Found ${users.length} users with paid subscriptions`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (${user._id})`);
      console.log(`   Plan: ${user.subscriptionTier}`);
      console.log(`   Stripe Customer: ${user.stripeCustomerId}`);
      
      // Check payment history in PostgreSQL
      console.log('\n💾 PostgreSQL Payment History:');
      const pgHistory = await db.query(`
        SELECT 
          stripe_invoice_id,
          amount,
          status,
          billing_reason,
          created_at,
          description
        FROM payment_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC
        LIMIT 3
      `, [user._id.toString()]);
      
      pgHistory.rows.forEach((payment, index) => {
        console.log(`   ${index + 1}. Invoice: ${payment.stripe_invoice_id}`);
        console.log(`      Amount: $${payment.amount}`);
        console.log(`      Date: ${payment.created_at}`);
        console.log(`      Description: ${payment.description}`);
        console.log(`      Billing Reason: ${payment.billing_reason}`);
      });
      
      // Check Stripe data
      console.log('\n🔄 Fresh Stripe Data:');
      try {
        const stripeInvoices = await stripeService.getCustomerInvoices(user.stripeCustomerId, 3);
        
        stripeInvoices.forEach((invoice, index) => {
          console.log(`   ${index + 1}. Stripe Invoice: ${invoice.id}`);
          console.log(`      Amount: $${invoice.amount_paid / 100}`);
          console.log(`      Status: ${invoice.status}`);
          console.log(`      Created: ${new Date(invoice.created * 1000).toISOString()}`);
          console.log(`      Period Start: ${invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : 'N/A'}`);
          console.log(`      Period End: ${invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : 'N/A'}`);
          console.log(`      Paid At: ${invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : 'N/A'}`);
          console.log(`      Billing Reason: ${invoice.billing_reason}`);
          console.log(`      Description: ${invoice.description || 'N/A'}`);
        });
      } catch (stripeError) {
        console.error(`   ❌ Error getting Stripe data: ${stripeError.message}`);
      }
      
      // Check current subscription dates
      console.log('\n📅 User Subscription Dates:');
      console.log(`   Start Date: ${user.subscriptionStartDate}`);
      console.log(`   End Date: ${user.subscriptionEndDate}`);
      console.log(`   Status: ${user.subscriptionStatus}`);
    }
    
    console.log('\n🎉 Debug completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
    process.exit(1);
  }
};

// Run the debug script if this file is executed directly
if (require.main === module) {
  debugBillingDates();
}

module.exports = { debugBillingDates };