// src/components/jobs/JobCreateDialog.js
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Grid, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Switch, 
  FormControlLabel, 
  Typography, 
  Divider, 
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  useTheme
} from '@mui/material';
import { 
  Add as AddIcon,
  Close as CloseIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  Link as LinkIcon,
  LocationOn as LocationOnIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import jobService from '../../utils/jobService';

const JobCreateDialog = ({ open, onClose, onJobCreated }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [jobData, setJobData] = useState({
    title: '',
    company: '',
    location: {
      city: '',
      state: '',
      country: 'US',
      remote: false
    },
    description: '',
    sourceUrl: '',
    salary: {
      min: '',
      max: '',
      currency: 'USD'
    },
    jobType: 'FULL_TIME'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setJobData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setJobData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    
    if (name === 'location.remote') {
      setJobData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          remote: checked
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!jobData.title || !jobData.company || !jobData.description) {
      setError('Job title, company, and description are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Clean up salary data
      const formattedJobData = {
        ...jobData,
        salary: {
          ...jobData.salary,
          min: jobData.salary.min ? Number(jobData.salary.min) : undefined,
          max: jobData.salary.max ? Number(jobData.salary.max) : undefined
        }
      };
      
      await jobService.createJob(formattedJobData);
      
      // Clear form and close dialog
      setJobData({
        title: '',
        company: '',
        location: {
          city: '',
          state: '',
          country: 'US',
          remote: false
        },
        description: '',
        sourceUrl: '',
        salary: {
          min: '',
          max: '',
          currency: 'USD'
        },
        jobType: 'FULL_TIME'
      });
      
      onJobCreated();
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err.response?.data?.message || 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear form
    setJobData({
      title: '',
      company: '',
      location: {
        city: '',
        state: '',
        country: 'US',
        remote: false
      },
      description: '',
      sourceUrl: '',
      salary: {
        min: '',
        max: '',
        currency: 'USD'
      },
      jobType: 'FULL_TIME'
    });
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? null : handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          // Custom scrollbar styling specifically for this dialog
          '& .MuiDialogContent-root': {
            // Override scrollbar for dialog content
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '2px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
              '&:active': {
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              },
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: 'transparent',
            },
            // Firefox scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>Add New Job</Typography>
          </Box>
          <Button 
            color="inherit" 
            onClick={handleCancel}
            disabled={loading}
            sx={{ 
              minWidth: 'auto', 
              p: 1,
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ 
          p: 3,
          // Enhanced scrollbar styling for the content area
          maxHeight: '70vh',
          overflowY: 'auto',
          // Custom scrollbar that matches your theme
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '2px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
            '&:active': {
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            },
          },
          '&::-webkit-scrollbar-corner': {
            backgroundColor: 'transparent',
          },
          // Firefox scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
        }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.2rem'
                }
              }}
            >
              {error}
            </Alert>
          )}
          
          {/* Basic Job Information Section */}
          <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WorkIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                Basic Job Information
              </Typography>
            </Box>
            
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Job Title"
                  name="title"
                  value={jobData.title}
                  onChange={handleChange}
                  fullWidth
                  required
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WorkIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Company"
                  name="company"
                  value={jobData.company}
                  onChange={handleChange}
                  fullWidth
                  required
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Job URL (Original Listing)"
                  name="sourceUrl"
                  value={jobData.sourceUrl}
                  onChange={handleChange}
                  fullWidth
                  placeholder="https://example.com/job-listing"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </Paper>
          
          {/* Location Section */}
          <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOnIcon color="secondary" />
              <Typography variant="subtitle1" fontWeight={600} color="secondary">
                Location
              </Typography>
            </Box>
            
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={jobData.location.remote} 
                      onChange={handleSwitchChange}
                      name="location.remote"
                      disabled={loading}
                      color="secondary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HomeIcon fontSize="small" color="secondary" />
                      <Typography variant="body2" fontWeight={500}>Remote Position</Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  label="City"
                  name="location.city"
                  value={jobData.location.city}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading || jobData.location.remote}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  label="State/Province"
                  name="location.state"
                  value={jobData.location.state}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading || jobData.location.remote}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={loading || jobData.location.remote}>
                  <InputLabel>Country</InputLabel>
                  <Select
                    name="location.country"
                    value={jobData.location.country}
                    onChange={handleChange}
                    label="Country"
                    startAdornment={
                      <InputAdornment position="start">
                        <PublicIcon color="action" fontSize="small" />
                      </InputAdornment>
                    }
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="US">🇺🇸 United States</MenuItem>
                    <MenuItem value="CA">🇨🇦 Canada</MenuItem>
                    <MenuItem value="UK">🇬🇧 United Kingdom</MenuItem>
                    <MenuItem value="AU">🇦🇺 Australia</MenuItem>
                    <MenuItem value="IN">🇮🇳 India</MenuItem>
                    <MenuItem value="DE">🇩🇪 Germany</MenuItem>
                    <MenuItem value="FR">🇫🇷 France</MenuItem>
                    <MenuItem value="OTHER">🌍 Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Job Details Section */}
          <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleIcon color="success" />
              <Typography variant="subtitle1" fontWeight={600} color="success.main">
                Job Details
              </Typography>
            </Box>
            
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Job Type</InputLabel>
                  <Select
                    name="jobType"
                    value={jobData.jobType}
                    onChange={handleChange}
                    label="Job Type"
                    startAdornment={
                      <InputAdornment position="start">
                        <ScheduleIcon color="action" fontSize="small" />
                      </InputAdornment>
                    }
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="FULL_TIME">💼 Full-time</MenuItem>
                    <MenuItem value="PART_TIME">⏰ Part-time</MenuItem>
                    <MenuItem value="CONTRACT">📋 Contract</MenuItem>
                    <MenuItem value="FREELANCE">🎯 Freelance</MenuItem>
                    <MenuItem value="INTERNSHIP">🎓 Internship</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="salary.currency"
                    value={jobData.salary.currency}
                    onChange={handleChange}
                    label="Currency"
                    startAdornment={
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="action" fontSize="small" />
                      </InputAdornment>
                    }
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="USD">💵 USD ($)</MenuItem>
                    <MenuItem value="EUR">💶 EUR (€)</MenuItem>
                    <MenuItem value="GBP">💷 GBP (£)</MenuItem>
                    <MenuItem value="CAD">🍁 CAD (C$)</MenuItem>
                    <MenuItem value="AUD">🦘 AUD (A$)</MenuItem>
                    <MenuItem value="INR">🇮🇳 INR (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Minimum Salary"
                  name="salary.min"
                  value={jobData.salary.min}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  InputProps={{ 
                    inputProps: { min: 0 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Maximum Salary"
                  name="salary.max"
                  value={jobData.salary.max}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  InputProps={{ 
                    inputProps: { min: 0 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Job Description Section */}
          <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DescriptionIcon color="warning" />
              <Typography variant="subtitle1" fontWeight={600} color="warning.main">
                Job Description
              </Typography>
            </Box>
            
            <TextField
              label="Job Description"
              name="description"
              value={jobData.description}
              onChange={handleChange}
              fullWidth
              required
              multiline
              rows={8}
              placeholder="Paste the full job description here..."
              disabled={loading}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  '& textarea': {
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    // Custom scrollbar for textarea
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '2px',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      },
                    },
                    '&::-webkit-scrollbar-corner': {
                      backgroundColor: 'transparent',
                    },
                  }
                } 
              }}
            />
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ 
          px: 3, 
          py: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'rgba(0,0,0,0.02)'
        }}>
          <Button 
            onClick={handleCancel} 
            disabled={loading}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1
            }}
          >
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default JobCreateDialog;