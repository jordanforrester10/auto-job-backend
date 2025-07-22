import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  IconButton,
  Grid,
  Paper,
  Chip,
  Divider,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as ResumeIcon,
  Search as JobSearchIcon,
  AutoAwesome as TailoringIcon,
  ContactMail as RecruiterIcon,
  FilterAlt as H1BFilterIcon,
  Chat as ChatIcon,
  Upload as UploadIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NewUserModal = ({ open, onClose, onSkip }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 200);
  };

  const handleAnalyzeResume = () => {
    handleClose();
    setTimeout(() => {
      navigate('/resumes');
    }, 300);
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    handleClose();
  };

  const handleUpgrade = () => {
    handleClose();
    setTimeout(() => {
      navigate('/settings');
    }, 300);
  };

  // Platform capabilities data - UPDATED with 6 tiles including AI Assistant
  const capabilities = [
    {
      icon: <ResumeIcon sx={{ fontSize: 28 }} />,
      title: 'Resume ATS Optimization',
      description: 'AI-powered analysis with ATS compatibility scoring',
      color: theme.palette.primary.main
    },
    {
      icon: <JobSearchIcon sx={{ fontSize: 28 }} />,
      title: 'Automated Job Discovery',
      description: 'Smart premium job matching based on your profile',
      color: theme.palette.secondary.main
    },
    {
      icon: <TailoringIcon sx={{ fontSize: 28 }} />,
      title: 'Resume Tailoring',
      description: 'Customize resumes for specific job applications',
      color: theme.palette.warning.main
    },
    {
      icon: <RecruiterIcon sx={{ fontSize: 28 }} />,
      title: 'Recruiter Outreach',
      description: 'Connect with hiring managers and recruiters',
      color: theme.palette.info.main
    },
    {
      icon: <H1BFilterIcon sx={{ fontSize: 28 }} />,
      title: 'H1B Filter Support',
      description: 'Find H1B sponsoring companies and opportunities',
      color: theme.palette.success.main
    },
    {
      icon: <ChatIcon sx={{ fontSize: 28 }} />,
      title: 'Your Own AI Assistant',
      description: 'Personalized career guidance and support',
      color: theme.palette.error.main
    }
  ];

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '92vh',
          m: 1,
          transform: closing ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s ease-out',
          overflow: 'hidden',
          // Performance optimizations
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', height: '100%', overflow: 'auto' }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Header Section - Reduced padding */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
            p: 3,
            pb: 2,
            textAlign: 'center',
            position: 'relative',
            // Performance optimizations
            willChange: 'scroll-position',
            transform: 'translateZ(0)' // Force hardware acceleration
          }}
        >
          {/* Welcome Message */}
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.75rem', md: '2rem' } }}>
            Welcome to auto-job.ai{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', fontSize: '0.95rem' }}>
            Elevate your job search with intelligent resume ATS optimization, smart job matching, resume tailoring to the job, 
            and connecting with 300k+ recruiters!
          </Typography>
        </Box>

        <Box sx={{ p: 3, pt: 2 }}>
          {/* Platform Capabilities - Reduced spacing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center', fontSize: '1.15rem' }}>
              What You Can Do with auto-job.ai
            </Typography>
            <Grid container spacing={1.5}>
              {capabilities.map((capability, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      // Simplified hover animation for better performance
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        // Removed transform for better scroll performance
                        boxShadow: theme.shadows[2], // Reduced shadow intensity
                        borderColor: capability.color
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: `${capability.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 1.5,
                          color: capability.color
                        }}
                      >
                        {capability.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.85rem' }}>
                        {capability.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                        {capability.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* How to Begin Section - Reduced spacing */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontSize: '1.15rem' }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 400, mx: 'auto', fontSize: '0.9rem' }}>
              Upload your resume to get personalized insights, discover matching jobs, 
              and start optimizing your job search strategy.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              onClick={handleAnalyzeResume}
              startIcon={<UploadIcon />}
              endIcon={<ArrowForwardIcon />}
              sx={{
                py: 1.25,
                px: 3.5,
                borderRadius: 2,
                fontSize: '0.95rem',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                // Simplified hover animation for better performance
                transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: `0 6px 16px ${theme.palette.primary.main}50`
                  // Removed transform for better scroll performance
                }
              }}
            >
              Upload My Resume
            </Button>
          </Box>

          {/* Skip Option */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="text"
              onClick={handleSkip}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: 'text.primary'
                }
              }}
            >
              I'll explore on my own
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;