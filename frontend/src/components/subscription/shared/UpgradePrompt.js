// frontend/src/components/subscription/shared/UpgradePrompt.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Upgrade as UpgradeIcon,
  Check as CheckIcon,
  Star as StarIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../../context/SubscriptionContext';
import subscriptionService from '../../../utils/subscriptionService';

const UpgradePrompt = ({ 
  open, 
  onClose, 
  feature = null, 
  title = "Upgrade Your Plan", 
  description = "Unlock premium features with our paid plans",
  currentPlan = 'free'
}) => {
  const theme = useTheme();
  const { planInfo } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Plan configurations with correct pricing
  const planConfigs = {
    casual: {
      name: 'Casual',
      price: '$19.99',
      period: 'month',
      color: theme.palette.primary.main,
      description: 'Perfect for active job seekers',
      features: [
        '5 Resume uploads & analysis',
        '25 Manual Job imports per month',
        '25 Resume tailoring sessions',
        'Full recruiter database access',
        '25 Recruiter Contact unlocks per month',
        'Up to 50 Jobs Automatically Delivered per week',
        'Priority email support'
      ],
      highlights: ['Most Popular', 'Best Value']
    },
    hunter: {
      name: 'Hunter',
      price: '$34.99',
      period: 'month',
      color: theme.palette.warning.main,
      description: 'For serious job hunters & career changers',
      features: [
        'Unlimited resume uploads & analysis',
        'Unlimited manual job imports',
        '50 Resume tailoring sessions',
        'Full recruiter database access',
        'Unlimited recruiter contact unlocks',
        'Up to 100 Jobs Automatically Delivered per week',
        'AI Assistant with 5 conversations',
        '20 messages per conversation',
        'Priority support & phone support'
      ],
      highlights: ['Full Access', 'AI Powered']
    }
  };

  // Feature-specific upgrade suggestions
  const featureUpgradeMap = {
    resumeUploads: {
      recommendedPlan: 'casual',
      title: 'Upgrade Your Plan',
      description: 'Get more resume uploads per month and advanced analysis tools.',
      icon: <UpgradeIcon />
    },
    jobImports: {
      recommendedPlan: 'casual',
      title: 'Upgrade Your Plan',
      description: 'Track more job applications per month with detailed analysis.',
      icon: <TrendingUpIcon />
    },
    recruiterAccess: {
      recommendedPlan: 'casual',
      title: 'Upgrade Your Plan',
      description: 'Get access to detailed recruiter profiles and contact information.',
      icon: <SecurityIcon />
    },
    aiAssistant: {
      recommendedPlan: 'hunter',
      title: 'Upgrade Your Plan',
      description: 'Get personalized AI assistance for your entire job search journey.',
      icon: <StarIcon />
    }
  };

  const getRecommendedPlan = () => {
    if (feature && featureUpgradeMap[feature]) {
      return featureUpgradeMap[feature].recommendedPlan;
    }
    return currentPlan === 'free' ? 'casual' : 'hunter';
  };

  const getFeatureInfo = () => {
    if (feature && featureUpgradeMap[feature]) {
      return featureUpgradeMap[feature];
    }
    return {
      title,
      description,
      icon: <UpgradeIcon />
    };
  };

  const handleUpgrade = async (planName) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Creating checkout session for plan:', planName);
      
      const checkoutData = await subscriptionService.createCheckoutSession(planName);
      
      if (checkoutData && checkoutData.checkoutUrl) {
        console.log('✅ Checkout session created, redirecting to:', checkoutData.checkoutUrl);
        // Redirect to Stripe Checkout
        window.location.href = checkoutData.checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session - no URL returned');
      }
    } catch (err) {
      console.error('❌ Error creating checkout session:', err);
      
      // Show user-friendly error message
      if (err.response?.status === 403) {
        setError('Please log in to upgrade your plan.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again in a few moments.');
      } else {
        setError('Unable to start upgrade process. Please contact support if this continues.');
      }
    } finally {
      setLoading(false);
    }
  };

  const recommendedPlan = getRecommendedPlan();
  const featureInfo = getFeatureInfo();

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          minHeight: '500px'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        p: 0,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.primary.main
              }}
            >
              {featureInfo.icon}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                {featureInfo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {featureInfo.description}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Box sx={{ p: 3 }}>
            <Alert 
              severity="error" 
              sx={{ borderRadius: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
            Choose the perfect plan for your job search
          </Typography>

          <Grid container spacing={3}>
            {Object.entries(planConfigs).map(([planKey, plan]) => {
              const isRecommended = planKey === recommendedPlan;
              const isCurrentPlan = planKey === currentPlan;
              
              return (
                <Grid item xs={12} md={6} key={planKey}>
                  <Card 
                    elevation={isRecommended ? 8 : 2}
                    sx={{
                      height: '100%',
                      position: 'relative',
                      border: isRecommended ? `2px solid ${plan.color}` : `1px solid ${theme.palette.divider}`,
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    {/* Recommended badge */}
                    {isRecommended && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1
                        }}
                      >
                        <Chip
                          label="Recommended"
                          color="primary"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      </Box>
                    )}

                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Plan header */}
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700, 
                            color: plan.color,
                            mb: 1
                          }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {plan.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: plan.color }}>
                            {plan.price}
                          </Typography>
                          <Typography variant="body1" color="text.secondary">
                            /{plan.period}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Highlights */}
                      {plan.highlights && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                          {plan.highlights.map((highlight, index) => (
                            <Chip
                              key={index}
                              label={highlight}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: plan.color + '40',
                                color: plan.color,
                                fontSize: '0.7rem'
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Features list */}
                      <List sx={{ flex: 1, py: 0 }}>
                        {plan.features.map((feature, index) => (
                          <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckIcon 
                                sx={{ 
                                  fontSize: 18, 
                                  color: plan.color 
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={feature}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { fontSize: '0.875rem' }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {/* Action button */}
                      <Button
                        variant={isRecommended ? "contained" : "outlined"}
                        size="large"
                        fullWidth
                        disabled={loading || isCurrentPlan}
                        onClick={() => handleUpgrade(planKey)}
                        startIcon={loading && isRecommended ? <CircularProgress size={20} color="inherit" /> : <UpgradeIcon />}
                        sx={{
                          mt: 2,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                          ...(isRecommended && {
                            backgroundColor: plan.color,
                            '&:hover': {
                              backgroundColor: plan.color,
                              filter: 'brightness(0.9)'
                            }
                          }),
                          ...(isCurrentPlan && {
                            backgroundColor: theme.palette.grey[200],
                            color: theme.palette.grey[600]
                          })
                        }}
                      >
                        {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Trust indicators */}
          <Paper 
            elevation={0} 
            sx={{ 
              mt: 4, 
              p: 3, 
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ color: theme.palette.success.main }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Secure Payment
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SupportIcon sx={{ color: theme.palette.info.main }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Cancel Anytime
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SpeedIcon sx={{ color: theme.palette.warning.main }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Instant Access
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: `1px solid ${theme.palette.divider}`,
        background: theme.palette.grey[50],
        justifyContent: 'space-between'
      }}>
        <Typography variant="caption" color="text.secondary">
          Powered by Stripe • Safe & Secure
        </Typography>
        <Button 
          onClick={onClose} 
          sx={{ 
            borderRadius: 2,
            textTransform: 'none'
          }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpgradePrompt;