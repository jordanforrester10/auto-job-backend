// src/components/jobs/tabs/SuggestedRecruitersTab.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

import jobService from '../../../utils/jobService';
import recruiterService from '../../../utils/recruiterService';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useUpgrade } from '../../../hooks/useUpgrade';
import AutoJobLogo from '../../common/AutoJobLogo';
import UpgradePrompt from '../../subscription/shared/UpgradePrompt';
import RecruiterDetails from '../../recruiters/RecruiterDetails';
import OutreachComposer from '../../recruiters/OutreachComposer';

// Import additional MUI components needed for RecruiterCard
import {
  Card,
  CardContent,
  Avatar,
  Rating,
  IconButton,
  Tooltip,
  Link,
  Badge
} from '@mui/material';
import {
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';

// RecruiterCard component - copied from RecruiterList.js to reuse subscription logic
const RecruiterCard = ({ recruiter, onViewDetails, onStartOutreach, onLoadMore, onUpgrade }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [localIsUnlocked, setLocalIsUnlocked] = useState(recruiter.isUnlocked || false);
  
  const {
    planInfo,
    hasFeatureAccess,
    canPerformAction,
    trackUsage,
    isFreePlan,
    isCasualPlan,
    isHunterPlan,
    usage,
    planLimits
  } = useSubscription();

  // Update local state when recruiter prop changes
  useEffect(() => {
    setLocalIsUnlocked(recruiter.isUnlocked || false);
  }, [recruiter.isUnlocked]);

  // Format recruiter data for display
  const formattedRecruiter = recruiterService.formatRecruiterForDisplay ? 
    recruiterService.formatRecruiterForDisplay(recruiter) : {
      displayName: `${recruiter.firstName} ${recruiter.lastName}`,
      companyDisplay: recruiter.company?.name || 'Company Not Available'
    };

  const handleStartOutreach = async () => {
    setIsLoading(true);
    try {
      await onStartOutreach(recruiter);
    } catch (error) {
      console.error('Failed to start outreach:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!isCasualPlan) return;
    
    // Check if user has enough unlock credits
    const permission = canPerformAction('recruiterUnlocks', 1);
    if (!permission.allowed) {
      // Show upgrade prompt when out of unlocks
      console.log('❌ No unlocks remaining - showing upgrade prompt');
      return;
    }

    try {
      setUnlocking(true);
      
      console.log('🔓 Unlocking recruiter from tile:', recruiter.id);
      
      // Call the unlock API directly
      const response = await recruiterService.unlockRecruiter(recruiter.id);
      
      if (response && response.success) {
        console.log('✅ Recruiter unlocked successfully from tile');
        
        // IMMEDIATELY update local state to show unlocked buttons
        setLocalIsUnlocked(true);
        
        console.log('🎉 Local tile state updated - recruiter now shows as unlocked');
      } else {
        console.error('❌ Unlock failed:', response);
        throw new Error(response?.message || 'Failed to unlock recruiter');
      }
      
    } catch (error) {
      console.error('Error unlocking recruiter:', error);
      // Reset local state if unlock failed
      setLocalIsUnlocked(false);
    } finally {
      setUnlocking(false);
    }
  };

  // Handle upgrade button click for free users
  const handleUpgradeClick = () => {
    console.log('🔄 Free user clicked upgrade button on recruiter card');
    if (onUpgrade) {
      onUpgrade('recruiterAccess', {
        recruiterId: recruiter.id,
        recruiterName: formattedRecruiter.displayName,
        context: 'recruiter_card'
      });
    }
  };

  const getContactStatusColor = (status) => {
    switch (status) {
      case 'replied':
        return 'success';
      case 'sent':
        return 'warning';
      case 'drafted':
        return 'info';
      default:
        return 'default';
    }
  };

  const getContactStatusText = (recruiter) => {
    if (recruiter.outreach?.hasContacted) {
      switch (recruiter.outreach.status) {
        case 'replied':
          return 'Replied';
        case 'sent':
          return 'Contacted';
        case 'drafted':
          return 'Draft Saved';
        default:
          return 'Contacted';
      }
    }
    return 'Not Contacted';
  };

  // Use different theme colors for avatar
  const getAvatarColor = (index) => {
    const colors = [
      theme.palette.secondary.main, // Teal
      theme.palette.warning.main,   // Orange
      theme.palette.success.main,   // Green
      theme.palette.info.main,      // Blue
      theme.palette.error.main      // Red
    ];
    // Use recruiter ID or name to consistently assign colors
    const colorIndex = (recruiter.id || recruiter.firstName?.charCodeAt(0) || 0) % colors.length;
    return colors[colorIndex];
  };

  // Get current usage for display
  const getRecruiterUnlocksUsage = () => {
    if (!usage || !planLimits) return { used: 0, limit: 0 };
    
    const used = usage.recruiterUnlocks?.used || 0;
    const limit = planLimits.recruiterUnlocks;
    
    return { used, limit };
  };

  // Check if recruiter is unlocked - use local state for immediate updates
  const isUnlocked = localIsUnlocked;
  
  console.log(`🔍 RecruiterCard render - ID: ${recruiter.id}, localIsUnlocked: ${localIsUnlocked}, plan: ${planInfo?.tier}`);

  // Determine card styling based on plan and unlock status
  const getCardStyling = () => {
    if (isFreePlan) {
      return {
        border: `1px solid ${theme.palette.grey[300]}`,
        backgroundColor: theme.palette.grey[50],
        opacity: 0.7
      };
    }
    
    if (isCasualPlan && !isUnlocked) {
      return {
        border: `1px solid ${theme.palette.warning.light}`,
        backgroundColor: `${theme.palette.warning.main}08`,
        opacity: 0.8
      };
    }
    
    return {
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: 'white',
      ...(recruiter.outreach?.hasContacted && {
        borderColor: theme.palette.success.light,
        backgroundColor: `${theme.palette.success.main}08`
      })
    };
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        borderRadius: 2,
        ...getCardStyling(),
        '&:hover': {
          elevation: 2,
          transform: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 'none' : 'translateY(-2px)',
          boxShadow: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 'none' : theme.shadows[4],
          borderColor: (isFreePlan || (isCasualPlan && !isUnlocked)) ? undefined : theme.palette.primary.light
        }
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Avatar and Basic Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          {/* Lock Overlay for Free/Casual Users */}
          {(isFreePlan || (isCasualPlan && !isUnlocked)) && (
            <Box sx={{ 
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2
            }}>
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: isFreePlan ? theme.palette.grey[600] : theme.palette.warning.main,
                fontSize: '0.875rem'
              }}>
                <LockIcon sx={{ fontSize: '1rem' }} />
              </Avatar>
            </Box>
          )}

          <Avatar
            sx={{
              width: 48,
              height: 48,
              mr: 2,
              bgcolor: getAvatarColor(),
              fontSize: '1.1rem',
              fontWeight: 'bold',
              opacity: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 0.6 : 1
            }}
          >
            {recruiter.firstName?.[0]}{recruiter.lastName?.[0]}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: theme.palette.text.primary,
                  opacity: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 0.7 : 1
                }}
              >
                {formattedRecruiter.displayName}
              </Typography>
              
              {recruiter.outreach?.hasContacted && isUnlocked && (
                <Tooltip title={`Status: ${getContactStatusText(recruiter)}`}>
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: 16, 
                      color: theme.palette.success.main
                    }} 
                  />
                </Tooltip>
              )}
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.primary.main, 
                fontWeight: 500, 
                mb: 0.5,
                opacity: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 0.7 : 1
              }}
            >
              {/* Show actual title for unlocked, generic for locked */}
              {(isHunterPlan || (isCasualPlan && isUnlocked)) ? recruiter.title : 'Senior Recruiter'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BusinessIcon sx={{ 
                fontSize: 16, 
                color: theme.palette.text.secondary,
                opacity: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 0.5 : 1
              }} />
              <Typography 
                variant="body2" 
                color="text.secondary" 
                noWrap
                sx={{ opacity: (isFreePlan || (isCasualPlan && !isUnlocked)) ? 0.7 : 1 }}
              >
                {/* Always show company name */}
                {formattedRecruiter.companyDisplay}
              </Typography>
            </Box>
          </Box>

          {/* Rating - Hidden for locked recruiters */}
          {recruiter.rating && (isHunterPlan || (isCasualPlan && isUnlocked)) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Rating
                value={recruiter.rating}
                readOnly
                size="small"
                precision={0.1}
              />
              <Typography variant="caption" color="text.secondary">
                {recruiter.rating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Industry and Specializations - Limited for locked recruiters */}
        <Box sx={{ mb: 2 }}>
          {(isHunterPlan || (isCasualPlan && isUnlocked)) ? (
            <>
              {recruiter.industry && (
                <Chip
                  label={recruiter.industry}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ mr: 1, mb: 1, borderRadius: 1 }}
                />
              )}
              {recruiter.specializations && recruiter.specializations.slice(0, 2).map((spec, index) => (
                <Chip
                  key={index}
                  label={spec}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1, borderRadius: 1 }}
                />
              ))}
            </>
          ) : (
            <Chip
              label="Technology"
              size="small"
              variant="outlined"
              color="primary"
              sx={{ mr: 1, mb: 1, borderRadius: 1, opacity: 0.6 }}
            />
          )}
        </Box>

        {/* Contact Status - Modified for locked state */}
        <Box sx={{ mb: 2 }}>
          {(isHunterPlan || (isCasualPlan && isUnlocked)) ? (
            <>
              <Chip
                label={getContactStatusText(recruiter)}
                size="small"
                color={getContactStatusColor(recruiter.outreach?.status)}
                variant={recruiter.outreach?.hasContacted ? 'filled' : 'outlined'}
                sx={{ fontWeight: 500, borderRadius: 1 }}
              />
              
              {recruiter.outreach?.lastContactDate && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Last contact: {new Date(recruiter.outreach.lastContactDate).toLocaleDateString()}
                </Typography>
              )}
            </>
          ) : (
            <Chip
              label={isFreePlan ? "Upgrade Required" : "Unlock Required"}
              size="small"
              color={isFreePlan ? "default" : "warning"}
              variant="outlined"
              sx={{ fontWeight: 500, borderRadius: 1, opacity: 0.8 }}
            />
          )}
        </Box>

        {/* Contact Information - Hidden for locked recruiters */}
        <Box sx={{ mb: 2, flex: 1 }}>
          {(isHunterPlan || (isCasualPlan && isUnlocked)) ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {recruiter.email && (
                <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                  <EmailIcon fontSize="small" />
                </IconButton>
              )}
              
              {recruiter.linkedinUrl && (
                <IconButton 
                  size="small" 
                  sx={{ color: theme.palette.primary.main }}
                  component={Link}
                  href={recruiter.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedInIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <IconButton size="small" sx={{ color: theme.palette.grey[400] }} disabled>
                <EmailIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: theme.palette.grey[400] }} disabled>
                <LinkedInIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Action Buttons - Different for each plan */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Free Plan - Upgrade Required */}
          {isFreePlan && (
            <>
              <Button
                variant="outlined"
                startIcon={<UpgradeIcon />}
                size="small"
                fullWidth
                onClick={handleUpgradeClick}
                sx={{ 
                  borderRadius: 2,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '08'
                  }
                }}
              >
                Upgrade Plan
              </Button>
            </>
          )}

          {/* Casual Plan - Unlock or Access */}
          {isCasualPlan && (
            <>
              {!isUnlocked ? (
                // Show unlock button
                <Button
                  variant="contained"
                  startIcon={unlocking ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />}
                  onClick={handleUnlock}
                  disabled={unlocking || (() => {
                    const { used, limit } = getRecruiterUnlocksUsage();
                    return (limit - used) <= 0;
                  })()}
                  size="small"
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    background: (() => {
                      const { used, limit } = getRecruiterUnlocksUsage();
                      const remaining = limit - used;
                      if (remaining <= 0) {
                        return theme.palette.grey[400];
                      }
                      return `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`;
                    })(),
                    color: '#ffffff !important',
                    fontWeight: 600,
                    '&:hover': {
                      background: (() => {
                        const { used, limit } = getRecruiterUnlocksUsage();
                        const remaining = limit - used;
                        if (remaining <= 0) {
                          return theme.palette.grey[400];
                        }
                        return `linear-gradient(45deg, ${theme.palette.warning.dark}, ${theme.palette.warning.main})`;
                      })()
                    },
                    '&:disabled': {
                      background: theme.palette.grey[300],
                      color: theme.palette.grey[500] + ' !important'
                    }
                  }}
                >
                  {(() => {
                    if (unlocking) return 'Unlocking...';
                    const { used, limit } = getRecruiterUnlocksUsage();
                    const remaining = limit - used;
                    if (remaining <= 0) return 'Upgrade Required';
                    return 'Unlock Recruiter';
                  })()}
                </Button>
              ) : (
                // Show normal buttons after unlock
                <>
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => onViewDetails(recruiter)}
                    size="small"
                    sx={{ 
                      flex: 1, 
                      borderRadius: 2,
                      '& .MuiButton-startIcon': {
                        margin: 0,
                        marginRight: '4px'
                      }
                    }}
                  >
                    View Details
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : 
                      <AutoJobLogo variant="icon-only" size="button" />
                    }
                    onClick={handleStartOutreach}
                    disabled={isLoading}
                    size="small"
                    color={recruiter.outreach?.hasContacted ? 'secondary' : 'primary'}
                    sx={{ 
                      flex: 1, 
                      borderRadius: 2,
                      '& .MuiButton-startIcon': {
                        margin: 0,
                        marginRight: '6px'
                      }
                    }}
                  >
                    {isLoading ? 'Loading...' : 'Contact Recruiter'}
                  </Button>
                </>
              )}
            </>
          )}

          {/* Hunter Plan - Full Access */}
          {isHunterPlan && (
            <>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => onViewDetails(recruiter)}
                size="small"
                sx={{ 
                  flex: 1, 
                  borderRadius: 2,
                  '& .MuiButton-startIcon': {
                    marginLeft: 0,
                    marginRight: '6px'
                  }
                }}
              >
                View Details
              </Button>
              
              <Button
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : 
                  <AutoJobLogo variant="icon-only" size="button" />
                }
                onClick={handleStartOutreach}
                disabled={isLoading}
                size="small"
                color={recruiter.outreach?.hasContacted ? 'secondary' : 'primary'}
                sx={{ 
                  flex: 1, 
                  borderRadius: 2,
                  '& .MuiButton-startIcon': {
                    margin: 0,
                    marginRight: '6px'
                  }
                }}
              >
                {isLoading ? 'Loading...' : 'Contact Recruiter'}
              </Button>
            </>
          )}
        </Box>

        {/* Usage indicator for Casual users */}
        {isCasualPlan && !isUnlocked && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {(() => {
                const { used, limit } = getRecruiterUnlocksUsage();
                const remaining = limit - used;
                if (remaining <= 0) {
                  return (
                    <Box sx={{ color: theme.palette.error.main, fontWeight: 600 }}>
                      ⚠️ No unlocks remaining - Upgrade to Hunter plan
                    </Box>
                  );
                }
                return `${remaining} unlock${remaining !== 1 ? 's' : ''} remaining this month`;
              })()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const SuggestedRecruitersTab = ({ job }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [suggestedRecruiters, setSuggestedRecruiters] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [searchUrl, setSearchUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state - same as RecruiterPage
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [showRecruiterDetails, setShowRecruiterDetails] = useState(false);
  const [showOutreachComposer, setShowOutreachComposer] = useState(false);
  
  // Add upgrade prompt state management
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState(null);
  const { showUpgradePrompt } = useUpgrade();
  
  const {
    planInfo,
    isFreePlan,
    isCasualPlan,
    isHunterPlan
  } = useSubscription();

  useEffect(() => {
    if (job && job._id) {
      fetchSuggestedRecruiters();
    }
  }, [job]);

  const fetchSuggestedRecruiters = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching suggested recruiters for job:', job._id);
      
      const response = await jobService.getSuggestedRecruiters(job._id);
      
      if (response.success) {
        setSuggestedRecruiters(response.suggestedRecruiters || []);
        setCompanyStats(response.companyStats);
        setSearchUrl(response.searchUrl || '');
        
        console.log('✅ Suggested recruiters loaded:', {
          count: response.suggestedRecruiters?.length || 0,
          company: response.companyStats?.companyName,
          total: response.companyStats?.totalRecruiters
        });
      } else {
        throw new Error('Failed to fetch suggested recruiters');
      }
    } catch (err) {
      console.error('❌ Error fetching suggested recruiters:', err);
      setError(err.message || 'Failed to load suggested recruiters');
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers - same as RecruiterPage
  const handleViewDetails = (recruiter) => {
    console.log('👤 Opening recruiter details modal:', recruiter.id);
    setSelectedRecruiter(recruiter);
    setShowRecruiterDetails(true);
  };

  const handleStartOutreach = (recruiter) => {
    // For free users, show upgrade prompt instead of opening composer
    if (isFreePlan) {
      console.log('❌ Free user tried to contact recruiter - showing upgrade prompt');
      handleUpgrade('recruiterAccess', {
        recruiterId: recruiter.id,
        recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
        context: 'suggested_recruiters_outreach'
      });
      return;
    }
    
    console.log('📧 Opening outreach composer modal:', recruiter.id);
    setSelectedRecruiter(recruiter);
    setShowOutreachComposer(true);
  };

  // Add upgrade handler function
  const handleUpgrade = (feature, context) => {
    console.log('🔄 Upgrade requested:', { feature, context });
    
    setUpgradeContext({
      feature,
      context,
      triggerSource: 'suggested_recruiters_tab'
    });
    
    setUpgradePromptOpen(true);
  };

  // Handle upgrade prompt close
  const handleUpgradePromptClose = () => {
    setUpgradePromptOpen(false);
    setUpgradeContext(null);
  };

  // Handle successful upgrade
  const handleUpgradeSuccess = () => {
    console.log('🎉 Upgrade successful - refreshing page');
    setUpgradePromptOpen(false);
    setUpgradeContext(null);
    // Optionally refresh the page or trigger a re-render
    window.location.reload();
  };

  // Outreach handlers - same as RecruiterPage
  const handleSendOutreach = async (outreachData) => {
    // Block free users from sending outreach
    if (isFreePlan) {
      console.log('❌ Free user tried to send outreach');
      return;
    }

    try {
      const response = await recruiterService.createOutreach(outreachData);
      
      // Immediately send the outreach
      await recruiterService.sendOutreach(response.outreach.id);
      
      console.log('✅ Message sent successfully!');
      
    } catch (error) {
      console.error('Failed to send outreach:', error);
      throw error;
    }
  };

  const handleSaveOutreach = async (outreachData) => {
    // Block free users from saving outreach
    if (isFreePlan) {
      console.log('❌ Free user tried to save outreach');
      return;
    }

    try {
      await recruiterService.createOutreach(outreachData);
      console.log('✅ Draft saved successfully!');
      
    } catch (error) {
      console.error('Failed to save outreach:', error);
      throw error;
    }
  };

  const handleViewAllRecruiters = () => {
    if (searchUrl && companyStats?.companyName) {
      console.log('🔍 Navigating to full recruiter search for company:', companyStats.companyName);
      navigate(searchUrl);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Finding recruiters at {job?.company}...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          '& .MuiAlert-icon': {
            color: theme.palette.error.main
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Unable to Load Suggested Recruiters
        </Typography>
        <Typography variant="body2">
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchSuggestedRecruiters}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  // Show empty state if no recruiters found
  if (!suggestedRecruiters || suggestedRecruiters.length === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          textAlign: 'center', 
          py: 8, 
          borderRadius: 2, 
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50]
        }}
      >
        <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No recruiters found at {job?.company}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          We couldn't find any recruiters in our database for this company. 
          Try searching our full recruiter directory instead.
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<VisibilityIcon />}
          onClick={() => navigate('/recruiters')}
          sx={{ borderRadius: 2 }}
        >
          Browse All Recruiters
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Company Stats Header */}
      {companyStats && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 2, 
            border: `1px solid ${theme.palette.divider}`,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {companyStats.showingCount} recruiters found at {companyStats.companyName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {companyStats.showingCount} of {companyStats.totalRecruiters} total recruiters
              </Typography>
            </Box>
            <Chip
              icon={<TrendingUpIcon />}
              label={`${companyStats.totalRecruiters} Total`}
              color="primary"
              variant="outlined"
              sx={{ borderRadius: 2 }}
            />
          </Box>
          
          {/* Plan-specific messaging */}
          {isFreePlan && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Upgrade to access recruiter details</strong> - Get contact information and start building your network with Casual plan or higher.
              </Typography>
            </Alert>
          )}
          
          {isCasualPlan && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Unlock recruiters to view contact details</strong> - Use your monthly unlocks to access recruiter information and start conversations.
              </Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* Recruiters Grid - Using existing RecruiterCard component */}
      <Grid container spacing={3}>
        {suggestedRecruiters.map((recruiter) => (
          <Grid item xs={12} sm={6} lg={4} key={recruiter.id}>
            <RecruiterCard
              recruiter={recruiter}
              onViewDetails={handleViewDetails}
              onStartOutreach={handleStartOutreach}
              onLoadMore={() => {}} // Not needed for suggested recruiters
              onUpgrade={handleUpgrade} // Now properly connected
            />
          </Grid>
        ))}
      </Grid>

      {/* Results Summary */}
      <Paper 
        elevation={0}
        sx={{ 
          mt: 3, 
          p: 2, 
          borderRadius: 2, 
          textAlign: 'center',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50]
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing {suggestedRecruiters.length} suggested recruiters
          {companyStats && (
            <Typography component="span" sx={{ ml: 1, fontWeight: 600, color: theme.palette.primary.main }}>
              • {companyStats.totalRecruiters} total at {companyStats.companyName}
            </Typography>
          )}
        </Typography>
      </Paper>

      {/* Modals - same as RecruiterPage */}
      <RecruiterDetails
        open={showRecruiterDetails}
        onClose={() => {
          setShowRecruiterDetails(false);
          setSelectedRecruiter(null);
        }}
        recruiterId={selectedRecruiter?.id}
        onStartOutreach={handleStartOutreach}
      />

      {/* Only show outreach composer for paid users */}
      {!isFreePlan && (
        <OutreachComposer
          open={showOutreachComposer}
          onClose={() => {
            setShowOutreachComposer(false);
            setSelectedRecruiter(null);
          }}
          recruiter={selectedRecruiter}
          onSend={handleSendOutreach}
          onSave={handleSaveOutreach}
        />
      )}

      {/* UpgradePrompt Modal - This is the key addition */}
      <UpgradePrompt
        open={upgradePromptOpen}
        onClose={handleUpgradePromptClose}
        feature={upgradeContext?.feature}
        title={upgradeContext?.feature === 'recruiterAccess' ? 'Upgrade to Access Recruiters' : 'Upgrade Your Plan'}
        description={upgradeContext?.feature === 'recruiterAccess' ? 'Get detailed recruiter profiles and contact information to expand your network.' : 'Unlock premium features with our paid plans'}
        currentPlan={planInfo?.tier || 'free'}
      />
    </Box>
  );
};

export default SuggestedRecruitersTab;
