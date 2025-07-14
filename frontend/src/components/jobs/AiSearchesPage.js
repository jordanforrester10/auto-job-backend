// src/components/jobs/AiSearchesPage.js - CLEANED UI VERSION
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Snackbar,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  SmartToy as SmartToyIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import PageHeader from '../common/PageHeader';
import { useAiSearches } from './hooks/useAiSearches';
import { useSubscription } from '../../context/SubscriptionContext';
import subscriptionService from '../../utils/subscriptionService';
import EmptySearchState from './components/EmptySearchState';
import AiSearchTable from './components/AiSearchTable';
import AiSearchDetailsDialog from './components/AiSearchDetailsDialog';
import AiSearchDeleteDialog from './components/AiSearchDeleteDialog';
import FindJobsDialog from './FindJobsDialog';

const AiSearchesPage = () => {
  const navigate = useNavigate();
  const {
    subscription,
    planInfo,
    refreshSubscription,
    canCreateAiJobSearch,
    needsUpgradeForWeeklyAI
  } = useSubscription();

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

  // Persistent weekly tracking state
  const [weeklyStats, setWeeklyStats] = useState({
    weeklyLimit: 0,
    weeklyUsed: 0,
    weeklyRemaining: 0,
    weeklyPercentage: 0,
    currentWeek: '',
    isWeeklyLimitReached: false,
    trackingMethod: 'loading'
  });
  const [weeklyStatsLoading, setWeeklyStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [findJobsDialogOpen, setFindJobsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch persistent weekly stats with debouncing
  const fetchWeeklyStats = async () => {
    try {
      setWeeklyStatsLoading(true);
      
      const weeklyLimit = subscription?.subscriptionTier === 'hunter' ? 100 : 
                         subscription?.subscriptionTier === 'casual' ? 50 : 0;
      
      const stats = await subscriptionService.getWeeklyJobStats(weeklyLimit);
      
      setWeeklyStats({
        weeklyLimit: stats.weeklyLimit || weeklyLimit,
        weeklyUsed: stats.weeklyUsed || 0,
        weeklyRemaining: stats.weeklyRemaining || weeklyLimit,
        weeklyPercentage: stats.weeklyPercentage || 0,
        currentWeek: stats.currentWeek || subscriptionService.getCurrentWeekString(),
        isWeeklyLimitReached: stats.isWeeklyLimitReached || false,
        trackingMethod: stats.trackingMethod || 'persistent_weekly_tracking',
        searchRuns: stats.searchRuns || []
      });
      
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      setWeeklyStats(prev => ({
        ...prev,
        trackingMethod: 'error_fallback',
        error: error.message
      }));
    } finally {
      setWeeklyStatsLoading(false);
    }
  };

  // Load data on mount - single call with debouncing
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!mounted) return;
      
      try {
        await Promise.all([
          fetchSearches(),
          refreshSubscription()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    // Debounced load to prevent multiple rapid calls
    const timeoutId = setTimeout(loadData, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Only run once on mount

  // Fetch weekly stats when subscription changes - debounced
  useEffect(() => {
    let timeoutId;
    
    if (subscription?.subscriptionTier) {
      timeoutId = setTimeout(() => {
        fetchWeeklyStats();
      }, 200); // Debounce weekly stats fetch
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [subscription?.subscriptionTier]);

  // Add null checks for subscription and upgrade info
  const canCreate = canCreateAiJobSearch ? canCreateAiJobSearch() : { allowed: false, reason: 'Loading...' };
  const upgradeInfo = needsUpgradeForWeeklyAI ? needsUpgradeForWeeklyAI() : { needed: false };

  // Ensure searches is always an array
  const safeSearches = Array.isArray(searches) ? searches : [];

  // Helper functions
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
      if (result.success) {
        // Debounced refresh after action
        setTimeout(async () => {
          await Promise.all([
            refreshSubscription(),
            fetchWeeklyStats()
          ]);
        }, 500);
      }
    }
  };

  const handleDeleteWithFeedback = async () => {
    if (!selectedSearch) return;
    
    const result = await handleDelete(selectedSearch._id);
    if (result) {
      showSnackbar(result.message, result.success ? 'success' : 'error');
      if (result.success) {
        closeDeleteDialog();
        // Debounced refresh after deletion
        setTimeout(async () => {
          await Promise.all([
            fetchSearches(),
            refreshSubscription(),
            fetchWeeklyStats()
          ]);
        }, 500);
      }
    }
  };

  const handleStartSearch = () => {
    setFindJobsDialogOpen(true);
  };

  const handleViewJobs = () => {
    closeDetailsDialog();
    navigate('/jobs');
  };

  const handleRefresh = async () => {
    setLastRefresh(Date.now());
    await Promise.all([
      fetchSearches(),
      refreshSubscription(),
      fetchWeeklyStats()
    ]);
  };

  // Auto-refresh when searches are running - less frequent
  useEffect(() => {
    const runningSearches = safeSearches.filter(s => s.status === 'running');
    if (runningSearches.length > 0) {
      const interval = setInterval(async () => {
        await Promise.all([
          fetchSearches(),
          fetchWeeklyStats() // Don't refresh subscription constantly
        ]);
      }, 30000); // Refresh every 30 seconds instead of 15
      
      return () => clearInterval(interval);
    }
  }, [safeSearches]);

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
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Weekly AI Job Discovery"
          subtitle="Manage your automated weekly job searches with persistent tracking"
          icon={<SmartToyIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleStartSearch}
                disabled={!canCreate.allowed}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                New AI Search
              </Button>
            </Box>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Persistent Weekly Statistics Dashboard */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Current Plan Info */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Current Plan
                  </Typography>
                  <Chip 
                    label={planInfo?.displayName || 'Free'} 
                    color={subscription?.subscriptionTier === 'hunter' ? 'warning' : 'primary'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    AI Search Slots
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {canCreate.current || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      / {canCreate.limit || 0}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {canCreate.remaining || 0} slot{(canCreate.remaining || 0) !== 1 ? 's' : ''} remaining
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Weekly Job Limit
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="success.main">
                    {weeklyStats.weeklyLimit} jobs/week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* CLEANED: Weekly Progress - Removed Persistent Chip */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarIcon color="info" />
                  <Typography variant="h6" fontWeight={600}>
                    This Week's Progress
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {weeklyStats.currentWeek}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {weeklyStatsLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <>
                        <Typography variant="h4" fontWeight={700} color="warning.main">
                          {weeklyStats.weeklyUsed}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          / {weeklyStats.weeklyLimit}
                        </Typography>
                      </>
                    )}
                  </Box>
                  {!weeklyStatsLoading && (
                    <>
                      <LinearProgress 
                        variant="determinate" 
                        value={weeklyStats.weeklyPercentage}
                        color={weeklyStats.weeklyPercentage > 80 ? 'warning' : 'info'}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {weeklyStats.weeklyRemaining} jobs remaining this week
                      </Typography>
                    </>
                  )}
                </Box>
                {weeklyStats.isWeeklyLimitReached && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Weekly limit reached. Resets Monday
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Search Performance */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon color="success" />
                  <Typography variant="h6" fontWeight={600}>
                    Search Performance
                  </Typography>
                </Box>
                {safeSearches.length > 0 ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Active Searches
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {safeSearches.filter(s => s.status === 'running').length}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Jobs Found
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {safeSearches.reduce((sum, search) => sum + (search.totalJobsFound || 0), 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Average Quality
                      </Typography>
                      <Chip 
                        label="High Quality" 
                        color="success" 
                        size="small"
                        icon={<SpeedIcon />}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No searches yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleStartSearch}
                      disabled={!canCreate.allowed}
                      sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}
                    >
                      Create First Search
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upgrade Prompt for Free Users */}
        {upgradeInfo.needed && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '1px solid #2196f3'
            }}
          >
            <Typography variant="body1" fontWeight={600} gutterBottom>
              Unlock Weekly AI Job Discovery
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Upgrade to {upgradeInfo.recommendedPlan === 'casual' ? 'Casual' : 'Hunter'} plan to get:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {(upgradeInfo.benefits || []).map((benefit, index) => (
                <Chip 
                  key={index}
                  label={benefit}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/settings')}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Upgrade Now
            </Button>
          </Alert>
        )}

        {/* Cannot Create Search Alert */}
        {!canCreate.allowed && !upgradeInfo.needed && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="body2" fontWeight={500} gutterBottom>
              {canCreate.reason}
            </Typography>
            {canCreate.suggestion && (
              <Typography variant="body2" color="text.secondary">
                {canCreate.suggestion}
              </Typography>
            )}
          </Alert>
        )}

        {/* Search List or Empty State */}
        {safeSearches.length === 0 ? (
          <EmptySearchState 
            onStartSearch={handleStartSearch}
            canStartSearch={canCreate.allowed}
            upgradeRequired={upgradeInfo.needed}
          />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <AiSearchTable
                searches={safeSearches}
                expandedRows={expandedRows}
                onToggleExpansion={toggleRowExpansion}
                onPauseResume={handlePauseResumeWithFeedback}
                onDelete={openDeleteDialog}
                onViewDetails={openDetailsDialog}
                actionLoading={actionLoading}
                weeklyModel={true}
                weeklyStats={weeklyStats}
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
          persistentTracking={true}
        />

        {/* Enhanced Details Dialog */}
        <AiSearchDetailsDialog
          open={detailsDialogOpen}
          onClose={closeDetailsDialog}
          selectedSearch={selectedSearch}
          onViewJobs={handleViewJobs}
          weeklyModel={true}
          weeklyStats={weeklyStats}
          persistentTracking={true}
        />

        {/* Find Jobs Dialog */}
        <FindJobsDialog
          open={findJobsDialogOpen}
          onClose={() => setFindJobsDialogOpen(false)}
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
                              