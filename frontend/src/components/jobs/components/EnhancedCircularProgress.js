// src/components/jobs/components/EnhancedCircularProgress.js
import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';

export const EnhancedCircularProgress = ({ value, size = 120 }) => {
  const theme = useTheme();
  
  const getColor = (score) => {
    if (score >= 85) return theme.palette.success.main;
    if (score >= 70) return theme.palette.info.main;
    if (score >= 55) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getQualityLabel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    return 'Needs Work';
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {/* Background circle */}
        <CircularProgress
          variant="determinate"
          size={size}
          thickness={6}
          value={100}
          sx={{ 
            color: getColor(value),
            opacity: 0.1,
            position: 'absolute'
          }}
        />
        {/* Progress circle */}
        <CircularProgress
          variant="determinate"
          size={size}
          thickness={6}
          value={value}
          sx={{ 
            color: getColor(value),
            transition: 'all 0.3s ease',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}
        >
          <Typography variant="h3" component="div" fontWeight="bold" color={getColor(value)}>
            {Math.round(value)}%
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {getQualityLabel(value)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};