// src/components/recruiters/RecruiterDetails.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Link,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LinkedIn as LinkedInIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Language as LanguageIcon,
  CalendarToday as CalendarTodayIcon,
  Send as SendIcon,
  Star as StarIcon,
  Groups as GroupsIcon,
  Domain as DomainIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import recruiterService from '../../utils/recruiterService';

const RecruiterDetails = ({ open, onClose, recruiterId, onStartOutreach }) => {
  const theme = useTheme();
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when dialog opens/closes or recruiterId changes
  useEffect(() => {
    if (open && recruiterId) {
      loadRecruiterDetails();
    } else {
      // Reset state when dialog closes or no recruiterId
      setRecruiter(null);
      setError('');
      setLoading(false);
    }
  }, [open, recruiterId]);

  const loadRecruiterDetails = async () => {
    // Don't load if no recruiterId provided
    if (!recruiterId) {
      setError('No recruiter selected');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('🔍 Loading recruiter details for ID:', recruiterId);
      
      const response = await recruiterService.getRecruiterDetails(recruiterId);
      
      if (response && response.recruiter) {
        setRecruiter(response.recruiter);
        console.log('✅ Recruiter details loaded:', response.recruiter.fullName);
      } else {
        setError('Recruiter data not found');
      }
    } catch (error) {
      console.error('Failed to load recruiter details:', error);
      setError('Failed to load recruiter details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state when closing
    setRecruiter(null);
    setError('');
    setLoading(false);
    onClose();
  };

  const handleStartOutreach = () => {
    if (recruiter) {
      onStartOutreach(recruiter);
      handleClose();
    }
  };

  const formatCompanySize = (sizeString) => {
    if (!sizeString) return 'Not specified';
    
    // Handle formats like "10000plus" or "1000plus"
    const plusMatch = sizeString.match(/(\d+)plus/i);
    if (plusMatch) {
      const [, number] = plusMatch;
      return `${parseInt(number).toLocaleString()}+ employees`;
    }
    
    // Handle formats like "Employees.1000to4999" or "1000to4999"
    const rangeMatch = sizeString.match(/(\d+)to(\d+)/);
    if (rangeMatch) {
      const [, min, max] = rangeMatch;
      return `${parseInt(min).toLocaleString()} - ${parseInt(max).toLocaleString()} employees`;
    }
    
    // Handle other formats like "Employees.1000plus"
    if (sizeString.includes('Employees.')) {
      const cleanedSize = sizeString.replace('Employees.', '');
      
      // Check for plus format after removing "Employees."
      const plusMatch2 = cleanedSize.match(/(\d+)plus/i);
      if (plusMatch2) {
        const [, number] = plusMatch2;
        return `${parseInt(number).toLocaleString()}+ employees`;
      }
      
      // Check for range format after removing "Employees."
      const rangeMatch2 = cleanedSize.match(/(\d+)to(\d+)/);
      if (rangeMatch2) {
        const [, min, max] = rangeMatch2;
        return `${parseInt(min).toLocaleString()} - ${parseInt(max).toLocaleString()} employees`;
      }
      
      return cleanedSize.replace('to', ' - ') + ' employees';
    }
    
    return sizeString;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    // Use recruiter ID to consistently assign colors
    const colorIndex = (recruiterId || 0) % colors.length;
    return colors[colorIndex];
  };

  // Safe text rendering function
  const safeText = (value) => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'object') {
      // Handle industry object specifically
      if (value.name) return value.name;
      if (value.description) return value.description;
      return 'Not specified';
    }
    return String(value);
  };

  // Extract industry name safely
  const getIndustryName = (industry) => {
    if (!industry) return 'Not specified';
    if (typeof industry === 'string') return industry;
    if (typeof industry === 'object' && industry.name) return industry.name;
    return 'Not specified';
  };

  // Don't render dialog if not open
  if (!open) return null;

  // Show error state if no recruiterId provided
  if (!recruiterId) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h6" sx={{ color: theme.palette.error.main }}>
            Error
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            No recruiter selected. Please select a recruiter to view details.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          minHeight: '500px'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        p: 0,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            Recruiter Details
          </Typography>
          <IconButton 
            onClick={handleClose}
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} sx={{ color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Loading recruiter details...
              </Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert 
              severity="error" 
              sx={{ borderRadius: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={loadRecruiterDetails}
                  disabled={loading}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {recruiter && !loading && !error && (
          <Box sx={{ p: 3 }}>
            {/* Profile Header */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                mb: 3, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}08)`,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: getAvatarColor(),
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    border: `3px solid ${theme.palette.background.paper}`,
                    boxShadow: theme.shadows[4]
                  }}
                >
                  {getInitials(recruiter.firstName, recruiter.lastName)}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
                    {safeText(recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`)}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WorkIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                    <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                      {safeText(recruiter.title)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon sx={{ color: theme.palette.text.secondary, fontSize: '1.1rem' }} />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {safeText(recruiter.company?.name)}
                    </Typography>
                    {recruiter.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
                        <StarIcon sx={{ color: theme.palette.warning.main, fontSize: '1.1rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {Number(recruiter.rating).toFixed(1)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                {recruiter.outreach?.hasContacted && (
                  <Chip
                    label="Previously Contacted"
                    color="success"
                    variant="outlined"
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 500
                    }}
                  />
                )}
              </Box>
            </Paper>

            <Grid container spacing={3}>
              {/* Contact Information */}
              <Grid item xs={12} md={6}>
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 2,
                        color: theme.palette.primary.main,
                        fontWeight: 600
                      }}
                    >
                      <EmailIcon />
                      Contact Information
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {recruiter.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Email
                            </Typography>
                            <Link
                              href={`mailto:${recruiter.email}`}
                              sx={{ 
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                fontWeight: 500,
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {safeText(recruiter.email)}
                            </Link>
                          </Box>
                        </Box>
                      )}

                      {recruiter.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PhoneIcon sx={{ color: theme.palette.success.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Phone
                            </Typography>
                            <Link
                              href={`tel:${recruiter.phone}`}
                              sx={{ 
                                color: theme.palette.text.primary,
                                textDecoration: 'none',
                                fontWeight: 500,
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {safeText(recruiter.phone)}
                            </Link>
                          </Box>
                        </Box>
                      )}

                      {recruiter.linkedinUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinkedInIcon sx={{ color: '#0077b5', fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              LinkedIn
                            </Typography>
                            <Link
                              href={recruiter.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                color: '#0077b5',
                                textDecoration: 'none',
                                fontWeight: 500,
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              LinkedIn Profile
                            </Link>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Company Details */}
              <Grid item xs={12} md={6}>
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 2,
                        color: theme.palette.primary.main,
                        fontWeight: 600
                      }}
                    >
                      <DomainIcon />
                      Company Details
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {recruiter.company?.size && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <GroupsIcon sx={{ color: theme.palette.secondary.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Company Size
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatCompanySize(recruiter.company.size)}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {recruiter.industry && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <WorkIcon sx={{ color: theme.palette.info.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Industry
                            </Typography>
                            <Chip
                              label={getIndustryName(recruiter.industry)}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ borderRadius: 1, fontWeight: 500 }}
                            />
                          </Box>
                        </Box>
                      )}

                      {recruiter.company?.foundedYear && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CalendarTodayIcon sx={{ color: theme.palette.warning.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Founded
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {safeText(recruiter.company.foundedYear)}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {recruiter.company?.website && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LanguageIcon sx={{ color: theme.palette.success.main, fontSize: '1.2rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Website
                            </Typography>
                            <Link
                              href={String(recruiter.company.website).startsWith('http') ? 
                                recruiter.company.website : 
                                `https://${recruiter.company.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                fontWeight: 500,
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {safeText(recruiter.company.website)}
                            </Link>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Specializations */}
              {recruiter.specializations && Array.isArray(recruiter.specializations) && recruiter.specializations.length > 0 && (
                <Grid item xs={12}>
                  <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 2,
                          color: theme.palette.primary.main,
                          fontWeight: 600
                        }}
                      >
                        <StarIcon />
                        Specializations
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {recruiter.specializations.map((spec, index) => (
                          <Chip
                            key={index}
                            label={safeText(spec)}
                            variant="outlined"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 500,
                              '&:hover': {
                                backgroundColor: theme.palette.primary.main + '08'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions - Only Close Button */}
      <DialogActions sx={{ 
        p: 3, 
        borderTop: `1px solid ${theme.palette.divider}`,
        background: theme.palette.grey[50]
      }}>
        <Button 
          onClick={handleClose} 
          variant="contained"
          sx={{ 
            borderRadius: 2,
            minWidth: 100
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecruiterDetails;
