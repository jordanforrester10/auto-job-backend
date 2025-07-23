import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Paper,
  Fade,
  Backdrop
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  TravelExplore as TravelExploreIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import AutoJobLogo from '../common/AutoJobLogo';

const FullScreenLoader = ({ open, locations = [], jobTitles = [] }) => {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Loading steps with messages - UPDATED: Extended timing for 90 seconds
  const loadingSteps = [
    {
      icon: <PsychologyIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: "Analyzing Your Preferences",
      message: `Processing your interest in ${jobTitles.join(', ')} positions in ${locations.map(loc => loc.name || loc).join(', ')}...`,
      duration: 3000
    },
    {
      icon: <TravelExploreIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
      title: "Searching Job Markets",
      message: "Scanning thousands of job opportunities across multiple platforms and databases...",
      duration: 5000
    },
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
      title: "AI-Powered Matching",
      message: "Our advanced AI is analyzing job descriptions, requirements, and matching them with your skills and experience...",
      duration: 8000
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 48, color: 'success.main' }} />,
      title: "Finding Your Recruiters",
      message: "Identifying and researching recruiters, hiring managers, and decision makers at target companies...",
      duration: 6000
    },
    {
      icon: <WorkIcon sx={{ fontSize: 48, color: 'info.main' }} />,
      title: "Finalizing Results",
      message: "Curating your personalized job matches, ranking by relevance, and preparing recruiter insights...",
      duration: 3000
    }
  ];

  // Auto-advance through steps - UPDATED: Much slower timing for 90 seconds
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 0.111; // UPDATED: Much slower - takes ~90 seconds to complete (100 / 0.111 * 0.1 = ~90 seconds)
      });
    }, 100); // Progress updates every 100ms

    return () => clearInterval(timer);
  }, [open]);

  // Update current step based on progress - UPDATED: Adjusted for slower timing
  useEffect(() => {
    const stepThresholds = [0, 15, 35, 60, 80, 100]; // Step progression remains the same
    for (let i = stepThresholds.length - 1; i >= 0; i--) {
      if (progress >= stepThresholds[i]) {
        setCurrentStep(i);
        break;
      }
    }
  }, [progress]);

  const currentStepData = loadingSteps[currentStep] || loadingSteps[0];

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1000, // Ensure it's above everything
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
      open={open}
    >
      <Fade in={open} timeout={500}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            p: 4
          }}
        >
          {/* Main Content Card */}
          <Paper
            elevation={0}
            sx={{
              p: 6,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}08)`,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Animation */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `linear-gradient(45deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
                animation: 'float 6s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                  '50%': { transform: 'translateY(-20px) rotate(180deg)' }
                }
              }}
            />

            {/* Logo - UPDATED: Icon-only and centered */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <AutoJobLogo 
                variant="icon-only" 
                size="large"
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '& svg': { 
                    width: 60, 
                    height: 60 
                  } 
                }} 
              />
            </Box>

            {/* Step Icon with Animation */}
            <Fade in={true} key={currentStep} timeout={1000}>
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    backgroundColor: `${currentStepData.icon.props.sx.color}15`,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.1)', opacity: 0.8 }
                    }
                  }}
                >
                  {currentStepData.icon}
                </Box>
              </Box>
            </Fade>

            {/* Main Loading Spinner */}
            <Box sx={{ mb: 3 }}>
              <CircularProgress 
                size={80} 
                thickness={3}
                sx={{ 
                  color: 'primary.main',
                  animation: 'spin 2s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </Box>

            {/* Step Title */}
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                color: 'text.primary',
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {currentStepData.title}
            </Typography>

            {/* Step Message */}
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 4,
                lineHeight: 1.6,
                fontSize: '1.1rem'
              }}
            >
              {currentStepData.message}
            </Typography>

            {/* Progress Bar */}
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: `${theme.palette.primary.main}20`,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }
                }}
              />
            </Box>

            {/* Progress Text */}
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {Math.round(progress)}% Complete
            </Typography>

            {/* Step Indicators */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
              {loadingSteps.map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: index <= currentStep ? 'primary.main' : 'grey.300',
                    transition: 'all 0.3s ease',
                    transform: index === currentStep ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
              ))}
            </Box>

            {/* Fun Facts - UPDATED: More engaging and informative */}
            <Box sx={{ mt: 4, p: 2, backgroundColor: `${theme.palette.info.main}10`, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                💡 Did you know? Our AI analyzes over 100 data points across job descriptions, company culture, and salary data to find your perfect matches!
              </Typography>
            </Box>
          </Paper>

          {/* Bottom Message - UPDATED: Adjusted timing expectation to 90 seconds */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mt: 3,
              textAlign: 'center',
              maxWidth: 500
            }}
          >
            Please don't close this window while we're working our magic. 
            This comprehensive search process can take up to 60-90 seconds as we thoroughly analyze thousands of opportunities.
          </Typography>
        </Box>
      </Fade>
    </Backdrop>
  );
};

export default FullScreenLoader;