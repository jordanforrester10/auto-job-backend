// frontend/src/components/user/Auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Container, Box, Alert, Grid } from '@mui/material';
import axios from 'axios';

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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { firstName, lastName, email, password, confirmPassword } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return false;
    }
    
    return true;
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/register', {
        firstName,
        lastName,
        email,
        password
      });
      
      // Store token in local storage
      localStorage.setItem('token', res.data.token);
      
      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setSuccess('Registration successful! Please check your email to verify your account.');
      setLoading(false);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

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
        <Typography component="h1" variant="h5">
          Create an Account
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 3, width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="firstName"
                required
                fullWidth
                id="firstName"
                label="First Name"
                autoFocus
                value={firstName}
                onChange={onChange}
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
                value={lastName}
                onChange={onChange}
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
                value={email}
                onChange={onChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={onChange}
                helperText="At least 8 characters with uppercase, lowercase, number, and special character"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              onClick={() => navigate('/login')}
              variant="text"
              sx={{ textTransform: 'none' }}
            >
              Already have an account? Sign In
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Register;