// frontend/src/utils/subscriptionService.js - FIXED VERSION WITH WORKING BUTTONS
import api from './axios';

class SubscriptionService {
  constructor() {
    // 🔧 NEW: Aggressive caching to prevent API spam
    this.cache = {
      subscription: { data: null, timestamp: 0, ttl: 60000 }, // 1 minute cache
      weeklyStats: { data: null, timestamp: 0, ttl: 30000 }, // 30 second cache
      billingHistory: { data: null, timestamp: 0, ttl: 300000 }, // 5 minute cache
      plans: { data: null, timestamp: 0, ttl: 600000 }, // 10 minute cache
      usage: { data: null, timestamp: 0, ttl: 30000 } // 30 second cache
    };
    
    // Track API call frequency to prevent spam
    this.lastApiCalls = {
      subscription: 0,
      billing: 0,
      weeklyStats: 0
    };
  }

  // 🔧 NEW: Generic cache helper
  isCacheValid(cacheKey) {
    const cache = this.cache[cacheKey];
    if (!cache || !cache.data) return false;
    
    const now = Date.now();
    const isValid = (now - cache.timestamp) < cache.ttl;
    
    if (!isValid) {
      console.log(`📋 Cache expired for ${cacheKey}`);
    }
    
    return isValid;
  }

  // 🔧 NEW: Set cache helper
  setCache(cacheKey, data) {
    this.cache[cacheKey] = {
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      timestamp: Date.now(),
      ttl: this.cache[cacheKey].ttl
    };
    console.log(`💾 Cached ${cacheKey} for ${this.cache[cacheKey].ttl/1000}s`);
  }

  // 🔧 NEW: Rate limiting helper
  isRateLimited(apiType, minInterval = 5000) {
    const now = Date.now();
    const lastCall = this.lastApiCalls[apiType] || 0;
    const timeSince = now - lastCall;
    
    if (timeSince < minInterval) {
      console.log(`⏱️ Rate limited ${apiType} API (${Math.round(timeSince/1000)}s ago, min ${minInterval/1000}s)`);
      return true;
    }
    
    this.lastApiCalls[apiType] = now;
    return false;
  }

  /**
   * 🔧 CACHED: Get current user's subscription details
   */
  async getCurrentSubscription(force = false) {
    // Check cache first
    if (!force && this.isCacheValid('subscription')) {
      console.log('📋 Using cached subscription data');
      return this.cache.subscription.data;
    }

    // Rate limiting for subscription calls
    if (!force && this.isRateLimited('subscription', 10000)) { // 10 second minimum
      if (this.cache.subscription.data) {
        console.log('📋 Using stale cached subscription due to rate limit');
        return this.cache.subscription.data;
      }
    }

    try {
      console.log('🔄 Fetching fresh subscription data...');
      const response = await api.get('/subscriptions/current');
      const data = response.data.data;
      
      this.setCache('subscription', data);
      return data;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      
      // Return cached data if available, even if stale
      if (this.cache.subscription.data) {
        console.log('📋 Using stale cached subscription due to error');
        return this.cache.subscription.data;
      }
      
      throw error;
    }
  }

  /**
   * 🔧 CACHED: Get weekly job discovery statistics
   */
  async getWeeklyJobStats(weeklyLimit = null, force = false) {
    const cacheKey = 'weeklyStats';
    
    // Check cache first
    if (!force && this.isCacheValid(cacheKey)) {
      console.log('📋 Using cached weekly stats');
      return this.cache[cacheKey].data;
    }

    // Rate limiting for weekly stats
    if (!force && this.isRateLimited('weeklyStats', 15000)) { // 15 second minimum
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached weekly stats due to rate limit');
        return this.cache[cacheKey].data;
      }
    }

