// src/components/jobs/JobsPage.js - Enhanced with Complete Usage Integration AND Plan-Based Discover Jobs Restrictions
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Divider, 
  Chip, 
  CircularProgress, 
  Alert,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
  Snackbar,
  Dialog,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon, 
  Work as WorkIcon,
  ErrorOutline as ErrorOutlineIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Upgrade as UpgradeIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import jobService from '../../utils/jobService';
import resumeService from '../../utils/resumeService';
import MainLayout from '../layout/MainLayout';
import JobCreateDialog from './JobCreateDialog';
import FindJobsDialog from './FindJobsDialog';
import AutoJobLogo from '../common/AutoJobLogo';
import JobImportLimit from '../subscription/limits/JobImportLimit';
import { useSubscription } from '../../context/SubscriptionContext';

// Helper function to determine job analysis status
const getJobAnalysisStatus = (job) => {
  // If job has explicit analysisStatus field, use it
  if (job.analysisStatus && job.analysisStatus.status) {
    return {
      status: job.analysisStatus.status,
      progress: job.analysisStatus.progress || 0,
      message: job.analysisStatus.message || 'Processing...',
      canViewJob: job.analysisStatus.canViewJob !== false,
      skillsFound: job.analysisStatus.skillsFound,
      experienceLevel: job.analysisStatus.experienceLevel
    };
  }
  
  // For existing jobs without analysisStatus field, infer status from parsedData
  if (job.parsedData && Object.keys(job.parsedData).length > 0 && !job.parsedData.analysisError) {
    return {
      status: 'completed',
      progress: 100,
      message: `Analysis complete! Found ${job.parsedData.keySkills?.length || 0} key skills.`,
      canViewJob: true,
      skillsFound: job.parsedData.keySkills?.length || 0,
      experienceLevel: job.parsedData.experienceLevel
    };
  }
  
  // If parsedData exists but has errors
  if (job.parsedData && job.parsedData.analysisError) {
    return {
      status: 'error',
      progress: 0,
      message: 'Analysis failed',
      canViewJob: true,
      error: job.parsedData.analysisError
    };
  }
  
  // No parsedData means analysis hasn't been done yet
  return {
    status: 'pending',
    progress: 0,
    message: 'Analysis pending...',
    canViewJob: false
  };
};

