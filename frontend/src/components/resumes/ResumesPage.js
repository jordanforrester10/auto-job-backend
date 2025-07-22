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
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  Add as AddIcon, 
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorOutlineIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  LightbulbOutlined as LightbulbIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AutoAwesomeIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import MainLayout from '../layout/MainLayout';
import ResumeUploadDialog from './ResumeUploadDialog';
import { useSubscription } from '../../context/SubscriptionContext';
import UpgradePrompt from '../subscription/shared/UpgradePrompt';

const ResumesPage = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Subscription context
  const {
    subscription,
    usage,
    planLimits,
    canPerformAction,
    getUsagePercentage,
    planInfo,
    isFreePlan,
    isCasualPlan,
    isHunterPlan,
    needsUpgrade,
    loading: subscriptionLoading
  } = useSubscription();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching resumes...');
      const response = await axios.get('/resumes');
      console.log('Resume response:', response);
      setResumes(response.data.resumes || []);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError(err.response?.data?.message || 'Failed to load resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  const handleResumeUploaded = (resumeId) => {
    fetchResumes();
    handleCloseUploadDialog();
    
    if (resumeId) {
      navigate(`/resumes/${resumeId}`);
    }
  };

  const handleMenuOpen = (event, resumeId) => {
    setAnchorEl(event.currentTarget);
    setSelectedResumeId(resumeId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedResumeId(null);
  };

  const handleDeleteResume = async () => {
    if (!selectedResumeId) return;
    
    try {
      await axios.delete(`/resumes/${selectedResumeId}`);
      setResumes(prevResumes => prevResumes.filter(resume => resume._id !== selectedResumeId));
      handleMenuClose();
      fetchResumes();
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  // Calculate dynamic job count based on resume data
  const calculateJobCount = () => {
    const baseJobCount = 500;
    const resumeBonus = resumes.length * 150;
    
    // Calculate unique skills from all resume analyses
    const allSkills = new Set();
    resumes.forEach(resume => {
      if (resume.analysis?.skills) {
        resume.analysis.skills.forEach(skill => allSkills.add(skill));
      }
      if (resume.analysis?.technicalSkills) {
        resume.analysis.technicalSkills.forEach(skill => allSkills.add(skill));
      }
    });
    
    const skillsBonus = allSkills.size * 50;
    return baseJobCount + resumeBonus + skillsBonus;
  };

  // Generate static sample job data with diverse industries
  const generateMockJobs = () => {
    // Fixed sample jobs covering tech, marketing, and sales
    const sampleJobs = [
      {
        title: 'Software Engineer',
        company: 'Google',
        location: 'Mountain View, CA',
        type: 'Full-time',
        matchScore: 85,
        id: 'sample-job-1'
      },
      {
        title: 'Marketing Manager',
        company: 'Walmart',
        location: 'Bentonville, AR',
        type: 'Full-time',
        matchScore: 78,
        id: 'sample-job-2'
      },
      {
        title: 'Sales Director',
        company: 'Apple',
        location: 'Cupertino, CA',
        type: 'Full-time',
        matchScore: 82,
        id: 'sample-job-3'
      }
    ];

    return sampleJobs;
  };

  // Get usage stats for resume uploads
  const getUploadUsageStats = () => {
    if (!usage || !planLimits) return { used: 0, limit: -1, percentage: 0, unlimited: true };
    
    const used = usage.resumeUploads?.used || 0;
    const limit = planLimits.resumeUploads;
    const unlimited = limit === -1;
    const percentage = unlimited ? 0 : Math.round((used / limit) * 100);
    
    return { used, limit, percentage, unlimited };
  };

  const uploadStats = getUploadUsageStats();

  // Smart Job Discovery Section - ONLY FOR FREE USERS
  const renderJobDiscoverySection = () => {
    // 🔧 FIXED: Only show for free users and when they have resumes
    if (!isFreePlan || resumes.length === 0) return null;

    const jobCount = calculateJobCount();
    const mockJobs = generateMockJobs();

    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            opacity: 0.5
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 32, mr: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    🎯 We found 300+ jobs matching your skills
                  </Typography>
                  <Chip 
                    label="AI Powered" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600
                    }} 
                  />
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.8, fontStyle: 'italic' }}>
                  Add jobs manually and tailor your resume, or upgrade for automated weekly job discovery and resume tailoring
                </Typography>
              </Box>
            </Box>
            
            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/jobs')}
                startIcon={<AddIcon />}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Add Jobs Manually
              </Button>
              
              <Button
                variant="contained"
                onClick={() => setShowUpgradePrompt(true)}
                startIcon={<TrendingUpIcon />}
                sx={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                  '&:hover': {
                    backgroundColor: '#f57c00',
                    boxShadow: '0 6px 16px rgba(255, 152, 0, 0.4)'
                  }
                }}
              >
                Upgrade To Automate
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Render upgrade alert if needed
  const renderUpgradeAlert = () => {
    if (!needsUpgrade || uploadStats.used < uploadStats.limit) return null;
    
    return (
      <Alert severity="warning" sx={{ mb: 3 }} action={
        <Button 
          color="inherit" 
          size="small" 
          onClick={() => setShowUpgradePrompt(true)}
        >
          Upgrade
        </Button>
      }>
        <AlertTitle>Upload Limit Reached</AlertTitle>
        You've used all {uploadStats.limit} resume uploads for this month. 
        Upgrade to {isFreePlan ? 'Casual' : 'Hunter'} plan for more uploads.
      </Alert>
    );
  };

  const renderEmptyState = () => (
    <Box sx={{ mt: 2 }}>
      {renderUpgradeAlert()}
      
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
        <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Let's Supercharge Your Job Search
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560, lineHeight: 1.5 }}>
          Upload your first resume to discover a preview of jobs that match you and begin tailoring your resume to the jobs.
          Our platform will help you create the perfect resume, match with relevant job opportunities, 
          and significantly increase your chances of landing interviews.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={uploadStats.used >= uploadStats.limit ? <LockIcon /> : <AddIcon />}
            onClick={handleOpenUploadDialog}
            disabled={uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1}
            sx={{ 
              py: 1, 
              px: 3, 
              fontSize: '0.9rem', 
              fontWeight: 500,
              borderRadius: 2
            }}
          >
            {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
              ? 'Upload Limit Reached' 
              : 'Upload Your First Resume'
            }
          </Button>
        </Box>
        
        {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <Button 
              variant="text" 
              size="small" 
              onClick={() => setShowUpgradePrompt(true)}
              startIcon={<TrendingUpIcon />}
            >
              Upgrade to upload more resumes
            </Button>
          </Typography>
        )}
      </Paper>

      <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600 }}>
        How Our Resume Manager Works
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
              1. AI Resume Analysis
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <DescriptionIcon sx={{ fontSize: 56, color: '#4caf50', opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Our AI scans your resume and provides detailed insights about strengths, weaknesses, 
              and specific improvement suggestions.
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
              2. ATS Optimization
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 56, color: '#2196f3', opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Beat the automated screening systems with compatibility scoring and keyword 
              optimization suggestions.
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
              3. Job-Resume Matching
            </Typography>
            <Box sx={{ 
                height: 100, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5
              }}
            >
              <LightbulbIcon sx={{ fontSize: 56, color: '#ff9800', opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Find the perfect match between your resume and job opportunities with skills gap 
              analysis and tailored recommendations.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderErrorState = () => (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 3, 
        mt: 2,
        borderRadius: 2,
        border: `1px solid`,
        borderColor: 'error.light',
        bgcolor: theme => `${theme.palette.error.main}08`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <ErrorOutlineIcon color="error" sx={{ mr: 1.5, mt: 0.5 }} />
        <Box>
          <Typography variant="subtitle1" color="error" gutterBottom fontWeight={600}>
            Error Loading Resumes
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5 }}>
            Failed to load resumes. Please try again.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<RefreshIcon />} 
          onClick={fetchResumes}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Try Again
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={uploadStats.used >= uploadStats.limit ? <LockIcon /> : <AddIcon />}
          onClick={handleOpenUploadDialog}
          disabled={uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
            ? 'Upload Limit Reached' 
            : 'Upload New Resume'
          }
        </Button>
      </Box>
    </Paper>
  );

  const renderResumeGrid = () => (
    <>
      {renderUpgradeAlert()}
      {renderJobDiscoverySection()}
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {resumes.map((resume) => (
          <Grid item xs={12} sm={6} md={4} key={resume._id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }
            }}>
              <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {resume.isTailored && (
                    <SmartToyIcon color="secondary" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="h6" gutterBottom noWrap fontWeight={500}>
                    {resume.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Updated {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
                </Typography>
                {resume.isTailored && resume.tailoredForJob && (
                  <Typography variant="body2" color="secondary.main" sx={{ fontStyle: 'italic', mb: 1 }}>
                    Tailored for {resume.tailoredForJob.jobTitle} at {resume.tailoredForJob.company}
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                
                {resume.analysis && resume.analysis.overallScore && (
                  <Box sx={{ mt: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={500}>
                        Resume Score
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={600} color={getScoreColor(resume.analysis.overallScore)}>
                          {resume.analysis.overallScore}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                          /100
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={resume.analysis.overallScore} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getScoreColor(resume.analysis.overallScore)
                        }
                      }}
                    />
                  </Box>
                )}
                
                {resume.analysis && resume.analysis.atsCompatibility && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      ATS Compatibility
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {resume.analysis.atsCompatibility}%
                    </Typography>
                  </Box>
                )}
                
                {resume.matchAnalysis && resume.matchAnalysis.overallScore && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        Match Rate
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {resume.matchAnalysis.overallScore}%
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={resume.fileType ? resume.fileType.toUpperCase() : 'PDF'} 
                    size="small" 
                    variant="outlined" 
                  />
                  {resume.versions && resume.versions.length > 0 && (
                    <Chip 
                      label={`${resume.versions.length + 1} Versions`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  {resume.isTailored && (
                    <Chip 
                      icon={<SmartToyIcon />}
                      label="AI Tailored" 
                      size="small" 
                      variant="outlined"
                      color="secondary"
                    />
                  )}
                </Box>
                
                {/* Enhanced Quick Wins Section */}
                {resume.analysis && resume.analysis.improvementAreas && resume.analysis.improvementAreas.length > 0 && (
                  <Paper 
                    elevation={0}
                    sx={{ 
                      mt: 2, 
                      p: 2,
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                      <WarningIcon fontSize="small" sx={{ color: 'warning.main' }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Quick Wins
                      </Typography>
                    </Box>
                    {resume.analysis.improvementAreas.slice(0, 2).map((area, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: 'warning.main',
                          mt: 1,
                          mr: 1,
                          flexShrink: 0
                        }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                          <strong>{area.section}:</strong> {area.suggestions[0]}
                        </Typography>
                      </Box>
                    ))}
                    
                    {isFreePlan && (
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<TrendingUpIcon />}
                        onClick={() => setShowUpgradePrompt(true)}
                        sx={{
                          mt: 1.5,
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          borderColor: 'warning.main',
                          color: 'warning.main',
                          '&:hover': {
                            borderColor: 'warning.dark',
                            backgroundColor: 'warning.main',
                            color: 'white'
                          }
                        }}
                      >
                        Upgrade to Improve ATS Score
                      </Button>
                    )}
                  </Paper>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate(`/resumes/${resume._id}`)}
                  variant="contained"
                >
                  View Details
                </Button>
                <Box>
                  <Tooltip title="Download">
                    <IconButton 
                      size="small" 
                      onClick={() => window.open(resume.downloadUrl || resume.fileUrl, '_blank')}
                      sx={{ mr: 1 }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton 
                    size="small"
                    aria-controls={`resume-menu-${resume._id}`}
                    aria-haspopup="true"
                    onClick={(e) => handleMenuOpen(e, resume._id)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
        
        {/* Upload New Resume Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              minHeight: 200,
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              p: 3,
              backgroundColor: uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? 'rgba(0, 0, 0, 0.05)' 
                : 'rgba(0, 0, 0, 0.02)',
              border: '2px dashed',
              borderColor: uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? 'grey.400' 
                : 'divider',
              cursor: uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? 'not-allowed' 
                : 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? {} 
                : {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(63, 81, 181, 0.04)'
                }
            }}
            onClick={handleOpenUploadDialog}
          >
            {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 ? (
              <LockIcon sx={{ fontSize: 40, color: 'grey.500', mb: 2 }} />
            ) : (
              <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            )}
            
            <Typography variant="h6" align="center" fontWeight={500} color={
              uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 ? 'text.disabled' : 'text.primary'
            }>
              {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? 'Upload Limit Reached' 
                : 'Upload New Resume'
              }
            </Typography>
            
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? `Used ${uploadStats.used}/${uploadStats.limit} uploads this month`
                : 'Add another resume to your collection'
              }
            </Typography>
            
            {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 && (
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<TrendingUpIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpgradePrompt(true);
                }}
                sx={{ mt: 2 }}
              >
                Upgrade Plan
              </Button>
            )}
          </Card>
        </Grid>
      </Grid>
    </>
  );

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={500}>
            Resume Manager
          </Typography>
          {!loading && !error && resumes.length > 0 && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 ? <LockIcon /> : <AddIcon />}
              onClick={handleOpenUploadDialog}
              disabled={uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1}
              sx={{ textTransform: 'none' }}
            >
              {uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1 
                ? 'Upload Limit Reached' 
                : 'Upload New Resume'
              }
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <CircularProgress size={60} thickness={4} color="primary" />
            <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
              Loading your resumes...
            </Typography>
          </Box>
        ) : error ? (
          renderErrorState()
        ) : resumes.length === 0 ? (
          renderEmptyState()
        ) : (
          renderResumeGrid()
        )}
      </Box>

      <ResumeUploadDialog 
        open={openUploadDialog}
        onClose={handleCloseUploadDialog}
        onResumeUploaded={handleResumeUploaded}
      />
      
      <Menu
        id="resume-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleDeleteResume} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Resume
        </MenuItem>
      </Menu>

      {showUpgradePrompt && (
        <UpgradePrompt 
          open={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          feature="resumeUploads"
          currentUsage={uploadStats.used}
          limit={uploadStats.limit}
          title="Resume Upload Limit Reached"
          description={`You've used all ${uploadStats.limit} resume uploads for this month.`}
        />
      )}
    </MainLayout>
  );
};

export default ResumesPage;
