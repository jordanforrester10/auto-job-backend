// src/components/auth/EmailVerification.js - FINAL CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import api from '../../utils/axios';
import AutoJobLogo from '../common/AutoJobLogo';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      setStatus('verifying');
      setMessage('Verifying your email address...');
      
      console.log('🔍 Attempting email verification with token:', verificationToken);
      console.log('🔍 API base URL should be:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
      
      // Use the configured api instance - this should call http://localhost:5000/api/auth/verify-email/TOKEN
      const response = await api.get(`/auth/verify-email/${verificationToken}`);
      
      console.log('✅ Verification response:', response.data);
      
      if (response.data.success) {
        setStatus('success');
        setMessage('Email verified successfully! You can now access all features.');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        throw new Error(response.data.error || 'Verification failed');
      }
      
    } catch (error) {
      console.error('❌ Email verification error:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url
      });
      
      setStatus('error');
      
      if (error.response?.status === 400) {
        setMessage('This verification link has expired or is invalid.');
      } else if (error.response?.status === 404) {
        setMessage('Verification endpoint not found. Please contact support.');
      } else {
        setMessage(error.response?.data?.error || 'Verification failed. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      
      console.log('📧 Resending verification email...');
      
      // Use the configured api instance
      const response = await api.post('/auth/resend-verification');
      
      console.log('✅ Resend response:', response.data);
      
      if (response.data.success) {
        setMessage('Verification email sent! Please check your inbox.');
        setStatus('success');
      } else {
        throw new Error(response.data.error || 'Failed to resend email');
      }
    } catch (error) {
      console.error('❌ Resend verification error:', error);
      setMessage(error.response?.data?.error || 'Failed to resend verification email. Please try again.');
      setStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <CircularProgress size={48} sx={{ color: '#1a73e8' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 48, color: '#34a853' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: '#ea4335' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Verifying Email...';
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Email Verification';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #00c4b4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: { xs: 3, sm: 4 },
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingBottom: { xs: 4, sm: 5 },
    }}>
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: { xs: '400px', sm: '450px' },
          mx: 'auto'
        }}
      >
        {/* Main Container - Matching login style */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, sm: 4 },
            width: '100%',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            borderRadius: 3
          }}
        >
          {/* Header with Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ mb: 3 }}>
              <AutoJobLogo 
                variant="icon-only"
                size="medium"
                color="primary"
              />
            </Box>
            
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                mb: 1,
                fontSize: { xs: '1.75rem', sm: '2rem' }
              }}
            >
              {getTitle()}
            </Typography>
            
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              {status === 'verifying' && 'Please wait while we verify your email address...'}
              {status === 'success' && 'Your email has been successfully verified!'}
              {status === 'error' && 'We encountered an issue verifying your email.'}
            </Typography>
          </Box>

          {/* Status Icon */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {getStatusIcon()}
          </Box>

          {/* Message Alert */}
          {message && (
            <Alert 
              severity={getStatusColor()} 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.25rem'
                }
              }}
            >
              {message}
            </Alert>
          )}

          {/* Action Buttons */}
          {status === 'success' && (
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 3,
                  textAlign: 'center',
                  fontSize: { xs: '0.875rem', sm: '0.9rem' }
                }}
              >
                You'll be redirected to your dashboard shortly, or click below to continue.
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                startIcon={<HomeIcon />}
                sx={{ 
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  mb: 2,
                  background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1557b0 0%, #3367d6 100%)',
                  }
                }}
              >
                Go to Dashboard
              </Button>
            </Box>
          )}

          {status === 'error' && (
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 3,
                  textAlign: 'center',
                  fontSize: { xs: '0.875rem', sm: '0.9rem' }
                }}
              >
                The verification link may have expired or is invalid.
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={isResending ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                onClick={handleResendVerification}
                disabled={isResending}
                sx={{ 
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  mb: 2,
                  background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1557b0 0%, #3367d6 100%)',
                  },
                  '&:disabled': {
                    background: theme => theme.palette.action.disabledBackground
                  }
                }}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: '0.875rem' }}
                >
                  or
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ 
                  py: 1.5,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'rgba(26, 115, 232, 0.04)'
                  }
                }}
              >
                Back to Login
              </Button>
            </Box>
          )}

          {status === 'verifying' && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                This may take a few moments...
              </Typography>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ 
            mt: 3,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.75rem'
              }}
            >
              Having trouble? Contact support@auto-job.ai
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default EmailVerification;