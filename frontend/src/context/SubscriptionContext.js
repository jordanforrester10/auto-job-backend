// frontend/src/context/SubscriptionContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import subscriptionService from '../utils/subscriptionService';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [planLimits, setPlanLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load subscription data
  const loadSubscriptionData = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setSubscription(null);
      setUsage(null);
      setPlanLimits(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await subscriptionService.getCurrentSubscription();
      
      setSubscription(data.user);
      setUsage(data.usageStats);
      setPlanLimits(data.planLimits);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Load subscription data when auth state changes
  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Check if user can perform an action
  const canPerformAction = useCallback((action, quantity = 1) => {
    if (!usage || !planLimits) {
      return { allowed: false, reason: 'Subscription data not loaded' };
    }

    const limit = planLimits[action];
    const current = usage[action]?.used || 0;

    // Unlimited access
    if (limit === -1) {
      return { allowed: true, unlimited: true };
    }

    // Check limit
    if (current + quantity > limit) {
      return {
        allowed: false,
        reason: `${action} limit exceeded (${current}/${limit})`,
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
  }, [usage, planLimits]);

  // Get usage percentage for a feature
  const getUsagePercentage = useCallback((action) => {
    if (!usage || !planLimits) return 0;

    const limit = planLimits[action];
    const current = usage[action]?.used || 0;

    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100; // No access
    
    return Math.round((current / limit) * 100);
  }, [usage, planLimits]);

  // Get plan display info
  const getPlanInfo = useCallback(() => {
    if (!subscription) return null;

    const tier = subscription.subscriptionTier || 'free';
    
    const planConfig = {
      free: {
        name: 'Free',
        displayName: 'Free Plan',
        color: '#9e9e9e',
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        description: 'Basic job search features'
      },
      casual: {
        name: 'Casual',
        displayName: 'Casual Plan',
        color: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        description: 'Enhanced job search with recruiter access'
      },
      hunter: {
        name: 'Hunter',
        displayName: 'Hunter Plan',
        color: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        description: 'Full AI-powered job hunting suite'
      }
    };

    return {
      ...planConfig[tier],
      tier,
      isActive: subscription.subscriptionStatus === 'active',
      endDate: subscription.subscriptionEndDate,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    };
  }, [subscription]);

  // Check if feature is available in current plan
  const hasFeatureAccess = useCallback((feature) => {
    if (!planLimits) return false;
    
    // Boolean features (like recruiterAccess, aiAssistant)
    if (typeof planLimits[feature] === 'boolean') {
      return planLimits[feature];
    }
    
    // Numeric features (check if limit > 0 or unlimited)
    const limit = planLimits[feature];
    return limit === -1 || limit > 0;
  }, [planLimits]);

  // Get recommended upgrade plan for a feature
  const getRecommendedPlan = useCallback((feature) => {
    const featurePlanMap = {
      resumeUploads: 'casual',
      jobImports: 'casual',
      recruiterAccess: 'casual',
      recruiterUnlocks: 'casual',
      aiJobDiscovery: 'casual',
      aiAssistant: 'hunter',
      aiConversations: 'hunter'
    };

    return featurePlanMap[feature] || 'casual';
  }, []);

  // Refresh subscription data
  const refreshSubscription = useCallback(() => {
    return loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Track usage for real-time updates
  const trackUsage = useCallback(async (action, quantity = 1) => {
    try {
      await subscriptionService.trackUsage(action, quantity);
      // Refresh usage data after tracking
      await loadSubscriptionData();
    } catch (err) {
      console.error('Error tracking usage:', err);
      throw err;
    }
  }, [loadSubscriptionData]);

  const value = {
    // Data
    subscription,
    usage,
    planLimits,
    loading,
    error,
    
    // Computed values
    planInfo: getPlanInfo(),
    
    // Methods
    canPerformAction,
    getUsagePercentage,
    hasFeatureAccess,
    getRecommendedPlan,
    refreshSubscription,
    trackUsage,
    
    // Convenience getters
    isFreePlan: subscription?.subscriptionTier === 'free',
    isCasualPlan: subscription?.subscriptionTier === 'casual',
    isHunterPlan: subscription?.subscriptionTier === 'hunter',
    needsUpgrade: subscription?.subscriptionTier === 'free' || subscription?.subscriptionTier === 'casual'
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};