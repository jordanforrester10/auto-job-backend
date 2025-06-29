// backend/config/stripe.js
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠️ STRIPE_WEBHOOK_SECRET is not set - webhooks will not work');
}

// Stripe configuration object
const stripeConfig = {
  // API Keys
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Price IDs for plans (these should be set in your .env file)
  priceIds: {
    casual: {
      monthly: process.env.STRIPE_CASUAL_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_CASUAL_YEARLY_PRICE_ID
    },
    hunter: {
      monthly: process.env.STRIPE_HUNTER_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_HUNTER_YEARLY_PRICE_ID
    }
  },

  // Default configuration
  defaults: {
    currency: 'usd',
    automaticTax: {
      enabled: true
    },
    billingAddressCollection: 'required',
    shippingAddressCollection: null,
    allowPromotionCodes: true,
    customerCreation: 'always',
    mode: 'subscription',
    successUrl: process.env.FRONTEND_URL + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: process.env.FRONTEND_URL + '/pricing'
  },

  // Webhook events we handle
  webhookEvents: [
    'customer.subscription.created',
    'customer.subscription.updated', 
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'invoice.upcoming',
    'checkout.session.completed',
    'checkout.session.expired',
    'customer.created',
    'customer.updated',
    'payment_method.attached'
  ]
};

// Validate price IDs
const validatePriceIds = () => {
  const missing = [];
  
  if (!stripeConfig.priceIds.casual.monthly) {
    missing.push('STRIPE_CASUAL_MONTHLY_PRICE_ID');
  }
  if (!stripeConfig.priceIds.casual.yearly) {
    missing.push('STRIPE_CASUAL_YEARLY_PRICE_ID');
  }
  if (!stripeConfig.priceIds.hunter.monthly) {
    missing.push('STRIPE_HUNTER_MONTHLY_PRICE_ID');
  }
  if (!stripeConfig.priceIds.hunter.yearly) {
    missing.push('STRIPE_HUNTER_YEARLY_PRICE_ID');
  }

  if (missing.length > 0) {
    console.warn('⚠️ Missing Stripe Price IDs in environment variables:');
    missing.forEach(id => console.warn(`   - ${id}`));
    console.warn('   Subscription creation will fail until these are set.');
  }
};

// Initialize Stripe configuration
const initializeStripe = async () => {
  try {
    console.log('🔄 Initializing Stripe configuration...');
    
    // Validate price IDs
    validatePriceIds();
    
    // Test Stripe connection
    await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful');
    
    // Log configuration status
    console.log('📊 Stripe Configuration Status:');
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Secret Key: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Casual Monthly Price: ${stripeConfig.priceIds.casual.monthly ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Casual Yearly Price: ${stripeConfig.priceIds.casual.yearly ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Hunter Monthly Price: ${stripeConfig.priceIds.hunter.monthly ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Hunter Yearly Price: ${stripeConfig.priceIds.hunter.yearly ? '✅ Set' : '❌ Missing'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error.message);
    return false;
  }
};

// Export Stripe instance and configuration
module.exports = {
  stripe,
  stripeConfig,
  initializeStripe
};