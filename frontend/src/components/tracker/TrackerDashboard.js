// frontend/src/components/tracker/TrackerDashboard.js - Main dashboard component for tracked jobs
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  Collapse,
  Paper,
  Divider,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import TrackedJobCard from './TrackedJobCard';
import TrackerFilters from './TrackerFilters';
import EmptyTrackerState from './EmptyTrackerState';
import useTrackedJobs from './hooks/useTrackedJobs';
import trackerService from '../../utils/trackerService';

const TrackerDashboard = ({ 
  onAddNote,
  onStatusChange,
  onJobDelete,
  onNoteAdded,
  showFilters = true,
  compact = false,
  initialFilters = {} 
}) => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    interested: true,
    applied: true,
    interviewing: true,
    closed: false
  });

  console.log('🔧 TrackerDashboard received initialFilters:', initialFilters);

  // Use the tracked jobs hook - FIXED: Pass initialFilters directly, not wrapped in an object
  const {
    trackedJobs,
    pagination,
    jobsByStatus,
    statusCounts,
    isLoading,
    isError,
    error,
    filters,
    updateFilters,
    clearFilters,
    updatePage,
    isEmpty,
    hasJobs,
    totalCount,
    refetch
  } = useTrackedJobs(initialFilters); // FIXED: Remove the curly braces

  console.log('🔧 TrackerDashboard current filters:', filters);

  // Handle section expand/collapse
  const toggleSection = (status) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    updateFilters(newFilters);
  };

  // Handle pagination
  const handlePageChange = (event, page) => {
    updatePage(page);
  };

  // Handle note addition
  const handleAddNote = (jobId) => {
    if (onAddNote) {
      onAddNote(jobId);
    }
  };

  // Handle status change
  const handleStatusChange = (jobId, newStatus, isRefresh = false) => {
    if (isRefresh) {
      // This is just a refresh call, don't show notification
      refetch();
      return;
    }
    
    // This is an actual status change
    if (onStatusChange) {
      onStatusChange(jobId, newStatus, false); // false = not a note update
    }
    
    // Refresh data
    refetch();
  };

  // Handle job deletion
  const handleJobDelete = (jobId) => {
    if (onJobDelete) {
      onJobDelete(jobId);
    }
    
    // Refresh data
    refetch();
  };

  // Handle notes updated
  const handleNotesUpdated = (jobId) => {
    if (onNoteAdded) {
      onNoteAdded(jobId);
    }
    
    // Refresh data
    refetch();
  };

  // Render status section
  const renderStatusSection = (status, jobs, statusInfo) => {
    const isExpanded = expandedSections[status];
    const jobCount = jobs.length;

    if (jobCount === 0) return null;

    return (
      <Paper
        key={status}
        elevation={0}
        sx={{
          mb: 2,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Section Header */}
        <Box
          sx={{
            p: 2,
            backgroundColor: alpha(statusInfo.bgColor, 0.05),
            borderBottom: isExpanded ? `1px solid ${theme.palette.divider}` : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            '&:hover': {
              backgroundColor: alpha(statusInfo.bgColor, 0.08)
            }
          }}
          onClick={() => toggleSection(status)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: statusInfo.bgColor
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600, color: statusInfo.bgColor }}>
              {statusInfo.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                backgroundColor: alpha(statusInfo.bgColor, 0.1),
                color: statusInfo.bgColor,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
            >
              {jobCount} job{jobCount !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>

        {/* Section Content */}
        <Collapse in={isExpanded}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {jobs.map((trackedJob) => (
                <Grid item xs={12} md={compact ? 12 : 6} lg={compact ? 12 : 4} key={trackedJob._id}>
                  <TrackedJobCard
                    trackedJob={trackedJob}
                    onStatusChange={handleStatusChange}
                    onAddNote={handleAddNote}
                    onDelete={handleJobDelete}
                    onNotesUpdated={handleNotesUpdated}
                    compact={compact}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
      </Paper>
    );
  };

  // Render grouped view (by status)
  const renderGroupedView = () => {
    const statusOrder = ['interested', 'applied', 'interviewing', 'closed'];
    
    return (
      <Box>
        {statusOrder.map((status) => {
          const jobs = jobsByStatus[status] || [];
          const statusInfo = trackerService.getStatusInfo(status);
          return renderStatusSection(status, jobs, statusInfo);
        })}
      </Box>
    );
  };

  // Render list view (no grouping)
  const renderListView = () => {
    return (
      <Grid container spacing={2}>
        {trackedJobs.map((trackedJob) => (
          <Grid item xs={12} md={compact ? 12 : 6} lg={compact ? 12 : 4} key={trackedJob._id}>
            <TrackedJobCard
              trackedJob={trackedJob}
              onStatusChange={handleStatusChange}
              onAddNote={handleAddNote}
              onDelete={handleJobDelete}
              onNotesUpdated={handleNotesUpdated}
              compact={compact}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // Determine which view to show
  const shouldShowGroupedView = () => {
    // Show grouped view if:
    // 1. Not filtering by specific status
    // 2. Not searching
    // 3. Sorting by status or lastActivity
    return (
      (!filters.status || filters.status === 'all') &&
      (!filters.search || !filters.search.trim()) &&
      (filters.sortBy === 'status' || filters.sortBy === 'lastActivity')
    );
  };

  // Loading state
  if (isLoading && !hasJobs) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Failed to load tracked jobs
        </Typography>
        <Typography variant="body2">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </Typography>
      </Alert>
    );
  }

  // Empty state
  if (isEmpty) {
    const hasActiveFilters = 
      (filters.status && filters.status !== 'all') ||
      (filters.search && filters.search.trim()) ||
      filters.includeArchived === 'true';

    return (
      <>
        {showFilters && (
          <TrackerFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={clearFilters}
            statusCounts={statusCounts}
            totalCount={totalCount}
            isLoading={isLoading}
          />
        )}
        <EmptyTrackerState
          variant={hasActiveFilters ? 'filtered' : (filters.includeArchived === 'true' ? 'archived' : 'default')}
          onAddJob={hasActiveFilters ? clearFilters : undefined}
          currentFilters={filters}
        />
      </>
    );
  }

  return (
    <Box>
      {/* Filters */}
      {showFilters && (
        <TrackerFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
          statusCounts={statusCounts}
          totalCount={totalCount}
          isLoading={isLoading}
        />
      )}

      {/* Loading overlay for filtering */}
      {isLoading && hasJobs && (
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              borderRadius: 2
            }}
          >
            <CircularProgress size={40} />
          </Box>
        </Box>
      )}

      {/* Jobs Display */}
      <Box sx={{ position: 'relative' }}>
        {shouldShowGroupedView() ? renderGroupedView() : renderListView()}
      </Box>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
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

      {/* Results summary */}
      {hasJobs && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {trackedJobs.length} of {totalCount} tracked job{totalCount !== 1 ? 's' : ''}
            {pagination.totalPages > 1 && (
              <> • Page {pagination.currentPage} of {pagination.totalPages}</>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TrackerDashboard;