// Inline JobAnalysisStatus component
const JobAnalysisStatus = ({ 
  analysisStatus, 
  size = 'normal', 
  variant = 'full', 
  showDetails = true 
}) => {
  if (!analysisStatus) {
    return null;
  }

  const { status, progress, message, skillsFound, experienceLevel } = analysisStatus;

  const statusConfig = {
    pending: {
      label: 'Analysis Queued',
      color: 'info',
      icon: HourglassEmptyIcon,
      bgColor: 'rgba(2, 136, 209, 0.1)',
      textColor: '#0288d1'
    },
    analyzing: {
      label: 'Analyzing Job',
      color: 'primary',
      icon: AutoAwesomeIcon,
      bgColor: 'rgba(26, 115, 232, 0.1)',
      textColor: '#1a73e8'
    },
    completed: {
      label: 'Analysis Complete',
      color: 'success',
      icon: CheckCircleIcon,
      bgColor: 'rgba(52, 168, 83, 0.1)',
      textColor: '#34a853'
    },
    error: {
      label: 'Analysis Failed',
      color: 'error',
      icon: ErrorOutlineIcon,
      bgColor: 'rgba(234, 67, 53, 0.1)',
      textColor: '#ea4335'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  const sizeConfig = {
    small: {
      iconSize: 16,
      chipHeight: 24,
      typography: 'caption',
      progressHeight: 4
    },
    normal: {
      iconSize: 20,
      chipHeight: 28,
      typography: 'body2',
      progressHeight: 6
    },
    large: {
      iconSize: 24,
      chipHeight: 32,
      typography: 'body1',
      progressHeight: 8
    }
  };

  const currentSize = sizeConfig[size];

  if (variant === 'chip') {
    return (
      <Chip
        icon={
          status === 'analyzing' ? (
            <CircularProgress 
              size={currentSize.iconSize} 
              thickness={6} 
              color={config.color}
            />
          ) : (
            <IconComponent 
              sx={{ 
                fontSize: `${currentSize.iconSize}px !important`,
                color: config.textColor 
              }} 
            />
          )
        }
        label={config.label}
        size={size}
        sx={{
          height: currentSize.chipHeight,
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: `1px solid ${config.textColor}`,
          fontWeight: 500,
          '& .MuiChip-icon': {
            color: `${config.textColor} !important`
          }
        }}
      />
    );
  }

  if (variant === 'progress-only') {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={config.color}
          sx={{
            height: currentSize.progressHeight,
            borderRadius: currentSize.progressHeight / 2,
            backgroundColor: config.bgColor,
            '& .MuiLinearProgress-bar': {
              borderRadius: currentSize.progressHeight / 2,
            }
          }}
        />
        {showDetails && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant={currentSize.typography} color="text.secondary">
              {message}
            </Typography>
            <Typography variant={currentSize.typography} color="text.secondary">
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: size === 'small' ? 1.5 : 2,
        borderRadius: 2,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.textColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {status === 'analyzing' ? (
          <CircularProgress 
            size={currentSize.iconSize} 
            thickness={6} 
            color={config.color}
          />
        ) : (
          <IconComponent 
            sx={{ 
              fontSize: currentSize.iconSize,
              color: config.textColor 
            }} 
          />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography 
            variant={currentSize.typography} 
            fontWeight={600}
            color={config.textColor}
            noWrap
          >
            {config.label}
          </Typography>
          
          {status === 'analyzing' && (
            <Chip
              icon={<SmartToyIcon sx={{ fontSize: '14px !important' }} />}
              label="AI"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.7rem',
                backgroundColor: config.textColor,
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white !important'
                }
              }}
            />
          )}
        </Box>

        {status !== 'completed' && status !== 'error' && (
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={config.color}
              sx={{
                height: currentSize.progressHeight,
                borderRadius: currentSize.progressHeight / 2,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: currentSize.progressHeight / 2,
                }
              }}
            />
          </Box>
        )}

        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color={config.textColor}
          sx={{ opacity: 0.9 }}
        >
          {message}
        </Typography>

        {status === 'completed' && showDetails && skillsFound !== undefined && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${skillsFound} skills found`}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                borderColor: config.textColor,
                color: config.textColor
              }}
            />
            {experienceLevel && (
              <Chip
                label={`${experienceLevel} level`}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  borderColor: config.textColor,
                  color: config.textColor
                }}
              />
            )}
          </Box>
        )}

        {status === 'error' && showDetails && (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 1, 
              py: 0.5,
              fontSize: '0.75rem',
              '& .MuiAlert-icon': {
                fontSize: '1rem'
              }
            }}
          >
            Analysis failed. You can still view the job, but some features may be limited.
          </Alert>
        )}
      </Box>

      {(status === 'analyzing' || status === 'pending') && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          fontWeight={600}
          color={config.textColor}
        >
          {progress}%
        </Typography>
      )}
    </Box>
  );
};

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-tabpanel-${index}`}
      aria-labelledby={`job-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const JobsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { 
    subscription, 
    usage, 
    planLimits, 
    canPerformAction, 
    getUsagePercentage,
    planInfo,
    hasFeatureAccess 
  } = useSubscription();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openFindJobsDialog, setOpenFindJobsDialog] = useState(false);
  const [openLimitDialog, setOpenLimitDialog] = useState(false);
  const [openAiDiscoveryLimitDialog, setOpenAiDiscoveryLimitDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [activeResumes, setActiveResumes] = useState([]);
  const [pollingJobs, setPollingJobs] = useState(new Set());

  // Safe AutoJobLogo wrapper component
  const SafeAutoJobLogo = ({ size = 'small' }) => {
    try {
      return (
        <AutoJobLogo 
          variant="icon-only" 
          size={size} 
          showTagline={false}
        />
      );
    } catch (error) {
      console.warn('AutoJobLogo failed to render:', error);
      return <SmartToyIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchActiveResumes();
  }, []);

  // Poll analysis status for jobs that are still processing
  useEffect(() => {
    const jobsNeedingPolling = jobs.filter(job => {
      const status = getJobAnalysisStatus(job);
      return (status.status === 'pending' || status.status === 'analyzing') && !pollingJobs.has(job._id);
    });

    jobsNeedingPolling.forEach(job => {
      startPollingJobStatus(job._id);
    });
  }, [jobs]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching jobs...');
      const jobsData = await jobService.getAllJobs();
      setJobs(jobsData || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.response?.data?.message || 'Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveResumes = async () => {
    try {
      const resumesData = await resumeService.getUserResumes();
      setActiveResumes(resumesData.filter(r => r.isActive) || []);
    } catch (err) {
      console.error('Error fetching active resumes:', err);
    }
  };

  // Start polling for a specific job's analysis status
  const startPollingJobStatus = async (jobId) => {
    if (pollingJobs.has(jobId)) {
      return; // Already polling this job
    }

    setPollingJobs(prev => new Set([...prev, jobId]));

    try {
      // Check if jobService.pollJobAnalysisStatus exists before using it
      if (typeof jobService.pollJobAnalysisStatus === 'function') {
        await jobService.pollJobAnalysisStatus(
          jobId,
          (statusUpdate) => {
            // Update the specific job's status in real-time
            setJobs(prevJobs => prevJobs.map(job => 
              job._id === jobId 
                ? { ...job, analysisStatus: statusUpdate }
                : job
            ));
          },
          30 // Max 30 attempts (60 seconds)
        );
      } else {
        console.warn('pollJobAnalysisStatus method not available in jobService');
      }
    } catch (error) {
      console.error(`Polling failed for job ${jobId}:`, error);
      
      // Update job to show error state
      setJobs(prevJobs => prevJobs.map(job => 
        job._id === jobId 
          ? { 
              ...job, 
              analysisStatus: { 
                status: 'error', 
                message: 'Analysis status polling failed',
                progress: 0,
                canViewJob: true
              }
            }
          : job
      ));
    } finally {
      // Remove from polling set
      setPollingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleOpenCreateDialog = () => {
    // Check usage limits before opening dialog
    const permission = canPerformAction('jobImports', 1);
    if (!permission.allowed) {
      setOpenLimitDialog(true);
      return;
    }
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  // UPDATED: Handle AI job discovery with plan-based restrictions
  const handleOpenFindJobsDialog = () => {
    const currentPlan = subscription?.subscriptionTier || 'free';
    
    // RESTRICTION 1: Free users cannot access AI job discovery
    if (currentPlan === 'free') {
      setOpenAiDiscoveryLimitDialog(true);
      return;
    }
    
    // RESTRICTION 2: Casual users can only create 1 AI job discovery
    if (currentPlan === 'casual') {
      const aiDiscoveryUsage = usage?.aiJobDiscovery || { used: 0, limit: 1 };
      if (aiDiscoveryUsage.used >= aiDiscoveryUsage.limit) {
        setOpenAiDiscoveryLimitDialog(true);
        return;
      }
    }
    
    // RESTRICTION 3: Hunter users have unlimited access (no additional checks needed)
    
    setOpenFindJobsDialog(true);
  };

  const handleCloseFindJobsDialog = () => {
    setOpenFindJobsDialog(false);
  };

  const handleJobCreated = (newJob) => {
    fetchJobs(); // Refresh the entire list
    handleCloseCreateDialog();
    showSnackbar('Job created successfully - analysis in progress', 'success');
    
    // Start polling the new job if it has an ID
    if (newJob?.job?.id) {
      setTimeout(() => {
        startPollingJobStatus(newJob.job.id);
      }, 1000);
    }
  };

  const handleMenuOpen = (event, jobId) => {
    setAnchorEl(event.currentTarget);
    setSelectedJobId(jobId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJobId(null);
  };

  const handleDeleteJob = async () => {
    if (!selectedJobId) return;
    
    try {
      await jobService.deleteJob(selectedJobId);
      setJobs(prevJobs => prevJobs.filter(job => job._id !== selectedJobId));
      handleMenuClose();
      showSnackbar('Job deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting job:', err);
      showSnackbar('Failed to delete job', 'error');
    }
  };

  const handleJobClick = (job) => {
    const status = getJobAnalysisStatus(job);
    
    // Check if analysis is complete before allowing navigation
    if (!status.canViewJob) {
      showSnackbar('Please wait for job analysis to complete before viewing details', 'warning');
      return;
    }
    
    navigate(`/jobs/${job._id}`);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const handleJobsFindCompleted = () => {
    fetchJobs();
    handleCloseFindJobsDialog();
    showSnackbar('AI job search initiated. Jobs will appear as they are found.', 'success');
  };

  const handleUpgrade = (plan) => {
    // Navigate to pricing page or subscription management
    window.open('/pricing', '_blank');
    setOpenLimitDialog(false);
    setOpenAiDiscoveryLimitDialog(false);
  };

  // Calculate usage statistics
  const jobImportUsage = usage?.jobImports || { used: 0, limit: planLimits?.jobImports || 0 };
  const usagePercentage = getUsagePercentage('jobImports');
  const isApproachingLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  // NEW: Calculate AI discovery usage and restrictions
  const aiDiscoveryUsage = usage?.aiJobDiscovery || { used: 0, limit: planLimits?.aiJobDiscovery || 0 };
  const aiDiscoveryPercentage = getUsagePercentage('aiJobDiscovery');
  const isAiDiscoveryAtLimit = planLimits?.aiJobDiscovery !== -1 && aiDiscoveryUsage.used >= aiDiscoveryUsage.limit;
  const hasAiDiscoveryAccess = hasFeatureAccess('aiJobDiscovery');
  const currentPlan = subscription?.subscriptionTier || 'free';

  const getUsageColor = () => {
    if (isAtLimit) return 'error';
    if (isApproachingLimit) return 'warning';
    return 'success';
  };

  // NEW: Get AI discovery button state and tooltip
  const getAiDiscoveryButtonState = () => {
    if (currentPlan === 'free') {
      return {
        disabled: true,
        tooltip: 'AI Job Discovery requires Casual plan or higher',
        text: 'Discover Jobs (Upgrade Required)',
        icon: LockIcon
      };
    }
    
    if (currentPlan === 'casual' && isAiDiscoveryAtLimit) {
      return {
        disabled: true,
        tooltip: 'You\'ve used your 1 AI job discovery for this month. Upgrade to Hunter for unlimited searches.',
        text: 'Discover Jobs (Limit Reached)',
        icon: LockIcon
      };
    }
    
    return {
      disabled: false,
      tooltip: currentPlan === 'casual' 
        ? `Create AI job search (${aiDiscoveryUsage.used}/${aiDiscoveryUsage.limit} used)`
        : 'Create unlimited AI job searches',
      text: 'Discover Jobs',
      icon: SafeAutoJobLogo
    };
  };

  const aiDiscoveryButtonState = getAiDiscoveryButtonState();

  const renderUsageCard = () => (
    <Card 
      sx={{ 
        mb: 3, 
        borderRadius: 2,
        border: `1px solid ${theme.palette[getUsageColor()].main}`,
        backgroundColor: `${theme.palette[getUsageColor()].main}08`
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color={getUsageColor()} />
            <Typography variant="subtitle1" fontWeight={600}>
              Usage Summary - {planInfo?.displayName || 'Current Plan'}
            </Typography>
          </Box>
          <Chip 
            label={planLimits?.jobImports === -1 ? 'Unlimited' : `${jobImportUsage.used || 0}/${planLimits?.jobImports || 0}`}
            color={getUsageColor()}
            sx={{ fontWeight: 500 }}
          />
        </Box>
        
        {/* Job Imports Progress */}
        {planLimits?.jobImports !== -1 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Job Imports
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {jobImportUsage.used || 0}/{planLimits?.jobImports || 0}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(usagePercentage, 100)}
              color={getUsageColor()}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* AI Job Discovery Progress */}
        {hasAiDiscoveryAccess && planLimits?.aiJobDiscovery !== -1 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                AI Job Discovery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {aiDiscoveryUsage.used || 0}/{planLimits?.aiJobDiscovery || 0}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(aiDiscoveryPercentage, 100)}
              color={isAiDiscoveryAtLimit ? 'error' : 'info'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary">
          {planLimits?.jobImports === -1 
            ? '✨ You have unlimited job imports with your Hunter plan!'
            : isAtLimit 
              ? '⚠️ You\'ve reached your monthly job import limit. Upgrade for more capacity.'
              : isApproachingLimit
                ? '⚠️ You\'re approaching your monthly job import limit.'
                : `🎯 ${planLimits?.jobImports - (jobImportUsage.used || 0)} job imports remaining this month.`
          }
          {currentPlan === 'free' && (
            <><br/>🔒 AI Job Discovery requires Casual plan or higher.</>
          )}
          {currentPlan === 'casual' && isAiDiscoveryAtLimit && (
            <><br/>🔒 AI Job Discovery limit reached. Upgrade to Hunter for unlimited searches.</>
          )}
        </Typography>

        {(isAtLimit || isApproachingLimit || currentPlan === 'free' || isAiDiscoveryAtLimit) && (
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Upgrade for more capacity:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>Casual Plan ($19.99/month):</strong> 25 job imports, 1 AI job discovery<br/>
              • <strong>Hunter Plan ($34.99/month):</strong> Unlimited job imports & AI discoveries
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UpgradeIcon />}
              onClick={() => setOpenLimitDialog(true)}
              sx={{ mt: 1, borderRadius: 2 }}
            >
              View Plans
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderEmptyState = () => (
    <Box sx={{ mt: 2 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3, 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          backgroundColor: theme => theme.palette.background.paper,
          border: `1px solid`,
          borderColor: 'divider',
          borderRadius: 3,
          mb: 3
        }}
      >
        <WorkIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Find Your Perfect Job Match
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560, lineHeight: 1.5 }}>
          Add jobs manually or let our AI find opportunities that match your resume.
          Our platform will help you analyze matches, tailor your application materials,
          and track your job search progress.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={handleOpenCreateDialog}
            disabled={isAtLimit && planLimits?.jobImports !== -1}
            sx={{ 
              py: 1, 
              px: 3, 
              fontSize: '0.9rem', 
              fontWeight: 500,
              borderRadius: 2
            }}
          >
            {isAtLimit && planLimits?.jobImports !== -1 ? 'Upgrade to Add Jobs' : 'Add Job Manually'}
          </Button>
          <Tooltip title={aiDiscoveryButtonState.tooltip} arrow>
            <span>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={
                  aiDiscoveryButtonState.icon === LockIcon ? 
                    <LockIcon /> : 
                    <SafeAutoJobLogo size="small" />
                } 
                onClick={handleOpenFindJobsDialog}
                disabled={aiDiscoveryButtonState.disabled}
                sx={{ 
                  py: 1, 
                  px: 3, 
                  fontSize: '0.9rem', 
                  fontWeight: 500,
                  borderRadius: 2,
                  opacity: aiDiscoveryButtonState.disabled ? 0.6 : 1
                }}
              >
                {aiDiscoveryButtonState.text}
              </Button>
            </span>
          </Tooltip>
        </Box>
        {activeResumes.length === 0 && (
          <Alert severity="info" sx={{ mt: 2.5, maxWidth: 480, fontSize: '0.85rem' }}>
            You need at least one resume to use the AI job search feature.
            Please upload a resume first.
          </Alert>
        )}
        {currentPlan === 'free' && (
          <Alert severity="warning" sx={{ mt: 2.5, maxWidth: 480, fontSize: '0.85rem' }}>
            <strong>Upgrade to unlock AI Job Discovery:</strong> Let our AI agent find relevant job opportunities automatically.
          </Alert>
        )}
      </Paper>

      <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600 }}>
        How Our Job Matching Works
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, 
            borderRadius: 2, 
            borderLeft: '3px solid #4caf50',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              1. Find or Add Jobs
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <WorkIcon sx={{ fontSize: 56, color: '#4caf50', opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Add jobs manually from listings you find, or let our AI find relevant positions 
              based on your resume {currentPlan === 'free' ? '(requires upgrade)' : ''}.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, 
            borderRadius: 2, 
            borderLeft: '3px solid #2196f3',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              2. Match Analysis
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 56, color: '#2196f3', opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Our system analyzes how well your resume matches each job, identifying
              strengths and areas for improvement.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, 
            borderRadius: 2, 
            borderLeft: '3px solid #ff9800',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              3. Tailor & Apply
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <SafeAutoJobLogo size="medium" />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Get AI-powered suggestions to tailor your resume for each job, increasing
              your chances of getting interviews.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderErrorState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        mt: 3,
        borderRadius: 2,
        border: '1px solid rgba(211, 47, 47, 0.2)',
        backgroundColor: 'rgba(211, 47, 47, 0.05)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <ErrorOutlineIcon color="error" sx={{ mr: 2, mt: 0.5 }} />
        <Box>
          <Typography variant="h6" color="error" gutterBottom fontWeight={500}>
            Error Loading Jobs
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {error || 'Failed to load jobs. Please try again.'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<RefreshIcon />} 
          onClick={fetchJobs}
          sx={{ textTransform: 'none' }}
        >Try Again
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleOpenCreateDialog}
          disabled={isAtLimit && planLimits?.jobImports !== -1}
          sx={{ textTransform: 'none' }}
        >
          {isAtLimit && planLimits?.jobImports !== -1 ? 'Upgrade to Add Jobs' : 'Add Job Manually'}
        </Button>
      </Box>
    </Paper>
  );

  const renderJobGrid = (filteredJobs) => (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {filteredJobs.map((job) => {
        // FIXED: Use the helper function to get consistent status
        const analysisStatus = getJobAnalysisStatus(job);
        const canView = analysisStatus.canViewJob;
        const isAnalyzing = analysisStatus.status === 'analyzing' || analysisStatus.status === 'pending';
        
        return (
          <Grid item xs={12} sm={6} md={4} key={job._id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
              opacity: canView ? 1 : 0.8,
              cursor: canView ? 'pointer' : 'default',
              '&:hover': canView ? {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              } : {}
            }}>
              {/* FIXED: Only show analysis overlay for jobs that are actually being analyzed */}
              {isAnalyzing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(2px)',
                    p: 1
                  }}
                >
                  <JobAnalysisStatus 
                    analysisStatus={analysisStatus}
                    size="small"
                    variant="full"
                    showDetails={false}
                  />
                </Box>
              )}

              {/* Discovered Badge */}
              {job.isAiGenerated && (
                <Chip 
                  icon={<SafeAutoJobLogo size="small" sx={{ '& svg': { width: 12, height: 12 } }} />}
                  label="Discovered" 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12,
                    height: '28px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    backgroundColor: '#00c4b4',
                    color: '#ffffff',
                    border: '1px solid #00c4b4',
                    boxShadow: '0 2px 8px rgba(38, 166, 154, 0.3)',
                    zIndex: 5,
                    '& .MuiChip-icon': {
                      color: '#ffffff !important'
                    },
                    '&:hover': {
                      backgroundColor: '#00695C',
                      boxShadow: '0 4px 12px rgba(38, 166, 154, 0.4)'
                    }
                  }}
                />
              )}

              <CardContent sx={{ flexGrow: 1, pt: job.isAiGenerated ? 5 : 3 }}>
                <Typography variant="h6" gutterBottom noWrap fontWeight={500}>
                  {job.title}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" noWrap>
                  {job.company}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {job.location?.city 
                    ? `${job.location.city}${job.location.state ? `, ${job.location.state}` : ''}`
                    : job.location?.remote ? 'Remote' : 'Location not specified'
                  }
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                {/* FIXED: Only show progress for jobs that are actually being analyzed */}
                {isAnalyzing && (
                  <Box sx={{ mb: 2 }}>
                    <JobAnalysisStatus 
                      analysisStatus={analysisStatus}
                      size="small"
                      variant="progress-only"
                      showDetails={true}
                    />
                  </Box>
                )}
                
                {/* Match Score - FIXED: Only show for completed analysis */}
                {job.matchAnalysis && job.matchAnalysis.overallScore && analysisStatus.status === 'completed' && (
                  <Box sx={{ mt: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={500}>
                        Match Score
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={600} color={getScoreColor(job.matchAnalysis.overallScore)}>
                          {job.matchAnalysis.overallScore}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                          /100
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={job.matchAnalysis.overallScore} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getScoreColor(job.matchAnalysis.overallScore)
                        }
                      }}
                    />
                  </Box>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={job.jobType?.replace('_', ' ') || 'Full-time'} 
                      size="small" 
                      variant="outlined" 
                    />
                    {job.salary?.min && (
                      <Chip 
                        label={`${job.salary.currency || '$'}${job.salary.min}${job.salary.max ? ` - ${job.salary.max}` : '+'}`} 
                        size="small" 
                        variant="outlined" 
                        color="success"
                      />
                    )}
                    <Chip 
                      label={job.applicationStatus?.replace('_', ' ') || 'Not Applied'} 
                      size="small" 
                      variant="outlined" 
                      color={job.applicationStatus === 'APPLIED' ? 'primary' : 'default'}
                    />
                  </Box>
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Tooltip 
                  title={!canView ? "Analysis in progress - please wait" : "View job details"}
                  arrow
                >
                  <span> {/* Span wrapper needed for disabled button tooltip */}
                    <Button 
                      size="small" 
                      color="primary" 
                      onClick={() => handleJobClick(job)}
                      variant="contained"
                      disabled={!canView}
                      startIcon={
                        canView ? <VisibilityIcon /> : <ScheduleIcon />
                      }
                    >
                      {canView ? 'View Details' : 'Analyzing...'}
                    </Button>
                  </span>
                </Tooltip>
                <Box>
                  {job.sourceUrl && (
                    <Tooltip title="Open Original Listing">
                      <IconButton 
                        size="small" 
                        onClick={() => window.open(job.sourceUrl, '_blank')}
                        sx={{ mr: 1 }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton 
                    size="small"
                    aria-controls={`job-menu-${job._id}`}
                    aria-haspopup="true"
                    onClick={(e) => handleMenuOpen(e, job._id)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
      
      {/* Add Job Card */}
      <Grid item xs={12} sm={6} md={4}>
        <Card 
          sx={{ 
            height: '100%', 
            minHeight: 250,
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            p: 3,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            border: '2px dashed',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(63, 81, 181, 0.04)'
            }
          }}
          onClick={handleOpenCreateDialog}
        >
          <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" align="center" fontWeight={500}>
            {isAtLimit && planLimits?.jobImports !== -1 ? 'Upgrade to Add Jobs' : 'Add New Job'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            {isAtLimit && planLimits?.jobImports !== -1 
              ? 'You\'ve reached your monthly limit. Upgrade to continue.'
              : 'Manually add a job listing to your collection'
            }
          </Typography>
          {isAtLimit && planLimits?.jobImports !== -1 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<UpgradeIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setOpenLimitDialog(true);
              }}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              View Plans
            </Button>
          )}
        </Card>
      </Grid>
    </Grid>
  );

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  // Filter jobs based on tab selection
  const getFilteredJobs = () => {
    switch (tabValue) {
      case 0: // All jobs
        return jobs;
      case 1: // AI-found jobs
        return jobs.filter(job => job.isAiGenerated);
      case 2: // Manually added jobs
        return jobs.filter(job => !job.isAiGenerated);
      case 3: // Not applied
        return jobs.filter(job => !job.applicationStatus || job.applicationStatus === 'NOT_APPLIED');
      case 4: // Applied
        return jobs.filter(job => job.applicationStatus && job.applicationStatus !== 'NOT_APPLIED');
      default:
        return jobs;
    }
  };

  const filteredJobs = getFilteredJobs();

  // FIXED: Count jobs by analysis status using the helper function
  const analyzingCount = jobs.filter(job => {
    const status = getJobAnalysisStatus(job);
    return status.status === 'analyzing' || status.status === 'pending';
  }).length;

  // NEW: AI Discovery Limit Dialog Component
  const AiDiscoveryLimitDialog = () => (
    <Dialog 
      open={openAiDiscoveryLimitDialog} 
      onClose={() => setOpenAiDiscoveryLimitDialog(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <Box sx={{ 
        background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)`,
        color: 'white',
        p: 3,
        textAlign: 'center'
      }}>
        <SafeAutoJobLogo size="large" />
        <Typography variant="h6" fontWeight={600} sx={{ mt: 2 }}>
          {currentPlan === 'free' 
            ? 'AI Job Discovery - Upgrade Required' 
            : 'AI Job Discovery Limit Reached'
          }
        </Typography>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {currentPlan === 'free' ? (
          <>
            <Typography variant="body1" paragraph>
              AI Job Discovery is a premium feature that automatically finds relevant job opportunities 
              based on your resume and career goals.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>What you get with AI Job Discovery:</strong>
            </Typography>
            <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
              <li>Automated job searching across multiple platforms</li>
              <li>Personalized job recommendations based on your resume</li>
              <li>Daily job alerts for new matches</li>
              <li>Advanced filtering and relevance scoring</li>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body1" paragraph>
              You've reached your monthly limit of {aiDiscoveryUsage.limit} AI job discovery.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>Current usage:</strong> {aiDiscoveryUsage.used}/{aiDiscoveryUsage.limit} searches used
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upgrade to Hunter plan for unlimited AI job searches and additional premium features.
            </Typography>
          </>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="outlined"
            onClick={() => setOpenAiDiscoveryLimitDialog(false)}
            sx={{ borderRadius: 2 }}
          >
            Maybe Later
          </Button>
          <Button 
            variant="contained"
            startIcon={<UpgradeIcon />}
            onClick={() => handleUpgrade(currentPlan === 'free' ? 'casual' : 'hunter')}
            sx={{ borderRadius: 2 }}
          >
            {currentPlan === 'free' ? 'Upgrade to Casual' : 'Upgrade to Hunter'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={500}>
              Job Matches
            </Typography>
            {analyzingCount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {analyzingCount} job{analyzingCount === 1 ? '' : 's'} currently being analyzed
              </Typography>
            )}
          </Box>
          {!loading && !error && jobs.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title={aiDiscoveryButtonState.tooltip} arrow>
                <span>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={
                      aiDiscoveryButtonState.icon === LockIcon ? 
                        <LockIcon /> : 
                        <SafeAutoJobLogo size="small" />
                    } 
                    onClick={handleOpenFindJobsDialog}
                    disabled={aiDiscoveryButtonState.disabled}
                    sx={{ 
                      textTransform: 'none',
                      opacity: aiDiscoveryButtonState.disabled ? 0.6 : 1
                    }}
                  >
                    {aiDiscoveryButtonState.text}
                  </Button>
                </span>
              </Tooltip>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                onClick={handleOpenCreateDialog}
                disabled={isAtLimit && planLimits?.jobImports !== -1}
                sx={{ textTransform: 'none' }}
              >
                {isAtLimit && planLimits?.jobImports !== -1 ? 'Upgrade to Add Jobs' : 'Add Job Manually'}
              </Button>
            </Box>
          )}
        </Box>

        {/* Usage Statistics Card */}
        {renderUsageCard()}

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <CircularProgress size={60} thickness={4} color="primary" />
            <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
              Loading your jobs...
            </Typography>
          </Box>
        ) : error ? (
          renderErrorState()
        ) : jobs.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              <Tab label={`All Jobs (${jobs.length})`} />
              <Tab label={`AI Found (${jobs.filter(job => job.isAiGenerated).length})`} />
              <Tab label={`Manually Added (${jobs.filter(job => !job.isAiGenerated).length})`} />
            </Tabs>
            
            {filteredJobs.length === 0 ? (
              <Box sx={{ textAlign: 'center', my: 6 }}>
                <Typography variant="h6" color="text.secondary">
                  No jobs found in this category
                </Typography>
              </Box>
            ) : (
              renderJobGrid(filteredJobs)
            )}
          </>
        )}
      </Box>

      {/* Job Create Dialog */}
      <JobCreateDialog 
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        onJobCreated={handleJobCreated}
      />
      
      {/* Find Jobs Dialog */}
      <FindJobsDialog 
        open={openFindJobsDialog}
        onClose={handleCloseFindJobsDialog}
        onJobsFound={handleJobsFindCompleted}
        resumes={activeResumes}
      />

      {/* Job Import Limit Dialog */}
      <JobImportLimit
        open={openLimitDialog}
        onClose={() => setOpenLimitDialog(false)}
        currentUsage={jobImportUsage}
        currentPlan={subscription?.subscriptionTier || 'free'}
        onUpgrade={handleUpgrade}
      />

      {/* AI Discovery Limit Dialog */}
      <AiDiscoveryLimitDialog />
      
      {/* Job menu */}
      <Menu
        id="job-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleDeleteJob} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Job
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </MainLayout>
  );
};

export default JobsPage;
