// src/components/recruiters/RecruiterList.js - FIXED PAGINATION
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Rating,
  Divider,
  Link,
  Badge,
  CircularProgress,
  Alert,
  Pagination,
  Paper
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LinkedIn as LinkedInIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import recruiterService from '../../utils/recruiterService';
import AutoJobLogo from '../common/AutoJobLogo';

const RecruiterCard = ({ recruiter, onViewDetails, onStartOutreach, onLoadMore }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Format recruiter data for display
  const formattedRecruiter = recruiterService.formatRecruiterForDisplay ? 
    recruiterService.formatRecruiterForDisplay(recruiter) : {
      displayName: `${recruiter.firstName} ${recruiter.lastName}`,
      companyDisplay: recruiter.company?.name || 'Company Not Available'
    };

  const handleStartOutreach = async () => {
    setIsLoading(true);
    try {
      await onStartOutreach(recruiter);
    } catch (error) {
      console.error('Failed to start outreach:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getContactStatusColor = (status) => {
    switch (status) {
      case 'replied':
        return 'success';
      case 'sent':
        return 'warning';
      case 'drafted':
        return 'info';
      default:
        return 'default';
    }
  };

  const getContactStatusText = (recruiter) => {
    if (recruiter.outreach?.hasContacted) {
      switch (recruiter.outreach.status) {
        case 'replied':
          return 'Replied';
        case 'sent':
          return 'Contacted';
        case 'drafted':
          return 'Draft Saved';
        default:
          return 'Contacted';
      }
    }
    return 'Not Contacted';
  };

  // Use different theme colors for avatar
  const getAvatarColor = (index) => {
    const colors = [
      theme.palette.secondary.main, // Teal
      theme.palette.warning.main,   // Orange
      theme.palette.success.main,   // Green
      theme.palette.info.main,      // Blue
      theme.palette.error.main      // Red
    ];
    // Use recruiter ID or name to consistently assign colors
    const colorIndex = (recruiter.id || recruiter.firstName?.charCodeAt(0) || 0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        '&:hover': {
          elevation: 2,
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: theme.palette.primary.light
        },
        ...(recruiter.outreach?.hasContacted && {
          borderColor: theme.palette.success.light,
          backgroundColor: `${theme.palette.success.main}08`
        })
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Avatar and Basic Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              mr: 2,
              bgcolor: getAvatarColor(),
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {recruiter.firstName?.[0]}{recruiter.lastName?.[0]}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: theme.palette.text.primary
                }}
              >
                {formattedRecruiter.displayName}
              </Typography>
              
              {recruiter.outreach?.hasContacted && (
                <Tooltip title={`Status: ${getContactStatusText(recruiter)}`}>
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: 16, 
                      color: theme.palette.success.main
                    }} 
                  />
                </Tooltip>
              )}
            </Box>
            
            <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500, mb: 0.5 }}>
              {recruiter.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BusinessIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {formattedRecruiter.companyDisplay}
              </Typography>
            </Box>
          </Box>

          {/* Rating */}
          {recruiter.rating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Rating
                value={recruiter.rating}
                readOnly
                size="small"
                precision={0.1}
              />
              <Typography variant="caption" color="text.secondary">
                {recruiter.rating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Company Logo and Info */}
        {recruiter.company?.logo && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={recruiter.company.logo}
              variant="square"
              sx={{ width: 20, height: 20, mr: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {recruiter.company.size && `${recruiter.company.size} company`}
            </Typography>
          </Box>
        )}

        {/* Industry and Specializations */}
        {recruiter.industry && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={recruiter.industry}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ mr: 1, mb: 1, borderRadius: 1 }}
            />
            {recruiter.specializations && recruiter.specializations.slice(0, 2).map((spec, index) => (
              <Chip
                key={index}
                label={spec}
                size="small"
                variant="outlined"
                sx={{ mr: 1, mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        )}

        {/* Contact Status */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={getContactStatusText(recruiter)}
            size="small"
            color={getContactStatusColor(recruiter.outreach?.status)}
            variant={recruiter.outreach?.hasContacted ? 'filled' : 'outlined'}
            sx={{ fontWeight: 500, borderRadius: 1 }}
          />
          
          {recruiter.outreach?.lastContactDate && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Last contact: {new Date(recruiter.outreach.lastContactDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Contact Information */}
        <Box sx={{ mb: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {recruiter.email && (
              <Tooltip title={`Email: ${recruiter.email}`}>
                <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {recruiter.phone && (
              <Tooltip title={`Phone: ${recruiter.phone}`}>
                <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {recruiter.linkedinUrl && (
              <Tooltip title="LinkedIn Profile">
                <IconButton 
                  size="small" 
                  sx={{ color: theme.palette.primary.main }}
                  component={Link}
                  href={recruiter.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => onViewDetails(recruiter)}
            size="small"
            sx={{ flex: 1, borderRadius: 2 }}
          >
            View Details
          </Button>
          
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : 
              <AutoJobLogo variant="icon-only" size="small" sx={{ width: 24, height: 24 }} />
            }
            onClick={handleStartOutreach}
            disabled={isLoading}
            size="small"
            color={recruiter.outreach?.hasContacted ? 'secondary' : 'primary'}
            sx={{ flex: 1, borderRadius: 2 }}
          >
            {isLoading ? 'Loading...' : 'Contact Recruiter'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const RecruiterList = ({ 
  searchResults, 
  loading, 
  error, 
  hasSearched,
  onViewDetails, 
  onStartOutreach,
  onLoadMore,
  onPageChange
}) => {
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (event, newPage) => {
    console.log(`📄 Page change requested: ${newPage}`);
    setCurrentPage(newPage);
    
    // Calculate offset for new page
    const limit = searchResults?.pagination?.limit || 20;
    const offset = (newPage - 1) * limit;
    
    // Call the page change handler with proper parameters
    if (onPageChange) {
      onPageChange(newPage, offset);
    } else if (onLoadMore) {
      // Fallback to onLoadMore if onPageChange not provided
      onLoadMore(newPage, offset);
    }
  };

  const handleLoadMore = () => {
    console.log('📄 Load more requested');
    if (onLoadMore) {
      const nextPage = currentPage + 1;
      const limit = searchResults?.pagination?.limit || 20;
      const offset = currentPage * limit; // Current page * limit for next batch
      
      setCurrentPage(nextPage);
      onLoadMore(nextPage, offset);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Searching recruiters...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          '& .MuiAlert-icon': {
            color: theme.palette.error.main
          }
        }}
      >
        {error}
      </Alert>
    );
  }

  // Show empty state only if user has searched
  if (hasSearched && (!searchResults || !searchResults.recruiters || searchResults.recruiters.length === 0)) {
    return (
      <Paper elevation={0} sx={{ textAlign: 'center', py: 8, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
        <PersonIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No recruiters found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Try adjusting your search criteria or filters to find more results.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          sx={{ borderRadius: 2 }}
        >
          Reset Search
        </Button>
      </Paper>
    );
  }

  // Don't show anything if no search has been performed
  if (!hasSearched) {
    return null;
  }

  const { recruiters, pagination } = searchResults;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  console.log('🔍 RecruiterList render:', {
    recruitersCount: recruiters?.length,
    currentPage,
    totalPages,
    pagination
  });

  return (
    <Box>
      {/* Results Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon sx={{ color: theme.palette.primary.main }} />
          {pagination.total.toLocaleString()} Recruiters Found
        </Typography>
      </Box>

      {/* Recruiter Grid */}
      <Grid container spacing={3}>
        {recruiters.map((recruiter) => (
          <Grid item xs={12} sm={6} lg={4} key={recruiter.id}>
            <RecruiterCard
              recruiter={recruiter}
              onViewDetails={onViewDetails}
              onStartOutreach={onStartOutreach}
              onLoadMore={onLoadMore}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pagination - Only show if more than one page */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2
              }
            }}
          />
        </Box>
      )}

      {/* Load More Button (Alternative to pagination) - REMOVED */}
      {/* This section has been removed as requested */}

      {/* Results Summary - SIMPLIFIED */}
      <Paper 
        elevation={0}
        sx={{ 
          mt: 3, 
          p: 2, 
          borderRadius: 2, 
          textAlign: 'center',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50]
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing {recruiters.length} of {pagination.total.toLocaleString()} recruiters
        </Typography>
      </Paper>
    </Box>
  );
};

export default RecruiterList;