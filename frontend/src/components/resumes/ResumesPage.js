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
  Tooltip
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
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import MainLayout from '../layout/MainLayout';
import ResumeUploadDialog from './ResumeUploadDialog';

const ResumesPage = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);

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
    
    // If a resumeId is provided, navigate to the resume detail page
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
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

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
        <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Let's Supercharge Your Job Search
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560, lineHeight: 1.5 }}>
          Upload your resume to unlock AI-powered analysis, optimization, and job matching. 
          Our platform will help you create the perfect resume, match with relevant job opportunities, 
          and significantly increase your chances of landing interviews.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleOpenUploadDialog}
          sx={{ 
            py: 1, 
            px: 3, 
            fontSize: '0.9rem', 
            fontWeight: 500,
            borderRadius: 2
          }}
        >
          Upload Your First Resume
        </Button>
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
          startIcon={<AddIcon />} 
          onClick={handleOpenUploadDialog}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Upload New Resume
        </Button>
      </Box>
    </Paper>
  );

  const renderResumeGrid = () => (
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
              
              {resume.analysis && resume.analysis.improvementAreas && resume.analysis.improvementAreas.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LightbulbIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    <Typography variant="body2" fontWeight={500}>
                      Improvement Areas
                    </Typography>
                  </Box>
                  {resume.analysis.improvementAreas.slice(0, 2).map((area, index) => (
                    <Typography key={index} variant="body2" color="text.secondary" sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      '&:before': {
                        content: '""',
                        display: 'inline-block',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: 'text.secondary',
                        mr: 1
                      }
                    }}>
                      {area.section}: {area.suggestions[0]}
                    </Typography>
                  ))}
                </Box>
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
          onClick={handleOpenUploadDialog}
        >
          <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" align="center" fontWeight={500}>
            Upload New Resume
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Add another resume to your collection
          </Typography>
        </Card>
      </Grid>
    </Grid>
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
              startIcon={<AddIcon />} 
              onClick={handleOpenUploadDialog}
              sx={{ textTransform: 'none' }}
            >
              Upload New Resume
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
    </MainLayout>
  );
};

export default ResumesPage;
