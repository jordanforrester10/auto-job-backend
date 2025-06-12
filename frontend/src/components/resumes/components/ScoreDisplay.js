// src/components/resumes/components/ScoreDisplay.js
import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import { getScoreColor } from '../utils/resumeHelpers';

/**
 * Circular progress score display component
 * @param {object} props - Component props
 * @param {number} props.value - Score value (0-100)
 * @param {string} props.label - Score label
 * @param {number} props.size - Circle size in pixels
 * @returns {JSX.Element} Score display component
 */
const ScoreDisplay = ({ value, label, size = 100 }) => {
  const theme = useTheme();
  const color = getScoreColor(value, theme);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        size={size}
        thickness={5}
        value={100}
        sx={{ color: color, opacity: 0.2, position: 'absolute' }}
      />
      <CircularProgress
        variant="determinate"
        size={size}
        thickness={5}
        value={value}
        sx={{ color: color }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h4" fontWeight="bold" color={color}>
          {Math.round(value)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

export default ScoreDisplay;