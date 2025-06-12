// src/components/auth/EmailVerification.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Container
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import settingsService from '../../utils/settingsService';
import AutoJobLogo from '../common/AutoJobLogo';

const EmailVerification = () => {
  const theme = useTheme();
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
      const response = await settingsService.verifyEmail(verificationToken);
      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (error) {
      setStatus('error');
      setMessage(settingsService.getErrorMessage(error));
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await settingsService.sendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
      setStatus('success');
    } catch (error) {
      setMessage(settingsService.getErrorMessage(error));
      setStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <CircularProgress size={48} color="primary" />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: theme.palette.error.main }} />;
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

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <AutoJobLogo 
          variant="stacked" 
          size="large" 
          color="primary"
          showTagline={false}
        />
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[8] }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {getStatusIcon()}
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </Typography>

          {message && (
            <Alert 
              severity={getStatusColor()} 
              sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}
            >
              {message}
            </Alert>
          )}

          {status === 'success' && (
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your email has been successfully verified. You'll be redirected to your dashboard shortly.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/dashboard')}
                sx={{ borderRadius: 2 }}
              >
                Go to Dashboard
              </Button>
            </Box>
          )}

          {status === 'error' && (
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                The verification link may have expired or is invalid.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{ borderRadius: 2 }}
                >
                  Back to Login
                </Button>
                <Button
                  variant="contained"
                  startIcon={isResending ? <CircularProgress size={20} /> : <EmailIcon />}
                  onClick={handleResendVerification}
                  disabled={isResending}
                  sx={{ borderRadius: 2 }}
                >
                  {isResending ? 'Sending...' : 'Resend Email'}
                </Button>
              </Box>
            </Box>
          )}

          {status === 'verifying' && (
            <Typography variant="body2" color="text.secondary">
              Please wait while we verify your email address...
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default EmailVerification;