// src/components/resumes/ResumeDetail.js - ENHANCED WITH ANALYSIS REFRESH
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  Person as PersonIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
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

/**
 * Main ResumeDetail component - now modular and streamlined with progress tracking and ANALYSIS REFRESH
 * Orchestrates all the individual components and manages state
 */
const ResumeDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [showComparison, setShowComparison] = useState(false);

  // Custom hooks for data and AI integration
  const { 
    resume, 
    loading, 
    error, 
    processingStatus, 
    fetchResumeDetails, 
    forceRefreshResume // 🔥 NEW: Use force refresh function
  } = useResumeData(id);
  
  const { 
    aiProcessing, 
    aiSuccess, 
    openAiChat, 
    handleQuickAction,
    progressStage,
    progressPercentage,
    comparisonData
  } = useAiIntegration(resume, forceRefreshResume); // 🔥 FIXED: Use force refresh

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

  // 🔥 CRITICAL FIX: Enhanced resume update event listener with analysis refresh
  useEffect(() => {
    const handleResumeUpdate = async (event) => {
      if (event.detail?.resumeId === id) {
        console.log('🔄 ResumeDetail: Resume update event received, force refreshing...');
        
        // Force refresh the resume data to get new analysis scores
        await forceRefreshResume();
        
        // Show success alert with new scores if available
        let message = event.detail.message || '✅ Resume updated successfully!';
        
        if (event.detail.newAnalysis) {
          message += `\n📊 New Scores: Overall ${event.detail.newAnalysis.overallScore}%, ATS ${event.detail.newAnalysis.atsCompatibility}%`;
        }
        
        setAlert({
          open: true,
          message: message,
          severity: 'success'
        });
        
        // Auto-hide alert after longer duration for detailed messages
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
      // Get the latest version or fall back to original
      let downloadUrl;
      
      if (resume.versions && resume.versions.length > 0) {
        // Get the most recent version
        const latestVersion = resume.versions[resume.versions.length - 1];
        downloadUrl = latestVersion.downloadUrl;
        console.log('📥 Downloading latest version:', latestVersion.versionNumber, latestVersion.createdAt);
      } else {
        // Fall back to original file
        downloadUrl = resume.downloadUrl;
        console.log('📥 Downloading original file');
      }
      
      if (downloadUrl) {
        // Open in new tab to trigger download
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

  // 🔥 ENHANCED: Force refresh function for manual refresh button
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
                  whiteSpace: 'pre-line' // Allow line breaks in success messages
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
                {/* 🔥 ENHANCED: Show analysis scores in header */}
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
                onClick={handleManualRefresh} // 🔥 FIXED: Use force refresh
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

        {/* AI Editing Toolbar */}
        <AiEditingToolbar
          resume={resume}
          onQuickAction={handleQuickAction}
          onOpenChat={openAiChat}
          aiProcessing={aiProcessing}
          progressStage={progressStage}
          progressPercentage={progressPercentage}
        />

        {/* Main Content Tabs */}
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