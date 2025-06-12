// src/components/resumes/utils/resumeHelpers.js
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import { ArrowUpward as ArrowUpwardIcon } from '@mui/icons-material';

/**
 * Renders an improved snippet component showing before/after text
 * @param {object} snippet - Snippet object with original and improved text
 * @param {object} theme - MUI theme object
 * @returns {JSX.Element} Rendered snippet card
 */
export const renderImprovedSnippet = (snippet, theme) => {
  return (
    <Card variant="outlined" sx={{ mb: 2, overflow: 'visible', borderRadius: 2 }} key={snippet.original}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: 'rgba(239, 83, 80, 0.1)', 
            color: 'text.primary', 
            p: 2, 
            borderRadius: 2,
            position: 'relative',
            border: '1px solid rgba(239, 83, 80, 0.3)'
          }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {snippet.original}
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            py: 1 
          }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <ArrowUpwardIcon />
            </Avatar>
          </Box>
          <Box sx={{ 
            backgroundColor: 'rgba(76, 175, 80, 0.1)', 
            color: 'text.primary', 
            p: 2, 
            borderRadius: 2,
            border: '1px solid rgba(76, 175, 80, 0.3)'
          }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {snippet.improved}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Gets color based on score value
 * @param {number} value - Score value (0-100)
 * @param {object} theme - MUI theme object
 * @returns {string} Color value
 */
export const getScoreColor = (value, theme) => {
  if (value >= 80) return theme.palette.success.main;
  if (value >= 60) return theme.palette.warning.main;
  return theme.palette.error.main;
};

/**
 * Formats date range for display
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    return `${new Date(startDate).toLocaleDateString()} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`;
  } else if (startDate) {
    return `From ${new Date(startDate).toLocaleDateString()}`;
  } else if (endDate) {
    return `Until ${new Date(endDate).toLocaleDateString()}`;
  }
  return 'Date not specified';
};