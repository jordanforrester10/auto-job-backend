// src/components/jobs/components/AiSearchSummaryCards.js - FIXED WEEKLY PROGRESS DISPLAY
import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Work as WorkIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

const AiSearchSummaryCards = ({ 
  searches, 
  weeklyModel = false, 
  weeklyStats = null, 
  slotStatus = null 
}) => {
  const theme = useTheme();

  // 🔧 FIXED: Use actual weekly stats instead of calculating from searches
  const getWeeklyJobsFound = () => {
    if (weeklyStats) {
      return weeklyStats.weeklyUsed || 0;
    }
    // Fallback to calculating from searches
    return searches.reduce((sum, s) => sum + (s.jobsFoundThisWeek || 0), 0);
  };

  // 🔧 FIXED: Use today's jobs from search progress
  const getTodayJobsFound = () => {
    // For weekly model, we don't track "today" separately since it's weekly batches
    if (weeklyModel) {
      return searches.reduce((sum, s) => {
        // Count jobs found in the last 24 hours
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return sum + (s.jobsFound?.filter(job => 
          new Date(job.foundAt) >= yesterday
        )?.length || 0);
      }, 0);
    }
    return searches.reduce((sum, s) => sum + (s.jobsFoundToday || 0), 0);
  };

  // 🔧 FIXED: Get appropriate limit based on model
  const getJobLimit = () => {
    if (weeklyModel && weeklyStats) {
      return weeklyStats.weeklyLimit || 100;
    }
    // For legacy daily model
    return searches.reduce((sum, s) => sum + (s.dailyLimit || 0), 0);
  };

  const summaryData = weeklyModel ? [
    {
      title: 'Active Searches',
      value: searches.filter(s => s.status === 'running').length,
      subtitle: 'Currently running',
      icon: <PlayIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
      shadowColor: 'rgba(26, 115, 232, 0.25)'
    },
    {
      title: 'Jobs This Week',
      value: getWeeklyJobsFound(),
      subtitle: `${weeklyStats?.weeklyRemaining || 0} remaining`,
      icon: <CalendarIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
      shadowColor: 'rgba(0, 196, 180, 0.25)'
    },
    {
      title: 'Total Jobs Found',
      value: searches.reduce((sum, s) => sum + (s.totalJobsFound || 0), 0),
      subtitle: 'All time discoveries',
      icon: <WorkIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.success.main} 30%, ${theme.palette.success.light} 90%)`,
      shadowColor: 'rgba(52, 168, 83, 0.25)'
    },
    {
      title: 'Weekly Limit',
      value: getJobLimit(),
      subtitle: 'Jobs per week',
      icon: <ScheduleIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.warning.main} 30%, ${theme.palette.warning.light} 90%)`,
      shadowColor: 'rgba(251, 188, 4, 0.25)'
    }
  ] : [
    // Legacy daily model cards
    {
      title: 'Active Searches',
      value: searches.filter(s => s.status === 'running').length,
      subtitle: 'Currently running',
      icon: <PlayIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
      shadowColor: 'rgba(26, 115, 232, 0.25)'
    },
    {
      title: 'Total Jobs Found',
      value: searches.reduce((sum, s) => sum + (s.totalJobsFound || 0), 0),
      subtitle: 'Across all searches',
      icon: <WorkIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
      shadowColor: 'rgba(0, 196, 180, 0.25)'
    },
    {
      title: 'Jobs Found Today',
      value: getTodayJobsFound(),
      subtitle: 'New discoveries',
      icon: <TrendingUpIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.success.main} 30%, ${theme.palette.success.light} 90%)`,
      shadowColor: 'rgba(52, 168, 83, 0.25)'
    },
    {
      title: 'Daily Limit',
      value: getJobLimit(),
      subtitle: 'Maximum per day',
      icon: <ScheduleIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.8 }} />,
      gradient: `linear-gradient(45deg, ${theme.palette.warning.main} 30%, ${theme.palette.warning.light} 90%)`,
      shadowColor: 'rgba(251, 188, 4, 0.25)'
    }
  ];

  return (
    <Grid container spacing={2}>
      {summaryData.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ 
            background: item.gradient,
            color: 'white',
            boxShadow: `0 4px 20px ${item.shadowColor}`,
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent>
              <Typography variant="overline" sx={{ opacity: 0.8 }} gutterBottom>
                {item.title}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600 }}>
                {item.value}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                {item.icon}
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {item.subtitle}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default AiSearchSummaryCards;