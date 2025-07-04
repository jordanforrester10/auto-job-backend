// frontend/src/utils/subscriptionService.js
import api from './axios';

class SubscriptionService {
  /**
   * Get current user's subscription details
   */
  async getCurrentSubscription() {
    try {
      const response = await api.get('/subscriptions/current');
      return response.data.data;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw error;
    }
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans() {
    try {
      const response = await api.get('/subscriptions/plans');
      return response.data.data;
    } catch (error) {
      console.error('Error getting available plans:', error);
      throw error;
    }
  }

  /**
   * Get plan comparison data
   */
  async getPlanComparison() {
    try {
      const response = await api.get('/subscriptions/plans/comparison');
      return response.data.data;
    } catch (error) {
      console.error('Error getting plan comparison:', error);
      throw error;
    }
  }

  /**
   * Check permission for a specific action
   */
  async checkPermission(feature, quantity = 1) {
    try {
      const response = await api.post('/subscriptions/check-permission', {
        feature,
        quantity
      });
      return response.data.data;
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  /**
   * Track usage for a feature
   */
  async trackUsage(feature, quantity = 1) {
    try {
      const response = await api.post('/subscriptions/track-usage', {
        feature,
        quantity
      });
      return response.data.data;
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  /**
   * Create checkout session for plan upgrade
   */
  async createCheckoutSession(planName, successUrl = null, cancelUrl = null) {
    try {
      const response = await api.post('/subscriptions/create-checkout', {
        planName,
        successUrl: successUrl || `${window.location.origin}/subscription/success`,
        cancelUrl: cancelUrl || `${window.location.origin}/pricing`
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session
   */
  async createCustomerPortalSession(returnUrl = null) {
    try {
      const response = await api.post('/subscriptions/customer-portal', {
        returnUrl: returnUrl || window.location.href
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(atPeriodEnd = true) {
    try {
      const response = await api.post('/subscriptions/cancel', {
        atPeriodEnd
      });
      return response.data.data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  async resumeSubscription() {
    try {
      const response = await api.post('/subscriptions/resume');
      return response.data.data;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * Change subscription plan
   */
  async changeSubscriptionPlan(newPlanName) {
    try {
      const response = await api.put('/subscriptions/change-plan', {
        newPlanName
      });
      return response.data.data;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw error;
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(limit = 10) {
    try {
      const response = await api.get(`/subscriptions/billing-history?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw error;
    }
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(months = 12) {
    try {
      const response = await api.get(`/subscriptions/usage-analytics?months=${months}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  /**
   * Sync subscription status with Stripe
   */
  async syncSubscriptionStatus() {
    try {
      const response = await api.post('/subscriptions/sync-status');
      return response.data.data;
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      throw error;
    }
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage() {
    try {
      const response = await api.get('/subscriptions/usage');
      return response.data.data;
    } catch (error) {
      console.error('Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Get usage warnings (approaching limits)
   */
  async getUsageWarnings() {
    try {
      const response = await api.get('/subscriptions/usage/warnings');
      return response.data.data;
    } catch (error) {
      console.error('Error getting usage warnings:', error);
      throw error;
    }
  }

  /**
   * Initiate upgrade flow from specific feature
   */
  async initiateUpgradeFlow(fromFeature, currentPlan) {
    const featureUpgradeMap = {
      resumeUploads: { target: 'casual', reason: 'Upload more resumes' },
      jobImports: { target: 'casual', reason: 'Import more job postings' },
      recruiterAccess: { target: 'casual', reason: 'Access recruiter database' },
      recruiterUnlocks: { target: 'casual', reason: 'Unlock more recruiter contacts' },
      aiJobDiscovery: { target: 'casual', reason: 'AI-powered job discovery' },
      aiAssistant: { target: 'hunter', reason: 'AI assistant conversations' },
      aiConversations: { target: 'hunter', reason: 'More AI conversations' }
    };

    const upgrade = featureUpgradeMap[fromFeature];
    if (!upgrade) {
      throw new Error('Unknown feature for upgrade flow');
    }

    // If already on the target plan or higher, suggest the next tier
    if (currentPlan === 'casual' && upgrade.target === 'casual') {
      upgrade.target = 'hunter';
      upgrade.reason = 'Unlock all premium features';
    }

    return upgrade;
  }

  /**
   * Format usage data for display
   */
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
        status: this.getUsageStatus(used, limit)
      };
    });

    return formatted;
  }

  /**
   * Get usage status for color coding
   */
  getUsageStatus(used, limit) {
    if (limit === -1) return 'unlimited';
    if (limit === 0) return 'unavailable';
    
    const percentage = (used / limit) * 100;
    
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }

  /**
   * Get feature display names
   */
  getFeatureDisplayName(feature) {
    const displayNames = {
      resumeUploads: 'Resume Uploads',
      resumeAnalysis: 'Resume Analysis',
      jobImports: 'Job Imports',
      resumeTailoring: 'Resume Tailoring',
      recruiterAccess: 'Recruiter Access',
      recruiterUnlocks: 'Recruiter Unlocks',
      aiJobDiscovery: 'AI Job Discovery',
      aiAssistant: 'AI Assistant',
      aiConversations: 'AI Conversations',
      aiMessagesTotal: 'AI Messages'
    };

    return displayNames[feature] || feature;
  }
}

export default new SubscriptionService();