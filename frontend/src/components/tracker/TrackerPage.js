// frontend/src/components/tracker/TrackerPage.js - Main tracker page component
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Archive as ArchiveIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import MainLayout from '../layout/MainLayout';
import TrackerDashboard from './TrackerDashboard';
import { useTrackerStats } from './hooks/useTrackedJobs';
import useTrackerActions from './hooks/useTrackerActions';
import { useNavigate } from 'react-router-dom';

const TrackerPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Hooks
  const { stats, isLoading: statsLoading } = useTrackerStats();
  const { addJobNote, isAddingNote, error, clearError } = useTrackerActions();

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    console.log(`🔄 Tab changed to: ${newValue === 0 ? 'Active Jobs' : 'Archived Jobs'}`);
    setCurrentTab(newValue);
  };

  // Handle add note dialog
  const handleAddNote = (jobId) => {
    setSelectedJobId(jobId);
    setNoteDialogOpen(true);
  };

  const handleCloseNoteDialog = () => {
    setNoteDialogOpen(false);
    setSelectedJobId(null);
    setNoteText('');
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedJobId) return;

    try {
      await addJobNote(selectedJobId, noteText.trim());
      setAlert({
        open: true,
        message: 'Note added successfully',
        severity: 'success'
      });
      handleCloseNoteDialog();
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to add note',
        severity: 'error'
      });
    }
  };

  // Handle status change
  const handleStatusChange = (jobId, newStatus, isNoteUpdate = false) => {
    if (isNoteUpdate) {
      // Don't show notification for note updates, just refresh data
      return;
    }
    
    setAlert({
      open: true,
      message: `Job status updated to ${newStatus}`,
      severity: 'success'
    });
  };

  // Handle note addition
  const handleNoteAdded = (jobId) => {
    setAlert({
      open: true,
      message: 'Note added successfully',
      severity: 'success'
    });
  };

  // Handle job deletion
  const handleJobDelete = (jobId) => {
    setAlert({
      open: true,
      message: 'Job removed from tracker',
      severity: 'info'
    });
  };

  // Handle alert close
  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
    clearError();
  };

  // Render stats cards
  const renderStatsCards = () => {
    if (statsLoading || !stats.overview) return null;

    const { overview } = stats;
    const statusCounts = overview.statusCounts || {};
    const metrics = overview.metrics || {};

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Tracked */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: '2.5rem', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                {overview.totalTracked || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Jobs Tracked
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              color: 'white'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: '2.5rem', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                {metrics.applicationRate || 0}%
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Application Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Interview Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
              color: 'white'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: '2.5rem', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                {metrics.interviewRate || 0}%
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Interview Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Actions */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
              color: 'white'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: '2.5rem', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                {(metrics.pendingFollowUps || 0) + (metrics.upcomingInterviews || 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pending Actions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render quick insights
  const renderQuickInsights = () => {
    if (statsLoading || !stats.overview) return null;

    const { jobsNeedingFollowUp, upcomingInterviews } = stats;

    if (!jobsNeedingFollowUp?.length && !upcomingInterviews?.length) return null;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.warning.main, 0.02)
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Action Items
        </Typography>

        <Stack spacing={2}>
          {jobsNeedingFollowUp?.length > 0 && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {jobsNeedingFollowUp.length} job{jobsNeedingFollowUp.length > 1 ? 's' : ''} need follow-up
              </Typography>
              <Typography variant="body2">
                These jobs haven't had activity in over 7 days. Consider reaching out or updating their status.
              </Typography>
            </Alert>
          )}

          {upcomingInterviews?.length > 0 && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {upcomingInterviews.length} upcoming interview{upcomingInterviews.length > 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2">
                You have interviews scheduled in the next 7 days. Make sure you're prepared!
              </Typography>
            </Alert>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                Application Tracker
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Remove the spreadsheets and track your job applications, manage statuses, and take personal notes
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/jobs')}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Find Jobs to Track
            </Button>
          </Box>

          {/* Stats Cards */}
          {renderStatsCards()}

          {/* Quick Insights */}
          {renderQuickInsights()}
        </Box>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              '& .MuiTab-root': {
                py: 2,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem'
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon fontSize="small" />
                  Active Jobs
                  {stats.overview?.totalTracked > 0 && (
                    <Chip
                      label={stats.overview.totalTracked}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main'
                      }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArchiveIcon fontSize="small" />
                  Archived Jobs
                  {stats.overview?.statusCounts?.closed > 0 && (
                    <Chip
                      label={stats.overview.statusCounts.closed}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor: alpha(theme.palette.grey[500], 0.1),
                        color: 'text.secondary'
                      }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {currentTab === 0 && (
              <TrackerDashboard
                key="active-jobs" // Force re-render when switching tabs
                onAddNote={handleAddNote}
                onStatusChange={handleStatusChange}
                onJobDelete={handleJobDelete}
                onNoteAdded={handleNoteAdded}
                showFilters={true}
                initialFilters={{ includeArchived: 'false' }} // Explicitly set for active jobs
              />
            )}

            {currentTab === 1 && (
              <TrackerDashboard
                key="archived-jobs" // Force re-render when switching tabs
                onAddNote={handleAddNote}
                onStatusChange={handleStatusChange}
                onJobDelete={handleJobDelete}
                onNoteAdded={handleNoteAdded}
                showFilters={true}
                initialFilters={{ includeArchived: 'true' }} // Explicitly set for archived jobs
              />
            )}
          </Box>
        </Paper>

        {/* Add Note Dialog */}
        <Dialog
          open={noteDialogOpen}
          onClose={handleCloseNoteDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NoteIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add Note
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent>
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              placeholder="Add your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {noteText.length}/2000 characters
            </Typography>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={handleCloseNoteDialog}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              variant="contained"
              disabled={!noteText.trim() || isAddingNote}
              sx={{ borderRadius: 2 }}
            >
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={alert.open || !!error}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleAlertClose}
            severity={error ? 'error' : alert.severity}
            sx={{ width: '100%', borderRadius: 2 }}
            variant="filled"
          >
            {error || alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
};

export default TrackerPage;
