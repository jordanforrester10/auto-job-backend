// src/components/jobs/AiSearchesPage.js
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Snackbar
} from '@mui/material';
import {
  SmartToy as SmartToyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import PageHeader from '../common/PageHeader';
import { useAiSearches } from './hooks/useAiSearches';
import EmptySearchState from './components/EmptySearchState';
import AiSearchSummaryCards from './components/AiSearchSummaryCards';
import AiSearchTable from './components/AiSearchTable';
import AiSearchDetailsDialog from './components/AiSearchDetailsDialog';
import AiSearchDeleteDialog from './components/AiSearchDeleteDialog';

const AiSearchesPage = () => {
  const navigate = useNavigate();
  const {
    searches,
    loading,
    error,
    actionLoading,
    setError,
    fetchSearches,
    handlePauseResume,
    handleDelete
  } = useAiSearches();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const toggleRowExpansion = (searchId) => {
    setExpandedRows(prev => ({
      ...prev,
      [searchId]: !prev[searchId]
    }));
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const openDeleteDialog = (search) => {
    setSelectedSearch(search);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedSearch(null);
  };

  const openDetailsDialog = (search) => {
    setSelectedSearch(search);
    setDetailsDialogOpen(true);
  };

  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedSearch(null);
  };

  const handlePauseResumeWithFeedback = async (searchId, currentStatus) => {
    const result = await handlePauseResume(searchId, currentStatus);
    if (result) {
      showSnackbar(result.message, result.success ? 'success' : 'error');
    }
  };

  const handleDeleteWithFeedback = async () => {
    if (!selectedSearch) return;
    
    const result = await handleDelete(selectedSearch._id);
    if (result) {
      showSnackbar(result.message, result.success ? 'success' : 'error');
      if (result.success) {
        closeDeleteDialog();
      }
    }
  };

  const handleStartSearch = () => {
    navigate('/jobs');
  };

  const handleViewJobs = () => {
    closeDetailsDialog();
    navigate('/jobs');
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress size={60} thickness={4} color="primary" />
          <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
            Loading your AI searches...
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Removed maxWidth constraint to match other pages */}
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Agent Job Searches"
          subtitle="Manage your automated AI job searches"
          icon={<SmartToyIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchSearches}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/jobs')}
              >
                View Jobs
              </Button>
            </Box>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {searches.length === 0 ? (
          <EmptySearchState onStartSearch={handleStartSearch} />
        ) : (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12}>
              <AiSearchSummaryCards searches={searches} />
            </Grid>

            {/* Enhanced Searches Table */}
            <Grid item xs={12}>
              <AiSearchTable
                searches={searches}
                expandedRows={expandedRows}
                onToggleExpansion={toggleRowExpansion}
                onPauseResume={handlePauseResumeWithFeedback}
                onDelete={openDeleteDialog}
                onViewDetails={openDetailsDialog}
                actionLoading={actionLoading}
              />
            </Grid>
          </Grid>
        )}

        {/* Delete Confirmation Dialog */}
        <AiSearchDeleteDialog
          open={deleteDialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteWithFeedback}
          selectedSearch={selectedSearch}
          isLoading={actionLoading[selectedSearch?._id]}
        />

        {/* Enhanced Details Dialog */}
        <AiSearchDetailsDialog
          open={detailsDialogOpen}
          onClose={closeDetailsDialog}
          selectedSearch={selectedSearch}
          onViewJobs={handleViewJobs}
        />

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
};

export default AiSearchesPage;
                              