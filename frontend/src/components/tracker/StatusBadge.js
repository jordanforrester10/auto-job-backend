// frontend/src/components/tracker/StatusBadge.js - Reusable status badge component
import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  FiberManualRecord as DotIcon,
  TrendingFlat as ArrowIcon
} from '@mui/icons-material';
import trackerService from '../../utils/trackerService';

const StatusBadge = ({
  status,
  size = 'medium',
  showProgress = false,
  showTooltip = true,
  variant = 'filled',
  onClick,
  disabled = false,
  className
}) => {
  const theme = useTheme();
  const statusInfo = trackerService.getStatusInfo(status);

  // Status progression mapping
  const statusProgression = {
    interested: { order: 1, label: 'Interested', next: 'applied' },
    applied: { order: 2, label: 'Applied', next: 'interviewing' },
    interviewing: { order: 3, label: 'Interviewing', next: 'closed' },
    closed: { order: 4, label: 'Closed', next: null }
  };

  const currentStatus = statusProgression[status] || statusProgression.interested;
  const progressPercentage = (currentStatus.order / 4) * 100;

  // Status descriptions for tooltips
  const statusDescriptions = {
    interested: 'Job has caught your attention and you\'re considering applying',
    applied: 'Application has been submitted and is under review',
    interviewing: 'In the interview process - phone screens, technical interviews, etc.',
    closed: 'Application process completed - hired, rejected, or withdrawn'
  };

  // Size configurations
  const sizeConfig = {
    small: {
      height: 20,
      fontSize: '0.7rem',
      iconSize: '0.8rem',
      progressHeight: 2
    },
    medium: {
      height: 24,
      fontSize: '0.8rem',
      iconSize: '1rem',
      progressHeight: 3
    },
    large: {
      height: 32,
      fontSize: '0.9rem',
      iconSize: '1.2rem',
      progressHeight: 4
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Render progress indicator
  const renderProgress = () => {
    if (!showProgress) return null;

    return (
      <Box sx={{ width: '100%', mt: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: config.progressHeight,
            borderRadius: 1,
            backgroundColor: alpha(statusInfo.bgColor, 0.2),
            '& .MuiLinearProgress-bar': {
              backgroundColor: statusInfo.bgColor,
              borderRadius: 1
            }
          }}
        />
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 0.5,
          fontSize: '0.6rem',
          color: 'text.secondary'
        }}>
          <span>Start</span>
          <span>Complete</span>
        </Box>
      </Box>
    );
  };

  // Render status flow indicator
  const renderStatusFlow = () => {
    const statuses = ['interested', 'applied', 'interviewing', 'closed'];
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        {statuses.map((statusKey, index) => {
          const isActive = statusKey === status;
          const isPassed = statusProgression[statusKey].order <= currentStatus.order;
          const statusColor = trackerService.getStatusInfo(statusKey).bgColor;
          
          return (
            <React.Fragment key={statusKey}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  opacity: isPassed ? 1 : 0.3
                }}
              >
                <DotIcon
                  sx={{
                    fontSize: '0.8rem',
                    color: isActive ? statusColor : (isPassed ? statusColor : 'text.disabled')
                  }}
                />
                <Box
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? statusColor : 'text.secondary'
                  }}
                >
                  {statusProgression[statusKey].label}
                </Box>
              </Box>
              {index < statuses.length - 1 && (
                <ArrowIcon
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    mx: 0.5
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  // Main badge component
  const badge = (
    <Chip
      label={statusInfo.label}
      size={size === 'large' ? 'medium' : 'small'}
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={className}
      sx={{
        height: config.height,
        fontSize: config.fontSize,
        fontWeight: 600,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        ...(variant === 'filled' && {
          backgroundColor: statusInfo.bgColor,
          color: statusInfo.textColor,
          '&:hover': onClick && !disabled ? {
            backgroundColor: alpha(statusInfo.bgColor, 0.8),
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[2]
          } : {},
          '&.Mui-disabled': {
            backgroundColor: alpha(statusInfo.bgColor, 0.5),
            color: alpha(statusInfo.textColor, 0.7)
          }
        }),
        ...(variant === 'outlined' && {
          borderColor: statusInfo.bgColor,
          color: statusInfo.bgColor,
          backgroundColor: 'transparent',
          '&:hover': onClick && !disabled ? {
            backgroundColor: alpha(statusInfo.bgColor, 0.1),
            borderColor: statusInfo.bgColor,
            transform: 'translateY(-1px)'
          } : {},
          '&.Mui-disabled': {
            borderColor: alpha(statusInfo.bgColor, 0.5),
            color: alpha(statusInfo.bgColor, 0.5)
          }
        }),
        transition: 'all 0.2s ease-in-out'
      }}
      icon={
        <DotIcon
          sx={{
            fontSize: config.iconSize,
            color: variant === 'filled' ? statusInfo.textColor : statusInfo.bgColor
          }}
        />
      }
    />
  );

  // Tooltip content
  const tooltipContent = showTooltip ? (
    <Box sx={{ maxWidth: 300 }}>
      <Box sx={{ fontWeight: 600, mb: 1 }}>
        {statusInfo.label} Status
      </Box>
      <Box sx={{ mb: 2, fontSize: '0.9rem' }}>
        {statusDescriptions[status]}
      </Box>
      {showProgress && renderStatusFlow()}
      {showProgress && renderProgress()}
    </Box>
  ) : '';

  if (showTooltip) {
    return (
      <Tooltip
        title={tooltipContent}
        placement="top"
        arrow
        enterDelay={500}
        leaveDelay={200}
      >
        <span>{badge}</span>
      </Tooltip>
    );
  }

  return badge;
};

// Status badge with progress indicator
export const StatusBadgeWithProgress = (props) => (
  <StatusBadge {...props} showProgress={true} />
);

// Clickable status badge for updates
export const ClickableStatusBadge = (props) => (
  <StatusBadge
    {...props}
    onClick={props.onClick}
    sx={{
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: (theme) => theme.shadows[2]
      }
    }}
  />
);

// Status comparison component
export const StatusComparison = ({ fromStatus, toStatus, size = 'small' }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <StatusBadge status={fromStatus} size={size} showTooltip={false} />
      <ArrowIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
      <StatusBadge status={toStatus} size={size} showTooltip={false} />
    </Box>
  );
};

export default StatusBadge;