    try {
      console.log('🔄 Fetching fresh weekly stats...');
      
      const params = weeklyLimit ? `?weeklyLimit=${weeklyLimit}` : '';
      const response = await api.get(`/subscriptions/weekly-job-stats${params}`);
      
      const processedStats = {
        weeklyLimit: response.data.data.weeklyLimit || 0,
        weeklyUsed: response.data.data.jobsFoundThisWeek || 0,
        weeklyRemaining: response.data.data.remainingThisWeek || 0,
        weeklyPercentage: response.data.data.weeklyPercentage || 0,
        currentWeek: this.getCurrentWeekString(),
        isWeeklyLimitReached: response.data.data.isLimitReached || false,
        weekStart: response.data.data.weekStart,
        weekEnd: response.data.data.weekEnd,
        searchRuns: response.data.data.searchRuns || [],
        trackingMethod: response.data.data.trackingMethod || 'persistent_weekly_tracking'
      };
      
      this.setCache(cacheKey, processedStats);
      return processedStats;
      
    } catch (error) {
      console.error('Error fetching weekly job stats:', error);
      
      // Return cached data if available
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached weekly stats due to error');
        return this.cache[cacheKey].data;
      }
      
      return {
        weeklyLimit: 0,
        weeklyUsed: 0,
        weeklyRemaining: 0,
        weeklyPercentage: 0,
        currentWeek: this.getCurrentWeekString(),
        isWeeklyLimitReached: false,
        trackingMethod: 'error_fallback',
        error: error.message
      };
    }
  }

  /**
   * 🔧 HEAVILY CACHED: Get billing history (5 minute cache)
   */
  async getBillingHistory(limit = 10, force = false) {
    const cacheKey = 'billingHistory';
    
    // Check cache first - billing history changes very rarely
    if (!force && this.isCacheValid(cacheKey)) {
      console.log('📋 Using cached billing history');
      return this.cache[cacheKey].data;
    }

    // Heavy rate limiting for billing calls (expensive Stripe calls)
    if (!force && this.isRateLimited('billing', 30000)) { // 30 second minimum
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached billing history due to rate limit');
        return this.cache[cacheKey].data;
      }
    }

    try {
      console.log('🔄 Fetching fresh billing history...');
      const response = await api.get(`/subscriptions/billing-history?limit=${limit}`);
      const data = response.data.data;
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting billing history:', error);
      
      // Return cached data if available
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached billing history due to error');
        return this.cache[cacheKey].data;
      }
      
      throw error;
    }
  }

  /**
   * 🔧 CACHED: Get all available subscription plans (10 minute cache)
   */
  async getAvailablePlans(force = false) {
    const cacheKey = 'plans';
    
    // Plans change very rarely, use long cache
    if (!force && this.isCacheValid(cacheKey)) {
      console.log('📋 Using cached plans');
      return this.cache[cacheKey].data;
    }

    try {
      console.log('🔄 Fetching fresh plans...');
      const response = await api.get('/subscriptions/plans');
      const data = response.data.data;
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting available plans:', error);
      
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached plans due to error');
        return this.cache[cacheKey].data;
      }
      
      throw error;
    }
  }

  /**
   * 🔧 CACHED: Get usage statistics
   */
  async getCurrentUsage(force = false) {
    const cacheKey = 'usage';
    
    if (!force && this.isCacheValid(cacheKey)) {
      console.log('📋 Using cached usage data');
      return this.cache[cacheKey].data;
    }

    try {
      console.log('🔄 Fetching fresh usage data...');
      const response = await api.get('/subscriptions/usage');
      const data = response.data.data;
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting current usage:', error);
      
      if (this.cache[cacheKey].data) {
        console.log('📋 Using stale cached usage due to error');
        return this.cache[cacheKey].data;
      }
      
      throw error;
    }
  }

  /**
   * 🔧 FIXED: Cancel subscription - properly handle API call and response
   */
  async cancelSubscription(atPeriodEnd = true) {
    try {
      console.log('🚫 Canceling subscription...', { atPeriodEnd });
      
      const response = await api.post('/subscriptions/cancel', {
        atPeriodEnd: atPeriodEnd
      });
      
      console.log('✅ Subscription cancellation response:', response.data);
      
      // Clear relevant caches after cancellation
      this.clearCache('subscription');
      this.clearCache('usage');
      this.clearCache('billingHistory');
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error canceling subscription:', error);
      
      // Handle different error types
      if (error.response?.status === 404) {
        throw new Error('No active subscription found to cancel');
      } else if (error.response?.status === 403) {
        throw new Error('Not authorized to cancel this subscription');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to cancel subscription. Please try again.');
      }
    }
  }

  /**
   * 🔧 FIXED: Resume subscription - properly handle API call and response
   */
  async resumeSubscription() {
    try {
      console.log('▶️ Resuming subscription...');
      
      const response = await api.post('/subscriptions/resume');
      
      console.log('✅ Subscription resume response:', response.data);
      
      // Clear relevant caches after resuming
      this.clearCache('subscription');
      this.clearCache('usage');
      this.clearCache('billingHistory');
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error resuming subscription:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No subscription found to resume');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to resume subscription. Please try again.');
      }
    }
  }

  /**
   * 🔧 FIXED: Create customer portal session - handle Stripe portal properly
   */
  async createCustomerPortalSession(returnUrl = null) {
    try {
      console.log('🔗 Creating customer portal session...');
      
      const response = await api.post('/subscriptions/customer-portal', {
        returnUrl: returnUrl || `${window.location.origin}/settings`
      });
      
      console.log('✅ Customer portal session created:', response.data);
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error creating customer portal session:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No subscription found. Customer portal is only available for active subscriptions.');
      } else if (error.response?.status === 403) {
        throw new Error('Not authorized to access customer portal');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to open billing portal. Please try again.');
      }
    }
  }

  /**
   * 🔧 FIXED: Change subscription plan
   */
  async changeSubscriptionPlan(newPlanName) {
    try {
      console.log('🔄 Changing subscription plan to:', newPlanName);
      
      const response = await api.put('/subscriptions/change-plan', {
        newPlanName: newPlanName
      });
      
      console.log('✅ Plan change response:', response.data);
      
      // Clear all caches after plan change
      this.clearCache();
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error changing subscription plan:', error);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to change subscription plan. Please try again.');
      }
    }
  }

  /**
   * 🔧 NEW: Clear specific cache
   */
  clearCache(cacheKey = null) {
    if (cacheKey && this.cache[cacheKey]) {
      console.log(`🗑️ Clearing cache for ${cacheKey}`);
      this.cache[cacheKey] = { data: null, timestamp: 0, ttl: this.cache[cacheKey].ttl };
    } else if (!cacheKey) {
      console.log('🗑️ Clearing all cache');
      Object.keys(this.cache).forEach(key => {
        this.cache[key] = { data: null, timestamp: 0, ttl: this.cache[key].ttl };
      });
    }
  }

  /**
   * 🔧 NEW: Force refresh specific data
   */
  async forceRefresh(dataType) {
    console.log(`🔄 Force refreshing ${dataType}...`);
    this.clearCache(dataType);
    
    switch (dataType) {
      case 'subscription':
        return await this.getCurrentSubscription(true);
      case 'weeklyStats':
        return await this.getWeeklyJobStats(null, true);
      case 'billingHistory':
        return await this.getBillingHistory(10, true);
      case 'usage':
        return await this.getCurrentUsage(true);
      default:
        console.warn(`Unknown data type for force refresh: ${dataType}`);
    }
  }

  // 🔧 OPTIMIZED: Other methods with reduced API calls

  /**
   * Check permission for a specific action (uses cached subscription data)
   */
  async checkPermission(feature, quantity = 1) {
    try {
      // Use cached subscription data to avoid API call
      const subscription = await this.getCurrentSubscription();
      
      // Simple client-side permission check based on cached data
      const planLimits = subscription.planLimits || {};
      const usage = subscription.usageStats || {};
      
      const limit = planLimits[feature];
      const current = usage[feature]?.used || 0;

      if (limit === -1) {
        return { allowed: true, unlimited: true };
      }

      if (current + quantity > limit) {
        return {
          allowed: false,
          reason: `${feature} limit exceeded (${current}/${limit})`,
          current,
          limit,
          upgradeRequired: true
        };
      }

      return {
        allowed: true,
        current,
        limit,
        remaining: limit - current
      };
    } catch (error) {
      console.error('Error checking permission:', error);
      return { allowed: false, reason: 'Unable to check permissions' };
    }
  }

  /**
   * Track usage (clears cache to force refresh)
   */
  async trackUsage(feature, quantity = 1) {
    try {
      const response = await api.post('/subscriptions/usage/track', {
        feature,
        quantity
      });
      
      // Clear relevant caches after tracking usage
      this.clearCache('subscription');
      this.clearCache('usage');
      this.clearCache('weeklyStats');
      
      return response.data.data;
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  /**
   * Create checkout session (no caching needed)
   */
  async createCheckoutSession(planName, successUrl = null, cancelUrl = null) {
    try {
      const response = await api.post('/subscriptions/create-checkout', {
        planName,
        successUrl: successUrl || `${window.location.origin}/settings?upgraded=true`,
        cancelUrl: cancelUrl || `${window.location.origin}/settings`
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Sync subscription status (clears cache)
   */
  async syncSubscriptionStatus() {
    try {
      const response = await api.post('/subscriptions/sync');
      
      // Clear all caches after sync
      this.clearCache();
      
      return response.data.data;
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      throw error;
    }
  }

  // 🔧 UTILITY METHODS (no API calls)

  getCurrentWeekString() {
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getUTCDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setUTCDate(now.getUTCDate() - daysToSubtract);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  getNextMondayDate() {
    const now = new Date();
    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }

  formatUsageForDisplay(usage, limits) {
    const formatted = {};

    Object.keys(usage).forEach(feature => {
      const used = usage[feature]?.used || 0;
      const limit = limits[feature];

      formatted[feature] = {
        used,
        limit,
        unlimited: limit === -1,
        percentage: limit === -1 ? 0 : Math.round((used / limit) * 100),
        remaining: limit === -1 ? '∞' : Math.max(0, limit - used),
        status: this.getUsageStatus(used, limit),
        displayName: this.getFeatureDisplayName(feature)
      };
    });

    return formatted;
  }

  getUsageStatus(used, limit) {
    if (limit === -1) return 'unlimited';
    if (limit === 0) return 'unavailable';
    
    const percentage = (used / limit) * 100;
    
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }

  getFeatureDisplayName(feature) {
    const displayNames = {
      resumeUploads: 'Resume Uploads',
      resumeAnalysis: 'Resume Analysis',
      jobImports: 'Job Imports',
      resumeTailoring: 'Resume Tailoring',
      recruiterAccess: 'Recruiter Access',
      recruiterUnlocks: 'Recruiter Unlocks',
      aiJobDiscovery: 'AI Job Discovery',
      aiJobDiscoverySlots: 'AI Search Slots',
      aiJobsPerWeek: 'Weekly Job Limit',
      aiAssistant: 'AI Assistant',
      aiConversations: 'AI Conversations',
      aiMessagesTotal: 'AI Messages'
    };

    return displayNames[feature] || feature;
  }

  needsUpgradeForWeeklyAI(currentPlan) {
    if (!currentPlan || currentPlan === 'free') {
      return {
        needed: true,
        currentPlan: 'free',
        recommendedPlan: 'casual',
        reason: 'AI job discovery not available on Free plan',
        benefits: [
          '1 AI job search slot',
          'Up to 50 jobs discovered per week',
          'Multi-location search',
          'Enhanced salary extraction',
          'Weekly automation'
        ]
      };
    }

    return {
      needed: false,
      currentPlan,
      hasAiDiscovery: true
    };
  }

  /**
   * 🔧 NEW: Get cache stats for debugging
   */
  getCacheStats() {
    const stats = {};
    Object.keys(this.cache).forEach(key => {
      const cache = this.cache[key];
      const age = cache.timestamp ? Date.now() - cache.timestamp : 0;
      stats[key] = {
        hasData: !!cache.data,
        ageSeconds: Math.round(age / 1000),
        ttlSeconds: Math.round(cache.ttl / 1000),
        isValid: this.isCacheValid(key)
      };
    });
    return stats;
  }
}

export default new SubscriptionService();
