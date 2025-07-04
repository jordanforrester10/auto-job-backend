// frontend/src/components/subscription/navigation/UpgradeButton.js
import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  useTheme
} from '@mui/material';
import {
  Upgrade as UpgradeIcon,
  Settings as SettingsIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../../context/SubscriptionContext';
import subscriptionService from '../../../utils/subscriptionService';

const UpgradeButton = ({ 
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'contained', // 'contained', 'outlined', 'text', 'icon'
  contextualFeature = null, // Feature that triggered the upgrade prompt
  showLabel = true,
  fullWidth = false
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { planInfo, isHunterPlan, needsUpgrade } = useSubscription();
  const [loading, setLoading] = useState(false);

  // Don't show upgrade button for Hunter plan users (show manage instead)
  const showManageInstead = isHunterPlan;

  const handleClick = async () => {
    if (showManageInstead) {
      // Navigate to settings/subscription management
      navigate('/settings?tab=subscription');
      return;
    }

    try {
      setLoading(true);

      // Determine target plan based on current plan and contextual feature
      let targetPlan = 'casual'; // Default upgrade
      
      if (planInfo?.tier === 'free') {
        targetPlan = contextualFeature === 'aiAssistant' || contextualFeature === 'aiConversations' ? 'hunter' : 'casual';
      } else if (planInfo?.tier === 'casual') {
        targetPlan = 'hunter';
      }

      // Create checkout session
      const session = await subscriptionService.createCheckoutSession(targetPlan);
      
      if (session.url) {
        // Redirect to Stripe checkout
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error starting upgrade flow:', error);
      // Could show error toast here
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    if (showManageInstead) {
      return {
        label: 'Manage',
        icon: <SettingsIcon />,
        color: 'primary',
        tooltip: 'Manage your Hunter subscription'
      };
    }

    if (planInfo?.tier === 'free') {
      return {
        label: 'Upgrade',
        icon: <UpgradeIcon />,
        color: 'primary',
        tooltip: contextualFeature 
          ? `Upgrade to unlock ${subscriptionService.getFeatureDisplayName(contextualFeature)}`
          : 'Upgrade to Casual plan for enhanced features'
      };
    }

    if (planInfo?.tier === 'casual') {
      return {
        label: 'Go Pro',
        icon: <StarIcon />,
        color: 'warning',
        tooltip: 'Upgrade to Hunter plan for full AI features'
      };
    }

    return {
      label: 'Upgrade',
      icon: <UpgradeIcon />,
      color: 'primary',
      tooltip: 'Upgrade your plan'
    };
  };

  const config = getButtonConfig();

  // Don't render if no upgrade needed and not managing
  if (!needsUpgrade && !showManageInstead) {
    return null;
  }

  const buttonStyles = {
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
    ...(variant === 'contained' && {
      background: showManageInstead 
        ? theme.palette.primary.main
        : `linear-gradient(135deg, ${theme.palette[config.color].main} 0%, ${theme.palette[config.color].dark} 100%)`,
      color: '#fff',
      boxShadow: `0 2px 8px ${theme.palette[config.color].main}40`,
      '&:hover': {
        boxShadow: `0 4px 12px ${theme.palette[config.color].main}60`,
        transform: 'translateY(-1px)'
      }
    })
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={config.tooltip} arrow>
        <IconButton
          onClick={handleClick}
          disabled={loading}
          color={config.color}
          size={size}
          sx={{
            ...buttonStyles,
            ...(variant === 'contained' && {
              backgroundColor: theme.palette[config.color].main,
              color: '#fff',
              '&:hover': {
                backgroundColor: theme.palette[config.color].dark
              }
            })
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            config.icon
          )}
        </IconButton>
      </Tooltip>
    );
  }

  const button = (
    <Button
      variant={variant}
      color={config.color}
      size={size}
      onClick={handleClick}
      disabled={loading}
      fullWidth={fullWidth}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : config.icon}
      sx={buttonStyles}
    >
      {showLabel && (loading ? 'Loading...' : config.label)}
    </Button>
  );

  if (config.tooltip) {
    return (
      <Tooltip title={config.tooltip} arrow>
        <Box component="span" sx={{ display: fullWidth ? 'block' : 'inline-block' }}>
          {button}
        </Box>
      </Tooltip>
    );
  }

  return button;
};

export default UpgradeButton;