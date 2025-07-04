// src/components/resumes/components/AiEditingToolbar.js - WITH SUBSCRIPTION GATING
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Chat as ChatIcon,
  AutoFixHigh as AutoFixHighIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useUpgrade } from '../../../hooks/useUpgrade';
import UpgradePrompt from '../../subscription/shared/UpgradePrompt';

/**
 * AI editing toolbar component with subscription gating
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
  const { hasFeatureAccess, planInfo } = useSubscription();
  const { upgradePrompt, closeUpgradePrompt, preActionCheck } = useUpgrade();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Check if user has AI assistant access
  const hasAiAssistantAccess = hasFeatureAccess('aiAssistant');
  
  // Ensure progress percentage is valid for MUI LinearProgress
  const validProgressPercentage = Math.max(0, Math.min(100, progressPercentage || 0));

  // Handle AI actions with subscription check
  const handleAiAction = async (action, type) => {
    if (!hasAiAssistantAccess) {
      setShowUpgradePrompt(true);
      return;
    }

    // Proceed with the action for Hunter users
    if (type === 'chat') {
      onOpenChat();
    } else if (type === 'quickAction') {
      onQuickAction(action);
    }
  };

  // Get plan-specific messaging
  const getPlanMessage = () => {
    if (planInfo?.tier === 'free') {
      return 'Upgrade to Hunter to unlock AI-powered resume optimization';
    } else if (planInfo?.tier === 'casual') {
      return 'Upgrade to Hunter to access AJ, your personal AI job assistant';
    }
    return 'AI-powered resume optimization available';
  };

  // Get tooltip message for locked features
  const getTooltipMessage = () => {
    if (planInfo?.tier === 'free') {
      return 'AI Assistant is a Hunter plan feature. Upgrade to unlock AI-powered resume optimization and career guidance.';
    } else if (planInfo?.tier === 'casual') {
      return 'AI Assistant is a Hunter plan feature. Upgrade to unlock AJ, your personal AI job assistant with unlimited conversations.';
    }
    return '';
  };

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 3,
          background: hasAiAssistantAccess 
            ? `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.secondary.main}10 100%)`
            : `linear-gradient(135deg, ${theme.palette.grey[200]} 0%, ${theme.palette.grey[300]} 100%)`,
          border: hasAiAssistantAccess 
            ? `1px solid ${theme.palette.primary.main}30`
            : `1px solid ${theme.palette.grey[400]}`,
          position: 'relative',
          opacity: hasAiAssistantAccess ? 1 : 0.7
        }}
      >
        {/* Lock overlay for non-Hunter users */}
        {!hasAiAssistantAccess && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1
            }}
          >
            <Tooltip title={getTooltipMessage()} placement="top">
              <IconButton 
                size="small"
                sx={{ 
                  bgcolor: theme.palette.warning.main,
                  color: 'white',
                  '&:hover': { bgcolor: theme.palette.warning.dark },
                  width: 32,
                  height: 32
                }}
              >
                <LockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoJobLogo variant="icon-only" size="small" />
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
            AI Job Assistant
          </Typography>
          <Chip 
            label={hasAiAssistantAccess ? "Powered by AJ" : "Hunter Feature"} 
            size="small" 
            color={hasAiAssistantAccess ? "primary" : "default"}
            sx={{ ml: 2 }}
          />
          {!hasAiAssistantAccess && (
            <Chip 
              label="Upgrade Required" 
              size="small" 
              color="warning"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        {/* Progress bar - only show for Hunter users when processing */}
        {hasAiAssistantAccess && aiProcessing && (
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
            <Typography 
              variant="body2" 
              color={hasAiAssistantAccess ? "text.secondary" : "text.disabled"}
            >
              {getPlanMessage()}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            {hasAiAssistantAccess ? (
              // Hunter users - show functional buttons
              <ButtonGroup variant="contained" fullWidth>
                <Button
                  startIcon={<ChatIcon />}
                  onClick={() => handleAiAction('chat', 'chat')}
                  disabled={aiProcessing}
                  sx={{ flexGrow: 1 }}
                >
                  Edit with AJ
                </Button>
                <Button
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => handleAiAction('Auto-Fix for ATS', 'quickAction')}
                  disabled={aiProcessing}
                  color="secondary"
                >
                  Auto-Fix for ATS
                </Button>
              </ButtonGroup>
            ) : (
              // Free/Casual users - show locked buttons with upgrade prompt
              <ButtonGroup variant="outlined" fullWidth>
                <Tooltip title={getTooltipMessage()} placement="top">
                  <span style={{ width: '100%' }}>
                    <Button
                      startIcon={<LockIcon />}
                      onClick={() => setShowUpgradePrompt(true)}
                      disabled={false}
                      sx={{ 
                        flexGrow: 1,
                        color: theme.palette.text.disabled,
                        borderColor: theme.palette.grey[300],
                        '&:hover': {
                          borderColor: theme.palette.warning.main,
                          color: theme.palette.warning.main
                        }
                      }}
                    >
                      Edit with AJ
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={getTooltipMessage()} placement="top">
                  <span>
                    <Button
                      startIcon={<UpgradeIcon />}
                      onClick={() => setShowUpgradePrompt(true)}
                      color="warning"
                      variant="contained"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      Upgrade
                    </Button>
                  </span>
                </Tooltip>
              </ButtonGroup>
            )}
          </Grid>
        </Grid>


      </Paper>

      {/* Upgrade Prompt Dialog */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="aiAssistant"
        title="AI Assistant Access Required"
        description="Unlock AJ, your personal AI job assistant with unlimited conversations and advanced resume optimization."
        currentPlan={planInfo?.tier}
      />

      {/* Global upgrade prompt from useUpgrade hook */}
      <UpgradePrompt
        open={upgradePrompt.open}
        onClose={closeUpgradePrompt}
        feature={upgradePrompt.feature}
        title={upgradePrompt.title}
        description={upgradePrompt.description}
        currentPlan={planInfo?.tier}
      />
    </>
  );
};

export default AiEditingToolbar;