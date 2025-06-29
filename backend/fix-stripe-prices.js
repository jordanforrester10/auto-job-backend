// backend/fix-stripe-prices.js - Update database with correct Stripe price IDs
require('dotenv').config();
const db = require('./config/postgresql');

async function updateStripePrices() {
  try {
    console.log('🔄 Updating Stripe price IDs in database...');

    // Update casual plan with correct monthly price ID
    await db.query(`
      UPDATE subscription_plans 
      SET stripe_monthly_price_id = $1
      WHERE name = 'casual'
    `, [process.env.STRIPE_CASUAL_MONTHLY_PRICE_ID]);

    // Update hunter plan with correct monthly price ID  
    await db.query(`
      UPDATE subscription_plans 
      SET stripe_monthly_price_id = $1
      WHERE name = 'hunter'
    `, [process.env.STRIPE_HUNTER_MONTHLY_PRICE_ID]);

    // Verify the updates
    const plansResult = await db.query(`
      SELECT name, display_name, price_monthly, stripe_monthly_price_id 
      FROM subscription_plans 
      ORDER BY sort_order
    `);

    console.log('✅ Updated subscription plans:');
    plansResult.rows.forEach(plan => {
      console.log(`  - ${plan.display_name} (${plan.name}): $${plan.price_monthly}/month`);
      console.log(`    Stripe Price ID: ${plan.stripe_monthly_price_id || 'NOT SET'}`);
    });

    // Check environment variables
    console.log('\n📊 Environment Variables:');
    console.log(`  - STRIPE_CASUAL_MONTHLY_PRICE_ID: ${process.env.STRIPE_CASUAL_MONTHLY_PRICE_ID || 'NOT SET'}`);
    console.log(`  - STRIPE_HUNTER_MONTHLY_PRICE_ID: ${process.env.STRIPE_HUNTER_MONTHLY_PRICE_ID || 'NOT SET'}`);

    console.log('\n✅ Database updated successfully!');

  } catch (error) {
    console.error('❌ Error updating Stripe prices:', error);
  } finally {
    process.exit(0);
  }
}

updateStripePrices();