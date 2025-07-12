// src/components/resumes/ResumeDetail.js - FIXED ESLINT ERRORS
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  ButtonGroup,
  Fade,
  Chip,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  Person as PersonIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  WorkOutline as WorkOutlineIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Speed as SpeedIcon,
  Assignment as AssignmentIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import MainLayout from '../layout/MainLayout';

// Import custom hooks
import { useResumeData } from './hooks/useResumeData';
import { useAiIntegration } from './hooks/useAiIntegration';

// Import components
import TabPanel from './components/TabPanel';
import ProcessingView from './components/ProcessingView';
import AiEditingToolbar from './components/AiEditingToolbar';
import BeforeAfterComparison from './components/BeforeAfterComparison';

// Import tab content components
import OverviewTab from './tabs/OverviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import ContentTab from './tabs/ContentTab';

// Import services
import resumeService from '../../utils/resumeService';

/**
 * Enhanced ResumeDetail component with onboarding flow for first-time users
 */
const ResumeDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showOnboarding = searchParams.get('showOnboarding') === 'true';
  
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [showComparison, setShowComparison] = useState(false);
  const [jobSuggestions, setJobSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Custom hooks for data and AI integration
  const { 
    resume, 
    loading, 
    error, 
    processingStatus, 
    fetchResumeDetails, 
    forceRefreshResume
  } = useResumeData(id);
  
  const { 
    aiProcessing, 
    aiSuccess, 
    openAiChat, 
    handleQuickAction,
    progressStage,
    progressPercentage,
    comparisonData
  } = useAiIntegration(resume, forceRefreshResume);

  // Fetch AI-generated job suggestions for onboarding
  const fetchJobSuggestions = useCallback(async () => {
    if (!resume || !resume.analysis) return;
    
    setLoadingSuggestions(true);
    try {
      // Call backend to get AI-generated job suggestions based on resume
      const suggestions = await resumeService.getJobSuggestions(resume._id);
      setJobSuggestions(suggestions || []);
    } catch (error) {
      console.error('Error fetching job suggestions:', error);
      // Fallback to generic suggestions if API fails
      setJobSuggestions([
        'Senior Software Developer',
        'Full Stack Engineer', 
        'Technical Lead',
        'Software Architect'
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [resume]);

  useEffect(() => {
    if (showOnboarding && resume && resume.analysis) {
      fetchJobSuggestions();
    }
  }, [showOnboarding, resume, fetchJobSuggestions]);

  // Show comparison dialog when optimization completes
  useEffect(() => {
    if (comparisonData && !aiProcessing) {
      setShowComparison(true);
    }
  }, [comparisonData, aiProcessing]);

  // Polling for processing status
  useEffect(() => {
    if (processingStatus === 'in-progress') {
      const pollInterval = setInterval(() => fetchResumeDetails(true), 10000);
      return () => clearInterval(pollInterval);
    }
  }, [processingStatus, fetchResumeDetails]);

  // Initial load
  useEffect(() => {
    fetchResumeDetails();
  }, [fetchResumeDetails]);

  // Resume update event listener
  useEffect(() => {
    const handleResumeUpdate = async (event) => {
      if (event.detail?.resumeId === id) {
        console.log('🔄 ResumeDetail: Resume update event received, force refreshing...');
        
        await forceRefreshResume();
        
        let message = event.detail.message || '✅ Resume updated successfully!';
        
        if (event.detail.newAnalysis) {
          message += `\n📊 New Scores: Overall ${event.detail.newAnalysis.overallScore}%, ATS ${event.detail.newAnalysis.atsCompatibility}%`;
        }
        
        setAlert({
          open: true,
          message: message,
          severity: 'success'
        });
        
        setTimeout(() => {
          setAlert({ open: false, message: '', severity: 'success' });
        }, 8000);
      }
    };

    window.addEventListener('resumeUpdated', handleResumeUpdate);
    return () => window.removeEventListener('resumeUpdated', handleResumeUpdate);
  }, [id, forceRefreshResume]);

  const handleDownload = async () => {
    try {
      let downloadUrl;
      
      if (resume.versions && resume.versions.length > 0) {
        const latestVersion = resume.versions[resume.versions.length - 1];
        downloadUrl = latestVersion.downloadUrl;
        console.log('📥 Downloading latest version:', latestVersion.versionNumber, latestVersion.createdAt);
      } else {
        downloadUrl = resume.downloadUrl;
        console.log('📥 Downloading original file');
      }
      
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error('No download URL available');
      }
      
    } catch (error) {
      console.error('Download error:', error);
      setAlert({
        open: true,
        message: 'Failed to download the resume. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setAlert({
      open: true,
      message: 'Refreshing resume data...',
      severity: 'info'
    });
    
    try {
      await forceRefreshResume();
      setAlert({
        open: true,
        message: '✅ Resume data refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setAlert({
        open: true,
        message: '❌ Failed to refresh resume data.',
        severity: 'error'
      });
    }
  };

  const handleImportJob = () => {
    navigate('/jobs', { state: { openCreateDialog: true } });
  };

  // Enhanced Onboarding Component
  const OnboardingExperience = () => {
    const analysis = resume?.analysis || {};
    const overallScore = analysis.overallScore || 0;
    const atsScore = analysis.atsCompatibility || 0;
    
    return (
      <Fade in={true}>
        <Box sx={{ mb: 4 }}>
          {/* Success Header */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3, 
              background: `linear-gradient(135deg, ${theme.palette.success.main}15 0%, ${theme.palette.success.light}08 100%)`,
              border: `2px solid ${theme.palette.success.main}25`,
              borderRadius: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 32, mr: 2 }} />
              <Typography variant="h5" fontWeight={600} color="success.dark">
                🎉 Resume Analysis Complete!
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Your resume has been successfully analyzed. Here's what we found and how you can supercharge your job search.
            </Typography>
          </Paper>

          {/* Resume Scores */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SpeedIcon sx={{ fontSize: 28, mr: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Overall Resume Score
                    </Typography>
                  </Box>
                  <Typography variant="h2" fontWeight={700} sx={{ mb: 1 }}>
                    {overallScore}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    out of 100 points
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={overallScore} 
                    sx={{ 
                      mt: 2, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'white',
                        borderRadius: 4
                      }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssignmentIcon sx={{ fontSize: 28, mr: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      ATS Compatibility
                    </Typography>
                  </Box>
                  <Typography variant="h2" fontWeight={700} sx={{ mb: 1 }}>
                    {atsScore}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    passes automated screening
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={atsScore} 
                    sx={{ 
                      mt: 2, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'white',
                        borderRadius: 4
                      }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Score Breakdown */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <InsightsIcon sx={{ mr: 1, color: 'primary.main' }} />
              What Your Scores Mean
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Overall Score ({overallScore}/100)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {overallScore >= 80 && "Excellent! Your resume is well-optimized and should perform great in most applications."}
                    {overallScore >= 60 && overallScore < 80 && "Good foundation! With some improvements, you can significantly boost your interview chances."}
                    {overallScore < 60 && "There's room for improvement. Focus on the suggestions below to strengthen your resume."}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    ATS Compatibility ({atsScore}%)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {atsScore >= 80 && "Great! Your resume should pass through most automated screening systems."}
                    {atsScore >= 60 && atsScore < 80 && "Decent compatibility. Some formatting improvements could help with automated systems."}
                    {atsScore < 60 && "Your resume may struggle with automated screening. Consider restructuring for better ATS compatibility."}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Call to Action - Moved up for better visibility */}
          <Paper sx={{ 
            p: 4, 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white',
            borderRadius: 3,
            mb: 4
          }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              🚀 Ready to See the Magic?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
              Import a job description to see how our AI tailors your resume for maximum impact.
              You'll get detailed match analysis and specific improvement recommendations.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleImportJob}
              sx={{
                bgcolor: 'white',
                color: 'secondary.main',
                fontWeight: 600,
                py: 1.5,
                px: 4,
                borderRadius: 3,
                '&:hover': {
                  bgcolor: 'grey.100',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Import Your First Job Description
            </Button>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
              It takes less than 30 seconds to paste a job posting and see the results
            </Typography>
          </Paper>

          {/* Job Suggestions */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WorkOutlineIcon sx={{ mr: 1, color: 'secondary.main' }} />
              Based on Your Skills, Look for Jobs Like:
            </Typography>
            {loadingSuggestions ? (
              <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  AI is analyzing your profile to suggest relevant job types...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {jobSuggestions.map((job, index) => (
                  <Chip 
                    key={index}
                    label={job}
                    variant="outlined"
                    color="secondary"
                    sx={{ fontWeight: 500 }}
                  />
                ))}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              These job types align well with your experience and skills. Use these as keywords when searching job boards.
            </Typography>
          </Paper>

          {/* Tailoring Preview */}
          <Paper sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.warning.main}08 0%, ${theme.palette.warning.light}05 100%)`,
            border: `1px solid ${theme.palette.warning.main}20`
          }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesomeIcon sx={{ mr: 1, color: 'warning.main' }} />
              What You Could Achieve with Job Tailoring
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight={600} color="success.main">
                    +15-25
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    points in match scores
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    90%+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ATS system pass rate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    3x
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    more interview callbacks
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <TrendingUpIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Highlight relevant experience for each specific role"
                  secondary="AI identifies and emphasizes the most important skills and experiences"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PsychologyIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Optimize keywords for automated screening systems"
                  secondary="Get past ATS filters that 75% of resumes fail to pass"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Personalized improvement suggestions for each application"
                  secondary="Specific recommendations based on job requirements analysis"
                />
              </ListItem>
            </List>
          </Paper>
        </Box>
      </Fade>
    );
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
            Loading your resume details...
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/resumes')}
            sx={{ mt: 2 }}
          >
            Back to Resumes
          </Button>
        </Box>
      </MainLayout>
    );
  }

  // Processing state
  if (processingStatus === 'in-progress') {
    return <ProcessingView navigate={navigate} />;
  }

  if (!resume) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Resume not found.</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/resumes')}
            sx={{ mt: 2 }}
          >
            Back to Resumes
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
        {/* Navigation */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/resumes')}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Resumes
        </Button>

        {/* AI Success Message */}
        {aiSuccess && (
          <Fade in={!!aiSuccess}>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                '& .MuiAlert-message': {
                  whiteSpace: 'pre-line'
                }
              }}
              action={
                comparisonData && (
                  <Button 
                    color="inherit" 
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setShowComparison(true)}
                  >
                    View Changes
                  </Button>
                )
              }
            >
              {aiSuccess}
            </Alert>
          </Fade>
        )}

        {/* Show Enhanced Onboarding Experience for First-Time Users */}
        {showOnboarding && resume && resume.analysis && (
          <OnboardingExperience />
        )}

        {/* Header */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 3,
            backgroundImage: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.light}15 100%)` 
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ maxWidth: { xs: '80%', sm: '70%', md: '75%' } }}>
              <Typography 
                variant="h4" 
                component="h1" 
                fontWeight={700} 
                color="primary"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5
                }}
              >
                {resume.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<DescriptionIcon />} 
                  label={resume.fileType} 
                  size="small" 
                  sx={{ mr: 1, mb: 0.5 }} 
                />
                <Typography variant="body2" color="text.secondary">
                  Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                </Typography>
                {resume.analysis && (
                  <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`Score: ${resume.analysis.overallScore || 0}%`}
                      size="small"
                      color={resume.analysis.overallScore >= 80 ? 'success' : resume.analysis.overallScore >= 60 ? 'warning' : 'error'}
                    />
                    <Chip 
                      label={`ATS: ${resume.analysis.atsCompatibility || 0}%`}
                      size="small"
                      color={resume.analysis.atsCompatibility >= 80 ? 'success' : resume.analysis.atsCompatibility >= 60 ? 'warning' : 'error'}
                    />
                  </Box>
                )}
              </Box>
            </Box>
            
            <ButtonGroup>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleManualRefresh}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={handleDownload}
              >
                Download
              </Button>
            </ButtonGroup>
          </Box>
        </Paper>

        {/* AI Editing Toolbar - Only show if not in onboarding mode */}
        {!showOnboarding && (
          <AiEditingToolbar
            resume={resume}
            onQuickAction={handleQuickAction}
            onOpenChat={openAiChat}
            aiProcessing={aiProcessing}
            progressStage={progressStage}
            progressPercentage={progressPercentage}
          />
        )}

        {/* Main Content Tabs - Only show if not in onboarding mode */}
        {!showOnboarding && (
          <Box>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <Tab label="Overview" icon={<DescriptionIcon />} iconPosition="start" />
                <Tab label="Analysis" icon={<LightbulbIcon />} iconPosition="start" />
                <Tab label="Content" icon={<PersonIcon />} iconPosition="start" />
              </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
              <OverviewTab resume={resume} theme={theme} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <AnalysisTab resume={resume} theme={theme} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <ContentTab resume={resume} theme={theme} />
            </TabPanel>
          </Box>
        )}

        {/* Alert Snackbar */}
        <Snackbar 
          open={alert.open} 
          autoHideDuration={6000} 
          onClose={() => setAlert({ ...alert, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Before/After Comparison Dialog */}
        <BeforeAfterComparison
          open={showComparison}
          onClose={() => setShowComparison(false)}
          comparisonData={comparisonData}
        />
      </Box>
    </MainLayout>
  );
};

export default ResumeDetail;