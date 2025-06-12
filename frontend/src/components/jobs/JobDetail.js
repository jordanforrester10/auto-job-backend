// src/components/jobs/JobDetail.js - Final refactored version with improved dialog
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Fade,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
  AutoFixHigh as AutoFixHighIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Insights as InsightsIcon,
  Close as CloseIcon,
  Stars as StarsIcon,
  Rocket as RocketIcon
} from '@mui/icons-material';

// Import our component files
import JobHeader from './components/JobHeader';
import OverviewTab from './tabs/OverviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import ContentTab from './tabs/ContentTab';
import AutoJobLogo from '../common/AutoJobLogo';

import jobService from '../../utils/jobService';
import resumeService from '../../utils/resumeService';
import MainLayout from '../layout/MainLayout';

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

const JobDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [allResumes, setAllResumes] = useState([]);
  const [resumeMatchStatus, setResumeMatchStatus] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [tailorDialogOpen, setTailorDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    fetchAllResumes();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const jobData = await jobService.getJobById(id);
      setJob(jobData);
      
      // Fetch resume match status
      const matchStatus = await jobService.getResumeMatchStatus(id);
      setResumeMatchStatus(matchStatus.resumeStatusMap || {});
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError('Failed to load job details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllResumes = async () => {
    try {
      const resumesData = await resumeService.getUserResumes();
      setAllResumes(resumesData || []);
    } catch (err) {
      console.error('Error fetching resumes:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteJob = async () => {
    try {
      await jobService.deleteJob(id);
      navigate('/jobs');
    } catch (error) {
      console.error('Error deleting job:', error);
      setAlert({
        open: true,
        message: 'Failed to delete job. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleOpenTailorDialog = () => {
    setTailorDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseTailorDialog = () => {
    setTailorDialogOpen(false);
    setSelectedResumeId('');
  };

  const handleResumeChange = (e) => {
    setSelectedResumeId(e.target.value);
  };

  const handleTailorResume = async () => {
    if (!selectedResumeId) {
      setAlert({
        open: true,
        message: 'Please select a resume to tailor',
        severity: 'warning'
      });
      return;
    }

    setMatchLoading(true);
    
    try {
      // First match the resume with the job using enhanced matching
      const matchResult = await jobService.matchResumeWithJob(id, selectedResumeId);
      
      // Show success message with match score
      setAlert({
        open: true,
        message: `Analysis complete! Match score: ${matchResult.matchAnalysis?.overallScore || 'N/A'}%`,
        severity: 'success'
      });
      
      // Refresh job data to show new match analysis
      await fetchJobDetails();
      
      // Navigate to the tailoring page
      navigate(`/jobs/${id}/tailor/${selectedResumeId}`);
    } catch (error) {
      console.error('Error initializing resume tailoring:', error);
      setAlert({
        open: true,
        message: 'Failed to start resume tailoring process. Please try again.',
        severity: 'error'
      });
      setMatchLoading(false);
    }
  };

  const renderResumeStatusChip = (resume) => {
    const status = resumeMatchStatus[resume._id];
    
    if (!status) {
      return null;
    }

    if (status.isTailored) {
      return (
        <Tooltip title={`${status.tailoredVersions.length} tailored version(s) for this job`}>
          <Chip
            icon={<AutoFixHighIcon />}
            label="Tailored"
            color="success"
            size="small"
            sx={{ ml: 1 }}
          />
        </Tooltip>
      );
    }

    if (status.isMatched) {
      return (
        <Tooltip title="Already matched with this job">
          <Chip
            icon={<CheckCircleIcon />}
            label="Matched"
            color="info"
            size="small"
            sx={{ ml: 1 }}
          />
        </Tooltip>
      );
    }

    return null;
  };

  // Render analysis status indicator
  const renderAnalysisStatus = () => {
    if (!job.parsedData || Object.keys(job.parsedData).length === 0) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Job Analysis Pending</Typography>
          <Typography variant="body2">
            This job is still being analyzed. Some features may be limited.
          </Typography>
        </Alert>
      );
    }

    if (job.parsedData.analysisError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Analysis Failed</Typography>
          <Typography variant="body2">
            {job.parsedData.analysisError}
          </Typography>
        </Alert>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
            Loading job details...
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/jobs')}
            sx={{ mt: 2 }}
          >
            Back to Jobs
          </Button>
        </Box>
      </MainLayout>
    );
  }

  if (!job) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Job not found.</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/jobs')}
            sx={{ mt: 2 }}
          >
            Back to Jobs
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/jobs')}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Jobs
        </Button>

        {/* Job Header Component */}
        <JobHeader 
          job={job}
          onTailorClick={handleOpenTailorDialog}
          onMenuClick={handleMenuClick}
          onOpenOriginal={() => window.open(job.sourceUrl, '_blank')}
        />

        {/* Analysis Status */}
        {renderAnalysisStatus()}

        {/* Tabs without white container background */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                '& .MuiTab-root': { 
                  py: 2,
                  fontWeight: 500
                }
              }}
            >
              <Tab label="Overview" icon={<DescriptionIcon />} iconPosition="start" />
              <Tab label="Analysis" icon={<LightbulbIcon />} iconPosition="start" />
              <Tab label="Content" icon={<DescriptionIcon />} iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab content without Paper wrapper */}
          {/* Overview Tab */}
          {tabValue === 0 && (
            <Box sx={{ py: 1 }}>
              <OverviewTab 
                job={job} 
                onTailorClick={handleOpenTailorDialog}
              />
            </Box>
          )}

          {/* Analysis Tab */}
          {tabValue === 1 && (
            <Box sx={{ py: 1 }}>
              <AnalysisTab 
                job={job} 
                onTailorClick={handleOpenTailorDialog}
              />
            </Box>
          )}

          {/* Content Tab */}
          {tabValue === 2 && (
            <Box sx={{ py: 1 }}>
              <ContentTab job={job} />
            </Box>
          )}
        </Box>

        {/* Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: 2 }
          }}
        >

          <MenuItem onClick={handleDeleteJob} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete Job" />
          </MenuItem>
        </Menu>

        {/* Enhanced AI Resume Analysis Dialog */}
        <Dialog
          open={tailorDialogOpen}
          onClose={handleCloseTailorDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { 
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0px 24px 38px rgba(0, 0, 0, 0.14), 0px 9px 46px rgba(0, 0, 0, 0.12), 0px 11px 15px rgba(0, 0, 0, 0.20)',
              height: 'auto',
              maxHeight: '90vh'
            }
          }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          {/* Custom Header with Solid Teal */}
          <DialogTitle 
            sx={{ 
              backgroundColor: theme.palette.secondary.main,
              color: 'white',
              p: 0,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Pattern */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at 20% 50%, ${alpha('#ffffff', 0.1)} 0%, transparent 50%), 
                             radial-gradient(circle at 80% 20%, ${alpha('#ffffff', 0.08)} 0%, transparent 50%)`,
                zIndex: 0
              }}
            />
            
            {/* Header Content */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 2.5,
              position: 'relative',
              zIndex: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AutoJobLogo 
                  variant="icon-only" 
                  size="small" 
                  color="white"
                />
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700,
                      mb: 0.25,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Enhanced AI Resume Analysis
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.9,
                      fontWeight: 500,
                      fontSize: '0.8rem'
                    }}
                  >
                    Powered by advanced AI agents
                  </Typography>
                </Box>
              </Box>
              
              <IconButton
                onClick={handleCloseTailorDialog}
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha('#ffffff', 0.1)
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
            {/* Hero Section */}
            <Box sx={{ 
              p: 2.5, 
              background: `linear-gradient(180deg, ${alpha(theme.palette.secondary.main, 0.02)} 0%, transparent 100%)`
            }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  mb: 1.5,
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: '1rem'
                }}
              >
                Select a resume for intelligent analysis and personalized recommendations.
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  lineHeight: 1.4,
                  fontSize: '0.875rem'
                }}
              >
                Our AI will analyze your resume against this job posting and provide detailed insights 
                to maximize your interview chances.
              </Typography>
            </Box>

            {/* AI Features Showcase */}
            <Box sx={{ px: 2.5, pb: 1.5 }}>
              <Card sx={{ 
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.light, 0.02)} 100%)`
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <StarsIcon 
                      sx={{ 
                        color: theme.palette.warning.main,
                        mr: 1,
                        fontSize: '1.25rem'
                      }} 
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Our enhanced AI will provide:
                    </Typography>
                  </Box>
                  
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5}>
                      <Card sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <TrendingUpIcon sx={{ color: 'success.main', mr: 0.75, fontSize: '1rem' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Dynamic Match Scores
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Real-time compatibility analysis
                        </Typography>
                      </Card>
                      
                      <Card sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <SpeedIcon sx={{ color: 'info.main', mr: 0.75, fontSize: '1rem' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Skill Importance Weighting
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Prioritized skill relevance
                        </Typography>
                      </Card>
                    </Stack>
                    
                    <Stack direction="row" spacing={1.5}>
                      <Card sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <PsychologyIcon sx={{ color: 'warning.main', mr: 0.75, fontSize: '1rem' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Experience Level Compatibility
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Career stage alignment
                        </Typography>
                      </Card>
                      
                      <Card sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <InsightsIcon sx={{ color: 'secondary.main', mr: 0.75, fontSize: '1rem' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Personalized Improvement Suggestions
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Tailored enhancement recommendations
                        </Typography>
                      </Card>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Resume Selection */}
            <Box sx={{ px: 2.5, pb: 2.5 }}>
              <Divider sx={{ my: 2 }} />
              
              {allResumes.length === 0 ? (
                <Alert 
                  severity="warning" 
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.25rem'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    No resumes found
                  </Typography>
                  <Typography variant="caption">
                    You don't have any resumes uploaded. Please upload a resume first to continue.
                  </Typography>
                </Alert>
              ) : (
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 1.5,
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    Choose your resume for analysis
                  </Typography>
                  
                  <FormControl 
                    fullWidth 
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  >
                    <InputLabel id="tailor-resume-label">Select Resume for Analysis</InputLabel>
                    <Select
                      labelId="tailor-resume-label"
                      value={selectedResumeId}
                      onChange={handleResumeChange}
                      label="Select Resume for Analysis"
                    >
                      {allResumes.map((resume) => (
                        <MenuItem 
                          key={resume._id} 
                          value={resume._id}
                          sx={{ 
                            minHeight: 48,
                            py: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <DescriptionIcon sx={{ mr: 1.5, color: 'text.secondary', fontSize: '1.25rem' }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {resume.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Updated {new Date(resume.updatedAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                            {renderResumeStatusChip(resume)}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ 
            p: 2.5, 
            pt: 0,
            gap: 1.5,
            background: `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
          }}>
            <Button 
              onClick={handleCloseTailorDialog}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 600
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleTailorResume}
              variant="contained" 
              color="secondary"
              disabled={!selectedResumeId || matchLoading}
              startIcon={
                matchLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AutoJobLogo 
                    variant="icon-only" 
                    size="small" 
                    color="white"
                    sx={{ transform: 'scale(0.7)' }}
                  />
                )
              }
              sx={{ 
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                backgroundColor: theme.palette.secondary.main,
                color: 'white',
                boxShadow: `0px 8px 16px ${alpha(theme.palette.secondary.main, 0.24)}`,
                '&:hover': {
                  backgroundColor: theme.palette.secondary.dark,
                  boxShadow: `0px 12px 20px ${alpha(theme.palette.secondary.main, 0.32)}`,
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  backgroundColor: alpha(theme.palette.secondary.main, 0.6),
                  color: 'white'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {matchLoading ? 'Analyzing Resume...' : 'Start Enhanced Analysis'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleAlertClose} 
            severity={alert.severity} 
            sx={{ width: '100%', borderRadius: 2 }}
            variant="filled"
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
};

export default JobDetail;
