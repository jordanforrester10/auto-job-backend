import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  OpenInNew as OpenInNewIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import AutoJobLogo from '../common/AutoJobLogo';

const JobRecommendations = ({ jobs, onNext, onPrevious }) => {
  const theme = useTheme();

  const formatLocation = (location) => {
    // Handle null/undefined
    if (!location) return 'Location not specified';
    
    // Handle string locations
    if (typeof location === 'string') {
      return location;
    }
    
    // Handle complex location objects with city/state/country structure
    if (typeof location === 'object') {
      // Check for city/state/country structure
      if (location.city || location.state || location.country) {
        const parts = [];
        if (location.city) parts.push(String(location.city));
        if (location.state) parts.push(String(location.state));
        if (location.country && location.country !== 'US') parts.push(String(location.country));
        
        let locationStr = parts.join(', ');
        
        // Add remote indicator if applicable
        if (location.isRemote) {
          locationStr = locationStr ? `${locationStr} (Remote)` : 'Remote';
        }
        
        return locationStr || 'Location not specified';
      }
      
      // Fallback to parsed/original structure
      if (location.parsed && typeof location.parsed === 'string') {
        return location.parsed;
      }
      if (location.original && typeof location.original === 'string') {
        return location.original;
      }
      
      // If it's still an object, try to stringify it safely
      if (location.name) return String(location.name);
      if (location.location) return String(location.location);
    }
    
    // Final fallback - convert to string safely
    return 'Location not specified';
  };

  const formatSalary = (salary) => {
    if (!salary || (!salary.min && !salary.max)) {
      return 'Salary not specified';
    }
    
    const formatAmount = (amount) => {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return amount;
      
      if (numAmount >= 1000) {
        return `$${(numAmount / 1000).toFixed(0)}k`;
      }
      return `$${numAmount}`;
    };
    
    if (salary.min && salary.max) {
      return `${formatAmount(salary.min)} - ${formatAmount(salary.max)}`;
    } else if (salary.min) {
      return `${formatAmount(salary.min)}+`;
    } else if (salary.max) {
      return `Up to ${formatAmount(salary.max)}`;
    }
    
    return 'Competitive salary';
  };

  const getJobTypeColor = (jobType) => {
    if (!jobType) return 'default';
    
    switch (String(jobType).toLowerCase()) {
      case 'full_time':
      case 'full-time':
        return 'primary';
      case 'part_time':
      case 'part-time':
        return 'secondary';
      case 'contract':
        return 'warning';
      case 'remote':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatJobType = (jobType) => {
    if (!jobType) return 'Full-time';
    return String(jobType).replace('_', '-').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleJobClick = (job) => {
    if (job.sourceUrl) {
      window.open(job.sourceUrl, '_blank');
    }
  };

  // Ensure jobs is an array
  const jobsArray = Array.isArray(jobs) ? jobs : [];

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
            Back to Analysis
          </Button>

          {/* Centered Icon */}
          <WorkIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          
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
            Meet Your Recruiters
          </Button>
        </Box>
        
        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Preview Some Jobs We've Found For You
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Based on your resume analysis, we've found {jobsArray.length} relevant job opportunities across the US that match your background and skills. With our paid plan, you can automate this weekly and customize it to find 100's of jobs in your desired location(s) and specific to you.
        </Typography>
      </Box>

      {/* Jobs Grid */}
      {jobsArray.length > 0 ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {jobsArray.map((job, index) => (
            <Grid item xs={12} key={job.id || index}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`, 
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}20`
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    {/* Job Info */}
                    <Grid item xs={12} md={8}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {job.title || 'Job Title Not Available'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {job.company || 'Company Not Available'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {formatLocation(job.location)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Job Tags */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip 
                            label={formatJobType(job.jobType)}
                            color={getJobTypeColor(job.jobType)}
                            size="small"
                          />
                          {job.salary && (job.salary.min || job.salary.max) && (
                            <Chip 
                              icon={<AttachMoneyIcon />}
                              label={formatSalary(job.salary)}
                              color="success"
                              variant="outlined"
                              size="small"
                            />
                          )}
                          <Chip 
                            icon={
                              <AutoJobLogo 
                                variant="icon-only" 
                                size="small" 
                                sx={{ 
                                  '& svg': { 
                                    width: 16, 
                                    height: 16 
                                  } 
                                }} 
                              />
                            }
                            label="AI Matched"
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                        
                        {/* Job Description Preview */}
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.5
                          }}
                        >
                          {job.description || 'Job description not available'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Action Button */}
                    <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleJobClick(job)}
                        endIcon={<OpenInNewIcon />}
                        disabled={!job.sourceUrl}
                        sx={{ 
                          borderRadius: 2,
                          px: 3,
                          py: 1
                        }}
                      >
                        View Job
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            No jobs found at this time
          </Typography>
          <Typography variant="body2">
            We couldn't find any matching jobs right now, but don't worry! Our AI will continue searching for opportunities that match your profile.
          </Typography>
        </Alert>
      )}

      {/* Upgrade Prompt */}
      <Alert 
        severity="info" 
        sx={{ 
          mb: 4, 
          borderRadius: 2,
          backgroundColor: theme.palette.primary.main + '10',
          borderColor: theme.palette.primary.main + '30'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <UpgradeIcon color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Want More Job Opportunities?
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Upgrade to Hunter plan to get weekly automated job searches with location targeting, 
          unlimited resume tailoring, and access to our full recruiter database.
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          • Weekly automated searches with location targeting<br/>
          • Unlimited resume tailoring for each job<br/>
          • Access to 300k+ recruiters<br/>
        </Typography>
      </Alert>
    </Paper>
  );
};

export default JobRecommendations;
