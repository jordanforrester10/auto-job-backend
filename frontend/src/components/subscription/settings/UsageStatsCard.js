// src/components/subscription/settings/UsageStatsCard.js - CLEANED VERSION
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Alert,
  Divider,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Upgrade as UpgradeIcon,
  Info as InfoIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../../context/SubscriptionContext';

const UsageStatsCard = ({ usage, planLimits, subscription, onUpgradeClick }) => {
  const theme = useTheme();
  const { 
    persistentWeeklyStats, 
    getWeeklyJobStats,
    hasPersistentTracking 
  } = useSubscription();

  if (!usage || !planLimits) {
    return (
      <Card sx={{ borderRadius: 3, height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Usage Statistics
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 200,
            color: 'text.secondary'
          }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Loading usage data...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const currentTier = subscription?.subscriptionTier || 'free';

  // Get persistent weekly stats
  const weeklyStats = getWeeklyJobStats() || persistentWeeklyStats || {
    weeklyLimit: 0,
    weeklyUsed: 0,
    weeklyRemaining: 0,
    weeklyPercentage: 0,
    isWeeklyLimitReached: false
  };

  // Feature display names and icons
  const featureConfig = {
    resumeUploads: {
      name: 'Resume Uploads',
      icon: '📄',
      description: 'Monthly resume uploads'
    },
    jobImports: {
      name: 'Job Imports',
      icon: '💼',
      description: 'Job postings imported'
    },
    resumeTailoring: {
      name: 'Resume Tailoring',
      icon: '✨',
      description: 'Resume customizations'
    },
    recruiterUnlocks: {
      name: 'Recruiter Unlocks',
      icon: '🔓',
      description: 'Recruiter contacts unlocked'
    },
    aiJobDiscovery: {
      name: 'AI Search Slots',
      icon: '🤖',
      description: 'Active AI job searches'
    },
    aiJobsThisWeek: {
      name: 'Jobs This Week',
      icon: '📅',
      description: 'Jobs discovered this week'
    },
    aiConversations: {
      name: 'AI Conversations',
      icon: '💬',
      description: 'AI assistant chats'
    }
  };

  // Calculate usage statistics
  const getUsageStats = () => {
    const stats = [];

    Object.keys(featureConfig).forEach(feature => {
      let limit, used, unlimited, percentage, remaining, status;
      
      if (feature === 'aiJobsThisWeek') {
        // Use persistent weekly stats
        limit = weeklyStats.weeklyLimit;
        used = weeklyStats.weeklyUsed;
        unlimited = false;
        percentage = weeklyStats.weeklyPercentage;
        remaining = weeklyStats.weeklyRemaining;
        status = getWeeklyUsageStatus(percentage);
        
        // Only show if user has AI discovery access
        if (!planLimits.aiJobDiscovery || limit === 0) return;
      } else if (feature === 'aiJobDiscovery') {
        // AI Search Slots
        limit = planLimits.aiJobDiscoverySlots || 0;
        used = usage[feature]?.used || 0;
        unlimited = false;
        percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
        remaining = Math.max(0, limit - used);
        status = getUsageStatus(used, limit);
        
        if (!planLimits.aiJobDiscovery || limit === 0) return;
      } else {
        // Standard monthly features
        limit = planLimits[feature];
        used = usage[feature]?.used || 0;
        
        if (limit === false || limit === 0) return;
        
        unlimited = limit === -1;
        percentage = unlimited ? 0 : Math.round((used / limit) * 100);
        remaining = unlimited ? '∞' : Math.max(0, limit - used);
        status = getUsageStatus(used, limit);
      }
      
      const config = featureConfig[feature];
      
      stats.push({
        feature,
        name: config.name,
        icon: config.icon,
        description: config.description,
        used,
        limit,
        unlimited,
        percentage,
        remaining,
        status,
        isWeekly: feature === 'aiJobsThisWeek'
      });
    });

    return stats;
  };

  // Get usage status for color coding
  const getUsageStatus = (used, limit) => {
    if (limit === -1) return 'unlimited';
    if (limit === 0 || limit === false) return 'unavailable';
    
    const percentage = (used / limit) * 100;
    
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  // Get weekly usage status
  const getWeeklyUsageStatus = (percentage) => {
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'exceeded': return theme.palette.error.main;
      case 'critical': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'normal': return theme.palette.success.main;
      case 'unlimited': return theme.palette.info.main;
      case 'unavailable': return theme.palette.grey[400];
      default: return theme.palette.grey[400];
    }
  };

  // Get progress color
  const getProgressColor = (status) => {
    switch (status) {
      case 'exceeded': return 'error';
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'normal': return 'success';
      case 'unlimited': return 'info';
      default: return 'primary';
    }
  };

  const usageStats = getUsageStats();
  const criticalUsage = usageStats.filter(stat => stat.status === 'critical' || stat.status === 'exceeded');
  const warningUsage = usageStats.filter(stat => stat.status === 'warning');

  // Get reset date for monthly features
  const getResetDate = () => {
    if (!usage.resetDate) return 'Unknown';
    
    const resetDate = new Date(usage.resetDate);
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
    
    return nextReset.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Usage Statistics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resets {getResetDate()}
            </Typography>
          </Box>
        </Box>

        {/* Weekly Limit Alert */}
        {weeklyStats.isWeeklyLimitReached && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Weekly job discovery limit reached ({weeklyStats.weeklyUsed}/{weeklyStats.weeklyLimit})
            </Typography>
            <Typography variant="caption">
              Weekly limit resets on Monday
            </Typography>
          </Alert>
        )}

        {/* Critical Usage Warnings */}
        {criticalUsage.length > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              currentTier !== 'hunter' && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => onUpgradeClick?.(currentTier === 'free' ? 'casual' : 'hunter')}
                  startIcon={<UpgradeIcon />}
                >
                  Upgrade
                </Button>
              )
            }
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {criticalUsage.length} feature{criticalUsage.length > 1 ? 's' : ''} at limit
            </Typography>
            <Typography variant="caption">
              {criticalUsage.map(stat => stat.name).join(', ')} {criticalUsage.length > 1 ? 'have' : 'has'} reached usage limits
            </Typography>
          </Alert>
        )}

        {/* Warning Usage Alerts */}
        {warningUsage.length > 0 && criticalUsage.length === 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              currentTier !== 'hunter' && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => onUpgradeClick?.(currentTier === 'free' ? 'casual' : 'hunter')}
                  startIcon={<UpgradeIcon />}
                >
                  Upgrade
                </Button>
              )
            }
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Approaching usage limits
            </Typography>
            <Typography variant="caption">
              Consider upgrading for higher limits
            </Typography>
          </Alert>
        )}

        {/* Usage Statistics List */}
        <List sx={{ py: 0 }}>
          {usageStats.map((stat, index) => (
            <ListItem key={stat.feature} sx={{ px: 0, py: 1.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography component="span" sx={{ fontSize: '1.2rem' }}>
                      {stat.icon}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {stat.name}
                    </Typography>
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {stat.used}/{stat.unlimited ? '∞' : stat.limit}
                      </Typography>
                      <Chip
                        label={
                          stat.status === 'unlimited' ? 'Unlimited' :
                          stat.status === 'exceeded' ? 'Exceeded' :
                          stat.status === 'critical' ? 'Critical' :
                          stat.status === 'warning' ? 'High' :
                          'Normal'
                        }
                        size="small"
                        color={
                          stat.status === 'unlimited' ? 'info' :
                          stat.status === 'exceeded' ? 'error' :
                          stat.status === 'critical' ? 'error' :
                          stat.status === 'warning' ? 'warning' :
                          'success'
                        }
                        variant="outlined"
                        sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                }
                secondary={
                  <Box>
                    {!stat.unlimited && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(stat.percentage, 100)}
                        color={getProgressColor(stat.status)}
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          mb: 0.5,
                          backgroundColor: theme.palette.grey[200]
                        }}
                      />
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {stat.description}
                      </Typography>
                      {!stat.unlimited && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: getStatusColor(stat.status),
                            fontWeight: 500
                          }}
                        >
                          {stat.remaining} remaining
                          {stat.isWeekly && ' this week'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>



        {/* Features Not Available */}
        {currentTier !== 'hunter' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.secondary }}>
                Features Not Available in {currentTier === 'free' ? 'Free Plan' : 'Casual Plan'}
              </Typography>
              
              {currentTier === 'free' && (
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item>
                    <Chip
                      label="🔓 Recruiter Access"
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label="🤖 AI Job Discovery"
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label="💬 AI Assistant"
                      size="small"
                      variant="outlined"
                      color="warning"
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                </Grid>
              )}

              {currentTier === 'casual' && (
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item>
                    <Chip
                      label="💬 AI Assistant"
                      size="small"
                      variant="outlined"
                      color="warning"
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label="🚀 100 Jobs/Week (vs 50)"
                      size="small"
                      variant="outlined"
                      color="warning"
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                </Grid>
              )}

              <Button
                variant="contained"
                startIcon={<UpgradeIcon />}
                onClick={() => onUpgradeClick?.(currentTier === 'free' ? 'casual' : 'hunter')}
                sx={{ 
                  borderRadius: 2,
                  background: currentTier === 'free' 
                    ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                    : `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                }}
              >
                {currentTier === 'free' 
                  ? 'Upgrade to Casual ($19.99/month)'
                  : 'Upgrade to Hunter ($34.99/month)'
                }
              </Button>
            </Box>
          </>
        )}

        {/* Usage Summary */}
        <Box sx={{ 
          mt: 3,
          p: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.grey[50],
          border: `1px solid ${theme.palette.grey[200]}`
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Usage Summary
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {usageStats.filter(s => s.status === 'normal' || s.status === 'unlimited').length} of {usageStats.length} features available
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {criticalUsage.length === 0 && warningUsage.length === 0 ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
              ) : (
                <WarningIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
              )}
              <Typography variant="caption" color="text.secondary">
                {criticalUsage.length === 0 && warningUsage.length === 0 
                  ? 'All features within limits'
                  : `${criticalUsage.length + warningUsage.length} feature${criticalUsage.length + warningUsage.length > 1 ? 's' : ''} need attention`
                }
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UsageStatsCard;