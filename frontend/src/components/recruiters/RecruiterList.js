// src/components/recruiters/RecruiterList.js - UPDATED WITH UPGRADE PROMPT FUNCTIONALITY
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Rating,
  Divider,
  Link,
  Badge,
  CircularProgress,
  Alert,
  Pagination,
  Paper
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LinkedIn as LinkedInIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../context/SubscriptionContext';
import { useUpgrade } from '../../hooks/useUpgrade';
import recruiterService from '../../utils/recruiterService';
import AutoJobLogo from '../common/AutoJobLogo';
import UpgradePrompt from '../subscription/shared/UpgradePrompt';

const RecruiterCard = ({ recruiter, onViewDetails, onStartOutreach, onLoadMore, onUpgrade }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [localIsUnlocked, setLocalIsUnlocked] = useState(recruiter.isUnlocked || false); // Local state for unlock status
  
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
      // You could trigger an upgrade modal here or show a toast
      // For now, we'll just prevent the unlock
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

  // NEW: Handle upgrade button click for free users
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
              {/* FIXED: Show actual title for unlocked, generic for locked */}
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
                {/* FIXED: Always show company name */}
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
              
              {recruiter.phone && (
                <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                  <PhoneIcon fontSize="small" />
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
                <PhoneIcon fontSize="small" />
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
                    sx={{ flex: 1, borderRadius: 2 }}
                  >
                    View Details
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : 
                      <AutoJobLogo variant="icon-only" size="small" sx={{ width: 24, height: 24 }} />
                    }
                    onClick={handleStartOutreach}
                    disabled={isLoading}
                    size="small"
                    color={recruiter.outreach?.hasContacted ? 'secondary' : 'primary'}
                    sx={{ flex: 1, borderRadius: 2 }}
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
                sx={{ flex: 1, borderRadius: 2 }}
              >
                View Details
              </Button>
              
              <Button
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : 
                  <AutoJobLogo variant="icon-only" size="small" sx={{ width: 24, height: 24 }} />
                }
                onClick={handleStartOutreach}
                disabled={isLoading}
                size="small"
                color={recruiter.outreach?.hasContacted ? 'secondary' : 'primary'}
                sx={{ flex: 1, borderRadius: 2 }}
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

const RecruiterList = ({ 
  searchResults, 
  loading, 
  error, 
  hasSearched,
  onViewDetails, 
  onStartOutreach,
  onLoadMore,
  onPageChange
  // Removed onRecruiterUnlocked - not needed anymore
}) => {
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  
  // NEW: Add upgrade prompt state and hook
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState(null);
  const { showUpgradePrompt } = useUpgrade();
  
  const {
    planInfo,
    hasFeatureAccess,
    canPerformAction,
    trackUsage,
    isFreePlan,
    isCasualPlan,
    isHunterPlan
  } = useSubscription();

  const handlePageChange = (event, newPage) => {
    console.log(`📄 Page change requested: ${newPage}`);
    setCurrentPage(newPage);
    
    // Calculate offset for new page
    const limit = searchResults?.pagination?.limit || 20;
    const offset = (newPage - 1) * limit;
    
    // Call the page change handler with proper parameters
    if (onPageChange) {
      onPageChange(newPage, offset);
    } else if (onLoadMore) {
      // Fallback to onLoadMore if onPageChange not provided
      onLoadMore(newPage, offset);
    }
  };

  const handleLoadMore = () => {
    console.log('📄 Load more requested');
    if (onLoadMore) {
      const nextPage = currentPage + 1;
      const limit = searchResults?.pagination?.limit || 20;
      const offset = currentPage * limit; // Current page * limit for next batch
      
      setCurrentPage(nextPage);
      onLoadMore(nextPage, offset);
    }
  };

  // NEW: Handle upgrade button clicks from recruiter cards
  const handleUpgrade = (feature, context) => {
    console.log('🔄 Upgrade requested:', { feature, context });
    
    setUpgradeContext({
      feature,
      context,
      triggerSource: 'recruiter_card'
    });
    
    setUpgradePromptOpen(true);
  };

  // NEW: Handle upgrade prompt close
  const handleUpgradePromptClose = () => {
    setUpgradePromptOpen(false);
    setUpgradeContext(null);
  };

  // NEW: Handle successful upgrade
  const handleUpgradeSuccess = () => {
    console.log('🎉 Upgrade successful - refreshing page');
    setUpgradePromptOpen(false);
    setUpgradeContext(null);
    // Optionally refresh the page or trigger a re-render
    window.location.reload();
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Searching recruiters...
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
        {error}
      </Alert>
    );
  }

  // Show empty state only if user has searched
  if (hasSearched && (!searchResults || !searchResults.recruiters || searchResults.recruiters.length === 0)) {
    return (
      <Paper elevation={0} sx={{ textAlign: 'center', py: 8, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
        <PersonIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No recruiters found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Try adjusting your search criteria or filters to find more results.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          sx={{ borderRadius: 2 }}
        >
          Reset Search
        </Button>
      </Paper>
    );
  }

  // Don't show anything if no search has been performed
  if (!hasSearched) {
    return null;
  }

  const { recruiters, pagination } = searchResults;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  console.log('🔍 RecruiterList render:', {
    recruitersCount: recruiters?.length,
    currentPage,
    totalPages,
    pagination
  });

  return (
    <>
      <Box>
        {/* Results Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon sx={{ color: theme.palette.primary.main }} />
            {pagination.total.toLocaleString()} Recruiters Found
          </Typography>
          
          {/* Plan-specific info */}
          {(isFreePlan || isCasualPlan) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isFreePlan && (
                <Chip
                  label="Upgrade for access"
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<UpgradeIcon sx={{ fontSize: '0.875rem' }} />}
                  sx={{ borderRadius: 2 }}
                />
              )}
              {isCasualPlan && (
                <Chip
                  label={`${(() => {
                    const permission = canPerformAction('recruiterUnlocks', 1);
                    return permission.remaining;
                  })()} unlocks remaining`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<CreditCardIcon sx={{ fontSize: '0.875rem' }} />}
                  sx={{ borderRadius: 2 }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Recruiter Grid */}
        <Grid container spacing={3}>
          {recruiters.map((recruiter) => (
            <Grid item xs={12} sm={6} lg={4} key={recruiter.id}>
              <RecruiterCard
                recruiter={recruiter}
                onViewDetails={onViewDetails}
                onStartOutreach={onStartOutreach}
                onLoadMore={onLoadMore}
                onUpgrade={handleUpgrade}
              />
            </Grid>
          ))}
        </Grid>

        {/* Pagination - Only show if more than one page */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>
        )}

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
            Showing {recruiters.length} of {pagination.total.toLocaleString()} recruiters
            {isFreePlan && (
              <Typography component="span" sx={{ ml: 1, fontWeight: 600, color: theme.palette.primary.main }}>
                • Upgrade for full access
              </Typography>
            )}
            {isCasualPlan && (
              <Typography component="span" sx={{ ml: 1, fontWeight: 600, color: theme.palette.warning.main }}>
                • {(() => {
                  const permission = canPerformAction('recruiterUnlocks', 1);
                  return permission.remaining;
                })()} unlocks remaining
              </Typography>
            )}
          </Typography>
        </Paper>
      </Box>

      {/* NEW: Upgrade Prompt Dialog */}
      <UpgradePrompt
        open={upgradePromptOpen}
        onClose={handleUpgradePromptClose}
        feature={upgradeContext?.feature || 'recruiterAccess'}
        title="Unlock Recruiter Access"
        description="Upgrade to Casual plan to unlock recruiter details and start building your professional network."
        currentPlan={planInfo?.tier || 'free'}
      />
    </>
  );
};

export default RecruiterList;