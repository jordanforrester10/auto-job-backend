import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  Launch as LaunchIcon,
  Upgrade as UpgradeIcon,
  AutoAwesome as AutoAwesomeIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../context/SubscriptionContext';

const NextStepsGuide = ({ 
  resumeId, 
  jobsCount, 
  recruitersCount, 
  onPrevious 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isFreePlan } = useSubscription();

  // Navigation handlers
  const handleUpgrade = () => {
    navigate('/settings', { 
      state: { scrollTo: 'subscription' } 
    });
  };

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  const handleStartTailoring = () => {
    navigate('/jobs');
  };

  const handleCreateSearch = () => {
    if (isFreePlan) {
      handleUpgrade();
    } else {
      navigate('/jobs/ai-searches');
    }
  };

  const handleBrowseRecruiters = () => {
    if (isFreePlan) {
      handleUpgrade();
    } else {
      navigate('/recruiters');
    }
  };

  const handleOptimizeResume = () => {
    if (isFreePlan) {
      handleUpgrade();
    } else {
      navigate(`/resumes/${resumeId}`);
    }
  };

  const nextSteps = [
    {
      icon: <EditIcon color="primary" />,
      title: 'Tailor Your Resume To a Specific Job',
      description: 'Customize your resume against jobs to improve your chances',
      action: 'Start Tailoring',
      available: true,
      premium: false,
      onClick: handleStartTailoring
    },
    {
      icon: <SearchIcon color="primary" />,
      title: 'Set Up Automated Job Searches',
      description: 'Create automated weekly job searches specific to you',
      action: 'Create Search',
      available: !isFreePlan,
      premium: true,
      onClick: handleCreateSearch
    },
    {
      icon: <PeopleIcon color="primary" />,
      title: 'Connect with Recruiters',
      description: 'Reach out to recruiters at your target companies',
      action: 'Browse Recruiters',
      available: !isFreePlan,
      premium: true,
      onClick: handleBrowseRecruiters
    },
    {
      icon: <StarIcon color="primary" />,
      title: 'Optimize Your Resume for ATS',
      description: 'Update your resume score with AI-powered suggestions to beat the Applicant Tracking Systems',
      action: 'Optimize Resume',
      available: !isFreePlan,
      premium: true,
      onClick: handleOptimizeResume
    }
  ];

  const achievements = [
    {
      icon: <CheckCircleIcon color="success" />,
      title: 'Resume Analyzed',
      description: 'Your resume has been fully analyzed by our AI'
    },
    {
      icon: <CheckCircleIcon color="success" />,
      title: `${jobsCount} Jobs Found`,
      description: 'We found relevant job opportunities for you'
    },
    {
      icon: <CheckCircleIcon color="success" />,
      title: `${recruitersCount} Recruiters Identified`,
      description: 'We identified key recruiters at these targeted companies'
    }
  ];

  return (
    <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
      {/* Header with Navigation Buttons */}
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
        {/* Icon and Buttons on same line */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'relative',
          mb: 2 
        }}>
          {/* Back Button */}
          <Button
            variant="outlined"
            onClick={onPrevious}
            startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Back to Recruiters
          </Button>

          {/* Centered Icon */}
          <TrendingUpIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          
          {/* Get Started Button */}
          <Button
            variant="contained"
            onClick={handleGetStarted}
            endIcon={<LaunchIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Start Your Job Search
          </Button>
        </Box>
        
        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          You Can Now Automate This At Scale!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          To maximize your job search success with auto-job.ai, we highly recommend upgrading to one of our plans to put your job search on hyperdrive.
        </Typography>
      </Box>

      {/* Prominent Upgrade Button for Free Users */}
      {isFreePlan && (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            color="warning"
            size="large"
            onClick={handleUpgrade}
            startIcon={<UpgradeIcon />}
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 8px 24px rgba(255, 152, 0, 0.3)',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(255, 152, 0, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            🚀 Upgrade to Hunter Plan - Unlock Everything!
          </Button>
        </Box>
      )}

      {/* Achievements Summary */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          {achievements.map((achievement, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card elevation={0} sx={{ border: `1px solid ${theme.palette.success.main}30`, borderRadius: 2 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  {achievement.icon}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                    {achievement.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    {achievement.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Recommended Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
          🚀 Recommended Next Steps
        </Typography>
        <Grid container spacing={3}>
          {nextSteps.map((step, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`, 
                  borderRadius: 2,
                  height: '100%',
                  opacity: step.available ? 1 : 0.7,
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    {step.icon}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {step.title}
                        </Typography>
                        {step.premium && (
                          <Chip 
                            label="Paid Plan" 
                            size="small" 
                            color="warning" 
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {step.description}
                      </Typography>
                      <Button
                        variant={step.available ? "outlined" : "outlined"}
                        size="small"
                        disabled={!step.available && !step.premium}
                        onClick={step.onClick}
                        sx={{ borderRadius: 2 }}
                      >
                        {step.premium && !step.available ? 'Upgrade to Access' : step.action}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Streamlined Features Info for Free Users */}
      {isFreePlan && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            backgroundColor: theme.palette.info.main + '10',
            borderColor: theme.palette.info.main + '30'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main', mb: 1 }}>
            ✨ What You Get with Hunter Plan ($34.99/month)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <AutoAwesomeIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Weekly automated job searches"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <AutoAwesomeIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Unlimited resume tailoring"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <AutoAwesomeIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Full recruiter database access"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <TimelineIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="3x more job opportunities"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <TimelineIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="50% faster job search process"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <TimelineIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Higher interview success rate"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Alert>
      )}
    </Paper>
  );
};

export default NextStepsGuide;
