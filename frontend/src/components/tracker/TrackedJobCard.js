// frontend/src/components/tracker/TrackedJobCard.js - Individual tracked job card component (FIXED LOCATION)
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Avatar,
  Divider,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Work as WorkIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  Note as NoteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CalendarToday as CalendarTodayIcon,
  TrendingUp as TrendingUpIcon,
  Flag as FlagIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
  Launch as LaunchIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  SwapVert as SwapVertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import trackerService from '../../utils/trackerService';
import useTrackerActions from './hooks/useTrackerActions';
import NotesDialog from './NotesDialog';

const TrackedJobCard = ({ 
  trackedJob, 
  onStatusChange, 
  onAddNote, 
  onDelete,
  onNotesUpdated,
  showActions = true,
  compact = false 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { updateJobStatus, deleteJob, isUpdatingStatus, isDeletingJob } = useTrackerActions();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  // Extract job details
  const jobDetails = trackedJob.jobDetails?.[0] || {};
  const resumeDetails = trackedJob.resumeDetails?.[0] || {};
  
  const jobTitle = jobDetails.title || 'Unknown Position';
  const company = jobDetails.company || 'Unknown Company';
  
  // FIXED: Use jobDetails instead of trackedJob for location
  const location = trackerService.getJobLocation(jobDetails);
  
  const statusInfo = trackerService.getStatusInfo(trackedJob.status);
  const priorityInfo = trackerService.getPriorityInfo(trackedJob.priority);
  const timeSinceActivity = trackerService.getTimeSinceActivity(trackedJob.lastActivity);
  const isRecentlyAdded = trackerService.isRecentlyAdded(trackedJob.createdAt);
  const needsFollowUp = trackerService.needsFollowUp(trackedJob.lastActivity);
  const upcomingInterviews = trackerService.getUpcomingInterviews(trackedJob);
  const pendingFollowUps = trackerService.getPendingFollowUps(trackedJob);

  // Additional job information from jobDetails
  const salary = trackerService.getSalaryDisplay(jobDetails);
  const jobType = trackerService.getJobTypeDisplay(jobDetails);
  const matchScore = trackerService.getMatchScoreDisplay(jobDetails);
  const jobSource = trackerService.getJobSource(jobDetails);

  // Menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusMenuOpen = (event) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  // Action handlers
  const handleViewJob = () => {
    if (jobDetails._id) {
      navigate(`/jobs/${jobDetails._id}`);
    }
    handleMenuClose();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const result = await updateJobStatus(trackedJob._id, newStatus);
      
      if (result.success) {
        // Call the parent's status change handler to refresh data
        if (onStatusChange) {
          onStatusChange(trackedJob._id, newStatus, false); // false = actual status change
        }
        
        console.log(`✅ Status updated to ${newStatus}`);
      } else {
        console.error('Failed to update status:', result.error);
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
    handleStatusMenuClose();
  };

  const handleAddNote = () => {
    setNotesDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    try {
      await deleteJob(trackedJob._id);
      if (onDelete) {
        onDelete(trackedJob._id);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
    handleMenuClose();
  };

  const handleCardClick = () => {
    if (jobDetails._id) {
      navigate(`/jobs/${jobDetails._id}`);
    }
  };

  const handleNotesUpdated = () => {
    // Call the notes updated callback
    if (onNotesUpdated) {
      onNotesUpdated(trackedJob._id);
    }
  };

  // Render priority indicator
  const renderPriorityIndicator = () => {
    if (trackedJob.priority === 'low' || trackedJob.priority === 'medium') return null;
    
    return (
      <Tooltip title={`${priorityInfo.label} Priority`}>
        <FlagIcon 
          sx={{ 
            fontSize: '1rem',
            color: priorityInfo.bgColor,
            ml: 0.5
          }} 
        />
      </Tooltip>
    );
  };

  // Render excitement level (if available in metadata)
  const renderExcitementLevel = () => {
    const excitement = trackedJob.metadata?.excitementLevel;
    if (!excitement) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          star <= excitement ? (
            <StarIcon key={star} sx={{ fontSize: '0.9rem', color: '#ffc107' }} />
          ) : (
            <StarBorderIcon key={star} sx={{ fontSize: '0.9rem', color: '#e0e0e0' }} />
          )
        ))}
      </Box>
    );
  };

  // Render activity indicators
  const renderActivityIndicators = () => {
    const indicators = [];

    if (isRecentlyAdded) {
      indicators.push(
        <Chip
          key="new"
          label="New"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: alpha(theme.palette.success.main, 0.1),
            color: theme.palette.success.main,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
          }}
        />
      );
    }

    if (needsFollowUp) {
      indicators.push(
        <Chip
          key="followup"
          label="Follow Up"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            color: theme.palette.warning.main,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
          }}
        />
      );
    }

    if (upcomingInterviews.length > 0) {
      indicators.push(
        <Chip
          key="interview"
          label={`Interview ${upcomingInterviews.length > 1 ? `(${upcomingInterviews.length})` : ''}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.main,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
          }}
        />
      );
    }

    // Add match score indicator if available
    if (matchScore) {
      indicators.push(
        <Chip
          key="match"
          label={`${matchScore}% Match`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        />
      );
    }

    return indicators;
  };

  // Enhanced status dropdown button
  const renderStatusDropdown = () => {
    return (
      <Button
        variant="contained"
        size="small"
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleStatusMenuOpen}
        disabled={isUpdatingStatus}
        sx={{
          backgroundColor: statusInfo.bgColor,
          color: statusInfo.textColor,
          fontWeight: 600,
          textTransform: 'none',
          minWidth: 'auto',
          px: 1.5,
          py: 0.5,
          fontSize: '0.8rem',
          borderRadius: 1.5,
          boxShadow: 'none',
          border: `1px solid ${alpha(statusInfo.bgColor, 0.3)}`,
          '&:hover': {
            backgroundColor: alpha(statusInfo.bgColor, 0.8),
            boxShadow: theme.shadows[2],
            transform: 'translateY(-1px)',
            border: `1px solid ${statusInfo.bgColor}`
          },
          '&:disabled': {
            backgroundColor: alpha(statusInfo.bgColor, 0.6),
            color: alpha(statusInfo.textColor, 0.8)
          },
          transition: 'all 0.2s ease-in-out',
          // Add visual indicator that it's interactive
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -1,
            right: -1,
            bottom: -1,
            left: -1,
            borderRadius: 'inherit',
            padding: '1px',
            background: `linear-gradient(45deg, ${alpha(statusInfo.bgColor, 0.3)}, ${alpha(statusInfo.bgColor, 0.1)})`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            zIndex: -1
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusInfo.textColor,
              opacity: 0.8
            }}
          />
          {statusInfo.label}
        </Box>
      </Button>
    );
  };

  const statusMenuItems = [
    { 
      value: 'interested', 
      label: 'Interested', 
      color: '#2196f3',
      description: 'Job has caught your attention'
    },
    { 
      value: 'applied', 
      label: 'Applied', 
      color: '#ff9800',
      description: 'Application submitted'
    },
    { 
      value: 'interviewing', 
      label: 'Interviewing', 
      color: '#4caf50',
      description: 'In the interview process'
    },
    { 
      value: 'closed', 
      label: 'Closed', 
      color: '#9e9e9e',
      description: 'Process completed'
    }
  ];

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: theme.palette.primary.main
        },
        ...(compact && {
          '& .MuiCardContent-root': {
            pb: 1
          }
        })
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {/* Header with title, company, and status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: compact ? '1rem' : '1.1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {jobTitle}
              </Typography>
              {renderPriorityIndicator()}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BusinessIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {company}
              </Typography>
            </Box>

            {/* Location display - FIXED */}
            {location && location !== 'Remote' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationOnIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {location}
                </Typography>
              </Box>
            )}

            {/* Show remote indicator if location is remote */}
            {location === 'Remote' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WorkIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Remote
                </Typography>
              </Box>
            )}

            {/* Additional job info - REMOVED salary and job type */}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, ml: 2 }}>
            {/* Enhanced Status Dropdown */}
            {renderStatusDropdown()}
            
            {showActions && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(e);
                }}
                sx={{ ml: 0.5 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Activity indicators */}
        {renderActivityIndicators().length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
            {renderActivityIndicators()}
          </Box>
        )}

        {/* Excitement level */}
        {renderExcitementLevel() && (
          <Box sx={{ mb: 1.5 }}>
            {renderExcitementLevel()}
          </Box>
        )}

        {!compact && (
          <>
            <Divider sx={{ my: 1.5 }} />
            
            {/* Bottom info */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {timeSinceActivity}
                </Typography>
                
                {/* REMOVED job source indicator to clean up the display */}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resumeDetails.name && (
                  <Tooltip title={`Resume: ${resumeDetails.name}`}>
                    <Chip
                      label="Resume"
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Tooltip>
                )}
                
                {trackedJob.notes && trackedJob.notes.length > 0 && (
                  <Tooltip title={`Click to view ${trackedJob.notes.length} note${trackedJob.notes.length > 1 ? 's' : ''}`}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotesDialogOpen(true);
                      }}
                    >
                      <NoteIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {trackedJob.notes.length}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </>
        )}
      </CardContent>

      {/* Quick actions (only in non-compact mode) */}
      {!compact && showActions && (
        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleViewJob();
            }}
          >
            View Job
          </Button>
          
          <Button
            size="small"
            startIcon={<NoteIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleAddNote();
            }}
          >
            Add Note
          </Button>

          {/* Apply button - only show for interested status and when URL exists */}
          {trackedJob.status === 'interested' && (jobDetails.sourceUrl || jobDetails.url) && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<LaunchIcon />}
              onClick={(e) => {
                e.stopPropagation();
                window.open(jobDetails.sourceUrl || jobDetails.url, '_blank');
              }}
            >
              Apply
            </Button>
          )}
        </CardActions>
      )}

      {/* Enhanced Status change menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            minWidth: 200,
            boxShadow: theme.shadows[8],
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            mt: 1
          }
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        {/* Menu header */}
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Update Status
          </Typography>
        </Box>

        {statusMenuItems.map((item, index) => (
          <MenuItem
            key={item.value}
            onClick={() => handleStatusChange(item.value)}
            disabled={isUpdatingStatus || item.value === trackedJob.status}
            sx={{
              py: 1.5,
              px: 2,
              mx: 1,
              my: 0.5,
              borderRadius: 1,
              ...(item.value === trackedJob.status && {
                backgroundColor: alpha(item.color, 0.1),
                border: `1px solid ${alpha(item.color, 0.3)}`
              }),
              '&:hover': {
                backgroundColor: alpha(item.color, 0.05),
                transform: 'translateX(4px)',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  mr: 2,
                  flexShrink: 0
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: item.value === trackedJob.status ? 600 : 400,
                      color: item.value === trackedJob.status ? item.color : 'text.primary'
                    }}
                  >
                    {item.label}
                  </Typography>
                  {item.value === trackedJob.status && (
                    <Typography variant="body2" sx={{ color: item.color, fontWeight: 600 }}>
                      ✓
                    </Typography>
                  )}
                </Box>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {item.description}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleViewJob}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View Job Details" />
        </MenuItem>
        
        <MenuItem onClick={handleAddNote}>
          <ListItemIcon>
            <NoteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Add Note" />
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={handleDelete}
          disabled={isDeletingJob}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Remove from Tracker" />
        </MenuItem>
      </Menu>

      {/* Notes Dialog */}
      <NotesDialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        trackedJob={trackedJob}
        onNotesUpdated={handleNotesUpdated}
      />
    </Card>
  );
};

export default TrackedJobCard;
