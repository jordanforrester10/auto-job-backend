// src/components/recruiters/RecruiterDetails.js - PHONE FEATURES REMOVED - COMPLETE FILE
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Link,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Language as LanguageIcon,
  CalendarToday as CalendarTodayIcon,
  Send as SendIcon,
  Star as StarIcon,
  Groups as GroupsIcon,
  Domain as DomainIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import recruiterService from '../../utils/recruiterService';
import { useSubscription } from '../../context/SubscriptionContext';
import UpgradePrompt from '../subscription/shared/UpgradePrompt';

const RecruiterDetails = ({ open, onClose, recruiterId, onStartOutreach }) => {
  const theme = useTheme();
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

  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  // Reset state when dialog opens/closes or recruiterId changes
  useEffect(() => {
    if (open && recruiterId) {
      loadRecruiterDetails();
    } else {
      // Reset state when dialog closes or no recruiterId
      setRecruiter(null);
      setError('');
      setLoading(false);
      setIsUnlocked(false);
      setUnlocking(false);
      setUnlockSuccess(false);
    }
  }, [open, recruiterId]);

  const loadRecruiterDetails = async () => {
    // Don't load if no recruiterId provided
    if (!recruiterId) {
      setError('No recruiter selected');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('🔍 Loading recruiter details for ID:', recruiterId);
      
      const response = await recruiterService.getRecruiterDetails(recruiterId);
      
      // Debug logging to see what we're getting back
      console.log('🔍 API Response:', response);
      console.log('🔍 Response structure:', {
        hasResponse: !!response,
        hasRecruiter: !!response?.recruiter,
        recruiterKeys: response?.recruiter ? Object.keys(response.recruiter) : 'none',
        accessLevel: response?.accessLevel,
        unlockRequired: response?.unlockRequired,
        success: response?.success
      });

      // Handle successful response with recruiter data
      if (response && (response.recruiter || response.success)) {
        
        // If we have recruiter data, use it
        if (response.recruiter) {
          setRecruiter(response.recruiter);
          setIsUnlocked(response.recruiter.isUnlocked || false);
          console.log('✅ Recruiter details loaded:', response.recruiter.fullName || response.recruiter.title);
        } 
        // Handle case where backend returns success but limited/no recruiter data (for casual users)
        else if (response.success && response.unlockRequired) {
          console.log('🔓 Recruiter requires unlock for casual user');
          // Create a minimal recruiter object for unlock flow
          setRecruiter({
            id: recruiterId,
            firstName: 'Recruiter',
            lastName: 'Profile',
            fullName: 'Recruiter Profile',
            title: 'Recruiter',
            company: { name: 'Company' },
            isUnlocked: false,
            accessLevel: 'limited'
          });
          setIsUnlocked(false);
        }
        // Handle case where backend returns basic access level info
        else if (response.accessLevel === 'basic' || response.accessLevel === 'limited') {
          console.log('🔒 Basic/Limited access level detected');
          setRecruiter({
            id: recruiterId,
            firstName: 'Recruiter',
            lastName: 'Profile', 
            fullName: 'Recruiter Profile',
            title: 'Recruiter',
            company: { name: 'Company' },
            isUnlocked: false,
            accessLevel: response.accessLevel
          });
          setIsUnlocked(false);
        }
        else {
          console.log('❌ Unexpected response format:', response);
          setError('Unexpected response format from server');
        }
      } else {
        console.log('❌ No valid response or recruiter data');
        setError('Recruiter data not found');
      }
      
    } catch (error) {
      console.error('Failed to load recruiter details:', error);
      
      // Handle 403 errors (feature access denied) gracefully
      if (error.status === 403 || error.response?.status === 403) {
        console.log('🔒 Access denied - user needs to upgrade plan');
        // For 403 errors, we'll still set a basic recruiter object so the component can show the upgrade prompt
        setRecruiter({
          id: recruiterId,
          firstName: 'Recruiter',
          lastName: 'Profile',
          fullName: 'Recruiter Profile',
          title: 'Premium Content',
          company: { name: 'Upgrade Required' },
          isUnlocked: false,
          accessLevel: 'restricted'
        });
        setError(''); // Clear error so upgrade prompt shows instead
      } else {
        setError('Failed to load recruiter details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state when closing
    setRecruiter(null);
    setError('');
    setLoading(false);
    setIsUnlocked(false);
    setUnlocking(false);
    setShowUpgradePrompt(false);
    setUnlockSuccess(false);
    onClose();
  };

  const handleStartOutreach = () => {
    if (recruiter) {
      onStartOutreach(recruiter);
      handleClose();
    }
  };

  // Show success message and direct user to recruiter tab
  const handleUnlockRecruiter = async () => {
    if (!isCasualPlan) return;

    // Check if user has enough unlock credits
    const permission = canPerformAction('recruiterUnlocks', 1);
    if (!permission.allowed) {
      setError('You have reached your recruiter unlock limit. Upgrade to Hunter plan for unlimited access.');
      return;
    }

    try {
      setUnlocking(true);
      setError(''); // Clear any previous errors
      
      console.log('🔓 Starting unlock process for recruiter:', recruiterId);
      
      // Call the API to unlock the recruiter
      const response = await recruiterService.unlockRecruiter(recruiterId);
      
      console.log('🔓 Unlock API response:', response);
      
      if (response && response.success) {
        console.log('✅ Recruiter unlocked, showing success message');
        
        // Show success message - no complex state updates
        setUnlockSuccess(true);
        setError(''); // Clear any errors
        
        console.log('✅ Recruiter unlock completed successfully');
      } else {
        // If response doesn't have success flag, but we got a response, consider it failed
        console.error('❌ Unlock API returned unsuccessful response:', response);
        throw new Error(response?.message || response?.error || 'Failed to unlock recruiter');
      }
    } catch (error) {
      console.error('❌ Error unlocking recruiter:', error);
      
      // Better error handling with specific error messages
      let errorMessage = 'Failed to unlock recruiter. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error types
      if (error.response?.status === 400) {
        errorMessage = 'Invalid request. Please refresh the page and try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Recruiter not found. Please refresh the page and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to unlock this recruiter.';
      }
      
      setError(errorMessage);
    } finally {
      setUnlocking(false);
    }
  };

  const handleUpgradeClick = () => {
    setShowUpgradePrompt(true);
  };

  const formatCompanySize = (sizeString) => {
    if (!sizeString) return 'Not specified';
    
    // Handle formats like "10000plus" or "1000plus"
    const plusMatch = sizeString.match(/(\d+)plus/i);
    if (plusMatch) {
      const [, number] = plusMatch;
      return `${parseInt(number).toLocaleString()}+ employees`;
    }
    
    // Handle formats like "Employees.1000to4999" or "1000to4999"
    const rangeMatch = sizeString.match(/(\d+)to(\d+)/);
    if (rangeMatch) {
      const [, min, max] = rangeMatch;
      return `${parseInt(min).toLocaleString()} - ${parseInt(max).toLocaleString()} employees`;
    }
    
    // Handle other formats like "Employees.1000plus"
    if (sizeString.includes('Employees.')) {
      const cleanedSize = sizeString.replace('Employees.', '');
      
      // Check for plus format after removing "Employees."
      const plusMatch2 = cleanedSize.match(/(\d+)plus/i);
      if (plusMatch2) {
        const [, number] = plusMatch2;
        return `${parseInt(number).toLocaleString()}+ employees`;
      }
      
      // Check for range format after removing "Employees."
      const rangeMatch2 = cleanedSize.match(/(\d+)to(\d+)/);
      if (rangeMatch2) {
        const [, min, max] = rangeMatch2;
        return `${parseInt(min).toLocaleString()} - ${parseInt(max).toLocaleString()} employees`;
      }
      
      return cleanedSize.replace('to', ' - ') + ' employees';
    }
    
    return sizeString;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    // Use recruiter ID to consistently assign colors
    const colorIndex = (recruiterId || 0) % colors.length;
    return colors[colorIndex];
  };

  // Safe text rendering function
  const safeText = (value) => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'object') {
      // Handle industry object specifically
      if (value.name) return value.name;
      if (value.description) return value.description;
      return 'Not specified';
    }
    return String(value);
  };

  // Extract industry name safely
  const getIndustryName = (industry) => {
    if (!industry) return 'Not specified';
    if (typeof industry === 'string') return industry;
    if (typeof industry === 'object' && industry.name) return industry.name;
    return 'Not specified';
  };

  // Get current usage for display
  const getRecruiterUnlocksUsage = () => {
    if (!usage || !planLimits) return { used: 0, limit: 0 };
    
    const used = usage.recruiterUnlocks?.used || 0;
    const limit = planLimits.recruiterUnlocks;
    
    return { used, limit };
  };

  // Render empty state for free users
  const renderFreeUserEmptyState = () => (
    <Box sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <LockIcon 
        sx={{ 
          fontSize: 80, 
          color: theme.palette.grey[400], 
          mb: 3,
          mx: 'auto'
        }} 
      />
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
        Recruiter Details Locked
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
        Access to recruiter contact information and detailed profiles is available with our paid plans.
      </Typography>
      
      {/* Feature highlights */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: theme.palette.grey[50],
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          maxWidth: 450,
          mx: 'auto'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
          Unlock with Premium Plans:
        </Typography>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <EmailIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
            Direct email contacts
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <LinkedInIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
            LinkedIn profiles
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
            Company details & insights
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <StarIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
            25 recruiter unlocks per month
          </Typography>
        </Box>
      </Paper>

      <Button
        variant="contained"
        size="large"
        startIcon={<UpgradeIcon />}
        onClick={handleUpgradeClick}
        sx={{
          borderRadius: 2,
          py: 1.5,
          px: 4,
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none'
        }}
      >
        Upgrade Plan
      </Button>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
        Starting at $19.99/month • Cancel anytime
      </Typography>
    </Box>
  );

  // Render unlock state for casual users
  const renderCasualUserUnlockState = () => {
    const { used, limit } = getRecruiterUnlocksUsage();
    const remaining = limit - used;

    return (
      <Box sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CreditCardIcon 
          sx={{ 
            fontSize: 80, 
            color: theme.palette.primary.main, 
            mb: 3,
            mx: 'auto'
          }} 
        />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
          Unlock Recruiter Details
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          View complete contact information and company details for {recruiter?.fullName || 'this recruiter'}.
        </Typography>
        
        {/* Usage indicator */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            backgroundColor: theme.palette.primary.main + '08',
            border: `1px solid ${theme.palette.primary.main}20`,
            borderRadius: 2,
            maxWidth: 350,
            mx: 'auto'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.primary.main }}>
            Monthly Usage
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {remaining} unlock{remaining !== 1 ? 's' : ''} remaining
          </Typography>
          <Typography variant="caption" color="text.secondary">
            of {limit} total unlocks this month
          </Typography>
        </Paper>

        <Button
          variant="contained"
          size="large"
          onClick={handleUnlockRecruiter}
          disabled={unlocking || remaining <= 0}
          startIcon={unlocking ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
          sx={{
            borderRadius: 2,
            py: 1.5,
            px: 4,
            fontSize: '1rem',
            fontWeight: 600,
            textTransform: 'none',
            mb: 2
          }}
        >
          {unlocking ? 'Unlocking...' : `Unlock Recruiter (1 credit)`}
        </Button>

        {remaining <= 0 && (
          <Alert 
            severity="warning" 
            sx={{ maxWidth: 400, mx: 'auto', borderRadius: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleUpgradeClick}
              >
                Upgrade
              </Button>
            }
          >
            You've used all your recruiter unlocks. Upgrade to Hunter for unlimited access.
          </Alert>
        )}
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Unlocked recruiters stay accessible forever
        </Typography>
      </Box>
    );
  };

  // Don't render dialog if not open
  if (!open) return null;

  // Show error state if no recruiterId provided
  if (!recruiterId) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h6" sx={{ color: theme.palette.error.main }}>
            Error
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            No recruiter selected. Please select a recruiter to view details.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            minHeight: '500px'
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 3
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              Recruiter Details
            </Typography>
            <IconButton 
              onClick={handleClose}
              sx={{ 
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={60} sx={{ color: theme.palette.primary.main, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Loading recruiter details...
                </Typography>
              </Box>
            </Box>
          )}

          {/* Show unlock success message */}
          {unlockSuccess && (
            <Box sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ 
                fontSize: 80, 
                color: theme.palette.success.main, 
                mb: 3,
                mx: 'auto'
              }} />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.main }}>
                🎉 Recruiter Unlocked Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                This recruiter has been permanently unlocked and added to your account. You can now view their full contact details and company information.
              </Typography>
              
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  backgroundColor: theme.palette.success.main + '08',
                  border: `1px solid ${theme.palette.success.main}30`,
                  borderRadius: 2,
                  maxWidth: 450,
                  mx: 'auto'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.main }}>
                  📍 Where to find this recruiter:
                </Typography>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
                    Go to the <strong style={{ margin: '0 4px' }}>Recruiter Outreach</strong> tab
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <SearchIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
                    Filter by Unlocked Recruiters
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <VisibilityIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.primary.main }} />
                    Click "View Details" to see full contact information for this Recruiter
                  </Typography>
                </Box>
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    // Navigate to recruiter tab
                    window.location.href = '/recruiters';
                  }}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 4,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Go to Recruiter Tab
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleClose}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 4,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Close
                </Button>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                💡 This recruiter is now permanently unlocked for your account
              </Typography>
            </Box>
          )}

          {/* Show error only if there's an actual error and not success */}
          {error && !unlockSuccess && (
            <Box sx={{ p: 3 }}>
              <Alert 
                severity="error" 
                sx={{ borderRadius: 2 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={() => setError('')}
                  >
                    Dismiss
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          )}

          {/* Feature gating logic - don't show if unlock was successful */}
          {recruiter && !loading && !error && !unlockSuccess && (
            <>
              {/* Free users - show empty state */}
              {isFreePlan && renderFreeUserEmptyState()}
              
              {/* Casual users - show unlock or full details */}
              {isCasualPlan && !isUnlocked && renderCasualUserUnlockState()}
              
              {/* Full details for unlocked casual users or hunter users */}
              {((isCasualPlan && isUnlocked) || isHunterPlan) && (
                <Box sx={{ p: 3 }}>
                  {/* Profile Header */}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      mb: 3, 
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}08)`,
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: getAvatarColor(),
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          border: `3px solid ${theme.palette.background.paper}`,
                          boxShadow: theme.shadows[4]
                        }}
                      >
                        {getInitials(recruiter.firstName, recruiter.lastName)}
                      </Avatar>
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
                          {safeText(recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`)}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <WorkIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                          <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                            {safeText(recruiter.title)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon sx={{ color: theme.palette.text.secondary, fontSize: '1.1rem' }} />
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {safeText(recruiter.company?.name)}
                          </Typography>
                          {recruiter.rating && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
                              <StarIcon sx={{ color: theme.palette.warning.main, fontSize: '1.1rem' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {Number(recruiter.rating).toFixed(1)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      
                      {/* Status indicators */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {isCasualPlan && (
                          <Chip
                            label="Unlocked"
                            color="success"
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 500 }}
                          />
                          )}
                        {recruiter.outreach?.hasContacted && (
                          <Chip
                            label="Previously Contacted"
                            color="info"
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 500 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Paper>

                  <Grid container spacing={3}>
                    {/* Contact Information - PHONE REMOVED */}
                    <Grid item xs={12} md={6}>
                      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography 
                            variant="h6" 
                            gutterBottom 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1, 
                              mb: 2,
                              color: theme.palette.primary.main,
                              fontWeight: 600
                            }}
                          >
                            <EmailIcon />
                            Contact Information
                          </Typography>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {recruiter.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Email
                                  </Typography>
                                  <Link
                                    href={`mailto:${recruiter.email}`}
                                    sx={{ 
                                      color: theme.palette.primary.main,
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                  >
                                    {safeText(recruiter.email)}
                                  </Link>
                                </Box>
                              </Box>
                            )}

                            {recruiter.linkedinUrl && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <LinkedInIcon sx={{ color: '#0077b5', fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    LinkedIn
                                  </Typography>
                                  <Link
                                    href={recruiter.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ 
                                      color: '#0077b5',
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                  >
                                    LinkedIn Profile
                                  </Link>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Company Details */}
                    <Grid item xs={12} md={6}>
                      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography 
                            variant="h6" 
                            gutterBottom 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1, 
                              mb: 2,
                              color: theme.palette.primary.main,
                              fontWeight: 600
                            }}
                          >
                            <DomainIcon />
                            Company Details
                          </Typography>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {recruiter.company?.size && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <GroupsIcon sx={{ color: theme.palette.secondary.main, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Company Size
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formatCompanySize(recruiter.company.size)}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {recruiter.industry && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <WorkIcon sx={{ color: theme.palette.info.main, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Industry
                                  </Typography>
                                  <Chip
                                    label={getIndustryName(recruiter.industry)}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ borderRadius: 1, fontWeight: 500 }}
                                  />
                                </Box>
                              </Box>
                            )}

                            {recruiter.company?.foundedYear && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <CalendarTodayIcon sx={{ color: theme.palette.warning.main, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Founded
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {safeText(recruiter.company.foundedYear)}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {recruiter.company?.website && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <LanguageIcon sx={{ color: theme.palette.success.main, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Website
                                  </Typography>
                                  <Link
                                    href={String(recruiter.company.website).startsWith('http') ? 
                                      recruiter.company.website : 
                                      `https://${recruiter.company.website}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ 
                                      color: theme.palette.primary.main,
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                  >
                                    {safeText(recruiter.company.website)}
                                  </Link>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Specializations */}
                    {recruiter.specializations && Array.isArray(recruiter.specializations) && recruiter.specializations.length > 0 && (
                      <Grid item xs={12}>
                        <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography 
                              variant="h6" 
                              gutterBottom 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                mb: 2,
                                color: theme.palette.primary.main,
                                fontWeight: 600
                              }}
                            >
                              <StarIcon />
                              Specializations
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {recruiter.specializations.map((spec, index) => (
                                <Chip
                                  key={index}
                                  label={safeText(spec)}
                                  variant="outlined"
                                  sx={{ 
                                    borderRadius: 1,
                                    fontWeight: 500,
                                    '&:hover': {
                                      backgroundColor: theme.palette.primary.main + '08'
                                    }
                                  }}
                                />
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        {/* Footer Actions */}
        <DialogActions sx={{ 
          p: 3, 
          borderTop: `1px solid ${theme.palette.divider}`,
          background: theme.palette.grey[50]
        }}>
          <Button 
            onClick={handleClose} 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              minWidth: 100
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="recruiterAccess"
        title="Unlock Recruiter Database"
        description="Get access to detailed recruiter profiles, contact information, and company insights."
        currentPlan={planInfo?.tier}
      />
    </>
  );
};

export default RecruiterDetails;
