// src/components/common/AutoJobLogo.js - FIXED VERSION
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * Shared logo component for auto-job.ai
 * Can be used across the application with different variants and sizes
 */
const AutoJobLogo = ({ 
  variant = 'horizontal', // 'horizontal', 'stacked', 'icon-only'
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  showTagline = true,
  customTagline = null,
  color = 'primary', // 'primary', 'white', 'gradient'
  className = '',
  onClick = null,
  sx = {}
}) => {
  const theme = useTheme();

  // Size configurations
  const sizeConfig = {
    small: {
      icon: 32,
      logoText: '1.25rem',
      taglineText: '0.75rem',
      gap: 1
    },
    medium: {
      icon: 48,
      logoText: '1.75rem',
      taglineText: '0.875rem',
      gap: 1.5
    },
    large: {
      icon: 64,
      logoText: '2.25rem',
      taglineText: '1rem',
      gap: 2
    },
    xlarge: {
      icon: 80,
      logoText: '2.75rem',
      taglineText: '1.125rem',
      gap: 2.5
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Color configurations - FIXED: Now properly handles theme functions
  const getColorConfig = () => {
    switch (color) {
      case 'primary':
        return {
          logoText: theme.palette.primary.main,
          taglineText: theme.palette.text.secondary,
          robotFill: '#e3f2fd',
          robotStroke: theme.palette.primary.main,
          antennaColor: theme.palette.success.main,
          eyeColor: theme.palette.primary.main,
          mouthColor: theme.palette.success.main,
          sidePanelColor: theme.palette.warning.main
        };
      case 'white':
        return {
          logoText: '#ffffff',
          taglineText: 'rgba(255, 255, 255, 0.8)',
          robotFill: 'rgba(255, 255, 255, 0.9)',
          robotStroke: '#ffffff',
          antennaColor: '#4caf50',
          eyeColor: '#2196f3',
          mouthColor: '#4caf50',
          sidePanelColor: '#ff9800'
        };
      case 'gradient':
        return {
          logoText: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #34a853 100%)',
          taglineText: theme.palette.text.secondary,
          robotFill: '#e3f2fd',
          robotStroke: '#1a73e8',
          antennaColor: '#34a853',
          eyeColor: '#1a73e8',
          mouthColor: '#34a853',
          sidePanelColor: '#fbbc04'
        };
      default:
        return {
          logoText: theme.palette.primary.main,
          taglineText: theme.palette.text.secondary,
          robotFill: '#e3f2fd',
          robotStroke: theme.palette.primary.main,
          antennaColor: theme.palette.success.main,
          eyeColor: theme.palette.primary.main,
          mouthColor: theme.palette.success.main,
          sidePanelColor: theme.palette.warning.main
        };
    }
  };

  const colors = getColorConfig();

  // Robot SVG Component
  const RobotIcon = () => (
    <svg 
      width={config.icon} 
      height={config.icon} 
      viewBox="0 0 64 64" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Robot Head Background */}
      <rect 
        x="8" 
        y="12" 
        width="48" 
        height="40" 
        rx="8" 
        ry="8" 
        fill={colors.robotFill}
        stroke={colors.robotStroke}
        strokeWidth="2"
      />
      
      {/* Antenna */}
      <circle 
        cx="32" 
        cy="8" 
        r="2" 
        fill={colors.antennaColor}
      />
      <line 
        x1="32" 
        y1="10" 
        x2="32" 
        y2="12" 
        stroke={colors.antennaColor}
        strokeWidth="2"
      />
      
      {/* Eyes */}
      <circle cx="22" cy="26" r="4" fill="#ffffff"/>
      <circle cx="42" cy="26" r="4" fill="#ffffff"/>
      <circle cx="22" cy="26" r="2" fill={colors.eyeColor}/>
      <circle cx="42" cy="26" r="2" fill={colors.eyeColor}/>
      
      {/* Mouth */}
      <rect 
        x="26" 
        y="36" 
        width="12" 
        height="6" 
        rx="3" 
        ry="3" 
        fill={colors.mouthColor}
      />
      <rect x="28" y="38" width="2" height="2" fill="#ffffff"/>
      <rect x="32" y="38" width="2" height="2" fill="#ffffff"/>
      <rect x="36" y="38" width="2" height="2" fill="#ffffff"/>
      
      {/* Side panels */}
      <rect 
        x="4" 
        y="20" 
        width="6" 
        height="16" 
        rx="3" 
        ry="3" 
        fill={colors.sidePanelColor}
      />
      <rect 
        x="54" 
        y="20" 
        width="6" 
        height="16" 
        rx="3" 
        ry="3" 
        fill={colors.sidePanelColor}
      />
    </svg>
  );

  // Logo text styles - FIXED: Now properly handles gradient colors
  const logoTextStyle = {
    fontSize: config.logoText,
    fontWeight: 700,
    lineHeight: 1,
    ...(color === 'gradient' ? {
      background: colors.logoText,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    } : {
      color: colors.logoText
    })
  };

  const taglineTextStyle = {
    fontSize: config.taglineText,
    fontWeight: 500,
    color: colors.taglineText,
    mt: 0.5
  };

  // Default tagline
  const taglineText = customTagline || 'Secure interviews faster with AI agents';

  // Render based on variant
  const renderLogo = () => {
    switch (variant) {
      case 'stacked':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: config.gap / 2,
              cursor: onClick ? 'pointer' : 'default',
              ...sx
            }}
            className={className}
            onClick={onClick}
          >
            <RobotIcon />
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={logoTextStyle}>
                auto-job.ai
              </Typography>
              {showTagline && (
                <Typography sx={taglineTextStyle}>
                  {taglineText}
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 'icon-only':
        return (
          <Box
            sx={{
              display: 'inline-flex',
              cursor: onClick ? 'pointer' : 'default',
              ...sx
            }}
            className={className}
            onClick={onClick}
          >
            <RobotIcon />
          </Box>
        );

      case 'horizontal':
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: config.gap,
              cursor: onClick ? 'pointer' : 'default',
              ...sx
            }}
            className={className}
            onClick={onClick}
          >
            <RobotIcon />
            <Box>
              <Typography sx={logoTextStyle}>
                auto-job.ai
              </Typography>
              {showTagline && (
                <Typography sx={taglineTextStyle}>
                  {taglineText}
                </Typography>
              )}
            </Box>
          </Box>
        );
    }
  };

  return renderLogo();
};

export default AutoJobLogo;