// backend/services/stripe.service.js - FIXED TO HANDLE MISSING USER METADATA
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');

class StripeService {
  /**
   * Create or retrieve a Stripe customer
   * @param {Object} user - User object from MongoDB
   * @returns {Object} Stripe customer object
   */
  async createOrGetCustomer(user) {
    try {
      // If user already has a Stripe customer ID, retrieve it
      if (user.stripeCustomerId) {
        try {
          const customer = await stripe.customers.retrieve(user.stripeCustomerId);
          return customer;
        } catch (error) {
          console.error('Error retrieving existing customer:', error);
          // If customer doesn't exist, create a new one
        }
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          plan: user.subscriptionTier
        }
      });

      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: customer.id
      });

      console.log(`✅ Created Stripe customer: ${customer.id} for user: ${user.email}`);
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer: ' + error.message);
    }
  }

  /**
   * Find user by Stripe customer ID
   * @param {string} stripeCustomerId - Stripe customer ID
   * @returns {Object|null} User object or null
   */
  async findUserByStripeCustomerId(stripeCustomerId) {
    try {
      const user = await User.findOne({ stripeCustomerId });
      return user;
    } catch (error) {
      console.error('Error finding user by Stripe customer ID:', error);
      return null;
    }
  }

  /**
   * Get user ID from subscription or customer
   * @param {Object} subscription - Stripe subscription object
   * @returns {string|null} User ID or null
   */
  async getUserIdFromSubscription(subscription) {
    try {
      // First try to get userId from subscription metadata
      if (subscription.metadata?.userId) {
        return subscription.metadata.userId;
      }

      // If not in subscription metadata, try to get from customer
      const customerId = subscription.customer;
      if (customerId) {
        // Try to find user by stripe customer ID in our database
        const user = await this.findUserByStripeCustomerId(customerId);
        if (user) {
          console.log(`✅ Found user ${user._id} via Stripe customer ID: ${customerId}`);
          return user._id.toString();
        }

        // If not found in our database, get customer from Stripe and check metadata
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.metadata?.userId) {
            console.log(`✅ Found user ID in customer metadata: ${customer.metadata.userId}`);
            return customer.metadata.userId;
          }
        } catch (customerError) {
          console.error('Error retrieving customer from Stripe:', customerError);
        }
      }

      console.warn(`⚠️ Could not find user ID for subscription ${subscription.id}`);
      return null;
    } catch (error) {
      console.error('Error getting user ID from subscription:', error);
      return null;
    }
  }

  /**
   * Create a checkout session for subscription (Monthly only)
   * @param {Object} params - Checkout parameters
   * @returns {Object} Stripe checkout session
   */
  async createCheckoutSession({
    userId,
    priceId,
    successUrl,
    cancelUrl,
    planName
  }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customer = await this.createOrGetCustomer(user);

      const sessionParams = {
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          planName: planName,
          billingCycle: 'monthly'
        },
        subscription_data: {
        metadata: {
            userId: userId,
            planName: planName
        },
        trial_period_days: 0 // CHANGED: Remove trial - set to 0 for all plans
        }
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log(`✅ Created checkout session: ${session.id} for plan: ${planName} (monthly)`);
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session: ' + error.message);
    }
  }

  /**
   * Create a customer portal session
   * @param {string} customerId - Stripe customer ID
   * @param {string} returnUrl - URL to return to after managing subscription
   * @returns {Object} Customer portal session
   */
  async createCustomerPortalSession(customerId, returnUrl) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session: ' + error.message);
    }
  }

  /**
   * Get subscription details
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Object} Subscription object
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new Error('Failed to retrieve subscription: ' + error.message);
    }
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @param {boolean} atPeriodEnd - Whether to cancel at period end
   * @returns {Object} Updated subscription object
   */
  async cancelSubscription(subscriptionId, atPeriodEnd = true) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd,
      });

      console.log(`✅ Subscription ${subscriptionId} marked for cancellation`);
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription: ' + error.message);
    }
  }

  /**
   * Resume subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Object} Updated subscription object
   */
  async resumeSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      console.log(`✅ Subscription ${subscriptionId} resumed`);
      return subscription;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error('Failed to resume subscription: ' + error.message);
    }
  }

  /**
   * Change subscription plan (Monthly only)
   * @param {string} subscriptionId - Stripe subscription ID
   * @param {string} newPriceId - New monthly price ID
   * @returns {Object} Updated subscription object
   */
  async changeSubscriptionPlan(subscriptionId, newPriceId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      console.log(`✅ Subscription ${subscriptionId} plan changed to ${newPriceId} (monthly)`);
      return updatedSubscription;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error('Failed to change subscription plan: ' + error.message);
    }
  }

  /**
   * Get customer's payment methods
   * @param {string} customerId - Stripe customer ID
   * @returns {Array} Array of payment methods
   */
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      throw new Error('Failed to retrieve payment methods: ' + error.message);
    }
  }

  /**
   * Get customer's invoices
   * @param {string} customerId - Stripe customer ID
   * @param {number} limit - Number of invoices to retrieve
   * @returns {Array} Array of invoices
   */
  async getCustomerInvoices(customerId, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: limit,
      });

      return invoices.data;
    } catch (error) {
      console.error('Error retrieving invoices:', error);
      throw new Error('Failed to retrieve invoices: ' + error.message);
    }
  }

  /**
   * Handle webhook events
   * @param {Object} event - Stripe webhook event
   */
  async handleWebhookEvent(event) {
    try {
      console.log(`🔔 Received Stripe webhook: ${event.type}`);

      // Log webhook event to database
      await this.logWebhookEvent(event);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      // Mark webhook as processed
      await this.markWebhookProcessed(event.id);
    } catch (error) {
      console.error('Error handling webhook event:', error);
      await this.logWebhookError(event.id, error.message);
      throw error;
    }
  }

  /**
   * Handle subscription created event - FIXED VERSION
   */
  async handleSubscriptionCreated(subscription) {
    try {
      const userId = await this.getUserIdFromSubscription(subscription);
      const planName = subscription.metadata?.planName || 'casual';

      if (!userId) {
        console.error(`❌ Cannot process subscription ${subscription.id} - no user ID found`);
        return;
      }

      console.log(`✅ Processing subscription created for user ${userId}`);

      // Update user subscription in MongoDB (always monthly)
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: planName,
        subscriptionStatus: subscription.status,
        subscriptionStartDate: new Date(subscription.created * 1000),
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        stripeCustomerId: subscription.customer // Make sure we store the customer ID
      });

      // Create subscription record in PostgreSQL
      await db.query(`
        INSERT INTO user_subscriptions (
          user_id, stripe_customer_id, stripe_subscription_id, status, 
          current_period_start, current_period_end,
          cancel_at_period_end, trial_start, trial_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          stripe_subscription_id = $3,
          status = $4,
          current_period_start = $5,
          current_period_end = $6,
          cancel_at_period_end = $7,
          trial_start = $8,
          trial_end = $9,
          updated_at = NOW()
      `, [
        userId,
        subscription.customer,
        subscription.id,
        subscription.status,
        new Date(subscription.created * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      ]);

      console.log(`✅ Monthly subscription created for user ${userId}: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated event - FIXED VERSION
   */
  async handleSubscriptionUpdated(subscription) {
    try {
      const userId = await this.getUserIdFromSubscription(subscription);

      if (!userId) {
        console.error(`❌ Cannot process subscription update ${subscription.id} - no user ID found`);
        return;
      }

      // Update user subscription in MongoDB
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: subscription.status,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });

      // Update subscription record in PostgreSQL
      await db.query(`
        UPDATE user_subscriptions SET
          status = $1,
          current_period_end = $2,
          cancel_at_period_end = $3,
          updated_at = NOW()
        WHERE user_id = $4
      `, [
        subscription.status,
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        userId
      ]);

      console.log(`✅ Monthly subscription updated for user ${userId}: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted event - FIXED VERSION
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = await this.getUserIdFromSubscription(subscription);

      if (!userId) {
        console.error(`❌ Cannot process subscription deletion ${subscription.id} - no user ID found`);
        return;
      }

      // Downgrade user to free plan
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false
      });

      // Update subscription record in PostgreSQL
      await db.query(`
        UPDATE user_subscriptions SET
          status = 'canceled',
          canceled_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      console.log(`✅ Subscription canceled for user ${userId}: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle payment succeeded event - FIXED VERSION
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const customerId = invoice.customer;

      // First try to find user by customer ID lookup
      let userId = null;
      
      // Method 1: Direct lookup in user_subscriptions table
      const userLookupQuery = await db.query(`
        SELECT user_id FROM user_subscriptions 
        WHERE stripe_customer_id = $1
      `, [customerId]);

      if (userLookupQuery.rows.length > 0) {
        userId = userLookupQuery.rows[0].user_id;
        console.log(`✅ Found user ${userId} via subscription lookup for customer ${customerId}`);
      } else {
        // Method 2: Lookup in MongoDB
        const user = await this.findUserByStripeCustomerId(customerId);
        if (user) {
          userId = user._id.toString();
          console.log(`✅ Found user ${userId} via MongoDB lookup for customer ${customerId}`);
        }
      }

      if (!userId) {
        console.warn(`⚠️ Cannot record payment - no user found for customer ${customerId}`);
        // Still log the webhook but without user_id
        await this.logWebhookEvent({
          id: `payment_orphaned_${Date.now()}`,
          type: 'payment_orphaned',
          data: { object: invoice },
          created: Math.floor(Date.now() / 1000)
        });
        return;
      }

      // Record payment in PostgreSQL
      await db.query(`
        INSERT INTO payment_history (
          user_id, stripe_payment_intent_id, stripe_invoice_id,
          amount, currency, status, payment_method, billing_reason,
          description, invoice_url, receipt_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (stripe_payment_intent_id) DO NOTHING
      `, [
        userId,
        invoice.payment_intent,
        invoice.id,
        invoice.amount_paid / 100, // Convert from cents
        invoice.currency,
        'succeeded',
        'card',
        invoice.billing_reason,
        invoice.description || 'Monthly subscription payment',
        invoice.hosted_invoice_url,
        invoice.receipt_url
      ]);

      console.log(`✅ Monthly payment succeeded recorded for user ${userId}: ${invoice.id}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed event - FIXED VERSION
   */
  async handlePaymentFailed(invoice) {
    try {
      const customerId = invoice.customer;

      // Find user ID
      let userId = null;
      const userLookupQuery = await db.query(`
        SELECT user_id FROM user_subscriptions 
        WHERE stripe_customer_id = $1
      `, [customerId]);

      if (userLookupQuery.rows.length > 0) {
        userId = userLookupQuery.rows[0].user_id;
      } else {
        const user = await this.findUserByStripeCustomerId(customerId);
        if (user) {
          userId = user._id.toString();
        }
      }

      if (!userId) {
        console.warn(`⚠️ Cannot record failed payment - no user found for customer ${customerId}`);
        return;
      }

      // Record failed payment in PostgreSQL
      await db.query(`
        INSERT INTO payment_history (
          user_id, stripe_invoice_id, amount, currency, status,
          billing_reason, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        invoice.id,
        invoice.amount_due / 100, // Convert from cents
        invoice.currency,
        'failed',
        invoice.billing_reason,
        'Monthly payment failed for subscription'
      ]);

      console.log(`⚠️ Monthly payment failed recorded for user ${userId}: ${invoice.id}`);
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  async handleCheckoutCompleted(session) {
    try {
      const userId = session.metadata?.userId;
      const planName = session.metadata?.planName;

      if (!userId) {
        console.error('No userId in checkout session metadata');
        return;
      }

      console.log(`✅ Monthly checkout completed for user ${userId}: Plan ${planName}`);
    } catch (error) {
      console.error('Error handling checkout completed:', error);
      throw error;
    }
  }

  /**
   * Log webhook event to database
   */
  async logWebhookEvent(event) {
    try {
      await db.query(`
        INSERT INTO webhook_events (stripe_event_id, event_type, data)
        VALUES ($1, $2, $3)
        ON CONFLICT (stripe_event_id) DO NOTHING
      `, [event.id, event.type, JSON.stringify(event)]);
    } catch (error) {
      console.error('Error logging webhook event:', error);
    }
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(eventId) {
    try {
      await db.query(`
        UPDATE webhook_events SET
          processed = true,
          processed_at = NOW()
        WHERE stripe_event_id = $1
      `, [eventId]);
    } catch (error) {
      console.error('Error marking webhook processed:', error);
    }
  }

  /**
   * Log webhook error
   */
  async logWebhookError(eventId, errorMessage) {
    try {
      await db.query(`
        UPDATE webhook_events SET
          error_message = $1
        WHERE stripe_event_id = $2
      `, [errorMessage, eventId]);
    } catch (error) {
      console.error('Error logging webhook error:', error);
    }
  }

  /**
   * Get pricing information for plans (Monthly only)
   */
  async getPricingInfo() {
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product']
      });

      return prices.data
        .filter(price => price.recurring?.interval === 'month') // Only monthly prices
        .map(price => ({
          id: price.id,
          productId: price.product.id,
          productName: price.product.name,
          amount: price.unit_amount / 100,
          currency: price.currency,
          interval: 'month',
          intervalCount: 1
        }));
    } catch (error) {
      console.error('Error getting pricing info:', error);
      throw new Error('Failed to get pricing info: ' + error.message);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, endpointSecret) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error('Invalid webhook signature');
    }
  }
}

module.exports = new StripeService();