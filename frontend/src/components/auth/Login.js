// src/components/auth/Login.js - FULLY RESPONSIVE DESIGN
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
  CircularProgress,
  Container
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
      position: 'relative',
      overflowY: 'auto',
      py: { xs: 2, sm: 3, md: 4 }, // Responsive padding
    }}>
      <Container 
        maxWidth="sm"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 'auto', sm: '100vh' },
          py: { xs: 2, sm: 0 }
        }}
      >
        <Box 
          sx={{ 
            width: '100%',
            maxWidth: { xs: '100%', sm: '420px', md: '450px' },
            mx: 'auto'
          }}
        >
          {/* Main Form Container */}
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2.5, sm: 3.5, md: 4 },
              width: '100%',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              borderRadius: { xs: 2, sm: 3 },
              mx: 'auto'
            }}
          >
            {/* Header with Logo */}
            <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
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
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                }}
              >
                Welcome Back
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '0.9rem', md: '1rem' },
                  px: { xs: 1, sm: 0 } // Add padding on very small screens
                }}
              >
                Sign in to continue your AI-powered job search journey
              </Typography>
            </Box>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '0.9rem' },
                  '& .MuiAlert-icon': {
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
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
                      <EmailIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: { xs: 1.5, sm: 2 },
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 }
                  },
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
                      <LockIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                        sx={{ mr: 0.5 }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: { xs: 2, sm: 3 },
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 }
                  },
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
                  py: { xs: 1.25, sm: 1.5 },
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 600,
                  mb: { xs: 2, sm: 3 },
                  background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  minHeight: { xs: 44, sm: 48 }, // Ensure touch-friendly size
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
                    <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      Signing you in...
                    </Typography>
                  </Box>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Divider */}
              <Divider sx={{ my: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
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
                startIcon={<PersonAddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                sx={{ 
                  py: { xs: 1.25, sm: 1.5 },
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  fontWeight: 500,
                  mb: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  textTransform: 'none',
                  minHeight: { xs: 44, sm: 48 },
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
                startIcon={<HelpIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                sx={{ 
                  py: { xs: 0.75, sm: 1 },
                  color: 'text.secondary',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  textTransform: 'none',
                  minHeight: { xs: 36, sm: 40 },
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
              mt: { xs: 2, sm: 3 },
              pt: { xs: 1.5, sm: 2 },
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: { xs: 1, sm: 1.5 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Trusted by professionals worldwide
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: { xs: 1, sm: 2, md: 3 },
                flexWrap: 'wrap'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  >
                    Enterprise Grade
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  >
                    GDPR Compliant
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  >
                    24/7 Support
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;