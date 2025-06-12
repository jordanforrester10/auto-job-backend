// src/components/auth/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Box, 
  Alert, 
  Paper,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CircularProgress
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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #00c4b4 100%)',
      display: 'flex',
      alignItems: 'center',
      py: 3
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center" sx={{ minHeight: '90vh' }}>
          {/* Left Side - Branding & Help */}
          <Grid item xs={12} md={6}>
            <Box sx={{ color: 'white', pr: { md: 4 } }}>
              {/* Logo Section */}
              <Box sx={{ mb: 4 }}>
                <AutoJobLogo 
                  variant="horizontal"
                  size="large"
                  color="white"
                  showTagline={true}
                />
              </Box>

              {/* Help Content */}
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  lineHeight: 1.2
                }}
              >
                Need Help Accessing Your Account?
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  opacity: 0.9,
                  fontWeight: 400,
                  mb: 4,
                  lineHeight: 1.4
                }}
              >
                Don't worry, it happens to the best of us. We'll help you get back 
                to your AI-powered job search in no time.
              </Typography>

              {/* Help Steps */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  How it works:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card sx={{ 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      mb: 2
                    }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Box 
                            sx={{ 
                              background: '#34a853',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              mt: 0.5,
                              flexShrink: 0
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                              1
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              Enter your email address
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              The same email you used to create your auto-job.ai account
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card sx={{ 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      mb: 2
                    }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Box 
                            sx={{ 
                              background: '#4285f4',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              mt: 0.5,
                              flexShrink: 0
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                              2
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              Check your email
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              We'll send you a secure link to reset your password
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card sx={{ 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Box 
                            sx={{ 
                              background: '#00c4b4',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              mt: 0.5,
                              flexShrink: 0
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                              3
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              Create a new password
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Follow the link to set up a secure new password
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Security Note */}
              <Box sx={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                p: 2.5
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <SecurityIcon sx={{ mr: 1.5, color: '#34a853', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Security First
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.4 }}>
                      For your security, password reset links expire after 1 hour. 
                      If you don't see our email, check your spam folder.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right Side - Reset Form */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }}
            >
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <AutoJobLogo 
                  variant="icon-only"
                  size="medium"
                  color="primary"
                />
                <Typography 
                  component="h1" 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.5,
                    mt: 1
                  }}
                >
                  Reset Your Password
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ mb: 2 }}
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
                  sx={{ mb: 3 }}
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
                
                <Button
                  component={Link}
                  to="/login"
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  Back to Sign In
                </Button>
              </Box>

              {/* Help Information */}
              <Box sx={{ 
                mt: 3, 
                pt: 3, 
                borderTop: '1px solid',
                borderColor: 'divider',
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Still having trouble? We're here to help.
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: 3,
                  flexWrap: 'wrap'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HelpIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      <Link to="/help" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        Contact Support
                      </Link>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      Available 24/7
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ForgotPassword;