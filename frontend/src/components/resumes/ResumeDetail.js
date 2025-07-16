// src/components/resumes/ResumeDetail.js - ENHANCED TAILORED RESUME DISPLAY
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
  LinearProgress,
  Tooltip
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
  Insights as InsightsIcon,
  CompareArrows as CompareArrowsIcon,
  EmojiEvents as EmojiEventsIcon
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
 * Enhanced ResumeDetail component with tailored resume detection and comparison
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
  const [originalResume, setOriginalResume] = useState(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);

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

  // ENHANCED: Fetch original resume for comparison if this is a tailored resume
  const fetchOriginalResumeForComparison = useCallback(async () => {
    if (!resume?.isTailored || !resume?.tailoredForJob?.originalResumeId) return;
    
    setLoadingOriginal(true);
    try {
      const originalResumeData = await resumeService.getResumeById(resume.tailoredForJob.originalResumeId);
      setOriginalResume(originalResumeData.resume);
      console.log('📊 Original resume loaded for comparison:', {
        originalScore: originalResumeData.resume?.analysis?.overallScore,
        tailoredScore: resume?.analysis?.overallScore,
        improvement: resume?.analysis?.overallScore - originalResumeData.resume?.analysis?.overallScore
      });
    } catch (error) {
      console.error('Error fetching original resume for comparison:', error);
    } finally {
      setLoadingOriginal(false);
    }
  }, [resume]);

  // Fetch AI-generated job suggestions for onboarding
  const fetchJobSuggestions = useCallback(async () => {
    if (!resume || !resume.analysis) return;
    
    setLoadingSuggestions(true);
    try {
      const suggestions = await resumeService.getJobSuggestions(resume._id);
      setJobSuggestions(suggestions || []);
    } catch (error) {
      console.error('Error fetching job suggestions:', error);
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

  // ENHANCED: Load original resume for tailored resume comparison
  useEffect(() => {
    if (resume?.isTailored) {
      fetchOriginalResumeForComparison();
    }
  }, [resume, fetchOriginalResumeForComparison]);

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

  const handleViewOriginalResume = () => {
    if (resume?.tailoredForJob?.originalResumeId) {
      navigate(`/resumes/${resume.tailoredForJob.originalResumeId}`);
    }
  };

  // ENHANCED: Tailored Resume Comparison Component
  const TailoredResumeComparison = () => {
    if (!resume?.isTailored || !originalResume) return null;

    const currentScore = resume?.analysis?.overallScore || 0;
    const originalScore = originalResume?.analysis?.overallScore || 0;
    const improvement = currentScore - originalScore;
    const currentAtsScore = resume?.analysis?.atsCompatibility || 0;
    const originalAtsScore = originalResume?.analysis?.atsCompatibility || 0;
    const atsImprovement = currentAtsScore - originalAtsScore;

    return (
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.success.main}08 0%, ${theme.palette.info.main}08 100%)`,
          border: `2px solid ${theme.palette.success.main}30`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EmojiEventsIcon sx={{ color: 'success.main', fontSize: 28, mr: 1.5 }} />
          <Typography variant="h6" fontWeight={600} color="success.dark">
            🎯 Tailored Resume Performance
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This resume has been AI-tailored for <strong>{resume.tailoredForJob?.jobTitle}</strong> at <strong>{resume.tailoredForJob?.company}</strong>
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.success.main}30` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Overall Resume Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {originalScore}%
                  </Typography>
                  <CompareArrowsIcon color="action" />
                  <Typography variant="h4" fontWeight={700} color="success.main" sx={{ ml: 1 }}>
                    {currentScore}%
                  </Typography>
                </Box>
                {improvement > 0 && (
                  <Chip 
                    label={`+${improvement} points`} 
                    color="success" 
                    size="small"
                    icon={<TrendingUpIcon />}
                  />
                )}
                {improvement === 0 && (
                  <Chip 
                    label="No change detected" 
                    color="warning" 
                    size="small"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.info.main}30` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  ATS Compatibility
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {originalAtsScore}%
                  </Typography>
                  <CompareArrowsIcon color="action" />
                  <Typography variant="h4" fontWeight={700} color="info.main" sx={{ ml: 1 }}>
                    {currentAtsScore}%
                  </Typography>
                </Box>
                {atsImprovement > 0 && (
                  <Chip 
                    label={`+${atsImprovement} points`} 
                    color="info" 
                    size="small"
                    icon={<TrendingUpIcon />}
                  />
                )}
                {atsImprovement === 0 && (
                  <Chip 
                    label="No change detected" 
                    color="warning" 
                    size="small"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tailoring Details */}
        {resume.parsedData?.tailoringMetadata && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Tailoring Optimizations Applied:
            </Typography>
            <Grid container spacing={2}>
              {resume.parsedData.tailoringMetadata.improvementsApplied?.summaryUpdated && (
                <Grid item xs={6} sm={3}>
                  <Chip label="Summary Optimized" color="success" size="small" />
                </Grid>
              )}
              {resume.parsedData.tailoringMetadata.improvementsApplied?.experienceEnhanced && (
                <Grid item xs={6} sm={3}>
                  <Chip label="Experience Enhanced" color="success" size="small" />
                </Grid>
              )}
              {resume.parsedData.tailoringMetadata.improvementsApplied?.skillsOptimized && (
                <Grid item xs={6} sm={3}>
                  <Chip label="Skills Optimized" color="success" size="small" />
                </Grid>
              )}
              {resume.parsedData.tailoringMetadata.improvementsApplied?.keywordsAdded && (
                <Grid item xs={6} sm={3}>
                  <Chip label="Keywords Added" color="success" size="small" />
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={handleViewOriginalResume}
          >
            View Original Resume
          </Button>
          {improvement === 0 && (
            <Tooltip title="If scores haven't improved, try refreshing the analysis">
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleManualRefresh}
                color="warning"
              >
                Refresh Analysis
              </Button>
            </Tooltip>
          )}
        </Box>
      </Paper>
    );
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

          {/* Call to Action */}
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

        {/* ENHANCED: Show Tailored Resume Comparison */}
        {!showOnboarding && resume?.isTailored && (
          <TailoredResumeComparison />
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  fontWeight={700} 
                  color="primary"
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mr: 2
                  }}
                >
                  {resume.name}
                </Typography>
                {resume.isTailored && (
                  <Chip 
                    icon={<AutoAwesomeIcon />} 
                    label="AI Tailored" 
                    color="success" 
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<DescriptionIcon />} 
                  label={resume.fileType} 
                  size="small" 
                  sx={{ mr: 1, mb: 0.5 }} 
                />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                  Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                </Typography>
                {resume.analysis && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
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