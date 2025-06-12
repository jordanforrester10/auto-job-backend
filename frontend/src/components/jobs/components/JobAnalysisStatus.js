// src/components/jobs/components/JobAnalysisStatus.js
import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  CircularProgress,
  Tooltip,
  Alert
} from '@mui/material';
import {
  HourglassEmpty as HourglassEmptyIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';

const JobAnalysisStatus = ({ 
  analysisStatus, 
  size = 'normal', // 'small', 'normal', 'large'
  variant = 'full', // 'full', 'chip', 'progress-only'
  showDetails = true 
}) => {
  if (!analysisStatus) {
    return null;
  }

  const { status, progress, message, skillsFound, experienceLevel } = analysisStatus;

  // Status configuration
  const statusConfig = {
    pending: {
      label: 'Analysis Queued',
      color: 'info',
      icon: HourglassEmptyIcon,
      bgColor: 'rgba(2, 136, 209, 0.1)',
      textColor: '#0288d1'
    },
    analyzing: {
      label: 'Analyzing Job',
      color: 'primary',
      icon: AutoAwesomeIcon,
      bgColor: 'rgba(26, 115, 232, 0.1)',
      textColor: '#1a73e8'
    },
    completed: {
      label: 'Analysis Complete',
      color: 'success',
      icon: CheckCircleIcon,
      bgColor: 'rgba(52, 168, 83, 0.1)',
      textColor: '#34a853'
    },
    error: {
      label: 'Analysis Failed',
      color: 'error',
      icon: ErrorIcon,
      bgColor: 'rgba(234, 67, 53, 0.1)',
      textColor: '#ea4335'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 16,
      chipHeight: 24,
      typography: 'caption',
      progressHeight: 4
    },
    normal: {
      iconSize: 20,
      chipHeight: 28,
      typography: 'body2',
      progressHeight: 6
    },
    large: {
      iconSize: 24,
      chipHeight: 32,
      typography: 'body1',
      progressHeight: 8
    }
  };

  const currentSize = sizeConfig[size];

  // Render chip variant
  if (variant === 'chip') {
    return (
      <Chip
        icon={
          status === 'analyzing' ? (
            <CircularProgress 
              size={currentSize.iconSize} 
              thickness={6} 
              color={config.color}
            />
          ) : (
            <IconComponent 
              sx={{ 
                fontSize: `${currentSize.iconSize}px !important`,
                color: config.textColor 
              }} 
            />
          )
        }
        label={config.label}
        size={size}
        sx={{
          height: currentSize.chipHeight,
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: `1px solid ${config.textColor}`,
          fontWeight: 500,
          '& .MuiChip-icon': {
            color: `${config.textColor} !important`
          }
        }}
      />
    );
  }

  // Render progress only
  if (variant === 'progress-only') {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={config.color}
          sx={{
            height: currentSize.progressHeight,
            borderRadius: currentSize.progressHeight / 2,
            backgroundColor: config.bgColor,
            '& .MuiLinearProgress-bar': {
              borderRadius: currentSize.progressHeight / 2,
            }
          }}
        />
        {showDetails && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant={currentSize.typography} color="text.secondary">
              {message}
            </Typography>
            <Typography variant={currentSize.typography} color="text.secondary">
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Render full variant
  return (
    <Box
      sx={{
        p: size === 'small' ? 1.5 : 2,
        borderRadius: 2,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.textColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}
    >
      {/* Status Icon */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {status === 'analyzing' ? (
          <CircularProgress 
            size={currentSize.iconSize} 
            thickness={6} 
            color={config.color}
          />
        ) : (
          <IconComponent 
            sx={{ 
              fontSize: currentSize.iconSize,
              color: config.textColor 
            }} 
          />
        )}
      </Box>

      {/* Status Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography 
            variant={currentSize.typography} 
            fontWeight={600}
            color={config.textColor}
            noWrap
          >
            {config.label}
          </Typography>
          
          {/* AI Badge for analyzing status */}
          {status === 'analyzing' && (
            <Chip
              icon={<SmartToyIcon sx={{ fontSize: '14px !important' }} />}
              label="AI"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.7rem',
                backgroundColor: config.textColor,
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white !important'
                }
              }}
            />
          )}
        </Box>

        {/* Progress Bar for non-completed status */}
        {status !== 'completed' && status !== 'error' && (
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={config.color}
              sx={{
                height: currentSize.progressHeight,
                borderRadius: currentSize.progressHeight / 2,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: currentSize.progressHeight / 2,
                }
              }}
            />
          </Box>
        )}

        {/* Status Message */}
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color={config.textColor}
          sx={{ opacity: 0.9 }}
        >
          {message}
        </Typography>

        {/* Success Details */}
        {status === 'completed' && showDetails && skillsFound !== undefined && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${skillsFound} skills found`}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                borderColor: config.textColor,
                color: config.textColor
              }}
            />
            {experienceLevel && (
              <Chip
                label={`${experienceLevel} level`}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  borderColor: config.textColor,
                  color: config.textColor
                }}
              />
            )}
          </Box>
        )}

        {/* Error Details */}
        {status === 'error' && showDetails && (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 1, 
              py: 0.5,
              fontSize: '0.75rem',
              '& .MuiAlert-icon': {
                fontSize: '1rem'
              }
            }}
          >
            Analysis failed. You can still view the job, but some features may be limited.
          </Alert>
        )}
      </Box>

      {/* Progress Percentage */}
      {(status === 'analyzing' || status === 'pending') && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          fontWeight={600}
          color={config.textColor}
        >
          {progress}%
        </Typography>
      )}
    </Box>
  );
};

export default JobAnalysisStatus;