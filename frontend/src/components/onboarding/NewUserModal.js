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
      icon: <ResumeIcon sx={{ fontSize: 32 }} />,
      title: 'Resume ATS Optimization',
      description: 'AI-powered analysis with ATS compatibility scoring',
      color: theme.palette.primary.main
    },
    {
      icon: <JobSearchIcon sx={{ fontSize: 32 }} />,
      title: 'Automated Job Discovery',
      description: 'Smart premium job matching based on your profile',
      color: theme.palette.secondary.main
    },
    {
      icon: <TailoringIcon sx={{ fontSize: 32 }} />,
      title: 'Resume Tailoring',
      description: 'Customize resumes for specific job applications',
      color: theme.palette.warning.main
    },
    {
      icon: <RecruiterIcon sx={{ fontSize: 32 }} />,
      title: 'Recruiter Outreach',
      description: 'Connect with hiring managers and recruiters',
      color: theme.palette.info.main
    },
    {
      icon: <H1BFilterIcon sx={{ fontSize: 32 }} />,
      title: 'H1B Filter Support',
      description: 'Find H1B sponsoring companies and opportunities',
      color: theme.palette.success.main
    },
    {
      icon: <ChatIcon sx={{ fontSize: 32 }} />,
      title: 'Your Own AI Assistant',
      description: 'Personalized career guidance and support',
      color: theme.palette.error.main
    }
  ];

  // Hunter plan benefits
  const hunterBenefits = [
    'Advanced resume optimization with detailed insights',
    'Automated job discovery with weekly delivery',
    'Unlimited resume tailoring for any job',
    'AI assistant with personalized conversations',
    'Full recruiter database access and outreach tools'
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
          maxHeight: '90vh',
          m: 2,
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
          // Remove backdrop blur for better performance
          // backdropFilter: 'blur(4px)'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Header Section */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
            p: 4,
            pb: 3,
            textAlign: 'center',
            position: 'relative',
            // Performance optimizations
            willChange: 'scroll-position',
            transform: 'translateZ(0)' // Force hardware acceleration
          }}
        >
          {/* Welcome Message */}
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Welcome to auto-job.ai{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
            Elevate your job search with intelligent resume ATS optimization, smart job matching, resume tailoring to the job, 
            and connect with 300k+ recruiters!
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {/* Platform Capabilities */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
              What You Can Do with auto-job.ai
            </Typography>
            <Grid container spacing={2}>
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
                    <CardContent sx={{ p: 2.5, textAlign: 'center', height: '100%' }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          backgroundColor: `${capability.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          color: capability.color
                        }}
                      >
                        {capability.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {capability.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {capability.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* How to Begin Section */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
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
                py: 1.5,
                px: 4,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                // Simplified hover animation for better performance
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(26, 115, 232, 0.4)'
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