// frontend/src/components/subscription/navigation/UsageIndicator.js
import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AllInclusive as InfinityIcon
} from '@mui/icons-material';
import { useSubscription } from '../../../context/SubscriptionContext';
import subscriptionService from '../../../utils/subscriptionService';

const UsageIndicator = ({ 
  showIcon = true,
  iconSize = 'medium',
  features = ['resumeUploads', 'jobImports', 'recruiterUnlocks', 'aiConversations'],
  compact = false
}) => {
  const theme = useTheme();
  const { usage, planLimits, planInfo } = useSubscription();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  if (!usage || !planLimits) {
    return null;
  }

  // Calculate overall usage status
  const getOverallStatus = () => {
    let highestPercentage = 0;
    let hasWarnings = false;
    let hasCritical = false;

    features.forEach(feature => {
      const percentage = getUsagePercentage(feature);
      if (percentage > highestPercentage) {
        highestPercentage = percentage;
      }
      if (percentage >= 90) hasCritical = true;
      else if (percentage >= 75) hasWarnings = true;
    });

    if (hasCritical) return 'critical';
    if (hasWarnings) return 'warning';
    return 'normal';
  };

  const getUsagePercentage = (feature) => {
    const limit = planLimits[feature];
    const used = usage[feature]?.used || 0;

    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100; // No access
    
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percentage, unlimited = false) => {
    if (unlimited) return theme.palette.success.main;
    if (percentage >= 100) return theme.palette.error.main;
    if (percentage >= 90) return theme.palette.error.main;
    if (percentage >= 75) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getStatusIcon = (feature) => {
    const limit = planLimits[feature];
    const percentage = getUsagePercentage(feature);

    if (limit === -1) return <InfinityIcon fontSize="small" />;
    if (limit === 0) return <BlockIcon fontSize="small" />;
    if (percentage >= 100) return <WarningIcon fontSize="small" />;
    if (percentage >= 90) return <WarningIcon fontSize="small" />;
    return <CheckCircleIcon fontSize="small" />;
  };

  const overallStatus = getOverallStatus();
  
  const statusConfig = {
    normal: {
      color: theme.palette.success.main,
      icon: <CheckCircleIcon />,
      tooltip: 'Usage is within normal limits'
    },
    warning: {
      color: theme.palette.warning.main,
      icon: <WarningIcon />,
      tooltip: 'Approaching usage limits'
    },
    critical: {
      color: theme.palette.error.main,
      icon: <WarningIcon />,
      tooltip: 'At or near usage limits'
    }
  };

  const currentStatus = statusConfig[overallStatus];

  return (
    <>
      <Tooltip title={currentStatus.tooltip} arrow>
        <IconButton
          onClick={handleClick}
          size={iconSize}
          sx={{
            color: currentStatus.color,
            '&:hover': {
              backgroundColor: alpha(currentStatus.color, 0.08)
            }
          }}
        >
          {showIcon ? <AnalyticsIcon /> : currentStatus.icon}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: `1px solid ${theme.palette.divider}`
          }
        }}
      >
        <Card elevation={0}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Usage Overview
              </Typography>
              <Box sx={{ ml: 'auto' }}>
                <Chip
                  label={planInfo?.displayName || 'Free Plan'}
                  size="small"
                  sx={{
                    backgroundColor: planInfo?.backgroundColor,
                    color: planInfo?.color,
                    fontWeight: 600
                  }}
                />
              </Box>
            </Box>

            <Grid container spacing={2}>
              {features.map(feature => {
                const limit = planLimits[feature];
                const used = usage[feature]?.used || 0;
                const percentage = getUsagePercentage(feature);
                const unlimited = limit === -1;
                const unavailable = limit === 0;
                const displayName = subscriptionService.getFeatureDisplayName(feature);

                return (
                  <Grid item xs={12} key={feature}>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        {getStatusIcon(feature)}
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            ml: 1, 
                            fontWeight: 500,
                            flex: 1
                          }}
                        >
                          {displayName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontWeight: 500
                          }}
                        >
                          {unlimited ? '∞' : unavailable ? 'N/A' : `${used}/${limit}`}
                        </Typography>
                      </Box>
                      
                      {!unavailable && (
                        <LinearProgress
                          variant="determinate"
                          value={unlimited ? 100 : percentage}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: alpha(theme.palette.grey[300], 0.3),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: unlimited 
                                ? theme.palette.success.main 
                                : getUsageColor(percentage),
                              borderRadius: 3,
                              background: unlimited
                                ? `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`
                                : undefined
                            }
                          }}
                        />
                      )}

                      {unavailable && (
                        <Box sx={{ 
                          height: 6, 
                          backgroundColor: alpha(theme.palette.grey[400], 0.3),
                          borderRadius: 3,
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `repeating-linear-gradient(
                              45deg,
                              ${alpha(theme.palette.grey[400], 0.5)},
                              ${alpha(theme.palette.grey[400], 0.5)} 4px,
                              transparent 4px,
                              transparent 8px
                            )`
                          }} />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            {/* Quick Actions */}
            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="View Details"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => {
                    handleClose();
                    // Navigate to settings/usage
                  }}
                />
                {(planInfo?.tier === 'free' || planInfo?.tier === 'casual') && (
                  <Chip
                    label="Upgrade"
                    size="small"
                    color="primary"
                    clickable
                    onClick={() => {
                      handleClose();
                      // Trigger upgrade flow
                    }}
                  />
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Popover>
    </>
  );
};

export default UsageIndicator;