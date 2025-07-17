import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  LocationOn as LocationOnIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import resumeService from '../../utils/resumeService';
import ResumeAnalysisSummary from './ResumeAnalysisSummary';
import JobRecommendations from './JobRecommendations';
import RecruiterShowcase from './RecruiterShowcase';
import NextStepsGuide from './NextStepsGuide';
import { useSubscription } from '../../context/SubscriptionContext';
import MainLayout from '../layout/MainLayout';

const OnboardingWelcome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id: resumeId } = useParams();
  const [searchParams] = useSearchParams();
  const showOnboarding = searchParams.get('showOnboarding') === 'true';
  
  const { planInfo, isFreePlan } = useSubscription();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardingData, setOnboardingData] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Resume Analysis', icon: <PsychologyIcon /> },
    { label: 'Job Matches', icon: <WorkIcon /> },
    { label: 'Recruiters', icon: <PeopleIcon /> },
    { label: 'Next Steps', icon: <TrendingUpIcon /> }
  ];

  useEffect(() => {
    if (showOnboarding && resumeId) {
      loadOnboardingData();
    } else {
      // If not a first-time user, redirect to normal resume detail
      navigate(`/resumes/${resumeId}`);
    }
  }, [resumeId, showOnboarding, navigate]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🎯 Loading onboarding data for resume:', resumeId);
      
      // Call the new onboarding endpoint
      const response = await resumeService.getFirstResumeAnalysis(resumeId);
      
      if (response.success) {
        setOnboardingData(response.data);
        console.log('✅ Onboarding data loaded:', {
          resumeScore: response.data.resumeAnalysis.overallScore,
          jobsFound: response.data.jobs.length,
          recruitersFound: response.data.recruiters.length
        });
      } else {
        throw new Error(response.message || 'Failed to load onboarding data');
      }
      
    } catch (err) {
      console.error('❌ Error loading onboarding data:', err);
      setError(err.message || 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  const handleGetStarted = () => {
    // Navigate to the main resume detail page
    navigate(`/resumes/${resumeId}`);
  };

  const handleUpgrade = () => {
    navigate('/settings?tab=subscription');
  };

  if (!showOnboarding) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Please wait while we get your profile setup
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
              We're analyzing your resume and finding some specific job matches and recruiters just for you...
            </Typography>
            <LinearProgress sx={{ width: '100%', maxWidth: 400, mt: 3 }} />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate(`/resumes/${resumeId}`)}>
            Continue to Resume
          </Button>
        </Container>
      </MainLayout>
    );
  }

  if (!onboardingData) {
    return null;
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header - Reduced height and removed green checkmark */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
            Welcome to auto-job.ai! 🎉
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Your resume has been analyzed and we've found personalized job matches and recruiters just for you.
          </Typography>
        </Box>

        {/* Plan indicator */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Chip 
            label={planInfo?.displayName || 'Free Plan'}
            sx={{ 
              backgroundColor: planInfo?.backgroundColor || theme.palette.grey[100],
              color: planInfo?.color || theme.palette.text.primary,
              fontWeight: 600,
              px: 2
            }}
          />
        </Box>

        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((step, index) => (
            <Step key={step.label} completed={index < activeStep}>
              <StepLabel 
                StepIconComponent={() => step.icon}
                onClick={() => handleStepClick(index)}
                sx={{ cursor: 'pointer' }}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Content Sections */}
      <Box sx={{ mb: 4 }}>
        {activeStep === 0 && (
          <ResumeAnalysisSummary 
            analysis={onboardingData.resumeAnalysis}
            onNext={() => setActiveStep(1)}
          />
        )}
        
        {activeStep === 1 && (
          <JobRecommendations 
            jobs={onboardingData.jobs}
            onNext={() => setActiveStep(2)}
            onPrevious={() => setActiveStep(0)}
          />
        )}
        
        {activeStep === 2 && (
          <RecruiterShowcase 
            recruiters={onboardingData.recruiters}
            onNext={() => setActiveStep(3)}
            onPrevious={() => setActiveStep(1)}
          />
        )}
        
        {activeStep === 3 && (
          <NextStepsGuide 
            resumeId={resumeId}
            jobsCount={onboardingData.jobs.length}
            recruitersCount={onboardingData.recruiters.length}
            onGetStarted={handleGetStarted}
            onUpgrade={handleUpgrade}
            onPrevious={() => setActiveStep(2)}
          />
        )}
      </Box>


      </Container>
    </MainLayout>
  );
};

export default OnboardingWelcome;
