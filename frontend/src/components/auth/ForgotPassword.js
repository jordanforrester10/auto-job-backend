// src/components/auth/ForgotPassword.js - CENTERED DESIGN WITHOUT HOW IT WORKS SECTION
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Alert, 
  Paper,
  InputAdornment,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { forgotPassword, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    const result = await forgotPassword(email);
    
    if (result.success) {
      setSuccess('If an account with that email exists, you will receive password reset instructions shortly.');
    } else {
      setError(result.error);
    }
  };

  return (
    <Box sx={{ 
      // Ensure full viewport coverage
      minHeight: '100vh',
      minHeight: '100dvh',
      height: '100%',
      background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #00c4b4 100%)',
      // Fix for white bar - ensure background covers everything
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: { xs: 2, sm: 3 },
      overflowY: 'auto',
      overflowX: 'hidden',
      // Ensure proper scrolling behavior
      position: 'relative',
      // Custom scrollbar styling
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '3px',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        },
      },
    }}>
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          // BACK TO ORIGINAL WIDTH
          maxWidth: { xs: '450px', sm: '500px' },
          mx: 'auto',
          my: { xs: 3, sm: 4 }, // Margin top and bottom for proper spacing
          position: 'relative',
          flex: '0 1 auto', // Allow shrinking but don't grow
        }}
      >
        {/* Main Form Container */}
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
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ mb: 2 }}>
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
                fontSize: { xs: '1.625rem', sm: '1.75rem' }
              }}
            >
              Reset Your Password
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '0.95rem' }
              }}
            >
              Enter your email address and we'll send you instructions to reset your password
            </Typography>
          </Box>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                '& .MuiAlert-icon': {
                  fontSize: '1.25rem'
                }
              }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                '& .MuiAlert-icon': {
                  fontSize: '1.25rem'
                }
              }}
            >
              {success}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                  },
                }
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={!loading && <SendIcon />}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                mb: 3,
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
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Sending reset link...
                </Box>
              ) : (
                'Send Reset Instructions'
              )}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                Remember your password?
              </Typography>
            </Divider>
            
            <Button
              component={Link}
              to="/login"
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<ArrowBackIcon />}
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
              Back to Sign In
            </Button>
          </Box>

          {/* Simple Security Note */}
          <Box sx={{ 
            mt: 3,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Box sx={{ 
              background: 'rgba(52, 168, 83, 0.04)', 
              border: '1px solid rgba(52, 168, 83, 0.12)',
              borderRadius: 2,
              p: 2.5,
              mb: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <SecurityIcon sx={{ 
                  mr: 1.5, 
                  color: '#34a853', 
                  mt: 0.25,
                  fontSize: '1.5rem',
                  flexShrink: 0
                }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 0.5,
                      fontSize: '1rem'
                    }}
                  >
                    Security First
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      lineHeight: 1.4,
                      fontSize: '0.875rem'
                    }}
                  >
                    For your security, password reset links expire after 1 hour. 
                    If you don't see our email, check your spam folder.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 1.5,
                fontSize: '0.875rem'
              }}
            >
              Still having trouble? We're here to help.
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: { xs: 2, sm: 3 },
              flexWrap: 'wrap'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HelpIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  <Link to="/help" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Contact Support
                  </Link>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Available 24/7
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ForgotPassword;