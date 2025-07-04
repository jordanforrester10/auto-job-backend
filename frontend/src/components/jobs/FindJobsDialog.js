// src/components/jobs/FindJobsDialog.js - Enhanced with Subscription Validation
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  StepConnector,
  stepConnectorClasses,
  styled
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import resumeService from '../../utils/resumeService';
import jobService from '../../utils/jobService';
import AutoJobLogo from '../common/AutoJobLogo';
import { useSubscription } from '../../context/SubscriptionContext';

// Custom styled components for better theming
const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: theme.palette.primary.main,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: theme.palette.success.main,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.divider,
    borderRadius: 1,
  },
}));

const FeatureBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.light,
    backgroundColor: theme.palette.background.paper,
  },
}));

const SuccessBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.success.light,
  border: `1px solid ${theme.palette.success.main}`,
  borderRadius: theme.spacing(1.5),
  '& .MuiTypography-root': {
    color: theme.palette.success.contrastText,
  },
}));

const FindJobsDialog = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { 
    subscription, 
    usage, 
    planLimits, 
    canPerformAction, 
    hasFeatureAccess,
    planInfo 
  } = useSubscription();
  
  const [activeStep, setActiveStep] = useState(0);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchStarted, setSearchStarted] = useState(false);
  const [resumesLoading, setResumesLoading] = useState(true);

  const steps = ['Select Resume', 'Confirm Search', 'Search Started'];

  // Get current subscription info
  const currentPlan = subscription?.subscriptionTier || 'free';
  const aiDiscoveryUsage = usage?.aiJobDiscovery || { used: 0, limit: planLimits?.aiJobDiscovery || 0 };
  const aiDiscoveryLimit = planLimits?.aiJobDiscovery || 0;
  const isAtLimit = aiDiscoveryLimit !== -1 && aiDiscoveryUsage.used >= aiDiscoveryLimit;

  useEffect(() => {
    if (open) {
      fetchResumes();
      // Reset state when dialog opens
      setActiveStep(0);
      setSelectedResumeId('');
      setError('');
      setSearchStarted(false);
    }
  }, [open]);

  const fetchResumes = async () => {
    try {
      setResumesLoading(true);
      setError('');
      const resumesData = await resumeService.getUserResumes();
      setResumes(resumesData || []);
      
      if (resumesData && resumesData.length === 1) {
        setSelectedResumeId(resumesData[0]._id);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError('Failed to load resumes. Please try again.');
    } finally {
      setResumesLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedResumeId) {
      setError('Please select a resume to continue');
      return;
    }
    
    if (activeStep === 1) {
      handleStartSearch();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
  };

  const handleClose = () => {
    if (!searchStarted || activeStep === 2) {
      setActiveStep(0);
      setSelectedResumeId('');
      setError('');
      setSearchStarted(false);
      onClose();
    }
  };

  const handleStartSearch = async () => {
    try {
      setLoading(true);
      setError('');
      setSearchStarted(true);

      // Final validation before starting search
      const permission = canPerformAction('aiJobDiscovery', 1);
      if (!permission.allowed) {
        throw new Error(permission.reason);
      }

      const response = await jobService.findJobsWithAi(selectedResumeId);
      
      // The backend returns a 202 status with a message
      // This is actually a success response, not an error
      console.log('AI Search Response:', response);
      
      // Move to success step
      setActiveStep(2);
    } catch (err) {
      console.error('Error starting AI job search:', err);
      
      // Check if this is actually a success response (202 status)
      if (err.response && err.response.status === 202) {
        // This is actually success - the backend returns 202 for async operations
        setActiveStep(2);
      } else {
        // This is a real error
        setError(err.response?.data?.message || err.message || 'Failed to start job search. Please try again.');
        setSearchStarted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSelectedResume = () => {
    return resumes.find(r => r._id === selectedResumeId);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" paragraph color="text.secondary">
              Select a resume to use for AI job discovery. AJ will analyze your resume and search for relevant job opportunities for you.
            </Typography>

            {/* Subscription Info Alert */}
            {currentPlan === 'casual' && (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Casual Plan: {aiDiscoveryUsage.used}/{aiDiscoveryLimit} AI Job Discoveries Used
                </Typography>
                <Typography variant="body2">
                  {isAtLimit 
                    ? 'You\'ve reached your monthly limit. Upgrade to Hunter for unlimited AI job searches.'
                    : `You have ${aiDiscoveryLimit - aiDiscoveryUsage.used} AI job discovery remaining this month.`
                  }
                </Typography>
                {isAtLimit && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UpgradeIcon />}
                    onClick={() => window.open('/pricing', '_blank')}
                    sx={{ mt: 1, borderRadius: 2 }}
                  >
                    Upgrade to Hunter
                  </Button>
                )}
              </Alert>
            )}

            {currentPlan === 'hunter' && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Hunter Plan: Unlimited AI Job Discoveries
                </Typography>
                <Typography variant="body2">
                  Create as many AI job searches as you need to find your perfect role.
                </Typography>
              </Alert>
            )}
            
            {resumesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : resumes.length === 0 ? (
              <Alert 
                severity="warning" 
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  You don't have any resumes uploaded yet.
                </Typography>
                <Typography variant="body2">
                  Please upload a resume first before using the AI job search feature.
                </Typography>
              </Alert>
            ) : (
              <>
                <FormControl fullWidth sx={{ mt: 3 }}>
                  <InputLabel id="resume-select-label">Select Resume</InputLabel>
                  <Select
                    labelId="resume-select-label"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    label="Select Resume"
                    sx={{
                      borderRadius: 2,
                      '& .MuiSelect-select': {
                        py: 1.5,
                      }
                    }}
                  >
                    {resumes.map((resume) => (
                      <MenuItem key={resume._id} value={resume._id}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight={500}>{resume.name}</Typography>
                            {resume.isTailored && (
                              <Chip 
                                label="AI Tailored" 
                                size="small" 
                                color="secondary"
                                sx={{ ml: 1, borderRadius: 1 }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Updated: {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
                            {resume.analysis?.overallScore && ` • Score: ${resume.analysis.overallScore}/100`}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedResumeId && getSelectedResume() && (
                  <FeatureBox sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                      Selected Resume Details
                    </Typography>
                    {(() => {
                      const selected = getSelectedResume();
                      return (
                        <List dense disablePadding>
                          <ListItem disableGutters>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <DescriptionIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={selected.name}
                              secondary={`File type: ${selected.fileType}`}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          {selected.parsedData?.experience?.[0] && (
                            <ListItem disableGutters>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <WorkIcon fontSize="small" color="info" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Current/Recent Role"
                                secondary={`${selected.parsedData.experience[0].title} at ${selected.parsedData.experience[0].company}`}
                                primaryTypographyProps={{ fontWeight: 500 }}
                              />
                            </ListItem>
                          )}
                        </List>
                      );
                    })()}
                  </FeatureBox>
                )}
              </>
            )}
          </Box>
        );

      case 1:
        const selectedResume = getSelectedResume();
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <AutoJobLogo 
                variant="icon-only" 
                size="large" 
                color="primary"
                sx={{ mb: 2 }}
              />
              <Typography variant="h6" gutterBottom fontWeight={600} color="text.primary">
                Ready to Let AJ our AI Agent Do Your Job Search?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our trained AI Agent will search for real job openings that match your profile
              </Typography>
            </Box>

            {/* Plan-specific messaging */}
            {currentPlan === 'casual' && !isAtLimit && (
              <Alert 
                severity="warning" 
                icon={<WarningIcon />} 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: 'warning.light',
                  border: '1px solid',
                  borderColor: 'warning.main',
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Casual Plan Limitation
                </Typography>
                <Typography variant="body2">
                  This will use your {aiDiscoveryLimit - aiDiscoveryUsage.used} remaining AI job discovery for this month. 
                  Upgrade to Hunter for unlimited searches.
                </Typography>
              </Alert>
            )}

            {currentPlan === 'hunter' && (
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />} 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: 'success.light',
                  border: '1px solid',
                  borderColor: 'success.main',
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Hunter Plan - Unlimited Access
                </Typography>
                <Typography variant="body2">
                  You have unlimited AI job discoveries. Create as many searches as you need!
                </Typography>
              </Alert>
            )}

            <Alert 
              severity="info" 
              icon={<InfoIcon />} 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'info.light',
                border: '1px solid',
                borderColor: 'info.main',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Daily Job Limit: Up to 10 Jobs
              </Typography>
              <Typography variant="body2">
                AJ will find and add up to 10 relevant job openings per day to your job list. 
                The search will continue running daily until you pause or cancel it.
              </Typography>
            </Alert>

            <FeatureBox sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                How it works:
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SearchIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Real Job Search"
                    secondary="Our AI Agent acts like a human and searches for real openings"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Daily Updates"
                    secondary="Finds up to 10 new jobs per day matching your profile"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SpeedIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Automatic Process"
                    secondary="Runs in the background - you can close this and check back later"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Quality Matches"
                    secondary="Only adds jobs that closely match your skills and experience"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </FeatureBox>

            <Alert 
              severity="warning" 
              icon={<WarningIcon />}
              sx={{
                borderRadius: 2,
                backgroundColor: 'warning.light',
                border: '1px solid',
                borderColor: 'warning.main',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              <Typography variant="body2">
                <strong>Note:</strong> If no matching jobs are found, the search will notify you and provide suggestions for improving your search criteria.
              </Typography>
            </Alert>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight={600}>
              AI Job Search Started!
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Your AI job search is now running in the background.
            </Typography>

            {/* Plan-specific success messaging */}
            {currentPlan === 'casual' && (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Casual Plan: {aiDiscoveryUsage.used + 1}/{aiDiscoveryLimit} AI Job Discoveries Used
                </Typography>
                <Typography variant="body2">
                  {aiDiscoveryUsage.used + 1 >= aiDiscoveryLimit 
                    ? 'You\'ve used all your AI job discoveries for this month. Upgrade to Hunter for unlimited searches.'
                    : `You have ${aiDiscoveryLimit - (aiDiscoveryUsage.used + 1)} AI job discovery remaining this month.`
                  }
                </Typography>
              </Alert>
            )}
            
            <SuccessBox sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight={600} gutterBottom sx={{ color: 'success.dark !important' }}>
                What happens next:
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Up to 10 relevant jobs will be added daily"
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Jobs will appear in your job list marked with 'AI Found'"
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• You'll receive notifications for new matches"
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
              </List>
            </SuccessBox>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                handleClose();
                navigate('/jobs/ai-searches');
              }}
              sx={{ 
                mb: 2,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              View AI Searches
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              You can manage your AI job searches from the AI Discovery page
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  // Check if user can proceed to next step
  const canProceed = () => {
    if (activeStep === 0) {
      return selectedResumeId && !resumesLoading && resumes.length > 0;
    }
    if (activeStep === 1) {
      // Check subscription limits before allowing search
      if (currentPlan === 'free') return false;
      if (currentPlan === 'casual' && isAtLimit) return false;
      return true;
    }
    return true;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={searchStarted && activeStep !== 2}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoJobLogo 
              variant="icon-only" 
              size="small" 
              color="primary"
              sx={{ mr: 1.5 }}
            />
            <Typography variant="h6" fontWeight={600}>
              Find Jobs with AJ
              {currentPlan !== 'free' && (
                <Chip 
                  label={planInfo?.displayName || currentPlan}
                  size="small"
                  color={currentPlan === 'hunter' ? 'warning' : 'primary'}
                  sx={{ ml: 2, height: 24 }}
                />
              )}
            </Typography>
          </Box>
          <IconButton 
            onClick={handleClose} 
            size="small"
            disabled={searchStarted && activeStep !== 2}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ px: 3 }}>
        <Stepper 
          activeStep={activeStep} 
          connector={<CustomStepConnector />}
          sx={{ 
            mb: 3,
            '& .MuiStepLabel-label': {
              fontWeight: 500,
              fontSize: '0.875rem'
            },
            '& .MuiStepLabel-label.Mui-active': {
              fontWeight: 600,
              color: 'primary.main'
            },
            '& .MuiStepLabel-label.Mui-completed': {
              color: 'success.main'
            }
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: '1.5rem'
              }
            }} 
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
        
        {renderStepContent()}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        {activeStep === 0 && (
          <>
            <Button 
              onClick={handleClose}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={!canProceed()}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Next
            </Button>
          </>
        )}
        
        {activeStep === 1 && (
          <>
            <Button 
              onClick={handleBack} 
              disabled={loading}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={loading || !canProceed()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              {loading ? 'Starting...' : 'Start AI Search'}
            </Button>
          </>
        )}
        
        {activeStep === 2 && (
          <Button 
            variant="contained" 
            onClick={handleClose}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 4
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FindJobsDialog;