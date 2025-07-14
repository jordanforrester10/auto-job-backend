// frontend/src/context/SubscriptionContext.js - COMPLETE FIXED VERSION
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [persistentWeeklyStats, setPersistentWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🔧 FIX: Prevent API spam with aggressive controls
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const currentUserIdRef = useRef(null);
  const loadCountRef = useRef(0);
  const mountedRef = useRef(true);
  const dataLoadedRef = useRef(false);

  // 🔧 AGGRESSIVE: Only load subscription data ONCE per user session
  const loadSubscriptionData = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // 🔧 EXTREME: Only allow loading once every 2 minutes unless forced
    if (!force && (isLoadingRef.current || timeSinceLastLoad < 120000)) {
      console.log(`🔄 Skipping subscription load - too recent (${Math.round(timeSinceLastLoad/1000)}s ago)`);
      return;
    }

    // 🔧 EXTREME: If we already loaded data for this user, don't load again
    if (!force && dataLoadedRef.current && currentUserIdRef.current === currentUser?._id) {
      console.log('🔄 Skipping subscription load - already loaded for this user');
      return;
    }

    if (!isAuthenticated || !currentUser || !mountedRef.current) {
      setSubscription(null);
      setUsage(null);
      setPlanLimits(null);
      setPersistentWeeklyStats(null);
      return;
    }

    // 🔧 NEW: Track load attempts to prevent infinite loops
    loadCountRef.current++;
    if (loadCountRef.current > 3 && !force) {
      console.log('🔄 Too many load attempts, skipping');
      return;
    }

    // 🔧 NEW: Reset state if user changed
    if (currentUserIdRef.current !== currentUser._id) {
      console.log('🔄 User changed, resetting subscription state');
      currentUserIdRef.current = currentUser._id;
      dataLoadedRef.current = false;
      loadCountRef.current = 0;
      setSubscription(null);
      setUsage(null);
      setPlanLimits(null);
      setPersistentWeeklyStats(null);
    }

    try {
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      setLoading(true);
      setError(null);

      console.log(`🔄 Loading subscription data (attempt ${loadCountRef.current}${force ? ' - forced' : ''})...`);
      
      // 🔧 NEW: Use cached service to minimize API calls
      const data = await subscriptionService.getCurrentSubscription(force);
      
      if (!mountedRef.current) return;
      
      setSubscription(data.user);
      setUsage(data.usageStats);
      setPlanLimits(data.planLimits);
      
      // Handle persistent weekly stats
      if (data.usageStats.aiJobsThisWeek) {
        setPersistentWeeklyStats({
          weeklyLimit: data.usageStats.aiJobsThisWeek.weeklyLimit,
          weeklyUsed: data.usageStats.aiJobsThisWeek.used,
          weeklyRemaining: data.usageStats.aiJobsThisWeek.remaining,
          weeklyPercentage: Math.round((data.usageStats.aiJobsThisWeek.used / data.usageStats.aiJobsThisWeek.weeklyLimit) * 100),
          currentWeek: subscriptionService.getCurrentWeekString(),
          isWeeklyLimitReached: data.usageStats.aiJobsThisWeek.isLimitReached,
          trackingMethod: data.usageStats.aiJobsThisWeek.trackingMethod || 'subscription_data',
          weekStart: data.usageStats.aiJobsThisWeek.weekStart,
          weekEnd: data.usageStats.aiJobsThisWeek.weekEnd
        });
      } else if (data.user.subscriptionTier && data.user.subscriptionTier !== 'free') {
        // Get weekly stats separately if not in main data
        try {
          const weeklyLimit = data.user.subscriptionTier === 'hunter' ? 100 : 50;
          const weeklyStats = await subscriptionService.getWeeklyJobStats(weeklyLimit, force);
          setPersistentWeeklyStats(weeklyStats);
        } catch (weeklyError) {
          console.error('Error fetching weekly stats:', weeklyError);
        }
      } else {
        setPersistentWeeklyStats({
          weeklyLimit: 0,
          weeklyUsed: 0,
          weeklyRemaining: 0,
          weeklyPercentage: 0,
          currentWeek: subscriptionService.getCurrentWeekString(),
          isWeeklyLimitReached: false,
          trackingMethod: 'free_plan'
        });
      }
      
      // 🔧 NEW: Mark data as loaded to prevent future loads
      dataLoadedRef.current = true;
      
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err.message);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // 🔧 EXTREME: Only load data ONCE when user authenticates
  useEffect(() => {
    let timeoutId;
    
    if (isAuthenticated && currentUser?._id && !dataLoadedRef.current) {
      // 🔧 SINGLE LOAD: Only load once per user session
      timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          loadSubscriptionData(true);
        }
      }, 1000); // 1 second delay to let auth settle
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, currentUser?._id, loadSubscriptionData]);

  // 🔧 STABLE: Get persistent weekly job statistics
  const getWeeklyJobStats = useCallback(() => {
    if (persistentWeeklyStats) {
      return persistentWeeklyStats;
    }

    if (!subscription) {
      return {
        weeklyLimit: 0,
        weeklyUsed: 0,
        weeklyRemaining: 0,
        weeklyPercentage: 0,
        currentWeek: subscriptionService.getCurrentWeekString(),
        isWeeklyLimitReached: false,
        trackingMethod: 'no_subscription'
      };
    }

    const weeklyLimit = subscription.subscriptionTier === 'hunter' ? 100 : 
                       subscription.subscriptionTier === 'casual' ? 50 : 0;
    
    return {
      weeklyLimit,
      weeklyUsed: 0,
      weeklyRemaining: weeklyLimit,
      weeklyPercentage: 0,
      currentWeek: subscriptionService.getCurrentWeekString(),
      isWeeklyLimitReached: false,
      trackingMethod: 'fallback'
    };
  }, [persistentWeeklyStats, subscription]);

  // 🔧 STABLE: Check if user can create AI job search
  const canCreateAiJobSearch = useCallback(() => {
    if (!usage || !planLimits) {
      return { allowed: false, reason: 'Subscription data not loaded' };
    }

    if (subscription?.subscriptionTier === 'free') {
      return {
        allowed: false,
        reason: 'AI job discovery not available on Free plan',
        currentPlan: 'free',
        upgradeRequired: true,
        feature: 'aiJobDiscovery',
        availableOn: ['casual', 'hunter']
      };
    }

    if (!planLimits.aiJobDiscovery) {
      return {
        allowed: false,
        reason: 'AI job discovery not available on your current plan',
        currentPlan: subscription?.subscriptionTier,
        upgradeRequired: true,
        feature: 'aiJobDiscovery'
      };
    }

    const aiSearchesUsed = usage.aiJobDiscovery?.used || 0;
    const aiSearchSlots = planLimits.aiJobDiscoverySlots || 0;

    if (aiSearchesUsed >= aiSearchSlots) {
      return {
        allowed: false,
        reason: `You can only have ${aiSearchSlots} active AI job search at a time`,
        current: aiSearchesUsed,
        limit: aiSearchSlots,
        plan: subscription?.subscriptionTier,
        suggestion: 'Cancel an existing search to create a new one'
      };
    }

    return {
      allowed: true,
      current: aiSearchesUsed,
      limit: aiSearchSlots,
      remaining: aiSearchSlots - aiSearchesUsed,
      weeklyJobLimit: planLimits.aiJobsPerWeek,
      frequency: planLimits.aiSearchFrequency
    };
  }, [usage, planLimits, subscription]);

  // 🔧 MINIMAL: Refresh function with extreme throttling
  const refreshSubscription = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // 🔧 EXTREME: Only allow manual refresh every 30 seconds
    if (!force && timeSinceLastLoad < 30000) {
      console.log(`🔄 Refresh throttled (${Math.round(timeSinceLastLoad/1000)}s ago)`);
      return;
    }
    
    console.log('🔄 Manual refresh triggered...');
    
    // Clear cached data to force fresh fetch
    subscriptionService.clearCache();
    dataLoadedRef.current = false;
    
    await loadSubscriptionData(true);
  }, [loadSubscriptionData]);

  // 🔧 STABLE: Other utility functions
  const canPerformAction = useCallback((action, quantity = 1) => {
    if (!usage || !planLimits) {
      return { allowed: false, reason: 'Subscription data not loaded' };
    }

    if (action === 'aiJobDiscovery') {
      return canCreateAiJobSearch();
    }

    const limit = planLimits[action];
    const current = usage[action]?.used || 0;

    if (limit === -1) {
      return { allowed: true, unlimited: true };
    }

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
  }, [usage, planLimits, canCreateAiJobSearch]);

  const getUsagePercentage = useCallback((action) => {
    if (!usage || !planLimits) return 0;

    if (action === 'aiJobsPerWeek') {
      const currentWeeklyStats = getWeeklyJobStats();
      return currentWeeklyStats.weeklyPercentage || 0;
    }

    const limit = planLimits[action];
    const current = usage[action]?.used || 0;

    if (limit === -1) return 0;
    if (limit === 0) return 100;
    
    return Math.round((current / limit) * 100);
  }, [usage, planLimits, getWeeklyJobStats]);

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
        description: 'Enhanced job search with weekly AI discovery'
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

  const hasFeatureAccess = useCallback((feature) => {
    if (!planLimits) return false;
    
    if (typeof planLimits[feature] === 'boolean') {
      return planLimits[feature];
    }
    
    const limit = planLimits[feature];
    return limit === -1 || limit > 0;
  }, [planLimits]);

  const getRecommendedPlan = useCallback((feature) => {
    const featurePlanMap = {
      resumeUploads: 'casual',
      jobImports: 'casual',
      recruiterAccess: 'casual',
      recruiterUnlocks: 'casual',
      aiJobDiscovery: 'casual',
      aiJobDiscoverySlots: 'casual',
      aiJobsPerWeek: 'casual',
      aiAssistant: 'hunter',
      aiConversations: 'hunter'
    };

    return featurePlanMap[feature] || 'casual';
  }, []);

  // 🔧 THROTTLED: Weekly stats refresh with extreme throttling
  const refreshPersistentWeeklyStats = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // Only allow weekly stats refresh every 60 seconds
    if (timeSinceLastLoad < 60000) {
      console.log('🔄 Weekly stats refresh throttled');
      return;
    }
    
    if (subscription?.subscriptionTier && subscription.subscriptionTier !== 'free') {
      console.log('🔄 Refreshing persistent weekly stats...');
      try {
        const weeklyLimit = subscription.subscriptionTier === 'hunter' ? 100 : 50;
        const weeklyStats = await subscriptionService.getWeeklyJobStats(weeklyLimit, true);
        setPersistentWeeklyStats(weeklyStats);
      } catch (error) {
        console.error('Error refreshing weekly stats:', error);
      }
    }
  }, [subscription?.subscriptionTier]);

  const trackUsage = useCallback(async (action, quantity = 1) => {
    try {
      await subscriptionService.trackUsage(action, quantity);
      
      // 🔧 MINIMAL: Only refresh data after usage tracking
      setTimeout(() => {
        dataLoadedRef.current = false; // Allow fresh load
        loadSubscriptionData(true);
      }, 2000);
    } catch (err) {
      console.error('Error tracking usage:', err);
      throw err;
    }
  }, [loadSubscriptionData]);

  const getAiSearchSlotStatus = useCallback(() => {
    if (!usage || !planLimits) {
      return {
        slotsUsed: 0,
        slotsTotal: 0,
        slotsRemaining: 0,
        canCreateNew: false,
        weeklyJobLimit: 0
      };
    }

    const slotsUsed = usage.aiJobDiscovery?.used || 0;
    const slotsTotal = planLimits.aiJobDiscoverySlots || 0;
    const slotsRemaining = Math.max(0, slotsTotal - slotsUsed);
    const canCreateNew = slotsRemaining > 0 && planLimits.aiJobDiscovery;
    const weeklyJobLimit = planLimits.aiJobsPerWeek || 0;

    return {
      slotsUsed,
      slotsTotal,
      slotsRemaining,
      canCreateNew,
      weeklyJobLimit,
      frequency: planLimits.aiSearchFrequency || 'weekly'
    };
  }, [usage, planLimits]);

  const needsUpgradeForWeeklyAI = useCallback(() => {
    if (!subscription) return { needed: true, reason: 'No subscription data' };
    
    const tier = subscription.subscriptionTier;
    
    if (tier === 'free') {
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
      currentPlan: tier,
      weeklyLimit: planLimits?.aiJobsPerWeek || 0
    };
  }, [subscription, planLimits]);

  const syncAiSearchSlots = useCallback(async () => {
    try {
      console.log('🔄 Syncing AI search slots...');
      await loadSubscriptionData(true);
      console.log('✅ AI search slots synced');
    } catch (error) {
      console.error('❌ Error syncing AI search slots:', error);
    }
  }, [loadSubscriptionData]);

  const getWeeklyTrackingSummary = useCallback(async () => {
    try {
      console.log('🔄 Getting weekly tracking summary...');
      const summary = await subscriptionService.getWeeklyTrackingSummary();
      return summary;
    } catch (error) {
      console.error('❌ Error getting weekly tracking summary:', error);
      return {
        summary: null,
        searchRuns: [],
        error: error.message
      };
    }
  }, []);

  const getWeeklyTrackingHistory = useCallback(async (limit = 12) => {
    try {
      console.log('🔄 Getting weekly tracking history...');
      const history = await subscriptionService.getWeeklyTrackingHistory(limit);
      return history;
    } catch (error) {
      console.error('❌ Error getting weekly tracking history:', error);
      return {
        history: [],
        totalWeeks: 0,
        error: error.message
      };
    }
  }, []);

  // 🔧 CLEANUP: Proper cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      isLoadingRef.current = false;
    };
  }, []);

  const value = {
    // Data
    subscription,
    usage,
    planLimits,
    persistentWeeklyStats,
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
    
    // Weekly AI discovery methods with persistent tracking
    canCreateAiJobSearch,
    getWeeklyJobStats,
    getAiSearchSlotStatus,
    needsUpgradeForWeeklyAI,
    refreshPersistentWeeklyStats,
    
    // Persistent weekly tracking methods
    getWeeklyTrackingSummary,
    getWeeklyTrackingHistory,
    
    // Sync methods
    syncAiSearchSlots,
    
    // Convenience getters
    isFreePlan: subscription?.subscriptionTier === 'free',
    isCasualPlan: subscription?.subscriptionTier === 'casual',
    isHunterPlan: subscription?.subscriptionTier === 'hunter',
    needsUpgrade: subscription?.subscriptionTier === 'free',
    
    // Weekly AI discovery convenience getters with persistent tracking
    hasAiJobDiscovery: planLimits?.aiJobDiscovery || false,
    weeklyJobLimit: planLimits?.aiJobsPerWeek || 0,
    aiSearchSlots: planLimits?.aiJobDiscoverySlots || 0,
    
    // Persistent tracking indicators
    hasPersistentTracking: !!persistentWeeklyStats?.trackingMethod?.includes('persistent'),
    trackingMethod: persistentWeeklyStats?.trackingMethod || 'unknown'
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};