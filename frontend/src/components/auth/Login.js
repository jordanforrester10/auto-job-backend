// src/components/auth/Login.js - CENTERED DESIGN MATCHING YOUR IMAGE
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Alert, 
  Paper,
  InputAdornment,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #00c4b4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: { xs: 3, sm: 4 }, // Increased padding
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingBottom: { xs: 4, sm: 5 }, // Extra bottom padding to prevent cutoff
    }}>
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: { xs: '400px', sm: '450px' }, // Made wider
          mx: 'auto'
        }}
      >
        {/* Main Form Container - Proper width like in image */}
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
              Welcome Back
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Sign in to continue your AI-powered job search journey
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
          
          <Box component="form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                  },
                }
              }}
            />
            
            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
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
                      onClick={handleClickShowPassword}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
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
            
            {/* Sign In Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
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
                  Signing you in...
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 2 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                New to auto-job.ai?
              </Typography>
            </Divider>
            
            {/* Create Account Button */}
            <Button
              component={Link}
              to="/register"
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<PersonAddIcon />}
              sx={{ 
                py: 1.5,
                fontSize: '0.9rem',
                fontWeight: 500,
                mb: 2,
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
              Create Your Free Account
            </Button>
            
            {/* Forgot Password Link */}
            <Button
              component={Link}
              to="/forgot-password"
              fullWidth
              variant="text"
              startIcon={<HelpIcon />}
              sx={{ 
                py: 1,
                color: 'text.secondary',
                fontSize: '0.875rem',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Forgot your password?
            </Button>
          </Box>

          {/* Trust Indicators Footer */}
          <Box sx={{ 
            mt: 3, // Reduced top margin 
            pt: 2, // Reduced top padding
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 1.5, // Reduced bottom margin
                fontSize: '0.875rem'
              }}
            >
              Trusted by professionals worldwide
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: { xs: 2, sm: 3 }, // Responsive gap
              flexWrap: 'wrap'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Bank-Level Security
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  GDPR Compliant
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  24/7 Support
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;