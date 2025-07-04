// frontend/src/components/auth/ResetPassword.js - COMPLETE THEMED VERSION
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Box, 
  Alert, 
  Paper,
  InputAdornment,
  IconButton,
  Fade,
  Chip
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Lock,
  CheckCircle,
  Security,
  Support,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const { resetPassword, loading } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();

  // Password validation criteria
  const validatePasswordCriteria = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const passwordCriteria = validatePasswordCriteria(password);
  const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);

  const validateForm = () => {
    const errors = {};
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!allCriteriaMet) {
      errors.password = 'Password does not meet all requirements';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    const result = await resetPassword(token, password);
    
    if (result.success) {
      setSuccess('Your password has been reset successfully! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setError(result.error || 'Failed to reset password. Please try again.');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (validationErrors.confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const PasswordCriteriaItem = ({ met, text }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1, 
      py: 0.25,
      color: met ? '#34a853' : '#5f6368',
      transition: 'color 0.2s ease'
    }}>
      <CheckCircle 
        sx={{ 
          fontSize: 14, 
          opacity: met ? 1 : 0.3,
          transition: 'opacity 0.2s ease'
        }} 
      />
      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
        {text}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      height: 'auto',
      background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      py: { xs: 2, sm: 3, md: 4 },
      px: { xs: 1, sm: 2 },
      overflow: 'visible'
    }}>
      <Container 
        maxWidth="md" 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          height: 'auto'
        }}
      >
        <Fade in timeout={600}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 4,
            boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.15)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            width: '100%',
            maxWidth: { xs: '100%', sm: 550, md: 650 },
            my: { xs: 1, sm: 2, md: 3 },
            mx: 'auto',
            position: 'relative',
            overflow: 'visible'
          }}>
            {/* Logo */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <AutoJobLogo 
                variant="icon-only" 
                size="large"
              />
            </Box>

            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                component="h1" 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  color: '#202124',
                  mb: 2,
                  fontSize: { xs: '1.75rem', sm: '2rem' }
                }}
              >
                Reset Your Password
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#5f6368',
                  lineHeight: 1.5,
                  fontSize: '0.95rem'
                }}
              >
                Create a new secure password for your account
              </Typography>
            </Box>

            {/* Info Alert */}
            <Box sx={{ 
              mb: 3,
              p: 2,
              backgroundColor: '#e8f5e8',
              borderRadius: 2,
              border: '1px solid #c8e6c9',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1
            }}>
              <CheckCircle sx={{ 
                color: '#4caf50', 
                fontSize: 20, 
                mt: 0.2,
                flexShrink: 0
              }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#2e7d32',
                  fontSize: '0.875rem',
                  lineHeight: 1.4
                }}
              >
                Choose a strong password with at least 8 characters including uppercase, lowercase, numbers, and special characters.
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}
            
            {/* Success Alert */}
            {success && (
              <Fade in>
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2
                  }}
                >
                  {success}
                </Alert>
              </Fade>
            )}
            
            {/* Reset Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {/* Password Fields Container */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: { xs: 0, md: 3 },
                mb: 2
              }}>
                {/* New Password Field */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 500,
                      color: '#202124'
                    }}
                  >
                    New Password *
                  </Typography>
                  
                  <TextField
                    required
                    fullWidth
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                    error={!!validationErrors.password}
                    disabled={loading}
                    placeholder="Enter your new password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#1a73e8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={loading}
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: { xs: 2, md: 0 },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8f9fa',
                        '& fieldset': {
                          borderColor: '#dadce0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#1a73e8',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1a73e8',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputBase-input': {
                        py: 1.5,
                      }
                    }}
                  />
                </Box>

              {/* Password Criteria */}
              {password && (
                <Box sx={{ 
                  mb: 3, 
                  p: 3, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: allCriteriaMet ? '#c8e6c9' : '#dadce0'
                }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: '#202124',
                    fontSize: '0.875rem',
                    mb: 2
                  }}>
                    Password Requirements:
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, 
                    gap: 1
                  }}>
                    <PasswordCriteriaItem 
                      met={passwordCriteria.length} 
                      text="8+ characters"
                    />
                    <PasswordCriteriaItem 
                      met={passwordCriteria.uppercase} 
                      text="Uppercase letter"
                    />
                    <PasswordCriteriaItem 
                      met={passwordCriteria.lowercase} 
                      text="Lowercase letter"
                    />
                    <PasswordCriteriaItem 
                      met={passwordCriteria.number} 
                      text="Number included"
                    />
                    <PasswordCriteriaItem 
                      met={passwordCriteria.special} 
                      text="Special character"
                    />
                  </Box>
                </Box>
              )}

              {/* Password Match Indicator */}
              {confirmPassword && (
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle 
                    sx={{ 
                      fontSize: 16,
                      color: password === confirmPassword ? '#34a853' : '#ea4335'
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: password === confirmPassword ? '#34a853' : '#ea4335',
                      fontSize: '0.875rem'
                    }}
                  >
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Typography>
                </Box>
              )}

                {/* Confirm Password Field */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 500,
                      color: '#202124'
                    }}
                  >
                    Confirm Password *
                  </Typography>
                  
                  <TextField
                    required
                    fullWidth
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    error={!!validationErrors.confirmPassword}
                    disabled={loading}
                    placeholder="Confirm your new password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#1a73e8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            disabled={loading}
                            size="small"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 0,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8f9fa',
                        '& fieldset': {
                          borderColor: '#dadce0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#1a73e8',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1a73e8',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputBase-input': {
                        py: 1.5,
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !allCriteriaMet || password !== confirmPassword}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                  boxShadow: '0px 4px 12px rgba(26, 115, 232, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
                    boxShadow: '0px 6px 16px rgba(26, 115, 232, 0.4)',
                  },
                  '&:disabled': {
                    background: '#f1f3f4',
                    color: '#9aa0a6',
                    boxShadow: 'none'
                  },
                  mb: 4
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>

              {/* Divider */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                gap: 2
              }}>
                <Box sx={{ flex: 1, height: 1, bgcolor: '#dadce0' }} />
                <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
                  Remember your password?
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: '#dadce0' }} />
              </Box>

              {/* Back to Login */}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ 
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    borderColor: '#dadce0',
                    color: '#1a73e8',
                    '&:hover': {
                      borderColor: '#1a73e8',
                      backgroundColor: 'rgba(26, 115, 232, 0.04)',
                    },
                    mb: 4
                  }}
                >
                  ← Back to Sign In
                </Button>
              </Link>
            </Box>

            {/* Security Section */}
            <Box sx={{ 
              mt: 4, 
              pt: 3,
              borderTop: '1px solid #f1f3f4'
            }}>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 2
              }}>
                <Security sx={{ 
                  color: '#34a853', 
                  fontSize: 20,
                  mt: 0.2,
                  flexShrink: 0
                }} />
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#202124',
                      mb: 0.5
                    }}
                  >
                    Security First
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#5f6368',
                      fontSize: '0.875rem',
                      lineHeight: 1.4
                    }}
                  >
                    Your password is encrypted and securely stored. This reset link expires in 10 minutes for your security.
                  </Typography>
                </Box>
              </Box>

              {/* Support Section */}
              <Box sx={{ 
                textAlign: 'center',
                mt: 3
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#5f6368',
                    mb: 2,
                    fontSize: '0.875rem'
                  }}
                >
                  Still having trouble? We're here to help.
                </Typography>
                
                <Box sx={{ 
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Chip
                    icon={<Support sx={{ fontSize: 16 }} />}
                    label="Contact Support"
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: '#1a73e8',
                      color: '#1a73e8',
                      '&:hover': {
                        backgroundColor: 'rgba(26, 115, 232, 0.04)',
                      }
                    }}
                  />
                  <Chip
                    icon={<Schedule sx={{ fontSize: 16 }} />}
                    label="Available 24/7"
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: '#34a853',
                      color: '#34a853',
                      '&:hover': {
                        backgroundColor: 'rgba(52, 168, 83, 0.04)',
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default ResetPassword;

