// backend/fix-billing-dates.js - Script to fix billing history dates from Stripe
const connectMongoDB = require('./config/mongodb');
const User = require('./models/mongodb/user.model');
const db = require('./config/postgresql');
const stripeService = require('./services/stripe.service');

const fixBillingDates = async () => {
  try {
    console.log('🔧 Starting billing dates fix...');
    
    // Connect to databases
    await connectMongoDB();
    
    // Find all users with paid subscriptions
    const users = await User.find({
      subscriptionTier: { $in: ['casual', 'hunter'] },
      stripeCustomerId: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${users.length} users with paid subscriptions to fix`);
    
    let totalFixed = 0;
    let totalFailed = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing User: ${user.email}`);
      
      try {
        // Get current payment history from database
        const pgHistory = await db.query(`
          SELECT 
            id,
            stripe_invoice_id,
            amount,
            created_at
          FROM payment_history 
          WHERE user_id = $1 
          ORDER BY created_at DESC
        `, [user._id.toString()]);
        
        console.log(`   💾 Found ${pgHistory.rows.length} payment records in database`);
        
        // Get fresh Stripe data
        const stripeInvoices = await stripeService.getCustomerInvoices(user.stripeCustomerId, 10);
        console.log(`   🔄 Found ${stripeInvoices.length} invoices in Stripe`);
        
        // Fix each payment record
        for (const dbPayment of pgHistory.rows) {
          const stripeInvoice = stripeInvoices.find(inv => inv.id === dbPayment.stripe_invoice_id);
          
          if (stripeInvoice && stripeInvoice.status === 'paid') {
            // Determine the correct date
            let correctDate = null;
            
            if (stripeInvoice.status_transitions && stripeInvoice.status_transitions.paid_at) {
              correctDate = new Date(stripeInvoice.status_transitions.paid_at * 1000);
            } else if (stripeInvoice.created) {
              correctDate = new Date(stripeInvoice.created * 1000);
            }
            
            if (correctDate) {
              const currentDate = new Date(dbPayment.created_at);
              const timeDiff = Math.abs(correctDate.getTime() - currentDate.getTime());
              const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
              
              // Only update if there's a significant difference (more than 1 day)
              if (daysDiff > 1) {
                console.log(`   🔧 Fixing invoice ${dbPayment.stripe_invoice_id}:`);
                console.log(`      Old Date: ${currentDate.toISOString()}`);
                console.log(`      New Date: ${correctDate.toISOString()}`);
                console.log(`      Difference: ${daysDiff.toFixed(1)} days`);
                
                // Update the database record
                await db.query(`
                  UPDATE payment_history 
                  SET 
                    created_at = $1,
                    description = $2,
                    updated_at = NOW()
                  WHERE id = $3
                `, [
                  correctDate,
                  stripeInvoice.description || `Monthly subscription payment - ${correctDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                  dbPayment.id
                ]);
                
                totalFixed++;
                console.log(`   ✅ Fixed payment record for invoice ${dbPayment.stripe_invoice_id}`);
              } else {
                console.log(`   ✓ Invoice ${dbPayment.stripe_invoice_id} date is already correct`);
              }
            } else {
              console.log(`   ⚠️ Could not determine correct date for invoice ${dbPayment.stripe_invoice_id}`);
            }
          } else {
            console.log(`   ⚠️ Invoice ${dbPayment.stripe_invoice_id} not found in Stripe or not paid`);
          }
        }
        
      } catch (userError) {
        console.error(`   ❌ Error processing user ${user.email}:`, userError.message);
        totalFailed++;
      }
    }
    
    console.log(`\n🎉 Billing dates fix completed!`);
    console.log(`   ✅ Fixed: ${totalFixed} records`);
    console.log(`   ❌ Failed: ${totalFailed} users`);
    
    // Run the debug script again to verify
    console.log(`\n🔍 Running verification...`);
    const { debugBillingDates } = require('./debug-billing-dates');
    await debugBillingDates();
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
    process.exit(1);
  }
};

// Run the fix script if this file is executed directly
if (require.main === module) {
  fixBillingDates();
}

module.exports = { fixBillingDates };