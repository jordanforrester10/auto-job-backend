// src/components/recruiters/RecruiterSearch.js - FIXED WITH PAGINATION SUPPORT
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  Autocomplete,
  Chip,
  Paper,
  Collapse,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import recruiterService from '../../utils/recruiterService';

const RecruiterSearch = ({ onSearchResults, onLoading, onError, onSearchStateChange }) => {
  const theme = useTheme();
  
  // Search state - NO LOCATION FILTER
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    company: null,
    industry: null,
    title: ''
  });
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  
  // Store current search parameters for pagination
  const [currentSearchParams, setCurrentSearchParams] = useState(null);
  
  // Filter options - NO LOCATIONS
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    industries: []
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setFilterOptionsLoading(true);
      const response = await recruiterService.getFilterOptions();
      setFilterOptions(response.filterOptions);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      onError?.('Failed to load search filters');
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  // Debounced search function with pagination support
  const performSearch = useCallback(async (searchParams = {}, page = 1, offset = 0) => {
    try {
      setIsSearching(true);
      onLoading?.(true);
      onSearchStateChange?.(true);
      
      const searchFilters = {
        query: searchQuery,
        company: filters.company?.name || '',
        industry: filters.industry?.name || '',
        title: filters.title || '',
        ...searchParams, // This should override the above if provided
        limit: 20,
        offset: offset
      };

      console.log('🔍 Performing search with filters:', searchFilters);
      console.log(`📄 Page: ${page}, Offset: ${offset}`);
      
      // Store current search params for pagination (FIXED)
      const paramsToStore = {
        query: searchFilters.query,
        company: searchFilters.company,
        industry: searchFilters.industry,
        title: searchFilters.title
      };
      setCurrentSearchParams(paramsToStore);
      
      const response = await recruiterService.searchRecruiters(searchFilters);
      
      setSearchCount(response.pagination.total);
      
      // Pass search parameters along with results (FIXED)
      if (onSearchResults) {
        // Add the search parameters to the callback
        onSearchResults(response, paramsToStore);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      onError?.('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
      onLoading?.(false);
    }
  }, [searchQuery, filters, onSearchResults, onLoading, onError, onSearchStateChange]);

  // Handle search button click
  const handleSearch = () => {
    performSearch({}, 1, 0); // Reset to page 1
  };

  // Handle pagination from RecruiterList
  const handlePageChange = useCallback((page, offset) => {
    console.log(`🔄 RecruiterSearch: Page change requested - Page: ${page}, Offset: ${offset}`);
    
    if (currentSearchParams) {
      // Use stored search parameters for pagination
      performSearch(currentSearchParams, page, offset);
    } else {
      // Fallback: perform new search with current filters
      performSearch({}, page, offset);
    }
  }, [currentSearchParams, performSearch]);

  // Expose pagination handler to parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    handlePageChange
  }));

  // Make pagination handler available to parent
  React.useEffect(() => {
    if (onSearchResults && typeof onSearchResults === 'function') {
      // Add pagination handler as a property to the callback
      onSearchResults.handlePageChange = handlePageChange;
    }
  }, [handlePageChange, onSearchResults]);

  // Handle filter changes with proper null handling
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Reset entire search state
  const resetSearchState = () => {
    setSearchQuery('');
    setFilters({
      company: null,
      industry: null,
      title: ''
    });
    setSearchCount(0);
    setShowAdvancedFilters(false);
    setCurrentSearchParams(null);
    onSearchStateChange?.(false);
    onSearchResults?.(null);
  };

  // Clear search query (X button)
  const clearSearchQuery = () => {
    setSearchQuery('');
    // If there are no other filters, reset everything
    if (!hasActiveFiltersExceptQuery()) {
      resetSearchState();
    }
  };

  // Refresh search with current parameters
  const refreshSearch = () => {
    performSearch({}, 1, 0); // Reset to page 1
  };

  // Check if any filters are applied (excluding search query)
  const hasActiveFiltersExceptQuery = () => {
    return filters.company || 
           filters.industry || 
           filters.title;
  };

  // Check if any filters are applied (including search query)
  const hasActiveFilters = () => {
    return searchQuery || hasActiveFiltersExceptQuery();
  };

  // Expose the pagination handler to parent components
  React.useEffect(() => {
    // Create a custom property on the component to expose pagination
    if (typeof window !== 'undefined') {
      window.recruiterSearchPagination = handlePageChange;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.recruiterSearchPagination;
      }
    };
  }, [handlePageChange]);

  return (
    <Paper elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Main Search Bar */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SearchIcon sx={{ color: theme.palette.primary.main }} />
            Find Recruiters
            {searchCount > 0 && (
              <Chip 
                label={`${searchCount.toLocaleString()} found`} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ borderRadius: 1 }}
              />
            )}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by name, company, title, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: searchQuery && (
                    <IconButton size="small" onClick={clearSearchQuery}>
                      <ClearIcon />
                    </IconButton>
                  )
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={isSearching}
                  startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                  sx={{ borderRadius: 2, minWidth: 120 }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
                
                <Badge 
                  badgeContent={hasActiveFilters() ? '●' : 0} 
                  color="secondary"
                  variant="dot"
                >
                  <Button
                    variant="outlined"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    startIcon={<FilterIcon />}
                    endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    Filters
                  </Button>
                </Badge>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              bgcolor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterIcon sx={{ color: theme.palette.primary.main }} />
              Advanced Filters
            </Typography>
            
            <Grid container spacing={3}>
              {/* Company Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <Autocomplete
                  options={filterOptions.companies}
                  getOptionLabel={(option) => option?.name || ''}
                  value={filters.company}
                  onChange={(e, value) => handleFilterChange('company', value)}
                  loading={filterOptionsLoading}
                  isOptionEqualToValue={(option, value) => option?.name === value?.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Company"
                      placeholder="Select company..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.name}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.count} recruiters
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>

              {/* Industry Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <Autocomplete
                  options={filterOptions.industries}
                  getOptionLabel={(option) => option?.name || ''}
                  value={filters.industry}
                  onChange={(e, value) => handleFilterChange('industry', value)}
                  loading={filterOptionsLoading}
                  isOptionEqualToValue={(option, value) => option?.name === value?.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Industry"
                      placeholder="Select industry..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.name}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.count} recruiters
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>

              {/* Title Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Job Title"
                  placeholder="e.g., Technical Recruiter"
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Filter Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasActiveFilters() && (
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={resetSearchState}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Reset All
                  </Button>
                )}
              </Box>
              
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={isSearching}
                startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                sx={{ borderRadius: 2 }}
              >
                Apply Filters
              </Button>
            </Box>

            {/* Active Filters Display */}
            {hasActiveFilters() && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
                  Active Filters:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {searchQuery && (
                    <Chip
                      label={`Search: "${searchQuery}"`}
                      size="small"
                      onDelete={() => setSearchQuery('')}
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  {filters.company && (
                    <Chip
                      label={`Company: ${filters.company.name}`}
                      size="small"
                      onDelete={() => handleFilterChange('company', null)}
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  {filters.industry && (
                    <Chip
                      label={`Industry: ${filters.industry.name}`}
                      size="small"
                      onDelete={() => handleFilterChange('industry', null)}
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  {filters.title && (
                    <Chip
                      label={`Title: ${filters.title}`}
                      size="small"
                      onDelete={() => handleFilterChange('title', '')}
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Collapse>

        {/* Search Tips */}
        {!hasActiveFilters() && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: theme.palette.info.main
              }
            }}
          >
            <Typography variant="body2">
              💡 <strong>Search Tips:</strong> Use specific keywords like "Technical Recruiter", company names, or job titles. 
              Try filtering by industry for better results.
            </Typography>
          </Alert>
        )}
      </CardContent>
      
      {/* Export pagination handler for parent component */}
      <div style={{ display: 'none' }} data-pagination-handler={handlePageChange} />
    </Paper>
  );
};

// Add pagination handler as a static method
RecruiterSearch.handlePageChange = null;

export default RecruiterSearch;