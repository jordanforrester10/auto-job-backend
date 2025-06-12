// src/components/auth/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Box, 
  Alert, 
  Paper, 
  Grid,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import { 
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as SmartToyIcon,
  Speed as SpeedIcon,
  Work as WorkIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);
    
    if (result.success) {
      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } else {
      setError(result.error);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!formData.password) return { score: 0, label: '', color: 'error' };
    
    let score = 0;
    const checks = {
      length: formData.password.length >= 8,
      lowercase: /[a-z]/.test(formData.password),
      uppercase: /[A-Z]/.test(formData.password),
      number: /\d/.test(formData.password),
      special: /[!@#$%^&*]/.test(formData.password)
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score === 5) return { score: 100, label: 'Strong', color: 'success' };
    if (score >= 3) return { score: 60, label: 'Medium', color: 'warning' };
    return { score: 20, label: 'Weak', color: 'error' };
  };

  const passwordStrength = getPasswordStrength();

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
          {/* Left Side - Branding & Benefits */}
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

              {/* Value Proposition */}
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  lineHeight: 1.2
                }}
              >
                Stay Ahead of The Market and Power Your Job Search Today
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
                Join thousands of professionals who've transformed their job search 
                with our AI intelligent platform and accessing our database of over 300k recruiters
              </Typography>

              {/* Benefits List */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  What you'll get with auto-job.ai:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckCircleIcon sx={{ mr: 2, color: '#34a853' }} />
                      <Typography variant="body1">
                        <strong>3x faster interview callbacks</strong> with AI-Tailored resumes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckCircleIcon sx={{ mr: 2, color: '#34a853' }} />
                      <Typography variant="body1">
                        <strong>24/7 AI agents</strong> finding you jobs and reaching out to recruiters
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckCircleIcon sx={{ mr: 2, color: '#34a853' }} />
                      <Typography variant="body1">
                        <strong>Smart job matching</strong> based on your resume and preferences
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckCircleIcon sx={{ mr: 2, color: '#34a853' }} />
                      <Typography variant="body1">
                        <strong>AI Assistant</strong> to help you stay ahead of the job market
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Social Proof */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip 
                  label="Free to Start" 
                  variant="outlined" 
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.1)',
                    fontWeight: 500
                  }} 
                  icon={<CheckCircleIcon sx={{ color: '#34a853 !important' }} />}
                />
                <Chip 
                  label="No Credit Card Required" 
                  variant="outlined" 
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.1)',
                    fontWeight: 500
                  }} 
                  icon={<SecurityIcon sx={{ color: '#4285f4 !important' }} />}
                />
              </Box>
            </Box>
          </Grid>

          {/* Right Side - Registration Form */}
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
                  Create Your Account
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Join auto-job.ai and accelerate your career today
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
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="firstName"
                      label="First Name"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="lastName"
                      label="Last Name"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      helperText="At least 8 characters with uppercase, lowercase, number, and special character"
                    />
                    {formData.password && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Password strength:
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color={`${passwordStrength.color}.main`}
                            sx={{ fontWeight: 500 }}
                          >
                            {passwordStrength.label}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={passwordStrength.score} 
                          color={passwordStrength.color}
                          sx={{ height: 4 }}
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      name="confirmPassword"
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle confirm password visibility"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size="small"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ 
                    mt: 3, 
                    mb: 3,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
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
                      Creating your account...
                    </Box>
                  ) : (
                    'Create Your Free Account'
                  )}
                </Button>
                
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Already have an account?
                  </Typography>
                </Divider>
                
                <Button
                  component={Link}
                  to="/login"
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<LoginIcon />}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  Sign In Instead
                </Button>
              </Box>

              {/* Terms and Privacy */}
              <Box sx={{ 
                mt: 3, 
                pt: 3, 
                borderTop: '1px solid',
                borderColor: 'divider',
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: 3,
                  flexWrap: 'wrap',
                  mt: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SecurityIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      SSL Encrypted
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      No Spam Guarantee
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

export default Register;