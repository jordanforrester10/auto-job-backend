// src/components/auth/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Box, 
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');
  
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear errors when user starts typing
    if (localError) setLocalError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Login successful, navigate to dashboard
        navigate('/dashboard');
      } else {
        setLocalError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLocalError('An unexpected error occurred. Please try again.');
    }
  };

  // Use local error if available, otherwise use context error
  const displayError = localError || error;

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          mt: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h4" gutterBottom>
              Sign In
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Welcome back! Please sign in to your account.
            </Typography>
            
            {displayError && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {displayError}
              </Alert>
            )}
            
            <Box component="form" onSubmit={onSubmit} sx={{ width: '100%' }}>
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
                onChange={onChange}
                error={!!displayError && displayError.includes('email')}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={onChange}
                error={!!displayError && displayError.includes('password')}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading || !email.trim() || !password.trim()}
                size="large"
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  component={Link}
                  to="/register"
                  variant="text"
                  sx={{ textTransform: 'none' }}
                  disabled={loading}
                >
                  Don't have an account? Sign Up
                </Button>
                <Button
                  component={Link}
                  to="/forgot-password"
                  variant="text"
                  sx={{ textTransform: 'none' }}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;