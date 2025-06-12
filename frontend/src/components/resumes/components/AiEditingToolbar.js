// src/components/resumes/components/AiEditingToolbar.js - FIXED PROGRESS DISPLAY
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  Chat as ChatIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';

/**
 * AI editing toolbar component with enhanced progress tracking
 * @param {object} props - Component props
 * @param {object} props.resume - Resume data
 * @param {function} props.onQuickAction - Quick action handler
 * @param {function} props.onOpenChat - Open chat handler
 * @param {boolean} props.aiProcessing - AI processing state
 * @param {string} props.progressStage - Current progress stage message
 * @param {number} props.progressPercentage - Progress percentage (0-100)
 * @returns {JSX.Element} AI editing toolbar component
 */
const AiEditingToolbar = ({ 
  resume, 
  onQuickAction, 
  onOpenChat, 
  aiProcessing, 
  progressStage, 
  progressPercentage 
}) => {
  const theme = useTheme();
  
  // Ensure progress percentage is valid for MUI LinearProgress
  const validProgressPercentage = Math.max(0, Math.min(100, progressPercentage || 0));

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 3,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.secondary.main}10 100%)`,
        border: `1px solid ${theme.palette.primary.main}30`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AutoJobLogo variant="icon-only" size="small" />
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
          AI Job Assistant
        </Typography>
        <Chip 
          label="Powered by AJ" 
          size="small" 
          color="primary" 
          sx={{ ml: 2 }}
        />
      </Box>

      {aiProcessing && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={validProgressPercentage} 
            sx={{ 
              borderRadius: 1,
              height: 8,
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
              }
            }} 
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontWeight: 500,
                maxWidth: '75%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {progressStage || 'AJ is improving your resume...'}
            </Typography>
            <Typography variant="caption" color="primary" fontWeight="medium">
              {Math.round(validProgressPercentage)}%
            </Typography>
          </Box>
        </Box>
      )}

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="body2" color="text.secondary">
            Let AJ analyze and optimize your resume for better ATS compatibility and job matching.
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ButtonGroup variant="contained" fullWidth>
            <Button
              startIcon={<ChatIcon />}
              onClick={onOpenChat}
              disabled={aiProcessing}
              sx={{ flexGrow: 1 }}
            >
              Edit with AJ
            </Button>
            <Button
              startIcon={<AutoFixHighIcon />}
              onClick={() => onQuickAction('Auto-Fix for ATS')}
              disabled={aiProcessing}
              color="secondary"
            >
              Auto-Fix for ATS
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AiEditingToolbar;