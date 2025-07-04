// frontend/src/hooks/useUpgrade.js
import { useState, useCallback } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import subscriptionService from '../utils/subscriptionService';

export const useUpgrade = () => {
  const { 
    planInfo, 
    canPerformAction, 
    hasFeatureAccess, 
    getRecommendedPlan,
    trackUsage 
  } = useSubscription();
  
  const [upgradePrompt, setUpgradePrompt] = useState({
    open: false,
    feature: null,
    title: null,
    description: null,
    currentUsage: null,
    limit: null
  });

  // Check if user can perform action, show upgrade prompt if not
  const checkAndPromptUpgrade = useCallback(async (feature, quantity = 1, customMessage = null) => {
    const permission = canPerformAction(feature, quantity);
    
    if (!permission.allowed && permission.upgradeRequired) {
      setUpgradePrompt({
        open: true,
        feature,
        title: customMessage?.title || null,
        description: customMessage?.description || null,
        currentUsage: permission.current,
        limit: permission.limit
      });
      return false;
    }
    
    return true;
  }, [canPerformAction]);

  // Track usage and check for limits
  const trackAndCheck = useCallback(async (feature, quantity = 1) => {
    try {
      await trackUsage(feature, quantity);
      return { success: true };
    } catch (error) {
      // If tracking fails due to limits, show upgrade prompt
      if (error.message.includes('limit exceeded') || error.message.includes('limit reached')) {
        setUpgradePrompt({
          open: true,
          feature,
          title: null,
          description: null,
          currentUsage: null,
          limit: null
        });
        return { success: false, limitReached: true };
      }
      throw error;
    }
  }, [trackUsage]);

  // Close upgrade prompt
  const closeUpgradePrompt = useCallback(() => {
    setUpgradePrompt({
      open: false,
      feature: null,
      title: null,
      description: null,
      currentUsage: null,
      limit: null
    });
  }, []);

  // Start upgrade flow
  const startUpgrade = useCallback(async (targetPlan = null) => {
    try {
      const plan = targetPlan || getRecommendedPlan(upgradePrompt.feature);
      const session = await subscriptionService.createCheckoutSession(plan);
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error starting upgrade:', error);
      throw error;
    }
  }, [upgradePrompt.feature, getRecommendedPlan]);

  // Get contextual upgrade messages for specific features
  const getUpgradeMessage = useCallback((feature) => {
    const messages = {
      resumeUploads: {
        title: 'Resume Upload Limit Reached',
        description: 'Upgrade to upload more resumes and unlock advanced analysis features.',
        benefits: ['Upload up to 5 resumes', 'Advanced ATS optimization', 'Resume comparison tools']
      },
      jobImports: {
        title: 'Job Import Limit Reached', 
        description: 'Upgrade to import more jobs and discover opportunities faster.',
        benefits: ['Import up to 25 job postings', 'Advanced job matching', 'Bulk job management']
      },
      recruiterAccess: {
        title: 'Recruiter Access Required',
        description: 'Unlock our recruiter database to connect with hiring managers.',
        benefits: ['Access 50,000+ recruiters', 'Contact information', 'Industry filtering']
      },
      recruiterUnlocks: {
        title: 'Recruiter Unlock Limit Reached',
        description: 'Upgrade to unlock more recruiter contacts and expand your network.',
        benefits: ['Unlock 25 recruiters monthly', 'Direct contact info', 'Personalized outreach']
      },
      aiJobDiscovery: {
        title: 'AI Job Discovery',
        description: 'Let our AI agent find relevant job opportunities for you automatically.',
        benefits: ['AI-powered job discovery', 'Personalized recommendations', 'Auto job alerts']
      },
      aiAssistant: {
        title: 'AI Assistant Access',
        description: 'Get personalized career advice and job search assistance.',
        benefits: ['5 AI conversations per month', '20 messages per conversation', 'Career coaching']
      },
      aiConversations: {
        title: 'AI Conversation Limit Reached',
        description: 'Upgrade to continue getting AI-powered career guidance.',
        benefits: ['Unlimited conversations', 'Advanced AI insights', 'Priority responses']
      }
    };

    return messages[feature] || {
      title: 'Feature Limit Reached',
      description: 'Upgrade your plan to access this feature.',
      benefits: ['Enhanced features', 'Higher limits', 'Priority support']
    };
  }, []);

  // Pre-action check - use before performing any limited action
  const preActionCheck = useCallback(async (feature, quantity = 1, options = {}) => {
    const { 
      showPrompt = true, 
      customMessage = null,
      autoTrack = false 
    } = options;

    // Check if feature is available
    if (!hasFeatureAccess(feature)) {
      if (showPrompt) {
        const message = customMessage || getUpgradeMessage(feature);
        setUpgradePrompt({
          open: true,
          feature,
          title: message.title,
          description: message.description,
          currentUsage: 0,
          limit: 0
        });
      }
      return { allowed: false, reason: 'feature_not_available' };
    }

    // Check usage limits
    const permission = canPerformAction(feature, quantity);
    if (!permission.allowed) {
      if (showPrompt) {
        const message = customMessage || getUpgradeMessage(feature);
        setUpgradePrompt({
          open: true,
          feature,
          title: message.title,
          description: message.description,
          currentUsage: permission.current,
          limit: permission.limit
        });
      }
      return { allowed: false, reason: 'limit_exceeded', ...permission };
    }

    // Auto-track usage if requested
    if (autoTrack) {
      try {
        await trackUsage(feature, quantity);
      } catch (error) {
        console.error('Error auto-tracking usage:', error);
      }
    }

    return { allowed: true, ...permission };
  }, [hasFeatureAccess, canPerformAction, getUpgradeMessage, trackUsage]);

  return {
    // State
    upgradePrompt,
    
    // Actions
    checkAndPromptUpgrade,
    trackAndCheck,
    closeUpgradePrompt,
    startUpgrade,
    preActionCheck,
    
    // Utilities
    getUpgradeMessage,
    
    // Convenience methods
    canUpgradeFrom: planInfo?.tier !== 'hunter',
    isFreePlan: planInfo?.tier === 'free',
    isCasualPlan: planInfo?.tier === 'casual',
    isHunterPlan: planInfo?.tier === 'hunter'
  };
};