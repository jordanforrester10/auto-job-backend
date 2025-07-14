// src/components/subscription/settings/CurrentPlanCard.js - FIXED DATE DISPLAY AND RESUME FUNCTIONALITY
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Upgrade as UpgradeIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Star as StarIcon,
  WorkspacePremium as PremiumIcon,
  ManageAccounts as ManageIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import subscriptionService from '../../../utils/subscriptionService';

const CurrentPlanCard = ({ subscription, planInfo, onPlanChange, onError, onSuccess }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState({
    portal: false,
    cancel: false,
    resume: false
  });
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Plan feature definitions
  const planFeatures = {
    free: [
      '1 Resume Upload',
      '3 Job Imports',
      '1 Resume Tailoring',
      'Basic Analytics'
    ],
    casual: [
      '5 Resume Uploads',
      '25 Manual Job Imports', 
      '25 Resume Tailoring',
      'Recruiter Database Access',
      '25 Recruiter Contact Unlocks',
      'Up to 50 Jobs Automatically Delivered per week'
    ],
    hunter: [
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
  };

  // FIXED: Updated plan pricing to match requirements
  const planPricing = {
    free: { monthly: 0, yearly: 0 },
    casual: { monthly: 19.99, yearly: 199.90 }, // Changed from 29 to 19.99
    hunter: { monthly: 34.99, yearly: 349.90 }  // Changed from 79 to 34.99
  };

  const currentTier = subscription?.subscriptionTier || 'free';
  const isActive = subscription?.subscriptionStatus === 'active';
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;

  // Handle customer portal access
  const handleManageSubscription = async () => {
    try {
      setLoading(prev => ({ ...prev, portal: true }));
      
      const portalSession = await subscriptionService.createCustomerPortalSession();
      
      // Redirect to Stripe customer portal
      window.open(portalSession.portalUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening customer portal:', error);
      onError?.('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, portal: false }));
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      setLoading(prev => ({ ...prev, cancel: true }));
      
      const result = await subscriptionService.cancelSubscription(true);
      
      onSuccess?.('Subscription will be canceled at the end of your current billing period.');
      setShowCancelDialog(false);
      
      // Refresh the page or trigger a refresh of subscription data
      window.location.reload();
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      onError?.('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, cancel: false }));
    }
  };

  // FIXED: Handle subscription resumption with proper loading state and refresh
  const handleResumeSubscription = async () => {
    try {
      setLoading(prev => ({ ...prev, resume: true }));
      
      console.log('🔄 Resuming subscription...');
      const result = await subscriptionService.resumeSubscription();
      console.log('✅ Resume subscription result:', result);
      
      onSuccess?.('Subscription resumed successfully! Page will refresh to update your subscription status.');
      
      // Wait a moment then refresh to show updated subscription status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error resuming subscription:', error);
      onError?.('Failed to resume subscription. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, resume: false }));
    }
  };

  // Get plan display information
  const getPlanDisplay = () => {
    switch (currentTier) {
      case 'hunter':
        return {
          name: 'Hunter Plan',
          color: theme.palette.warning.main,
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          icon: <PremiumIcon />,
          description: 'Full AI-powered job hunting suite'
        };
      case 'casual':
        return {
          name: 'Casual Plan',
          color: theme.palette.primary.main,
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          icon: <StarIcon />,
          description: 'Enhanced job search with recruiter access'
        };
      case 'free':
      default:
        return {
          name: 'Free Plan',
          color: theme.palette.grey[600],
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          icon: <InfoIcon />,
          description: 'Basic job search features'
        };
    }
  };

  const planDisplay = getPlanDisplay();
  const currentFeatures = planFeatures[currentTier] || [];
  const currentPrice = planPricing[currentTier];

  // FIXED: Get next billing date with proper date handling and validation
  const getNextBillingDate = () => {
    console.log('🔍 Getting next billing date:', {
      subscriptionEndDate: subscription?.subscriptionEndDate,
      currentPeriodEnd: subscription?.currentPeriodEnd,
      type: typeof subscription?.subscriptionEndDate
    });

    // Try multiple date fields that might contain the billing date
    const dateValue = subscription?.subscriptionEndDate || 
                     subscription?.currentPeriodEnd || 
                     subscription?.current_period_end ||
                     subscription?.nextBillingDate ||
                     subscription?.next_billing_date;

    if (!dateValue) {
      console.warn('⚠️ No subscription end/billing date available');
      return 'Not available';
    }
    
    try {
      let date;
      
      // Handle different date formats
      if (typeof dateValue === 'number') {
        // Unix timestamp - check if it's in seconds or milliseconds
        if (dateValue < 1e12) {
          // Likely in seconds, convert to milliseconds
          date = new Date(dateValue * 1000);
        } else {
          // Already in milliseconds
          date = new Date(dateValue);
        }
      } else if (typeof dateValue === 'string') {
        // String date
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        // Already a Date object
        date = dateValue;
      } else {
        console.warn('⚠️ Unexpected date format:', dateValue);
        return 'Invalid Date';
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Invalid date created:', date);
        return 'Invalid Date';
      }

      const formatted = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      console.log('✅ Next billing date formatted:', formatted);
      return formatted;
      
    } catch (error) {
      console.error('❌ Error formatting next billing date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <>
      <Card sx={{ borderRadius: 3, height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          {/* Plan Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: planDisplay.backgroundColor,
                  color: planDisplay.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {planDisplay.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {planDisplay.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {planDisplay.description}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              {currentTier === 'free' ? (
                <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  Free
                </Typography>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    ${currentPrice.monthly}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  {isActive && (
                    <Chip
                      label="Active"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </>
              )}
            </Box>
          </Box>

          {/* Subscription Status */}
          {currentTier !== 'free' && (
            <Box sx={{ mb: 3 }}>
              {cancelAtPeriodEnd ? (
                <Alert 
                  severity="warning" 
                  sx={{ borderRadius: 2, mb: 2 }}
                  action={
                    <Button
                      size="small"
                      onClick={handleResumeSubscription}
                      disabled={loading.resume}
                      startIcon={loading.resume ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                    >
                      {loading.resume ? 'Resuming...' : 'Resume'}
                    </Button>
                  }
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Subscription ends on {getNextBillingDate()}
                  </Typography>
                  <Typography variant="caption">
                    Your subscription will not renew automatically
                  </Typography>
                </Alert>
              ) : (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: theme.palette.success.light + '20',
                  border: `1px solid ${theme.palette.success.light}`
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.success.dark }}>
                    Next billing: {getNextBillingDate()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Monthly subscription • Auto-renewal enabled
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Plan Features */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Plan Features
            </Typography>
            <List dense sx={{ py: 0 }}>
              {currentFeatures.map((feature, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon 
                      sx={{ 
                        fontSize: 20, 
                        color: theme.palette.success.main 
                      }} 
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={feature}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { fontWeight: 500 }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentTier === 'free' ? (
              <Button
                variant="contained"
                startIcon={<UpgradeIcon />}
                onClick={() => onPlanChange?.()}
                sx={{ 
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                }}
              >
                Upgrade
              </Button>
            ) : currentTier === 'casual' ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<PremiumIcon />}
                  onClick={() => onPlanChange?.('hunter')}
                  sx={{ 
                    borderRadius: 2,
                    background: `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                  }}
                >
                  Upgrade to Hunter ($34.99/month)
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ManageIcon />}
                  onClick={handleManageSubscription}
                  disabled={loading.portal}
                  sx={{ borderRadius: 2 }}
                >
                  {loading.portal ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Opening...
                    </>
                  ) : (
                    'Manage Subscription'
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<ManageIcon />}
                onClick={handleManageSubscription}
                disabled={loading.portal}
                sx={{ borderRadius: 2 }}
              >
                {loading.portal ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Opening...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            )}

            {/* Cancel Subscription Button for Paid Plans */}
            {currentTier !== 'free' && !cancelAtPeriodEnd && (
              <Button
                variant="text"
                color="error"
                onClick={() => setShowCancelDialog(true)}
                sx={{ borderRadius: 2, mt: 1 }}
              >
                Cancel Subscription
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: theme.palette.error.main
        }}>
          <CancelIcon />
          Cancel Subscription
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to cancel your {planDisplay.name.toLowerCase()}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your subscription will remain active until {getNextBillingDate()}, and you'll continue to have access to all premium features until then.
          </Typography>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              You can reactivate your subscription anytime before it expires.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setShowCancelDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancelSubscription}
            variant="contained"
            color="error"
            startIcon={loading.cancel ? <CircularProgress size={16} /> : <CancelIcon />}
            disabled={loading.cancel}
            sx={{ borderRadius: 2 }}
          >
            {loading.cancel ? 'Canceling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CurrentPlanCard;