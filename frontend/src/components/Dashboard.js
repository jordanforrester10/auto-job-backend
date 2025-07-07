// src/components/Dashboard.js - Updated with Embedded Getting Started Guide
import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Chip,
  useTheme,
  Paper,
  Alert,
  Skeleton,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Divider
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
  TrendingUp,
  Help,
  PlayArrow,
  Lock,
  Upgrade,
  Star,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import MainLayout from './layout/MainLayout';
import AutoJobLogo from './common/AutoJobLogo';
import resumeService from '../utils/resumeService';
import jobService from '../utils/jobService';

const Dashboard = () => {
  const theme = useTheme();
  const { currentUser } = useContext(AuthContext);
  const { currentSubscription, hasFeatureAccess } = useSubscription();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    resumeCount: 0,
    jobMatches: 0,
    applications: 0,
    resumeScore: 0,
    hasActiveResume: false,
    hasAnalyzedResumes: false
  });

  // Getting Started Guide state
  const [activeStep, setActiveStep] = useState(0);

  const userPlan = currentSubscription?.tier || 'free';

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load resumes and jobs in parallel
        const [resumesData, jobsData] = await Promise.all([
          resumeService.getUserResumes().catch(() => []),
          jobService.getUserJobs().catch(() => [])
        ]);
        
        setResumes(resumesData);
        setJobs(jobsData);
        
        // Calculate stats
        const activeResume = resumesData.find(r => r.isActive);
        const completedJobs = jobsData.filter(j => j.analysisStatus?.status === 'completed');
        const applications = jobsData.filter(j => j.applicationStatus && j.applicationStatus !== 'Not Applied');
        
        // Calculate average resume score from all analyzed resumes
        let resumeScore = 0;
        const analyzedResumes = resumesData.filter(r => r.analysis?.overallScore);
        if (analyzedResumes.length > 0) {
          const totalScore = analyzedResumes.reduce((sum, r) => sum + r.analysis.overallScore, 0);
          resumeScore = Math.round(totalScore / analyzedResumes.length);
        }
        
        setStats({
          resumeCount: resumesData.length,
          jobMatches: completedJobs.length,
          applications: applications.length,
          resumeScore: resumeScore,
          hasActiveResume: !!activeResume,
          hasAnalyzedResumes: analyzedResumes.length > 0
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // Helper functions for Getting Started Guide
  const getFeatureStatus = (feature) => {
    const hasAccess = hasFeatureAccess(feature);
    const requiredPlan = getRequiredPlan(feature);
    
    return {
      hasAccess,
      requiredPlan,
      isLocked: !hasAccess
    };
  };

  const getRequiredPlan = (feature) => {
    const featurePlans = {
      'recruiterAccess': 'casual',
      'aiJobDiscovery': 'casual', 
      'aiAssistant': 'hunter',
      'resumeTailoring': 'free',
      'resumeUploads': 'free'
    };
    return featurePlans[feature] || 'free';
  };

  const getPlanColor = (plan) => {
    const colors = {
      'free': 'default',
      'casual': 'primary',
      'hunter': 'warning'
    };
    return colors[plan] || 'default';
  };

  const getPlanName = (plan) => {
    const names = {
      'free': 'Free',
      'casual': 'Casual',
      'hunter': 'Hunter'
    };
    return names[plan] || 'Free';
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  // Get user's first name
  const firstName = currentUser?.firstName || 'there';
  
  // Determine user journey stage
  const isFirstTimeUser = stats.resumeCount === 0;
  const hasResumes = stats.resumeCount > 0;
  const hasJobs = stats.jobMatches > 0;
  const hasApplications = stats.applications > 0;

  // Show embedded guide for first-time users or those with minimal activity
  const shouldShowEmbeddedGuide = isFirstTimeUser || (!hasJobs && stats.resumeCount < 2);

  // Feature Card Component
  const FeatureCard = ({ icon, title, description, feature, href }) => {
    const status = getFeatureStatus(feature);
    
    return (
      <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
        <CardContent sx={{ textAlign: 'center', pb: 3 }}>
          {status.isLocked && (
            <Chip
              size="small"
              label={`${getPlanName(status.requiredPlan)}+ Required`}
              color={getPlanColor(status.requiredPlan)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            />
          )}
          <Box sx={{ mb: 2, opacity: status.isLocked ? 0.5 : 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" sx={{ opacity: status.isLocked ? 0.7 : 1 }}>
            {title}
            {status.isLocked && <Lock sx={{ ml: 1, fontSize: 16, verticalAlign: 'middle' }} />}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          {status.isLocked ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Upgrade />}
              href="/settings"
            >
              Upgrade to {getPlanName(status.requiredPlan)}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              href={href}
            >
              Get Started
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Getting Started Steps for Embedded Guide
  const getEmbeddedSteps = () => [
    {
      label: 'Welcome to auto-job.ai',
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              You're currently on the <strong>{getPlanName(userPlan)}</strong> plan. 
              {userPlan === 'free' && ' Upgrade to access more powerful features!'}
            </Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Welcome! Let's get you set up to supercharge your job search with AI.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<UploadIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Upload Resume"
                description="Start with AI resume analysis"
                feature="resumeUploads"
                href="/resumes"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<WorkIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Find Jobs"
                description="Import and match jobs"
                feature="resumeTailoring"
                href="/jobs"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<PersonIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Contact Recruiters"
                description="Connect with hiring managers"
                feature="recruiterAccess"
                href="/recruiters"
              />
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Upload Your First Resume',
      content: (
        <Box>
          {userPlan === 'free' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Free Plan:</strong> Upload 1 resume. 
                <Button variant="text" size="small" href="/settings" sx={{ ml: 1 }}>
                  Upgrade for more
                </Button>
              </Typography>
            </Alert>
          )}
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Go to 'My Resumes'" 
                secondary="Click the sidebar or use the button below"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Upload your resume file" 
                secondary="PDF or DOCX format, get instant AI analysis"
              />
            </ListItem>
          </List>
          <Button 
            variant="contained" 
            startIcon={<UploadIcon />}
            href="/resumes"
            sx={{ mt: 2 }}
          >
            Upload Resume Now
          </Button>
        </Box>
      ),
    },
    {
      label: 'Find Job Opportunities',
      content: (
        <Box>
          {userPlan === 'free' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Free Plan:</strong> Import 3 jobs. 
                <Button variant="text" size="small" href="/settings" sx={{ ml: 1 }}>
                  Upgrade for 25+
                </Button>
              </Typography>
            </Alert>
          )}
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Import job descriptions" 
                secondary="Add jobs manually or via URL from job boards"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Get AI match analysis" 
                secondary="See how well your resume matches each opportunity"
              />
            </ListItem>
          </List>
          <Button 
            variant="contained" 
            startIcon={<WorkIcon />}
            href="/jobs"
            sx={{ mt: 2 }}
          >
            Explore Jobs
          </Button>
        </Box>
      ),
    }
  ];

  // FAQ Data
  const faqData = [
    {
      question: 'How do I get started?',
      answer: 'Upload your resume first, then import job descriptions to get AI-powered matching and optimization suggestions.'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support PDF and DOCX formats for resumes. Make sure your file is under 10MB for best results.'
    },
    {
      question: 'How does the job matching work?',
      answer: 'Our AI analyzes your resume against job descriptions, scoring compatibility and suggesting improvements.'
    }
  ];

  // Get contextual message based on user journey
  const getContextualMessage = () => {
    if (isFirstTimeUser) {
      return {
        title: `Welcome to auto-job.ai, ${firstName}!`,
        message: "Let's get you started! Follow the guide below to set up your profile and start finding opportunities."
      };
    }
    
    if (!stats.hasAnalyzedResumes) {
      return {
        title: `Hi ${firstName}! Let's analyze your resumes`,
        message: "I see you have resumes uploaded. Let me analyze them with AI to identify strengths and optimization opportunities."
      };
    }
    
    if (stats.resumeScore > 0 && stats.resumeScore < 70) {
      return {
        title: `Hi ${firstName}! Your resume shows potential`,
        message: `Your average resume score is ${stats.resumeScore}/100. Let's work together to boost that score!`
      };
    }
    
    return {
      title: `Welcome back, ${firstName}!`,
      message: "Continue your job search journey with the tools below."
    };
  };

  // Welcome Speech Bubble Component
  const WelcomeSpeechBubble = () => {
    const contextMessage = getContextualMessage();
    
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}12 0%, ${theme.palette.secondary.main}08 100%)`,
          border: `2px solid ${theme.palette.primary.main}25`,
          borderRadius: 3,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flexShrink: 0, mt: 0.5 }}>
            <AutoJobLogo variant="icon-only" size="medium" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              {contextMessage.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {contextMessage.message}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Embedded Getting Started Guide Component
  const EmbeddedGettingStartedGuide = () => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center' }}>
        Getting Started Guide
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {getEmbeddedSteps().map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="h6">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      startIcon={index === getEmbeddedSteps().length - 1 ? <CheckCircleIcon /> : <PlayArrow />}
                    >
                      {index === getEmbeddedSteps().length - 1 ? 'Complete Setup' : 'Continue'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === getEmbeddedSteps().length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Great! You're all set up!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You're ready to use auto-job.ai effectively. Your dashboard will show more insights as you add resumes and jobs.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mr: 1 }}
            >
              Refresh Dashboard
            </Button>
            <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
              Restart Guide
            </Button>
          </Paper>
        )}
      </Paper>

      {/* Additional Help */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Need more help?
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<Help />}
          href="/contact-support"
          size="small"
        >
          Contact Support
        </Button>
      </Box>
    </Box>
  );

  // Progress Steps Component (for users with some data)
  const ProgressSteps = () => {
    const steps = [
      {
        id: 'upload',
        title: 'Upload Resume',
        description: 'Add your resume files',
        completed: hasResumes,
        action: () => navigate('/resumes'),
        icon: <DescriptionIcon />,
        actionText: hasResumes ? 'Add More Resumes' : 'Upload Resume'
      },
      {
        id: 'analyze',
        title: 'Analysis',
        description: 'Get resume insights',
        completed: stats.hasAnalyzedResumes,
        action: () => navigate('/resumes'),
        icon: <AutoAwesomeIcon />,
        actionText: stats.hasAnalyzedResumes ? 'View Analysis' : 'Analyze Resumes'
      },
      {
        id: 'search',
        title: 'Find Jobs',
        description: 'Discover opportunities',
        completed: hasJobs,
        action: () => hasJobs ? navigate('/jobs') : navigate('/jobs'),
        icon: <SearchIcon />,
        actionText: hasJobs ? 'View Matches' : 'Start Job Search'
      },
      {
        id: 'apply',
        title: 'Apply & Track',
        description: 'Submit applications',
        completed: hasApplications,
        action: () => navigate('/jobs'),
        icon: <SendIcon />,
        actionText: hasApplications ? 'Track Applications' : 'Start Applying'
      }
    ];

    const completedSteps = steps.filter(s => s.completed).length;
    const progressPercentage = (completedSteps / steps.length) * 100;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Your Progress
            </Typography>
            <Chip 
              label={`${completedSteps}/${steps.length} Complete`}
              color={completedSteps === steps.length ? 'success' : 'primary'}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ 
              height: 8, 
              borderRadius: 4, 
              mb: 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
              }
            }} 
          />
          
          <Grid container spacing={2}>
            {steps.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={step.id}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    height: 140,
                    borderRadius: 2,
                    backgroundColor: step.completed ? 'success.main' : 'background.paper',
                    color: step.completed ? 'white' : 'text.primary',
                    border: step.completed ? 'none' : `2px solid ${theme.palette.grey[200]}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                      borderColor: step.completed ? 'transparent' : theme.palette.primary.main,
                      backgroundColor: step.completed ? 'success.dark' : 'background.paper'
                    }
                  }}
                  onClick={step.action}
                >
                  <Box sx={{ color: step.completed ? 'white' : theme.palette.primary.main, mb: 1 }}>
                    {step.completed ? <CheckCircleIcon /> : step.icon}
                  </Box>
                  
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1 }}>
                      {step.description}
                    </Typography>
                  </Box>
                  
                  {!step.completed && (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ 
                        fontSize: '0.7rem', 
                        minHeight: 'auto',
                        py: 0.5,
                        px: 1,
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                          color: 'white'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        step.action();
                      }}
                    >
                      {step.actionText}
                    </Button>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Stats Overview for existing users
  const StatsOverview = () => {
    if (isFirstTimeUser) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.resumeScore}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Resume Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WorkIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.jobMatches}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Job Matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.applications}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.resumeCount}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Resumes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 3 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
          <Grid container spacing={3}>
            {[...Array(4)].map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <WelcomeSpeechBubble />
        
        {!isFirstTimeUser && <StatsOverview />}
        
        {shouldShowEmbeddedGuide ? (
          // Show embedded Getting Started Guide for new/minimal users
          <EmbeddedGettingStartedGuide />
        ) : (
          // Show normal progress steps for users with data
          <ProgressSteps />
        )}
        
        {/* Call to action for users who completed the guide */}
        {!shouldShowEmbeddedGuide && (
          <Card sx={{ mt: 3, textAlign: 'center', p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Need a refresher?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Review the complete getting started guide anytime.
            </Typography>
            <Button 
              variant="outlined" 
              href="/getting-started"
              startIcon={<Help />}
            >
              View Full Guide
            </Button>
          </Card>
        )}
      </Box>
    </MainLayout>
  );
};

export default Dashboard;