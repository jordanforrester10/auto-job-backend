// frontend/src/components/tracker/EmptyTrackerState.js - Empty state component for tracker
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as PlayArrowIcon,
  Work as WorkIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AutoJobLogo from '../common/AutoJobLogo';

const EmptyTrackerState = ({ 
  variant = 'default', // 'default', 'filtered', 'archived'
  onAddJob,
  currentFilters = {}
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const getEmptyStateContent = () => {
    switch (variant) {
      case 'filtered':
        return {
          icon: <SearchIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />,
          title: 'No jobs match your filters',
          description: 'Try adjusting your search criteria or filters to see more results.',
          primaryAction: {
            label: 'Clear Filters',
            onClick: () => {
              // This will be handled by parent component
              if (onAddJob) onAddJob();
            }
          },
          secondaryAction: {
            label: 'View All Jobs',
            onClick: () => navigate('/jobs')
          }
        };

      case 'archived':
        return {
          icon: <AssignmentIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />,
          title: 'No archived jobs yet',
          description: 'Jobs you mark as "closed" will automatically be archived here for future reference.',
          primaryAction: {
            label: 'View Active Jobs',
            onClick: () => {
              // This will be handled by parent component to switch tabs
              if (onAddJob) onAddJob();
            }
          },
          secondaryAction: {
            label: 'Find New Jobs',
            onClick: () => navigate('/jobs')
          }
        };

      default:
        return {
          icon: <TrendingUpIcon sx={{ fontSize: '4rem', color: 'primary.main' }} />,
          title: 'Start tracking your job applications',
          primaryAction: {
            label: 'Find Jobs to Track',
            onClick: () => navigate('/jobs')
          }
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        py: 6,
        px: 3
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`,
          zIndex: 0
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
        {/* Icon */}
        <Box sx={{ mb: 3 }}>
          {content.icon}
        </Box>

        {/* Title */}
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          {content.title}
        </Typography>

        {/* Description */}
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            mb: 4,
            lineHeight: 1.6,
            maxWidth: '400px',
            mx: 'auto'
          }}
        >
          {content.description}
        </Typography>

        {/* Actions */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="center"
          sx={{ mb: 4 }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={content.primaryAction.onClick}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: theme.shadows[3],
              '&:hover': {
                boxShadow: theme.shadows[6],
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {content.primaryAction.label}
          </Button>

          {content.secondaryAction && (
            <Button
              variant="outlined"
              size="large"
              onClick={content.secondaryAction.onClick}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {content.secondaryAction.label}
            </Button>
          )}
        </Stack>

        {/* Feature highlights for default state */}
        {variant === 'default' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 3
            }}
          >


            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AssignmentIcon sx={{ color: 'info.main', fontSize: '1.2rem' }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Track Application Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monitor progress from interested to hired
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <WorkIcon sx={{ color: 'success.main', fontSize: '1.2rem' }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Organize your Applications
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Focus on your most promising opportunities
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TrendingUpIcon sx={{ color: 'warning.main', fontSize: '1.2rem' }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Add Personal Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Always keep on top of each job and where you are at
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Quick tip for filtered state */}
        {variant === 'filtered' && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2
            }}
          >
            <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
              💡 Tip: Try searching by company name or job title, or adjust your status filters
            </Typography>
          </Paper>
        )}

        {/* Archive tip */}
        {variant === 'archived' && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 3,
              backgroundColor: alpha(theme.palette.grey[500], 0.05),
              border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
              borderRadius: 2
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              📁 Jobs are automatically archived when marked as "closed" to keep your active list clean
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default EmptyTrackerState;
