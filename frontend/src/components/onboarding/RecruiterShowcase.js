import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Upgrade as UpgradeIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const RecruiterShowcase = ({ recruiters, onNext, onPrevious }) => {
  const theme = useTheme();

  const formatEmployeeCount = (count) => {
    if (!count) return 'Company size not specified';
    if (count < 1000) return `${count} employees`;
    if (count < 1000000) return `${Math.round(count / 1000)}k employees`;
    return `${Math.round(count / 1000000)}M employees`;
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  const handleRecruiterView = (recruiter) => {
    // For onboarding, we just show the recruiter info without enabling contact
    console.log('Viewing recruiter:', recruiter.fullName);
  };

  return (
    <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
      {/* Header with Navigation Buttons */}
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
        {/* Icon and Buttons on same line */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'relative',
          mb: 2 
        }}>
          {/* Back Button */}
          <Button
            variant="outlined"
            onClick={onPrevious}
            startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Back to Jobs
          </Button>

          {/* Centered Icon */}
          <PeopleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          
          {/* Next Button */}
          <Button
            variant="contained"
            onClick={onNext}
            endIcon={<ArrowForwardIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            See Next Steps
          </Button>
        </Box>
        
        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Preview Recruiters At These Companies
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          We've found {recruiters.length} recruiters at the companies from your job matches. 
          These are the people who could help you land your next role. You can access these and 300,000 more in one of our paid plans.
        </Typography>
      </Box>

      {/* Recruiters Grid */}
      {recruiters.length > 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mb: 4 
        }}>
          <Grid 
            container 
            spacing={3} 
            sx={{ 
              maxWidth: recruiters.length === 1 ? '400px' : 
                       recruiters.length === 2 ? '800px' : 
                       '1200px',
              justifyContent: 'center'
            }}
          >
            {recruiters.map((recruiter, index) => (
              <Grid 
                item 
                xs={12} 
                md={recruiters.length === 1 ? 12 : 6} 
                lg={recruiters.length === 3 ? 4 : recruiters.length === 2 ? 6 : 12} 
                key={index}
              >
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`, 
                  borderRadius: 2,
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}20`
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Recruiter Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                    <Avatar 
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: 'primary.main',
                        fontSize: '1.2rem',
                        fontWeight: 600
                      }}
                    >
                      {getInitials(recruiter.firstName, recruiter.lastName)}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {recruiter.fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {recruiter.title || 'Recruiter'}
                      </Typography>
                      
                      {/* Company Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {recruiter.company?.name || 'Company not specified'}
                        </Typography>
                      </Box>
                      
                      {/* Industry */}
                      {recruiter.industry && (
                        <Chip 
                          label={recruiter.industry}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Company Details and Contact Info Side by Side */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {/* Company Details */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Company Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {recruiter.company?.employeeCount && (
                          <Typography variant="body2" color="text.secondary">
                            📊 {formatEmployeeCount(recruiter.company.employeeCount)}
                          </Typography>
                        )}
                        {recruiter.company?.website && (
                          <Typography variant="body2" color="text.secondary">
                            🌐 {recruiter.company.website}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Contact Info */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Contact Information
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            {recruiter.email ? `${recruiter.email.substring(0, 3)}***@${recruiter.email.split('@')[1]}` : 'Email available'}
                          </Typography>
                          <LockIcon fontSize="small" color="action" />
                        </Box>
                        {recruiter.linkedinUrl && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkedInIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              LinkedIn available
                            </Typography>
                            <LockIcon fontSize="small" color="action" />
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Locked View Button */}
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled
                    startIcon={<LockIcon />}
                    sx={{ 
                      borderRadius: 2,
                      py: 1,
                      color: 'text.disabled',
                      borderColor: 'divider',
                      '&.Mui-disabled': {
                        color: 'text.disabled',
                        borderColor: 'divider'
                      }
                    }}
                  >
                    Locked - Upgrade to View
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            No recruiters found at this time
          </Typography>
          <Typography variant="body2">
            We couldn't find recruiters at the matched companies right now, but our database is constantly updated with new recruiter contacts.
          </Typography>
        </Alert>
      )}

      {/* Upgrade Prompt */}
      <Alert 
        severity="warning" 
        sx={{ 
          mb: 4, 
          borderRadius: 2,
          backgroundColor: theme.palette.warning.main + '10',
          borderColor: theme.palette.warning.main + '30'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <UpgradeIcon color="warning" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>
            Unlock Full Recruiter Access
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This is just a preview! Upgrade to Hunter plan to unlock full contact details, 
          send personalized messages, and access our complete database of 300k+ recruiters.
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          • Full contact information (email and LinkedIn)<br/>
          • AI-powered message generation<br/>
          • Recruiter outreach tracking<br/>
          • Access to 300k+ verified recruiters
        </Typography>
      </Alert>

      {/* Key Benefits */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
          Why Connect with Recruiters?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                3x
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Higher chance of getting interviews when reaching out to recruiters
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                60%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Of jobs are filled through recruiter networks before being posted
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 700 }}>
                2x
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Faster hiring process when you have a recruiter advocate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default RecruiterShowcase;
