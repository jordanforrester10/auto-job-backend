// src/components/subscription/settings/SubscriptionSection.js
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../../context/SubscriptionContext';
import CurrentPlanCard from './CurrentPlanCard';
import UsageStatsCard from './UsageStatsCard';
import BillingHistoryCard from './BillingHistoryCard';
import PlanChangeDialog from './PlanChangeDialog';

const SubscriptionSection = ({ onError, onSuccess }) => {
  const theme = useTheme();
  const { 
    subscription, 
    usage, 
    planLimits, 
    loading, 
    error, 
    refreshSubscription,
    planInfo
  } = useSubscription();
  
  // Local state for dialogs
  const [showPlanChangeDialog, setShowPlanChangeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Handle plan change request
  const handlePlanChangeRequest = (planName) => {
    setSelectedPlan(planName);
    setShowPlanChangeDialog(true);
  };

  // Handle successful plan change
  const handlePlanChangeSuccess = async (message) => {
    setShowPlanChangeDialog(false);
    setSelectedPlan(null);
    onSuccess?.(message || 'Plan changed successfully!');
    
    // Refresh subscription data
    try {
      await refreshSubscription();
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  // Handle plan change error
  const handlePlanChangeError = (error) => {
    onError?.(error);
  };

  // Handle plan change dialog close
  const handlePlanChangeClose = () => {
    setShowPlanChangeDialog(false);
    setSelectedPlan(null);
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 400,
        gap: 2
      }}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading subscription information...
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ borderRadius: 2 }}
        action={
          <button onClick={refreshSubscription}>
            Retry
          </button>
        }
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Failed to load subscription data
        </Typography>
        <Typography variant="body2">
          {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            color: theme.palette.primary.main, 
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CreditCardIcon />
          Subscription & Billing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your subscription plan, view usage statistics, and billing history
        </Typography>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Current Plan Card */}
        <Grid item xs={12} lg={6}>
          <CurrentPlanCard 
            subscription={subscription}
            planInfo={planInfo}
            onPlanChange={handlePlanChangeRequest}
            onError={onError}
            onSuccess={onSuccess}
          />
        </Grid>

        {/* Usage Statistics Card */}
        <Grid item xs={12} lg={6}>
          <UsageStatsCard 
            usage={usage}
            planLimits={planLimits}
            subscription={subscription}
            onUpgradeClick={handlePlanChangeRequest}
          />
        </Grid>

        {/* Billing History Card - Full Width */}
        <Grid item xs={12}>
          <BillingHistoryCard 
            subscription={subscription}
            onError={onError}
            onSuccess={onSuccess}
          />
        </Grid>
      </Grid>

      {/* Plan Change Dialog */}
      <PlanChangeDialog
        open={showPlanChangeDialog}
        onClose={handlePlanChangeClose}
        currentPlan={subscription?.subscriptionTier || 'free'}
        targetPlan={selectedPlan}
        onSuccess={handlePlanChangeSuccess}
        onError={handlePlanChangeError}
      />
    </Box>
  );
};

export default SubscriptionSection;