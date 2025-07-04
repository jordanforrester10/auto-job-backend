// frontend/src/components/subscription/navigation/PlanBadge.js
import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
  Typography,
  useTheme
} from '@mui/material';
import {
  Star as StarIcon,
  WorkspacePremium as PremiumIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { useSubscription } from '../../../context/SubscriptionContext';

const PlanBadge = ({ 
  onClick = null,
  size = 'medium', // 'small', 'medium', 'large'
  showIcon = true,
  showTooltip = true,
  variant = 'filled' // 'filled', 'outlined'
}) => {
  const theme = useTheme();
  const { planInfo, subscription } = useSubscription();

  if (!planInfo) {
    return null;
  }

  const planConfig = {
    free: {
      icon: <GradeIcon />,
      color: '#9e9e9e',
      backgroundColor: 'rgba(158, 158, 158, 0.1)',
      borderColor: '#9e9e9e',
      label: 'Free',
      description: 'Basic features with limited usage'
    },
    casual: {
      icon: <StarIcon />,
      color: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      borderColor: '#2196f3',
      label: 'Casual',
      description: 'Enhanced features with recruiter access'
    },
    hunter: {
      icon: <PremiumIcon />,
      color: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderColor: '#ff9800',
      label: 'Hunter',
      description: 'Full AI-powered job hunting suite'
    }
  };

  const config = planConfig[planInfo.tier];
  
  const sizeConfig = {
    small: {
      height: 24,
      fontSize: '0.75rem',
      iconSize: '16px'
    },
    medium: {
      height: 32,
      fontSize: '0.875rem',
      iconSize: '18px'
    },
    large: {
      height: 40,
      fontSize: '1rem',
      iconSize: '20px'
    }
  };

  const currentSize = sizeConfig[size];

  // Create tooltip content
  const tooltipContent = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {config.label} Plan
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {config.description}
      </Typography>
      {subscription?.subscriptionStatus && (
        <Typography variant="caption" color="text.secondary">
          Status: {subscription.subscriptionStatus === 'active' ? 'Active' : subscription.subscriptionStatus}
        </Typography>
      )}
      {subscription?.subscriptionEndDate && planInfo.tier !== 'free' && (
        <Typography variant="caption" color="text.secondary" display="block">
          {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}: {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );

  const chipStyles = {
    height: currentSize.height,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    fontSize: currentSize.fontSize,
    fontWeight: 600,
    ...(variant === 'filled' ? {
      backgroundColor: config.backgroundColor,
      color: config.color,
      border: `1px solid ${config.borderColor}20`,
      '&:hover': onClick ? {
        backgroundColor: config.color,
        color: '#fff',
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 8px ${config.color}30`
      } : {}
    } : {
      backgroundColor: 'transparent',
      color: config.color,
      border: `1px solid ${config.borderColor}`,
      '&:hover': onClick ? {
        backgroundColor: config.backgroundColor,
        transform: 'translateY(-1px)',
        boxShadow: `0 2px 4px ${config.color}20`
      } : {}
    })
  };

  const iconElement = showIcon ? React.cloneElement(config.icon, {
    style: { 
      fontSize: currentSize.iconSize,
      marginRight: theme.spacing(0.5)
    }
  }) : null;

  const badge = (
    <Chip
      icon={iconElement}
      label={config.label}
      onClick={onClick}
      sx={chipStyles}
      variant={variant === 'outlined' ? 'outlined' : undefined}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip
        title={tooltipContent}
        arrow
        placement="bottom"
        sx={{
          '& .MuiTooltip-tooltip': {
            maxWidth: 280,
            padding: theme.spacing(1.5)
          }
        }}
      >
        <Box component="span">
          {badge}
        </Box>
      </Tooltip>
    );
  }

  return badge;
};

export default PlanBadge;