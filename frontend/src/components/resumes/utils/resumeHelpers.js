// src/components/resumes/utils/resumeHelpers.js - ENHANCED WITH BULLET POINT UTILITIES
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  ArrowUpward as ArrowUpwardIcon,
  CheckCircle as CheckCircleIcon,
  FiberManualRecord as BulletIcon
} from '@mui/icons-material';

/**
 * Enhanced bullet point extraction from text with multiple patterns
 * @param {string} text - Text that may contain bullet points
 * @returns {Array} Array of extracted bullet points
 */
export const extractBulletPointsFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const bulletPoints = [];

  for (const line of lines) {
    // Enhanced bullet point patterns
    const bulletPatterns = [
      /^[-−–—]\s+(.+)$/,           // Dash variations (most common)
      /^[•·▪▫◦‣⁃]\s+(.+)$/,        // Bullet symbols
      /^\*\s+(.+)$/,               // Asterisk
      /^>\s+(.+)$/,                // Greater than
      /^→\s+(.+)$/,                // Arrow
      /^[\d]+\.\s+(.+)$/,          // Numbered list (1., 2., etc.)
      /^[a-zA-Z]\.\s+(.+)$/,       // Lettered list (a., b., etc.)
      /^[IVX]+\.\s+(.+)$/,         // Roman numerals
    ];

    for (const pattern of bulletPatterns) {
      const match = line.match(pattern);
      if (match && match[1].trim().length > 5) { // Minimum meaningful length
        bulletPoints.push(match[1].trim());
        break; // Stop checking other patterns for this line
      }
    }
  }

  return bulletPoints;
};

/**
 * Clean description text by removing bullet points that were extracted
 * @param {string} text - Original text
 * @param {Array} extractedBullets - Bullet points that were extracted
 * @returns {string} Cleaned description text
 */
export const cleanDescriptionText = (text, extractedBullets = []) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const nonBulletLines = [];

  for (const line of lines) {
    // Check if this line was extracted as a bullet point
    const isBulletLine = extractedBullets.some(bullet => 
      line.includes(bullet) || bullet.includes(line.replace(/^[-•*>→\d+\.\s]+/, '').trim())
    );

    // If not a bullet line and doesn't start with bullet patterns, keep it
    if (!isBulletLine && !line.match(/^[-•*>→\d+\.\s]/)) {
      nonBulletLines.push(line);
    }
  }

  return nonBulletLines.join(' ').trim();
};

/**
 * Smart bullet point renderer that handles various formats
 * @param {Array} bulletPoints - Array of bullet point strings
 * @param {object} theme - MUI theme object
 * @param {string} sectionType - Type of section ('experience', 'education', etc.)
 * @returns {JSX.Element} Rendered bullet points
 */
export const renderSmartBulletPoints = (bulletPoints, theme, sectionType = 'experience') => {
  if (!bulletPoints || !Array.isArray(bulletPoints) || bulletPoints.length === 0) {
    return null;
  }

  const getSectionTitle = (type) => {
    switch (type) {
      case 'experience':
        return 'Key Achievements:';
      case 'education':
        return 'Highlights:';
      case 'projects':
        return 'Project Details:';
      default:
        return 'Details:';
    }
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="body2" fontWeight="bold" color="primary" gutterBottom>
        {getSectionTitle(sectionType)}
      </Typography>
      <List dense sx={{ pl: 1 }}>
        {bulletPoints.map((point, idx) => (
          <ListItem key={idx} sx={{ px: 0, py: 0.5, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary={point} 
              sx={{ 
                '& .MuiListItemText-primary': { 
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  color: theme.palette.text.primary
                } 
              }} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

/**
 * Detect if text contains bullet points
 * @param {string} text - Text to analyze
 * @returns {boolean} True if text contains bullet points
 */
export const containsBulletPoints = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const bulletPatterns = [
    /^[-−–—]\s+/m,           // Dash variations
    /^[•·▪▫◦‣⁃]\s+/m,        // Bullet symbols
    /^\*\s+/m,               // Asterisk
    /^>\s+/m,                // Greater than
    /^→\s+/m,                // Arrow
    /^[\d]+\.\s+/m,          // Numbered list
  ];

  return bulletPatterns.some(pattern => pattern.test(text));
};

/**
 * Enhanced improved snippet renderer showing before/after text with better bullet point handling
 * @param {object} snippet - Snippet object with original and improved text
 * @param {object} theme - MUI theme object
 * @returns {JSX.Element} Rendered snippet card
 */
export const renderImprovedSnippet = (snippet, theme) => {
  const originalBullets = extractBulletPointsFromText(snippet.original);
  const improvedBullets = extractBulletPointsFromText(snippet.improved);

  return (
    <Card variant="outlined" sx={{ mb: 2, overflow: 'visible', borderRadius: 2 }} key={snippet.original}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          {/* Original Content */}
          <Box sx={{ 
            backgroundColor: 'rgba(239, 83, 80, 0.1)', 
            color: 'text.primary', 
            p: 2, 
            borderRadius: 2,
            position: 'relative',
            border: '1px solid rgba(239, 83, 80, 0.3)'
          }}>
            <Typography variant="body2" fontWeight="bold" color="error.main" gutterBottom>
              Original:
            </Typography>
            {originalBullets.length > 0 ? (
              <List dense>
                {originalBullets.map((bullet, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <BulletIcon fontSize="small" sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={bullet}
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {snippet.original}
              </Typography>
            )}
          </Box>

          {/* Arrow */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            py: 1 
          }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <ArrowUpwardIcon />
            </Avatar>
          </Box>

          {/* Improved Content */}
          <Box sx={{ 
            backgroundColor: 'rgba(76, 175, 80, 0.1)', 
            color: 'text.primary', 
            p: 2, 
            borderRadius: 2,
            border: '1px solid rgba(76, 175, 80, 0.3)'
          }}>
            <Typography variant="body2" fontWeight="bold" color="success.main" gutterBottom>
              Improved:
            </Typography>
            {improvedBullets.length > 0 ? (
              <List dense>
                {improvedBullets.map((bullet, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={bullet}
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {snippet.improved}
              </Typography>
            )}
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

/**
 * Parse and format resume content with enhanced bullet point handling
 * @param {object} resumeData - Parsed resume data
 * @returns {object} Enhanced resume data with better bullet point structure
 */
export const enhanceResumeDataForDisplay = (resumeData) => {
  if (!resumeData) return resumeData;

  // Enhance experience data
  if (resumeData.experience && Array.isArray(resumeData.experience)) {
    resumeData.experience = resumeData.experience.map(exp => {
      if (!exp.highlights || exp.highlights.length === 0) {
        const extractedBullets = extractBulletPointsFromText(exp.description);
        if (extractedBullets.length > 0) {
          return {
            ...exp,
            highlights: extractedBullets,
            description: cleanDescriptionText(exp.description, extractedBullets)
          };
        }
      }
      return exp;
    });
  }

  // Enhance education data
  if (resumeData.education && Array.isArray(resumeData.education)) {
    resumeData.education = resumeData.education.map(edu => {
      if (!edu.highlights || edu.highlights.length === 0) {
        const extractedBullets = extractBulletPointsFromText(edu.description);
        if (extractedBullets.length > 0) {
          return {
            ...edu,
            highlights: extractedBullets,
            description: cleanDescriptionText(edu.description, extractedBullets)
          };
        }
      }
      return edu;
    });
  }

  return resumeData;
};