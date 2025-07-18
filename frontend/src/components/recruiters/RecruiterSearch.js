// src/components/recruiters/RecruiterSearch.js - UPDATED WITH H1B FILTERING
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
  Badge,
  FormControlLabel,
  Switch,
  Tooltip
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
  Refresh as RefreshIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Info as InfoIcon,
  Flag as FlagIcon // NEW: Icon for H1B filter
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSubscription } from '../../context/SubscriptionContext';
import recruiterService from '../../utils/recruiterService';

const RecruiterSearch = ({ 
  onSearchResults, 
  onLoading, 
  onError, 
  onSearchStateChange,
  showUnlockedOnly = false,
  onShowUnlockedOnlyChange,
  h1bOnly = false, // NEW: H1B filter prop
  onH1BOnlyChange  // NEW: H1B filter change handler
}) => {
  const theme = useTheme();
  const { isCasualPlan, isHunterPlan, canPerformAction } = useSubscription();
  //test
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
    industries: [],
    h1bData: null // NEW: H1B filter data
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
      console.log('📊 Filter options loaded:', response.filterOptions);
      
      // NEW: Log H1B data
      if (response.filterOptions.h1bData) {
        console.log('🏢 H1B filter data:', response.filterOptions.h1bData);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
      onError?.('Failed to load search filters');
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  // Debounced search function with pagination support - UPDATED WITH H1B FILTER
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
        show_unlocked_only: showUnlockedOnly,
        h1b_only: h1bOnly, // NEW: Include H1B filter
        ...searchParams, // This should override the above if provided
        limit: 20,
        offset: offset
      };

      console.log('🔍 Performing search with filters (including H1B filter):', searchFilters);
      console.log(`📄 Page: ${page}, Offset: ${offset}`);
      
      // Store current search params for pagination (UPDATED)
      const paramsToStore = {
        query: searchFilters.query,
        company: searchFilters.company,
        industry: searchFilters.industry,
        title: searchFilters.title,
        show_unlocked_only: searchFilters.show_unlocked_only,
        h1b_only: searchFilters.h1b_only // NEW: Store H1B filter
      };
      setCurrentSearchParams(paramsToStore);
      
      const response = await recruiterService.searchRecruiters(searchFilters);
      
      setSearchCount(response.pagination.total);
      
      // Pass search parameters along with results (UPDATED)
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
  }, [searchQuery, filters, showUnlockedOnly, h1bOnly, onSearchResults, onLoading, onError, onSearchStateChange]);

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

  // Handle filter changes with proper null handling
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Handle show unlocked only change
  const handleShowUnlockedOnlyChange = (event) => {
    const enabled = event.target.checked;
    console.log('🔍 RecruiterSearch: Show unlocked only changed:', enabled);
    
    // Update parent component
    if (onShowUnlockedOnlyChange) {
      onShowUnlockedOnlyChange(enabled);
    }
    
    // If we have active search results, automatically re-search
    if (hasActiveFilters() || searchQuery) {
      // The parent will handle the re-search through the callback
    }
  };

  // NEW: Handle H1B only filter change
  const handleH1BOnlyChange = (event) => {
    const enabled = event.target.checked;
    console.log('🏢 RecruiterSearch: H1B only filter changed:', enabled);
    
    // Update parent component
    if (onH1BOnlyChange) {
      onH1BOnlyChange(enabled);
    }
    
    // If we have active search results, automatically re-search
    if (hasActiveFilters() || searchQuery) {
      // The parent will handle the re-search through the callback
    }
  };

  // Reset entire search state - UPDATED
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
    
    // Reset unlock filter if applicable
    if (isCasualPlan && onShowUnlockedOnlyChange) {
      onShowUnlockedOnlyChange(false);
    }
    
    // NEW: Reset H1B filter
    if (onH1BOnlyChange) {
      onH1BOnlyChange(false);
    }
    
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

  // Check if any filters are applied (excluding search query) - UPDATED
  const hasActiveFiltersExceptQuery = () => {
    return filters.company || 
           filters.industry || 
           filters.title ||
           (isCasualPlan && showUnlockedOnly) ||
           h1bOnly; // NEW: Include H1B filter
  };

  // Check if any filters are applied (including search query) - UPDATED
  const hasActiveFilters = () => {
    return searchQuery || hasActiveFiltersExceptQuery();
  };

  // Get usage info for Casual users
  const getUnlockUsageInfo = () => {
    if (!isCasualPlan) return null;
    
    const permission = canPerformAction('recruiterUnlocks', 1);
    return {
      remaining: permission.remaining || 0,
      total: permission.limit || 0,
      used: (permission.limit || 0) - (permission.remaining || 0)
    };
  };

  const unlockUsage = getUnlockUsageInfo();

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
            {/* Show unlock filter status for Casual users */}
            {isCasualPlan && showUnlockedOnly && (
              <Chip 
                label="Unlocked Only" 
                size="small" 
                color="warning" 
                variant="filled"
                icon={<LockOpenIcon sx={{ fontSize: '0.875rem' }} />}
                sx={{ borderRadius: 1 }}
              />
            )}
            {/* NEW: Show H1B filter status */}
            {h1bOnly && (
              <Chip 
                label="H1B Sponsors Only" 
                size="small" 
                color="success" 
                variant="filled"
                icon={<FlagIcon sx={{ fontSize: '0.875rem' }} />}
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

        {/* Show Unlocked Only Filter for Casual Users */}
        {isCasualPlan && (
          <Box sx={{ mb: 3 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: showUnlockedOnly ? theme.palette.warning.main + '08' : theme.palette.grey[50],
                border: `1px solid ${showUnlockedOnly ? theme.palette.warning.light : theme.palette.divider}`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showUnlockedOnly}
                        onChange={handleShowUnlockedOnlyChange}
                        color="warning"
                        size="medium"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockOpenIcon sx={{ color: theme.palette.warning.main, fontSize: '1.2rem' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Show Unlocked Only
                        </Typography>
                        <Tooltip title="Filter to show only recruiters you have already unlocked. This helps you quickly find your previously accessed recruiter contacts.">
                          <InfoIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                        </Tooltip>
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
                
                {/* Usage indicator for Casual users */}
                {unlockUsage && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {unlockUsage.remaining} unlocks remaining this month
                    </Typography>
                    <Chip
                      label={`${unlockUsage.used}/${unlockUsage.total}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', height: 24 }}
                    />
                  </Box>
                )}
              </Box>
              
              {showUnlockedOnly && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Showing only recruiters you've unlocked. Turn off this filter to see all available recruiters.
                </Typography>
              )}
            </Paper>
          </Box>
        )}

        {/* NEW: H1B Companies Filter */}
        <Box sx={{ mb: 3 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: h1bOnly ? theme.palette.success.main + '08' : theme.palette.grey[50],
              border: `1px solid ${h1bOnly ? theme.palette.success.light : theme.palette.divider}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={h1bOnly}
                      onChange={handleH1BOnlyChange}
                      color="success"
                      size="medium"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FlagIcon sx={{ color: theme.palette.success.main, fontSize: '1.2rem' }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        H1B Sponsors Only
                      </Typography>
                      <Tooltip title="Filter to show only recruiters from companies that sponsor H1B visas. This helps international candidates find employers who can provide visa sponsorship.">
                        <InfoIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                      </Tooltip>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
              
              {/* H1B companies count */}
              {filterOptions.h1bData && filterOptions.h1bData.isAvailable && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {filterOptions.h1bData.totalH1BCompanies?.toLocaleString()} H1B sponsor companies
                  </Typography>
                  <Chip
                    label="H1B Data Available"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', height: 24 }}
                  />
                </Box>
              )}
            </Box>
            
            {h1bOnly && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  🎯 Showing only recruiters from companies that sponsor H1B visas. 
                  {filterOptions.h1bData?.totalH1BCompanies && (
                    <span> Database includes {filterOptions.h1bData.totalH1BCompanies.toLocaleString()} verified H1B sponsor companies.</span>
                  )}
                </Typography>
                
                {/* NEW: Show top H1B industries if available */}
                {filterOptions.h1bData?.topIndustries?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      Top H1B Industries:
                    </Typography>
                    {filterOptions.h1bData.topIndustries.slice(0, 5).map((industry, index) => (
                      <Chip
                        key={industry.industry}
                        label={`${industry.industry} (${industry.count})`}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem', height: 20 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Show warning if H1B data is not available */}
            {filterOptions.h1bData && !filterOptions.h1bData.isAvailable && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 1 }}>
                <Typography variant="caption">
                  H1B sponsor data is currently unavailable. Please try again later or contact support.
                </Typography>
              </Alert>
            )}
          </Paper>
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

            {/* Active Filters Display - UPDATED */}
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
                  {/* Show unlocked only filter chip */}
                  {isCasualPlan && showUnlockedOnly && (
                    <Chip
                      label="Unlocked Only"
                      size="small"
                      onDelete={() => onShowUnlockedOnlyChange?.(false)}
                      color="warning"
                      icon={<LockOpenIcon sx={{ fontSize: '0.75rem' }} />}
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  {/* NEW: H1B filter chip */}
                  {h1bOnly && (
                    <Chip
                      label="H1B Sponsors Only"
                      size="small"
                      onDelete={() => onH1BOnlyChange?.(false)}
                      color="success"
                      icon={<FlagIcon sx={{ fontSize: '0.75rem' }} />}
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Collapse>

        {/* Search Tips - UPDATED */}
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
              {isCasualPlan && (
                <span> You can also filter to show only your unlocked recruiters using the toggle above.</span>
              )}
              <span> Use the "H1B Sponsors Only" filter to find recruiters from companies that sponsor work visas.</span>
              {!isCasualPlan && !isHunterPlan && (
                <span> Upgrade to Casual plan to unlock recruiter contact details.</span>
              )}
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