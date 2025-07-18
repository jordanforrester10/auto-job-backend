// src/components/jobs/FindJobsDialog.js - Enhanced with Location Support and Weekly Model
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
  styled,
  TextField,
  Autocomplete,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent
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
  Upgrade as UpgradeIcon,
  LocationOn as LocationOnIcon,
  Public as PublicIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon
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

// 🆕 NEW: Popular US cities for job search
const POPULAR_CITIES = [
  'Remote',
  'New York, NY',
  'San Francisco, CA',
  'Los Angeles, CA',
  'Chicago, IL',
  'Seattle, WA',
  'Boston, MA',
  'Austin, TX',
  'Denver, CO',
  'Atlanta, GA',
  'Dallas, TX',
  'Miami, FL',
  'Portland, OR',
  'San Diego, CA',
  'Philadelphia, PA',
  'Washington, DC',
  'Nashville, TN',
  'Phoenix, AZ',
  'Minneapolis, MN',
  'Detroit, MI'
];

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

  // 🆕 NEW: Job titles and location state management
  const [jobTitles, setJobTitles] = useState(['']);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [searchLocations, setSearchLocations] = useState(['Remote']);
  const [includeRemote, setIncludeRemote] = useState(true);
  const [locationInput, setLocationInput] = useState('');

  const steps = ['Select Resume', 'Job Titles', 'Choose Locations', 'Confirm Search', 'Search Started'];

  // Get current subscription info
  const currentPlan = subscription?.subscriptionTier || 'free';
  const aiDiscoverySlots = planLimits?.aiJobDiscoverySlots || 0;
  const weeklyJobLimit = planLimits?.aiJobsPerWeek || 0;

  useEffect(() => {
    if (open) {
      fetchResumes();
      // Reset state when dialog opens
      setActiveStep(0);
      setSelectedResumeId('');
      setSearchLocations(['Remote']);
      setIncludeRemote(true);
      setLocationInput('');
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
    
    if (activeStep === 1 && jobTitles.filter(title => title.trim() !== '').length === 0) {
      setError('Please enter at least one job title');
      return;
    }
    
    if (activeStep === 2 && searchLocations.length === 0) {
      setError('Please select at least one location');
      return;
    }
    
    if (activeStep === 3) {
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
    if (!searchStarted || activeStep === 3) {
      setActiveStep(0);
      setSelectedResumeId('');
      setSearchLocations(['Remote']);
      setIncludeRemote(true);
      setLocationInput('');
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

      // Prepare search criteria with job titles and locations
      const searchCriteria = {
        jobTitles: jobTitles.filter(title => title.trim() !== ''), // 🆕 NEW: Include job titles
        searchLocations: searchLocations.map(location => ({
          name: location,
          type: location === 'Remote' ? 'remote' : 'city',
          radius: location === 'Remote' ? 0 : 25
        })),
        includeRemote: includeRemote,
        experienceLevel: 'mid',
        jobTypes: ['FULL_TIME'],
        salaryRange: null,
        workEnvironment: 'any'
      };

      console.log('🎯 Frontend Dialog: Sending search criteria with job titles:', searchCriteria);

      const response = await jobService.findJobsWithAi(selectedResumeId, searchCriteria);
      
      console.log('Weekly AI Search Response:', response);
      
      // Move to success step (step 4)
      setActiveStep(4);
    } catch (err) {
      console.error('Error starting weekly AI job search:', err);
      
      // Check if this is actually a success response (202 status)
      if (err.response && err.response.status === 202) {
        setActiveStep(4);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to start weekly job search. Please try again.');
        setSearchStarted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = (location) => {
    if (location && !searchLocations.includes(location)) {
      setSearchLocations([...searchLocations, location]);
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    setSearchLocations(searchLocations.filter(loc => loc !== locationToRemove));
  };

  const handleRemoteToggle = (event) => {
    const checked = event.target.checked;
    setIncludeRemote(checked);
    
    if (checked && !searchLocations.includes('Remote')) {
      setSearchLocations(['Remote', ...searchLocations]);
    } else if (!checked && searchLocations.includes('Remote')) {
      setSearchLocations(searchLocations.filter(loc => loc !== 'Remote'));
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
              Select a resume to use for weekly AI job discovery. AJ will analyze your resume and search for relevant job opportunities weekly.
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
                  Casual Plan: Weekly AI Job Discovery
                </Typography>
                <Typography variant="body2">
                  You can create {aiDiscoverySlots} AI search that finds up to {weeklyJobLimit} jobs per week.
                </Typography>
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
                  Hunter Plan: Enhanced Weekly AI Job Discovery
                </Typography>
                <Typography variant="body2">
                  You can create {aiDiscoverySlots} AI search that finds up to {weeklyJobLimit} jobs per week.
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
                  Please upload a resume first before using the weekly AI job search feature.
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
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600} color="text.primary">
              What Job Titles Are You Looking For?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter the specific job titles you want to search for. This replaces resume analysis - you directly specify what roles you're targeting.
            </Typography>

            {/* Job Titles Input */}
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={jobTitles.filter(title => title.trim() !== '')}
                onChange={(event, newValue) => {
                  setJobTitles(newValue.length > 0 ? newValue : ['']);
                }}
                onInputChange={(event, newInputValue) => {
                  setJobTitleInput(newInputValue);
                }}
                onKeyPress={(event) => {
                  if (event.key === 'Enter' && jobTitleInput.trim()) {
                    event.preventDefault();
                    const newTitles = [...jobTitles.filter(title => title.trim() !== ''), jobTitleInput.trim()];
                    if (newTitles.length <= 10) {
                      setJobTitles(newTitles);
                      setJobTitleInput('');
                    }
                  }
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        variant="outlined"
                        label={option}
                        {...chipProps}
                        sx={{ borderRadius: 2 }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Job Titles"
                    placeholder="e.g., Software Engineer, Frontend Developer, React Developer"
                    variant="outlined"
                    fullWidth
                    helperText={`Enter job titles separated by commas or press Enter. ${jobTitles.filter(t => t.trim()).length}/10 titles`}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <WorkIcon sx={{ color: 'text.secondary', mr: 1 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                )}
              />
            </Box>

            {/* Job Titles Validation */}
            {jobTitles.filter(title => title.trim() !== '').length === 0 && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                  Please enter at least one job title to search for.
                </Typography>
              </Alert>
            )}

            {/* Job Titles Tips */}
            <FeatureBox>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                Job Title Tips
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <TrendingUpIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Be Specific"
                    secondary="Use exact job titles like 'Senior React Developer' instead of just 'Developer'"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <WorkIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Multiple Variations"
                    secondary="Include different variations: 'Software Engineer', 'Software Developer', 'SWE'"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SpeedIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Level Targeting"
                    secondary="Include seniority levels: 'Junior', 'Senior', 'Lead', 'Principal' if relevant"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </FeatureBox>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600} color="text.primary">
              Choose Search Locations
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select cities or locations where you'd like to search for jobs. Include "Remote" for work-from-home opportunities.
            </Typography>

            {/* Remote Work Toggle */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeRemote}
                      onChange={handleRemoteToggle}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HomeIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={500}>
                        Include Remote Work Opportunities
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                  Search for work-from-home and distributed team positions
                </Typography>
              </CardContent>
            </Card>

            {/* Location Input */}
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                freeSolo
                options={POPULAR_CITIES}
                value={locationInput}
                onChange={(event, newValue) => {
                  if (newValue) {
                    handleAddLocation(newValue);
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  setLocationInput(newInputValue);
                }}
                onKeyPress={(event) => {
                  if (event.key === 'Enter' && locationInput.trim()) {
                    event.preventDefault();
                    handleAddLocation(locationInput.trim());
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add Location"
                    placeholder="Type a city name or select from suggestions"
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => handleAddLocation(locationInput.trim())}
                          disabled={!locationInput.trim() || searchLocations.includes(locationInput.trim())}
                          sx={{ ml: 1 }}
                        >
                          Add
                        </Button>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                )}
              />
            </Box>

            {/* Selected Locations */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Selected Locations ({searchLocations.length})
              </Typography>
              {searchLocations.length === 0 ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2">
                    Please select at least one location to search for jobs.
                  </Typography>
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {searchLocations.map((location, index) => (
                    <Chip
                      key={index}
                      label={location}
                      onDelete={() => handleRemoveLocation(location)}
                      color={location === 'Remote' ? 'success' : 'primary'}
                      variant={location === 'Remote' ? 'filled' : 'outlined'}
                      icon={location === 'Remote' ? <HomeIcon /> : <LocationOnIcon />}
                      sx={{
                        borderRadius: 2,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '18px'
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Location Tips */}
            <FeatureBox>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                Location Search Tips
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <PublicIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Major Cities"
                    secondary="Include major tech hubs like SF, NYC, Seattle for more opportunities"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Multiple Locations"
                    secondary="Add 2-4 locations to maximize your weekly job discoveries"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <HomeIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Remote First"
                    secondary="Remote jobs often have higher salaries and more flexibility"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </FeatureBox>
          </Box>
        );

      case 3:
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
                Ready to Start Your Weekly AI Job Search?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AJ will search for jobs matching your profile and locations every week
              </Typography>
            </Box>

            {/* Search Summary */}
            <FeatureBox sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                Search Configuration Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon fontSize="small" color="info" />
                    <Typography variant="body2" fontWeight={500}>Resume:</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                    {selectedResume?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTimeIcon fontSize="small" color="info" />
                    <Typography variant="body2" fontWeight={500}>Frequency:</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                    Weekly ({weeklyJobLimit} jobs/week max)
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon fontSize="small" color="info" />
                    <Typography variant="body2" fontWeight={500}>Locations ({searchLocations.length}):</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 3 }}>
                    {searchLocations.map((location, index) => (
                      <Chip
                        key={index}
                        label={location}
                        size="small"
                        color={location === 'Remote' ? 'success' : 'default'}
                        icon={location === 'Remote' ? <HomeIcon /> : <LocationOnIcon />}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </FeatureBox>

            {/* Plan-specific messaging */}
            {currentPlan === 'casual' && (
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
                  Casual Plan - Weekly Job Discovery
                </Typography>
                <Typography variant="body2">
                  Your AI search will find up to {weeklyJobLimit} relevant jobs every week across your selected locations.
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
                  Hunter Plan - Enhanced Weekly Discovery
                </Typography>
                <Typography variant="body2">
                  Your AI search will find up to {weeklyJobLimit} high-quality jobs every week with premium analysis.
                </Typography>
              </Alert>
            )}

            <FeatureBox sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary">
                How Weekly AI Job Search Works:
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SearchIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Smart Location Search"
                    secondary="Searches across all your selected locations for relevant opportunities"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Weekly Automation"
                    secondary={`Finds up to ${weeklyJobLimit} new jobs every Monday, delivered to your job list`}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SpeedIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Premium Analysis"
                    secondary="Each job gets full AI analysis with salary extraction and skill matching"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Quality Focused"
                    secondary="Only saves jobs that closely match your skills, experience, and location preferences"
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
                <strong>Note:</strong> Your search will run automatically every week. You can pause, modify, or cancel it anytime from the AI Searches page.
              </Typography>
            </Alert>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            )}
          </Box>
        );

      case 4:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Weekly AI Job Search Started!
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Your weekly AI job search is now active and will run automatically.
            </Typography>

            {/* Plan-specific success messaging */}
            {currentPlan === 'casual' && (
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
                  Casual Plan: Weekly Search Active
                </Typography>
                <Typography variant="body2">
                  AJ will find up to {weeklyJobLimit} relevant jobs every week across {searchLocations.length} location{searchLocations.length > 1 ? 's' : ''}.
                </Typography>
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
                  Hunter Plan: Enhanced Weekly Search Active
                </Typography>
                <Typography variant="body2">
                  AJ will find up to {weeklyJobLimit} high-quality jobs every week with premium analysis and salary extraction.
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
                    primary={`• Up to ${weeklyJobLimit} relevant jobs will be found every Monday`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary={`• Jobs will be searched across ${searchLocations.length} location${searchLocations.length > 1 ? 's' : ''}: ${searchLocations.join(', ')}`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• Each job will include salary extraction and skill matching analysis"
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { color: 'success.dark' }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="• You'll receive weekly notifications about new job discoveries"
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
              Manage AI Searches
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              You can pause, modify, or view progress from the AI Searches page
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
      return jobTitles.filter(title => title.trim() !== '').length > 0;
    }
    if (activeStep === 2) {
      return searchLocations.length > 0;
    }
    if (activeStep === 3) {
      // Check subscription limits before allowing search
      if (currentPlan === 'free') return false;
      return aiDiscoverySlots > 0;
    }
    return true;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={searchStarted && activeStep !== 3}
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
              Start Weekly AI Job Search
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
            disabled={searchStarted && activeStep !== 3}
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
        {(activeStep === 0 || activeStep === 1) && (
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
        
        {activeStep === 1 && activeStep > 0 && (
          <Button 
            onClick={handleBack} 
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Back
          </Button>
        )}
        
        {activeStep === 2 && (
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
        
        {activeStep === 3 && (
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
              {loading ? 'Starting...' : 'Start Weekly Search'}
            </Button>
          </>
        )}
        
        {activeStep === 4 && (
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
