// frontend/src/components/tracker/TrackerFilters.js - Filters component for tracked jobs
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  Typography,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Sort as SortIcon
} from '@mui/icons-material';

const TrackerFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  statusCounts = {},
  totalCount = 0,
  isLoading = false
}) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Handle search input change with debouncing
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      onFiltersChange({ search: value });
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    onFiltersChange({ [filterName]: value });
  };

  // Handle sort change
  const handleSortChange = (sortBy, sortOrder = 'desc') => {
    onFiltersChange({ sortBy, sortOrder });
  };

  // Clear all filters
  const handleClearAll = () => {
    setSearchValue('');
    onClearFilters();
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.search && filters.search.trim()) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Status options with counts
  const statusOptions = [
    { value: 'all', label: 'All Statuses', count: totalCount },
    { value: 'interested', label: 'Interested', count: statusCounts.interested || 0 },
    { value: 'applied', label: 'Applied', count: statusCounts.applied || 0 },
    { value: 'interviewing', label: 'Interviewing', count: statusCounts.interviewing || 0 },
    { value: 'closed', label: 'Closed', count: statusCounts.closed || 0 }
  ];

  // Sort options
  const sortOptions = [
    { value: 'lastActivity', label: 'Recent Activity', order: 'desc' },
    { value: 'createdAt', label: 'Date Added', order: 'desc' },
    { value: 'status', label: 'Status', order: 'asc' }
  ];

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2,
        mb: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2
      }}
    >
      {/* Main filter row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        {/* Search */}
        <TextField
          placeholder="Search jobs by title or company..."
          value={searchValue}
          onChange={handleSearchChange}
          size="small"
          sx={{ 
            minWidth: 250,
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            endAdornment: searchValue && (
              <IconButton
                size="small"
                onClick={() => {
                  setSearchValue('');
                  onFiltersChange({ search: '' });
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            )
          }}
        />

        {/* Status filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status || 'all'}
            label="Status"
            onChange={(e) => handleFilterChange('status', e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{option.label}</span>
                  <Chip 
                    label={option.count} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      ml: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main'
                    }} 
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={filters.sortBy || 'lastActivity'}
            label="Sort by"
            onChange={(e) => {
              const selectedSort = sortOptions.find(opt => opt.value === e.target.value);
              handleSortChange(e.target.value, selectedSort?.order || 'desc');
            }}
            sx={{ borderRadius: 2 }}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearAll}
            sx={{ borderRadius: 2 }}
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </Box>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Active Filters:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {filters.status && filters.status !== 'all' && (
              <Chip
                label={`Status: ${statusOptions.find(opt => opt.value === filters.status)?.label}`}
                size="small"
                onDelete={() => handleFilterChange('status', 'all')}
                color="primary"
                variant="outlined"
              />
            )}
            
            {filters.search && filters.search.trim() && (
              <Chip
                label={`Search: "${filters.search}"`}
                size="small"
                onDelete={() => {
                  setSearchValue('');
                  handleFilterChange('search', '');
                }}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Results summary */}
      <Box sx={{ 
        pt: 2, 
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="body2" color="text.secondary">
          {isLoading ? 'Loading...' : `${totalCount} job${totalCount !== 1 ? 's' : ''} found`}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SortIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Sorted by {sortOptions.find(opt => opt.value === filters.sortBy)?.label || 'Recent Activity'}
            {filters.sortOrder === 'asc' ? ' (A-Z)' : ' (newest first)'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default TrackerFilters;
