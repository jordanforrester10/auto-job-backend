// backend/services/stripe.service.js - FINAL FIX: PRIORITIZES SUBSCRIPTION ITEM DATES
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');

class StripeService {
  /**
   * Helper function to safely convert Stripe timestamp to Date
   * @param {number|null} timestamp - Stripe timestamp (in seconds)
   * @returns {Date|null} JavaScript Date object or null
   */
  safeTimestampToDate(timestamp) {
    if (!timestamp || timestamp === null || timestamp === undefined) {
      return null;
    }
    
    try {
      const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Error converting timestamp to date:', timestamp, error);
      return null;
    }
  }

  /**
   * Calculate next billing date (monthly billing)
   * @param {Date} startDate - Subscription start date
   * @returns {Date} Next billing date
   */
  calculateNextBillingDate(startDate = new Date()) {
    const nextBilling = new Date(startDate);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    
    // Handle edge case where day doesn't exist in next month (e.g., Jan 31 -> Feb 28)
    if (nextBilling.getDate() !== startDate.getDate()) {
      nextBilling.setDate(0); // Set to last day of previous month
    }
    
    return nextBilling;
  }

  /**
   * FIXED: Get subscription dates with SUBSCRIPTION ITEM PRIORITY
   * @param {Object} subscription - Stripe subscription object
   * @returns {Object} Object with start and end dates
   */
  async getSubscriptionDatesRobust(subscription) {
    console.log(`🔍 Getting robust subscription dates for ${subscription.id}`);
    
    let startDate = null;
    let endDate = null;
    let source = null;

    // 🎯 STRATEGY 1 (NEW): Use subscription items first (Stripe's newer API structure)
    if (subscription.items?.data?.length > 0) {
      const item = subscription.items.data[0];
      if (item.current_period_start && item.current_period_end) {
        startDate = this.safeTimestampToDate(item.current_period_start);
        endDate = this.safeTimestampToDate(item.current_period_end);
        source = 'subscription_item';
        console.log(`✅ Strategy 1 (subscription_item): ${startDate} → ${endDate}`);
      }
    }

    // Strategy 2: Use subscription-level current_period dates (legacy structure)
    if ((!startDate || !endDate) && subscription.current_period_start && subscription.current_period_end) {
      startDate = this.safeTimestampToDate(subscription.current_period_start);
      endDate = this.safeTimestampToDate(subscription.current_period_end);
      source = 'current_period';
      console.log(`✅ Strategy 2 (current_period): ${startDate} → ${endDate}`);
    }

    // Strategy 3: Use latest invoice line item period
    if (!startDate || !endDate) {
      try {
        let invoice = null;
        
        // If latest_invoice is expanded, use it
        if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
          invoice = subscription.latest_invoice;
        } 
        // Otherwise retrieve it
        else if (subscription.latest_invoice) {
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice, {
            expand: ['lines']
          });
        }

        if (invoice?.lines?.data?.length > 0) {
          const lineItem = invoice.lines.data[0];
          if (lineItem.period && lineItem.period.start && lineItem.period.end) {
            startDate = this.safeTimestampToDate(lineItem.period.start);
            endDate = this.safeTimestampToDate(lineItem.period.end);
            source = 'invoice_line_item';
            console.log(`✅ Strategy 3 (invoice_line_item): ${startDate} → ${endDate}`);
          }
        }
      } catch (invoiceError) {
        console.warn(`⚠️ Could not retrieve latest invoice: ${invoiceError.message}`);
      }
    }

    // Strategy 4: Use latest invoice period dates (subscription creation invoice)
    if (!startDate || !endDate) {
      try {
        let invoice = null;
        
        if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
          invoice = subscription.latest_invoice;
        } 
        else if (subscription.latest_invoice) {
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
        }

        if (invoice && invoice.period_start && invoice.period_end) {
          startDate = this.safeTimestampToDate(invoice.period_start);
          endDate = this.safeTimestampToDate(invoice.period_end);
          source = 'latest_invoice';
          console.log(`✅ Strategy 4 (latest_invoice): ${startDate} → ${endDate}`);
        }
      } catch (invoiceError) {
        console.warn(`⚠️ Could not retrieve latest invoice: ${invoiceError.message}`);
      }
    }

    // Strategy 5: Check upcoming invoice
    if (!startDate || !endDate) {
      try {
        const upcomingInvoice = await stripe.invoices.upcoming({
          customer: subscription.customer
        });
        
        if (upcomingInvoice.period_start && upcomingInvoice.period_end) {
          startDate = this.safeTimestampToDate(upcomingInvoice.period_start);
          endDate = this.safeTimestampToDate(upcomingInvoice.period_end);
          source = 'upcoming_invoice';
          console.log(`✅ Strategy 5 (upcoming_invoice): ${startDate} → ${endDate}`);
        }
      } catch (upcomingError) {
        console.warn(`⚠️ Could not retrieve upcoming invoice: ${upcomingError.message}`);
      }
    }

    // Strategy 6: Use billing cycle anchor + calculate
    if (!startDate || !endDate) {
      if (subscription.billing_cycle_anchor) {
        const anchorDate = this.safeTimestampToDate(subscription.billing_cycle_anchor);
        if (anchorDate) {
          startDate = anchorDate;
          endDate = this.calculateNextBillingDate(anchorDate);
          source = 'billing_cycle_anchor';
          console.log(`✅ Strategy 6 (billing_anchor): ${startDate} → ${endDate}`);
        }
      }
    }

    // Strategy 7: Use subscription start_date + calculate
    if (!startDate || !endDate) {
      if (subscription.start_date) {
        const subStartDate = this.safeTimestampToDate(subscription.start_date);
        if (subStartDate) {
          startDate = subStartDate;
          endDate = this.calculateNextBillingDate(subStartDate);
          source = 'start_date_calculated';
          console.log(`✅ Strategy 7 (start_date): ${startDate} → ${endDate}`);
        }
      }
    }

    // Strategy 8: Use subscription created date + calculate (last resort)
    if (!startDate || !endDate) {
      const createdDate = this.safeTimestampToDate(subscription.created);
      if (createdDate) {
        startDate = createdDate;
        endDate = this.calculateNextBillingDate(createdDate);
        source = 'created_date_calculated';
        console.log(`⚠️ Strategy 8 (created_date - FALLBACK): ${startDate} → ${endDate}`);
      }
    }

    const result = {
      startDate,
      endDate,
      source,
      hasValidDates: !!(startDate && endDate)
    };

    console.log(`📅 Final dates for ${subscription.id}:`, result);
    return result;
  }

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
   * Get invoice details
   * @param {string} invoiceId - Stripe invoice ID
   * @returns {Object} Invoice object
   */
  async getInvoice(invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      throw new Error('Failed to retrieve invoice: ' + error.message);
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

      console.log(`📅 Creating monthly subscription checkout for plan: ${planName}`);

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
            planName: planName,
            billingCycle: 'monthly'
          }
        },
        billing_address_collection: 'required',
        allow_promotion_codes: true,
        automatic_tax: {
          enabled: false
        }
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log(`✅ Created checkout session: ${session.id} for plan: ${planName}`);
      
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
   * Get subscription details with full expansion
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Object} Subscription object
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: [
          'latest_invoice',
          'latest_invoice.lines',
          'customer',
          'items',
          'items.data.price'
        ]
      });
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new Error('Failed to retrieve subscription: ' + error.message);
    }
  }

  /**
   * Get all subscriptions for a customer with full expansion
   * @param {string} customerId - Stripe customer ID
   * @returns {Array} Array of subscription objects
   */
  async getCustomerSubscriptions(customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: [
          'data.latest_invoice',
          'data.latest_invoice.lines',
          'data.items',
          'data.items.data.price'
        ]
      });
      return subscriptions.data;
    } catch (error) {
      console.error('Error retrieving customer subscriptions:', error);
      throw new Error('Failed to retrieve customer subscriptions: ' + error.message);
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

      console.log(`✅ Subscription ${subscriptionId} plan changed to ${newPriceId}`);
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
   * FIXED: Handle subscription created event - WITH SUBSCRIPTION ITEM PRIORITY
   */
  async handleSubscriptionCreated(subscription) {
    try {
      const userId = await this.getUserIdFromSubscription(subscription);

      if (!userId) {
        console.error(`❌ Cannot process subscription creation ${subscription.id} - no user ID found`);
        return;
      }

      console.log(`✅ Processing subscription created for user ${userId}`);
      console.log(`🔍 Subscription status: ${subscription.status}`);

      // Get plan name from metadata or price
      let planName = subscription.metadata?.planName;
      if (!planName) {
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId?.includes('casual')) {
          planName = 'casual';
        } else if (priceId?.includes('hunter')) {
          planName = 'hunter';
        }
      }

      // 🎯 FIXED: Get subscription dates using subscription item priority
      const dateResult = await this.getSubscriptionDatesRobust(subscription);

      if (!dateResult.hasValidDates) {
        console.error(`❌ Could not determine valid billing dates for subscription ${subscription.id}`);
        
        // For incomplete subscriptions, we'll wait for them to become active
        if (subscription.status === 'incomplete') {
          console.log(`⏳ Subscription ${subscription.id} is incomplete, will process when it becomes active`);
          
          // Store minimal data for now
          await User.findByIdAndUpdate(userId, {
            subscriptionTier: planName || 'casual',
            subscriptionStatus: subscription.status
          });
          
          return;
        }
        
        throw new Error(`Unable to determine billing dates for subscription ${subscription.id}`);
      }

      console.log(`📅 Using dates from source: ${dateResult.source}`);
      console.log(`   Start: ${dateResult.startDate.toISOString()}`);
      console.log(`   End: ${dateResult.endDate.toISOString()}`);

      // Update user subscription in MongoDB
      const updateData = {
        subscriptionTier: planName || 'casual',
        subscriptionStatus: subscription.status,
        subscriptionStartDate: dateResult.startDate,
        subscriptionEndDate: dateResult.endDate,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false
      };

      console.log(`📝 Updating user with subscription item dates:`, updateData);

      await User.findByIdAndUpdate(userId, updateData);

      // Create or update subscription record in PostgreSQL
      await db.query(`
        INSERT INTO user_subscriptions (
          user_id, stripe_customer_id, stripe_subscription_id, status,
          current_period_start, current_period_end, cancel_at_period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          stripe_subscription_id = $3,
          status = $4,
          current_period_start = $5,
          current_period_end = $6,
          cancel_at_period_end = $7,
          updated_at = NOW()
      `, [
        userId,
        subscription.customer,
        subscription.id,
        subscription.status,
        dateResult.startDate,
        dateResult.endDate,
        subscription.cancel_at_period_end || false
      ]);

      console.log(`✅ Subscription created for user ${userId}: ${subscription.id}`);
      console.log(`🎯 Billing cycle (${dateResult.source}): ${dateResult.startDate.toDateString()} → ${dateResult.endDate.toDateString()}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * FIXED: Handle subscription updated event - WITH SUBSCRIPTION ITEM PRIORITY
   */
  async handleSubscriptionUpdated(subscription) {
    try {
      const userId = await this.getUserIdFromSubscription(subscription);

      if (!userId) {
        console.error(`❌ Cannot process subscription update ${subscription.id} - no user ID found`);
        return;
      }

      console.log(`✅ Processing subscription updated for user ${userId}`);
      console.log(`🔍 Updated subscription status: ${subscription.status}`);

      // 🎯 FIXED: Get subscription dates using subscription item priority
      const dateResult = await this.getSubscriptionDatesRobust(subscription);

      let updateData = {
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };

      if (dateResult.hasValidDates) {
        console.log(`📅 Using updated dates from source: ${dateResult.source}`);
        console.log(`   Start: ${dateResult.startDate.toISOString()}`);
        console.log(`   End: ${dateResult.endDate.toISOString()}`);

        updateData.subscriptionStartDate = dateResult.startDate;
        updateData.subscriptionEndDate = dateResult.endDate;
      } else {
        console.warn(`⚠️ Could not get updated dates for subscription ${subscription.id}, keeping existing dates`);
      }

      console.log(`📝 Updating user with subscription item dates:`, updateData);

      await User.findByIdAndUpdate(userId, updateData);

      // Update subscription record in PostgreSQL
      const pgUpdateData = [
        subscription.status,
        subscription.cancel_at_period_end,
        userId
      ];

      let pgQuery = `
        UPDATE user_subscriptions SET
          status = $1,
          cancel_at_period_end = $2,
          updated_at = NOW()
        WHERE user_id = $3
      `;

      if (dateResult.hasValidDates) {
        pgQuery = `
          UPDATE user_subscriptions SET
            status = $1,
            current_period_start = $2,
            current_period_end = $3,
            cancel_at_period_end = $4,
            updated_at = NOW()
          WHERE user_id = $5
        `;
        pgUpdateData.splice(1, 0, dateResult.startDate, dateResult.endDate);
        pgUpdateData[4] = userId; // Update the user_id position
      }

      await db.query(pgQuery, pgUpdateData);

      console.log(`✅ Subscription updated for user ${userId}: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
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
   * FIXED: Handle payment succeeded event - WITH CORRECT DATE FIELDS
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const customerId = invoice.customer;

      // Find user ID using multiple methods
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
        console.warn(`⚠️ Cannot record payment - no user found for customer ${customerId}`);
        return;
      }

      // 🎯 FIXED: Use correct date fields from Stripe invoice
      console.log('📅 Invoice date fields available:', {
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        status_transitions: invoice.status_transitions,
        due_date: invoice.due_date,
        billing_reason: invoice.billing_reason
      });

      // Determine the best date to use for payment record
      let paymentDate = null;
      
      // Priority order for payment date:
      // 1. status_transitions.paid_at (when actually paid)
      // 2. created (when invoice was created)
      // 3. period_start (billing period start)
      // 4. current timestamp as fallback
      
      if (invoice.status_transitions && invoice.status_transitions.paid_at) {
        paymentDate = this.safeTimestampToDate(invoice.status_transitions.paid_at);
        console.log('✅ Using status_transitions.paid_at:', paymentDate);
      } else if (invoice.created) {
        paymentDate = this.safeTimestampToDate(invoice.created);
        console.log('✅ Using invoice.created:', paymentDate);
      } else if (invoice.period_start) {
        paymentDate = this.safeTimestampToDate(invoice.period_start);
        console.log('✅ Using invoice.period_start:', paymentDate);
      } else {
        paymentDate = new Date();
        console.log('⚠️ Using current timestamp as fallback:', paymentDate);
      }

      // Also determine billing period for context
      let billingPeriodStart = null;
      let billingPeriodEnd = null;
      
      if (invoice.period_start) {
        billingPeriodStart = this.safeTimestampToDate(invoice.period_start);
      }
      if (invoice.period_end) {
        billingPeriodEnd = this.safeTimestampToDate(invoice.period_end);
      }

      console.log('📊 Payment record details:', {
        userId,
        paymentDate: paymentDate?.toISOString(),
        billingPeriodStart: billingPeriodStart?.toISOString(),
        billingPeriodEnd: billingPeriodEnd?.toISOString(),
        amount: invoice.amount_paid / 100,
        invoiceId: invoice.id,
        billingReason: invoice.billing_reason
      });

      // Record payment in PostgreSQL with correct date
      await db.query(`
        INSERT INTO payment_history (
          user_id, stripe_payment_intent_id, stripe_invoice_id,
          amount, currency, status, payment_method, billing_reason,
          description, invoice_url, receipt_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          created_at = EXCLUDED.created_at,
          updated_at = NOW()
      `, [
        userId,
        invoice.payment_intent,
        invoice.id,
        invoice.amount_paid / 100, // Convert cents to dollars
        invoice.currency,
        'succeeded',
        'card',
        invoice.billing_reason || 'subscription_cycle',
        invoice.description || `Monthly subscription payment - ${billingPeriodStart?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        invoice.hosted_invoice_url,
        invoice.receipt_url,
        paymentDate // Use the correctly determined payment date
      ]);

      console.log(`✅ Payment succeeded recorded for user ${userId}: ${invoice.id} on ${paymentDate?.toISOString()}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed event
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
        invoice.amount_due / 100,
        invoice.currency,
        'failed',
        invoice.billing_reason,
        'Monthly payment failed for subscription'
      ]);

      console.log(`⚠️ Payment failed recorded for user ${userId}: ${invoice.id}`);
    } catch (error) {console.error('Error handling payment failed:', error);
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

      console.log(`✅ Checkout completed for user ${userId}: Plan ${planName}`);
      
      // The subscription creation will be handled by the subscription.created webhook
    } catch (error) {
      console.error('Error handling checkout completed:', error);
      throw error;
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
        .filter(price => price.recurring?.interval === 'month')
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

  /**
   * FIXED: Get fresh subscription data with subscription item priority
   * @param {string} userId - User ID
   * @returns {Object|null} Fresh subscription data with correct date handling
   */
  async getFreshSubscriptionData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.stripeCustomerId) {
        return null;
      }

      const subscriptions = await this.getCustomerSubscriptions(user.stripeCustomerId);
      const activeSubscription = subscriptions.find(sub => sub.status === 'active') ||
                                subscriptions.find(sub => sub.status === 'past_due') ||
                                subscriptions[0];

      if (!activeSubscription) {
        return null;
      }

      // Get comprehensive subscription data with full expansion
      const subscriptionWithInvoice = await stripe.subscriptions.retrieve(activeSubscription.id, {
        expand: [
          'latest_invoice',
          'latest_invoice.payment_intent',
          'latest_invoice.lines',
          'items',
          'items.data.price',
          'customer'
        ]
      });

      // Get dates using subscription item priority
      const dateResult = await this.getSubscriptionDatesRobust(subscriptionWithInvoice);

      console.log(`📊 Fresh Stripe data for subscription ${subscriptionWithInvoice.id}:`);
      console.log(`   Status: ${subscriptionWithInvoice.status}`);
      console.log(`   Date source: ${dateResult.source}`);
      console.log(`   Period start: ${dateResult.startDate?.toISOString() || 'N/A'}`);
      console.log(`   Period end: ${dateResult.endDate?.toISOString() || 'N/A'}`);
      console.log(`   Cancel at period end: ${subscriptionWithInvoice.cancel_at_period_end}`);

      return {
        id: subscriptionWithInvoice.id,
        status: subscriptionWithInvoice.status,
        current_period_start: dateResult.startDate ? Math.floor(dateResult.startDate.getTime() / 1000) : null,
        current_period_end: dateResult.endDate ? Math.floor(dateResult.endDate.getTime() / 1000) : null,
        billing_cycle_anchor: subscriptionWithInvoice.billing_cycle_anchor,
        cancel_at_period_end: subscriptionWithInvoice.cancel_at_period_end,
        latest_invoice: subscriptionWithInvoice.latest_invoice,
        created: subscriptionWithInvoice.created,
        dateSource: dateResult.source,
        hasValidDates: dateResult.hasValidDates
      };

    } catch (error) {
      console.error('Error getting fresh subscription data:', error);
      return null;
    }
  }

  /**
   * FIXED: Get accurate next billing date with subscription item priority
   * @param {string} userId - User ID
   * @returns {Date|null} Next billing date
   */
  async getAccurateNextBillingDate(userId) {
    try {
      console.log(`📅 Getting accurate billing date for user ${userId} from Stripe...`);
      
      const freshData = await this.getFreshSubscriptionData(userId);
      
      if (!freshData) {
        console.log(`⚠️ No fresh subscription data found for user ${userId}`);
        return null;
      }

      if (!freshData.hasValidDates) {
        console.log(`⚠️ No valid dates in fresh subscription data for user ${userId}`);
        return null;
      }

      // Use the subscription item date from our getFreshSubscriptionData method
      if (freshData.current_period_end) {
        const billingDate = this.safeTimestampToDate(freshData.current_period_end);
        console.log(`✅ Got accurate billing date from Stripe (${freshData.dateSource}): ${billingDate?.toISOString()}`);
        return billingDate;
      }

      console.log(`⚠️ No current_period_end in fresh data for user ${userId}`);
      return null;
    } catch (error) {
      console.error('Error getting accurate next billing date:', error);
      return null;
    }
  }

  /**
   * FIXED: Sync subscription data from Stripe with subscription item priority
   * @param {string} userId - User ID
   * @returns {Object} Sync result
   */
  async syncUserSubscriptionFromStripe(userId) {
    try {
      console.log(`🔄 Syncing subscription data for user ${userId} with subscription item priority`);

      const user = await User.findById(userId);
      if (!user || !user.stripeCustomerId) {
        throw new Error('User not found or no Stripe customer ID');
      }

      // Get all subscriptions for this customer
      const subscriptions = await this.getCustomerSubscriptions(user.stripeCustomerId);
      
      if (subscriptions.length === 0) {
        console.log(`ℹ️ No subscriptions found for user ${userId}`);
        return { message: 'No subscriptions found', subscriptions: [] };
      }

      // Find the most recent active or recently canceled subscription
      const activeSubscription = subscriptions.find(sub => sub.status === 'active') || 
                                subscriptions.find(sub => sub.status === 'past_due') ||
                                subscriptions[0];

      if (!activeSubscription) {
        console.log(`ℹ️ No relevant subscription found for user ${userId}`);
        return { message: 'No relevant subscription found', subscriptions };
      }

      console.log(`🔍 Found subscription ${activeSubscription.id} with status: ${activeSubscription.status}`);

      // Get plan name from subscription
      let planName = activeSubscription.metadata?.planName;
      if (!planName) {
        const priceId = activeSubscription.items.data[0]?.price?.id;
        if (priceId?.includes('casual')) {
          planName = 'casual';
        } else if (priceId?.includes('hunter')) {
          planName = 'hunter';
        } else {
          planName = 'casual';
        }
      }

      // 🎯 FIXED: Get subscription dates using subscription item priority
      const dateResult = await this.getSubscriptionDatesRobust(activeSubscription);

      if (!dateResult.hasValidDates) {
        throw new Error(`Could not determine valid billing dates for subscription ${activeSubscription.id} using any strategy including subscription items`);
      }

      console.log(`📅 Using dates from subscription item source: ${dateResult.source}`);
      console.log(`   Start: ${dateResult.startDate.toISOString()}`);
      console.log(`   End: ${dateResult.endDate.toISOString()}`);

      // Update user in MongoDB with subscription item dates
      const updateData = {
        subscriptionTier: planName,
        subscriptionStatus: activeSubscription.status,
        subscriptionStartDate: dateResult.startDate,
        subscriptionEndDate: dateResult.endDate,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false
      };

      await User.findByIdAndUpdate(userId, updateData);

      // Update PostgreSQL subscription record
      await db.query(`
        INSERT INTO user_subscriptions (
          user_id, stripe_customer_id, stripe_subscription_id, status,
          current_period_start, current_period_end, cancel_at_period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          stripe_subscription_id = $3,
          status = $4,
          current_period_start = $5,
          current_period_end = $6,
          cancel_at_period_end = $7,
          updated_at = NOW()
      `, [
        userId,
        user.stripeCustomerId,
        activeSubscription.id,
        activeSubscription.status,
        dateResult.startDate,
        dateResult.endDate,
        activeSubscription.cancel_at_period_end || false
      ]);

      console.log(`✅ Successfully synced subscription data with subscription item dates for user ${userId}`);

      return {
        message: `Subscription data synced with subscription item dates (source: ${dateResult.source})`,
        subscription: {
          id: activeSubscription.id,
          status: activeSubscription.status,
          planName,
          startDate: dateResult.startDate,
          endDate: dateResult.endDate,
          cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
          dateSource: dateResult.source
        }
      };

    } catch (error) {
      console.error(`❌ Error syncing subscription for user ${userId}:`, error);
      throw new Error('Failed to sync subscription data: ' + error.message);
    }
  }

  /**
   * UTILITY: Fix subscription billing dates by syncing from Stripe with subscription item priority
   * @param {string} userId - User ID (optional, if not provided will fix all users)
   * @returns {Object} Fix results
   */
  async fixSubscriptionBillingDates(userId = null) {
    try {
      console.log('🔧 Starting subscription billing date fix with subscription item priority...');

      let users;
      if (userId) {
        const user = await User.findById(userId);
        users = user ? [user] : [];
      } else {
        // Find all users with paid subscriptions
        users = await User.find({
          subscriptionTier: { $in: ['casual', 'hunter'] },
          stripeCustomerId: { $exists: true, $ne: null }
        });
      }

      console.log(`📊 Found ${users.length} users to fix billing dates`);

      const results = {
        total: users.length,
        fixed: 0,
        failed: 0,
        details: []
      };

      for (const user of users) {
        try {
          console.log(`🔄 Processing user ${user._id}...`);
          
          const syncResult = await this.syncUserSubscriptionFromStripe(user._id);
          
          results.fixed++;
          results.details.push({
            userId: user._id,
            email: user.email,
            status: 'success',
            result: syncResult
          });

          console.log(`✅ Fixed billing dates for user ${user._id}`);
        } catch (userError) {
          console.error(`❌ Failed to fix user ${user._id}:`, userError.message);
          
          results.failed++;
          results.details.push({
            userId: user._id,
            email: user.email,
            status: 'failed',
            error: userError.message
          });
        }
      }

      console.log(`🎉 Billing date fix completed: ${results.fixed} fixed, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Error fixing subscription billing dates:', error);
      throw new Error('Failed to fix subscription billing dates: ' + error.message);
    }
  }
}

module.exports = new StripeService();