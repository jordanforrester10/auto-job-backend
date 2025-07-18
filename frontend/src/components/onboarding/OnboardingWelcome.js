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
import JobPreferencesStep from './JobPreferencesStep';
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
  const [jobPreferences, setJobPreferences] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);

  const steps = [
    { label: 'Resume Analysis', icon: <PsychologyIcon /> },
    { label: 'Job Preferences', icon: <LocationOnIcon /> },
    { label: 'Job Matches', icon: <WorkIcon /> },
    { label: 'Recruiters', icon: <PeopleIcon /> },
    { label: 'Next Steps', icon: <TrendingUpIcon /> }
  ];

  useEffect(() => {
    if (showOnboarding && resumeId) {
      loadOnboardingData();
      checkOnboardingStatus();
    } else {
      // If not a first-time user, redirect to normal resume detail
      navigate(`/resumes/${resumeId}`);
    }
  }, [resumeId, showOnboarding, navigate]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking onboarding status for flow control...');
      const status = await resumeService.checkOnboardingStatus(resumeId);
      setOnboardingStatus(status);
      
      console.log('📊 Onboarding status:', status);
      
      // If flow is locked (preferences already set), skip to job recommendations
      if (status.lockedFlow && status.preferencesSet) {
        console.log('🔒 Flow is locked - skipping to job recommendations');
        setJobPreferences(status.currentPreferences);
        setActiveStep(2); // Skip to job recommendations
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Continue with normal flow if check fails
    }
  };

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

  // Handle job preferences collection
  const handleJobPreferences = async (locations, jobTitles) => {
    try {
      setLoadingJobs(true);
      setJobPreferences({ locations, jobTitles });
      
      console.log('🎯 Job preferences collected:', { locations, jobTitles });
      
      // Call backend to get personalized jobs based on preferences using onboarding-specific endpoint
      const response = await resumeService.getPersonalizedJobsForOnboarding(resumeId, {
        locations: locations,
        jobTitles: jobTitles
      });
      
      if (response.success && response.jobs && response.jobs.length > 0) {
        // Update onboarding data with personalized jobs AND recruiters
        setOnboardingData(prev => ({
          ...prev,
          jobs: response.jobs,
          recruiters: response.recruiters || prev.recruiters || [], // Include recruiters from API response
          personalizedJobs: true
        }));
        
        console.log('✅ Personalized jobs found:', response.jobs.length);
        console.log('✅ Recruiters found:', (response.recruiters || []).length);
      } else {
        console.warn('⚠️ Job search failed, using fallback jobs');
        // Keep existing jobs as fallback
      }
      
      // Move to job recommendations step
      setActiveStep(2);
      
    } catch (error) {
      console.error('❌ Error getting personalized jobs:', error);
      // Continue with existing jobs as fallback
      setActiveStep(2);
    } finally {
      setLoadingJobs(false);
    }
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
          <JobPreferencesStep
            onContinue={handleJobPreferences}
            onPrevious={() => setActiveStep(0)}
            resumeAnalysis={onboardingData.resumeAnalysis}
            loading={loadingJobs}
          />
        )}
        
        {activeStep === 2 && (
          <>
            {loadingJobs ? (
              <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, textAlign: 'center' }}>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h5" gutterBottom>
                  Finding Your Perfect Jobs! 🔍
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                  We're searching for {jobPreferences?.jobTitles?.join(', ')} positions in {jobPreferences?.locations?.map(loc => loc.name).join(', ')}...
                </Typography>
                <LinearProgress sx={{ width: '100%', maxWidth: 400, mt: 3, mx: 'auto' }} />
              </Paper>
            ) : (
              <JobRecommendations 
                jobs={onboardingData.jobs}
                locations={jobPreferences?.locations}
                jobTitles={jobPreferences?.jobTitles}
                personalizedJobs={onboardingData.personalizedJobs}
                onNext={() => setActiveStep(3)}
                onPrevious={() => setActiveStep(1)}
                allowBackToPreferences={!onboardingStatus?.lockedFlow}
              />
            )}
          </>
        )}
        
        {activeStep === 3 && (
          <RecruiterShowcase 
            recruiters={onboardingData.recruiters}
            onNext={() => setActiveStep(4)}
            onPrevious={() => setActiveStep(2)}
          />
        )}
        
        {activeStep === 4 && (
          <NextStepsGuide 
            resumeId={resumeId}
            jobsCount={onboardingData.jobs.length}
            recruitersCount={onboardingData.recruiters.length}
            onGetStarted={handleGetStarted}
            onUpgrade={handleUpgrade}
            onPrevious={() => setActiveStep(3)}
          />
        )}
      </Box>


      </Container>
    </MainLayout>
  );
};

export default OnboardingWelcome;
