// src/components/subscription/settings/PlanChangeDialog.js - UPDATED TO SHOW ALL PLANS
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Upgrade as UpgradeIcon,
  Star as StarIcon,
  WorkspacePremium as PremiumIcon,
  TrendingUp as TrendingUpIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import subscriptionService from '../../../utils/subscriptionService';

const PlanChangeDialog = ({ open, onClose, currentPlan, onSuccess, onError }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [planDetails, setPlanDetails] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Plan configuration with complete features
  const planConfig = {
    free: {
      name: 'Free Plan',
      price: 0,
      color: theme.palette.grey[600],
      icon: <StarIcon />,
      description: 'Basic job search features',
      features: [
        'Unlimited Resume Uploads',
        '3 Job Imports', 
        '1 Resume Tailoring',
        'Basic Analytics',
        'Email Support'
      ]
    },
    casual: {
      name: 'Casual Plan',
      price: 14.99,
      color: theme.palette.primary.main,
      icon: <StarIcon />,
      description: 'Enhanced job search with recruiter access',
      features: [
        'Unlimited Resume Uploads',
        '25 Manual Job Imports',
        '25 Resume Tailoring',
        'Recruiter Database Access',
        '25 Recruiter Contact Unlocks',
        'Up to 50 Jobs Automatically Delivered per week'
      ]
    },
    hunter: {
      name: 'Hunter Plan',
      price: 24.99,
      color: theme.palette.warning.main,
      icon: <PremiumIcon />,
      description: 'Full AI-powered job hunting suite',
      features: [
        'Unlimited Resume Uploads',
        'Unlimited Manual Job Imports',
        '50 Resume Tailoring',
        'Full Recruiter Database',
        'Unlimited Recruiter Contact Unlocks',
        'Up to 100 Jobs Automatically Delivered per week',
        'AI Assistant (5 conversations)',
        '20 Messages per conversation',
        'Priority Support'
      ]
    }
  };

  // Get available plans based on current plan
  const getAvailablePlans = () => {
    const allPlans = ['free', 'casual', 'hunter'];
    // Show all plans except current one
    return allPlans.filter(plan => plan !== currentPlan);
  };

  // Load plan details when dialog opens
  useEffect(() => {
    if (open) {
      loadPlanDetails();
      // Pre-select first available plan
      const availablePlans = getAvailablePlans();
      if (availablePlans.length > 0) {
        setSelectedPlan(availablePlans[0]);
      }
    }
  }, [open, currentPlan]);

  const loadPlanDetails = async () => {
    try {
      setLoading(true);
      
      // Load available plans from API
      const plans = await subscriptionService.getAvailablePlans();
      setPlanDetails(plans);
      
    } catch (error) {
      console.error('Error loading plan details:', error);
      onError?.('Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  // Handle plan change confirmation
  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    try {
      setLoading(true);
      
      // Determine if this is an upgrade, downgrade, or new subscription
      const planOrder = { free: 0, casual: 1, hunter: 2 };
      const isUpgrade = planOrder[selectedPlan] > planOrder[currentPlan];
      const isDowngrade = planOrder[selectedPlan] < planOrder[currentPlan];
      const isNewSubscription = currentPlan === 'free';
      
      if (isNewSubscription) {
        // Create checkout session for new subscription
        const checkout = await subscriptionService.createCheckoutSession(selectedPlan);
        
        // Redirect to Stripe checkout
        window.location.href = checkout.checkoutUrl;
        
      } else if (isDowngrade && selectedPlan === 'free') {
        // Handle downgrade to free (cancel subscription)
        const result = await subscriptionService.cancelSubscription(true);
        
        onSuccess?.(`Subscription will be canceled and you'll return to the Free plan at the end of your billing period.`);
        onClose();
        
      } else {
        // Change existing subscription (upgrade/downgrade between paid plans)
        const result = await subscriptionService.changeSubscriptionPlan(selectedPlan);
        
        const changeType = isUpgrade ? 'upgraded' : 'downgraded';
        onSuccess?.(`Successfully ${changeType} to ${planConfig[selectedPlan].name}!`);
        onClose();
      }
      
    } catch (error) {
      console.error('Error changing plan:', error);
      onError?.(error.response?.data?.error || 'Failed to change plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for dynamic content based on plan change type
  const getPlanChangeType = () => {
    if (!selectedPlan) return null;
    
    const planOrder = { free: 0, casual: 1, hunter: 2 };
    const currentOrder = planOrder[currentPlan];
    const selectedOrder = planOrder[selectedPlan];
    
    if (currentPlan === 'free') return 'new';
    if (selectedOrder > currentOrder) return 'upgrade';
    if (selectedOrder < currentOrder) return 'downgrade';
    return 'same';
  };

  const getAlertSeverity = () => {
    const changeType = getPlanChangeType();
    switch (changeType) {
      case 'new': return 'success';
      case 'upgrade': return 'info';
      case 'downgrade': return 'warning';
      default: return 'info';
    }
  };

  const getAlertIcon = () => {
    const changeType = getPlanChangeType();
    switch (changeType) {
      case 'new': return <CheckCircleIcon />;
      case 'upgrade': return <UpgradeIcon />;
      case 'downgrade': return <TrendingUpIcon />;
      default: return <CheckCircleIcon />;
    }
  };

  const getAlertTitle = () => {
    const changeType = getPlanChangeType();
    switch (changeType) {
      case 'new': return `Start Your ${planConfig[selectedPlan].name}`;
      case 'upgrade': return `Upgrade to ${planConfig[selectedPlan].name}`;
      case 'downgrade': 
        return selectedPlan === 'free' 
          ? 'Return to Free Plan' 
          : `Downgrade to ${planConfig[selectedPlan].name}`;
      default: return `Switch to ${planConfig[selectedPlan].name}`;
    }
  };

  const getAlertMessage = () => {
    const changeType = getPlanChangeType();
    switch (changeType) {
      case 'new': 
        return "You'll be redirected to secure checkout to start your subscription. Your first billing cycle starts immediately.";
      case 'upgrade': 
        return "Your subscription will be upgraded immediately with prorated billing adjustments.";
      case 'downgrade':
        return selectedPlan === 'free'
          ? "Your subscription will be canceled at the end of your current billing period. You'll keep access to premium features until then."
          : "Your subscription will be downgraded at the end of your current billing period with adjusted billing.";
      default: 
        return "Changes will take effect according to your billing cycle.";
    }
  };

  const getButtonIcon = () => {
    const changeType = getPlanChangeType();
    switch (changeType) {
      case 'new': return <CheckCircleIcon />;
      case 'upgrade': return <UpgradeIcon />;
      case 'downgrade': return <TrendingUpIcon />;
      default: return <UpgradeIcon />;
    }
  };

  const getButtonText = () => {
    const changeType = getPlanChangeType();
    const plan = planConfig[selectedPlan];
    
    switch (changeType) {
      case 'new': 
        return `Start ${plan.name} - ${plan.price}/month`;
      case 'upgrade': 
        return `Upgrade to ${plan.name} - ${plan.price}/month`;
      case 'downgrade':
        return selectedPlan === 'free'
          ? 'Cancel Subscription (Return to Free)'
          : `Downgrade to ${plan.name} - ${plan.price}/month`;
      default: 
        return `Switch to ${plan.name} - ${plan.price}/month`;
    }
  };

  // Get available plans to show
  const availablePlans = getAvailablePlans();
  
  if (availablePlans.length === 0) {
    return null; // No upgrades available
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UpgradeIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Choose Your Plan
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 200,
            gap: 2
          }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading plan information...
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Current Plan Display */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Current Plan: {planConfig[currentPlan].name}
              </Typography>
            </Box>

            {/* Available Plans Grid */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {availablePlans.map((planKey) => {
                const plan = planConfig[planKey];
                const isSelected = selectedPlan === planKey;
                
                return (
                  <Grid item xs={12} md={6} key={planKey}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        borderRadius: 2,
                        border: isSelected 
                          ? `2px solid ${plan.color}` 
                          : `2px solid ${theme.palette.grey[300]}`,
                        backgroundColor: isSelected ? plan.color + '10' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          border: `2px solid ${plan.color}`,
                          backgroundColor: plan.color + '05'
                        }
                      }}
                      onClick={() => setSelectedPlan(planKey)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: plan.color + '20',
                              color: plan.color
                            }}
                          >
                            {plan.icon}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {plan.name}
                            </Typography>
                            {isSelected && (
                              <Chip label="Selected" size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                        
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                          ${plan.price}
                          <Typography component="span" variant="body2" color="text.secondary">
                            /month
                          </Typography>
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {plan.description}
                        </Typography>
                        
                        <List dense sx={{ py: 0 }}>
                          {plan.features.map((feature, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                              <ListItemIcon sx={{ minWidth: 20 }}>
                                <CheckCircleIcon sx={{ fontSize: 14, color: plan.color }} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={feature}
                                primaryTypographyProps={{ 
                                  variant: 'body2',
                                  sx: { fontWeight: 400, fontSize: '0.8rem' }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Selected Plan Action Message */}
            {selectedPlan && (
              <Alert 
                severity={getAlertSeverity()}
                sx={{ mb: 3, borderRadius: 2 }}
                icon={getAlertIcon()}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {getAlertTitle()}
                </Typography>
                <Typography variant="body2">
                  {getAlertMessage()}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Important Notes */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Important Notes
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Monthly billing cycle with automatic renewal"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Cancel anytime - no long-term commitment"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Usage limits reset monthly on your billing date"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmChange}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : getButtonIcon()}
          disabled={loading || !selectedPlan}
          sx={{ 
            borderRadius: 2,
            background: selectedPlan 
              ? `linear-gradient(45deg, ${planConfig[selectedPlan].color}, ${planConfig[selectedPlan].color}DD)`
              : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
          }}
        >
          {loading ? (
            'Processing...'
          ) : selectedPlan ? (
            getButtonText()
          ) : (
            'Select a Plan'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanChangeDialog;