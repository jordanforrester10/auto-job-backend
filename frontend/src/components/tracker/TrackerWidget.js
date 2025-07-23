// frontend/src/components/tracker/TrackerWidget.js - Dashboard tracker summary widget
import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment as TrackerIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useTrackedJobs from './hooks/useTrackedJobs';
import useInterviewManager from './hooks/useInterviewManager';
import StatusBadge from './StatusBadge';

const TrackerWidget = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: trackedJobs = [], isLoading } = useTrackedJobs();
  const { getUpcomingInterviews } = useInterviewManager();

  // Calculate stats
  const totalJobs = trackedJobs.length;
  const activeJobs = trackedJobs.filter(job => job.status !== 'closed').length;
  const upcomingInterviews = getUpcomingInterviews();
  const recentActivity = trackedJobs
    .filter(job => {
      const lastActivity = new Date(job.updatedAt);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      return lastActivity > threeDaysAgo;
    })
    .slice(0, 3);

  // Status breakdown
  const statusCounts = {
    interested: trackedJobs.filter(job => job.status === 'interested').length,
    applied: trackedJobs.filter(job => job.status === 'applied').length,
    interviewing: trackedJobs.filter(job => job.status === 'interviewing').length,
    closed: trackedJobs.filter(job => job.status === 'closed').length
  };

  // Handle navigation
  const handleViewTracker = () => {
    navigate('/job-tracker');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrackerIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Job Tracker
            </Typography>
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (totalJobs === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrackerIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Job Tracker
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Start tracking your job applications
            </Typography>
            <Button
              variant="contained"
              onClick={handleViewTracker}
              sx={{ borderRadius: 2 }}
            >
              Get Started
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrackerIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Job Tracker
            </Typography>
          </Box>
          
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={handleViewTracker}
            sx={{ borderRadius: 2 }}
          >
            View All
          </Button>
        </Box>

        {/* Key Metrics */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {totalJobs}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Tracked
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
              {activeJobs}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
              {upcomingInterviews.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Interviews
            </Typography>
          </Box>
        </Box>

        {/* Status Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Application Pipeline
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              if (count === 0) return null;
              
              return (
                <StatusBadge
                  key={status}
                  status={status}
                  size="small"
                  showTooltip={false}
                  sx={{ fontSize: '0.7rem' }}
                >
                  {count}
                </StatusBadge>
              );
            })}
          </Box>
        </Box>

        {/* Upcoming Interviews */}
        {upcomingInterviews.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EventIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Upcoming Interviews
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {upcomingInterviews.slice(0, 2).map((interview) => (
                <Box
                  key={interview._id}
                  sx={{
                    p: 1.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {interview.jobTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(interview.scheduledDate).toLocaleDateString()} at{' '}
                    {new Date(interview.scheduledDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
              ))}
              
              {upcomingInterviews.length > 2 && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  +{upcomingInterviews.length - 2} more interviews
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUpIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Recent Activity
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentActivity.map((job) => {
                const jobTitle = job.jobDetails?.[0]?.title || 'Unknown Job';
                const company = job.jobDetails?.[0]?.company || 'Unknown Company';
                const timeAgo = new Date(job.updatedAt).toLocaleDateString();
                
                return (
                  <Box
                    key={job._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.5
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, noWrap: true }}>
                        {jobTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ noWrap: true }}>
                        {company} • {timeAgo}
                      </Typography>
                    </Box>
                    
                    <StatusBadge status={job.status} size="small" showTooltip={false} />
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Quick Actions */}
        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleViewTracker}
            sx={{ borderRadius: 2 }}
          >
            Manage Applications
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrackerWidget;
