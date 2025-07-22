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

  // Condensed plan configurations with key features only
  const planConfigs = {
    casual: {
      name: 'Casual',
      price: '$14.99',
      period: 'month',
      color: theme.palette.primary.main,
      description: 'Perfect for active job seekers',
      keyFeatures: [
        'Unlimited Resume uploads & analysis',
        '25 Manual Job imports per month',
        '25 Resume tailoring sessions',
        'Full recruiter database access',
        '25 Recruiter Contact unlocks',
        'Up to 50 Jobs per week'
      ],
      highlights: ['Most Popular']
    },
    hunter: {
      name: 'Hunter',
      price: '$24.99',
      period: 'month',
      color: theme.palette.warning.main,
      description: 'For serious job hunters',
      keyFeatures: [
        'Unlimited resume uploads & analysis',
        'Unlimited manual job imports',
        '50 Resume tailoring sessions',
        'Unlimited recruiter unlocks',
        'Up to 100 Jobs per week',
        'AI Assistant with 5 conversations'
      ],
      highlights: ['Full Access']
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
        window.location.href = checkoutData.checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session - no URL returned');
      }
    } catch (err) {
      console.error('❌ Error creating checkout session:', err);
      
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          maxHeight: '90vh',
          height: 'auto'
        }
      }}
    >
      {/* Compact Header */}
      <DialogTitle sx={{ 
        p: 0,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          pb: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
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
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0 }}>
                {featureInfo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {featureInfo.description}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert 
              severity="error" 
              sx={{ borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Box>
        )}

        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontSize: '1.1rem' }}>
            Choose the perfect plan for your job search
          </Typography>

          <Grid container spacing={2}>
            {Object.entries(planConfigs).map(([planKey, plan]) => {
              const isRecommended = planKey === recommendedPlan;
              const isCurrentPlan = planKey === currentPlan;
              
              return (
                <Grid item xs={12} sm={6} key={planKey}>
                  <Card 
                    elevation={isRecommended ? 6 : 2}
                    sx={{
                      height: '100%',
                      position: 'relative',
                      border: isRecommended ? `2px solid ${plan.color}` : `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Recommended badge */}
                    {isRecommended && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -8,
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
                            fontSize: '0.65rem',
                            height: 18
                          }}
                        />
                      </Box>
                    )}

                    <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Plan header - more compact */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 700, 
                            color: plan.color,
                            mb: 0.5,
                            fontSize: '1.5rem'
                          }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          {plan.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: plan.color, fontSize: '1.8rem' }}>
                            {plan.price}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{plan.period}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Compact features list */}
                      <List sx={{ flex: 1, py: 0, '& .MuiListItem-root': { py: 0.25, px: 0 } }}>
                        {plan.keyFeatures.map((feature, index) => (
                          <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <CheckIcon 
                                sx={{ 
                                  fontSize: 16, 
                                  color: plan.color 
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={feature}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { fontSize: '0.8rem', lineHeight: 1.3 }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {/* Compact action button */}
                      <Button
                        variant={isRecommended ? "contained" : "outlined"}
                        size="medium"
                        fullWidth
                        disabled={loading || isCurrentPlan}
                        onClick={() => handleUpgrade(planKey)}
                        startIcon={loading && isRecommended ? <CircularProgress size={16} color="inherit" /> : <UpgradeIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          mt: 1.5,
                          py: 1,
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '0.85rem',
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

          {/* Compact trust indicators */}
          <Paper 
            elevation={0} 
            sx={{ 
              mt: 2, 
              p: 1.5, 
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <SecurityIcon sx={{ color: theme.palette.success.main, fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                    Secure Payment
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <SupportIcon sx={{ color: theme.palette.info.main, fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                    Cancel Anytime
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <SpeedIcon sx={{ color: theme.palette.warning.main, fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                    Instant Access
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        pt: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        background: theme.palette.grey[50],
        justifyContent: 'space-between'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Powered by Stripe • Safe & Secure
        </Typography>
        <Button 
          onClick={onClose} 
          size="small"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '0.8rem'
          }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpgradePrompt;