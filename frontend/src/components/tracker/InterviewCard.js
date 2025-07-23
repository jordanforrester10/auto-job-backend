// frontend/src/components/tracker/InterviewCard.js - Individual interview display component
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import useInterviewManager from './hooks/useInterviewManager';

const InterviewCard = ({
  interview,
  trackedJob,
  onEdit,
  onDelete,
  compact = false
}) => {
  const theme = useTheme();
  const { deleteInterview, isLoading, getInterviewTypeInfo, getInterviewOutcomeInfo } = useInterviewManager();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Handle menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle edit
  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit(interview);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    handleMenuClose();
    if (window.confirm('Are you sure you want to delete this interview?')) {
      try {
        await deleteInterview(trackedJob._id, interview._id);
        if (onDelete) {
          onDelete(interview._id);
        }
      } catch (error) {
        console.error('Failed to delete interview:', error);
      }
    }
  };

  // Format interview date
  const formatInterviewDate = (date) => {
    const interviewDate = new Date(date);
    
    if (isToday(interviewDate)) {
      return `Today at ${format(interviewDate, 'h:mm a')}`;
    } else if (isTomorrow(interviewDate)) {
      return `Tomorrow at ${format(interviewDate, 'h:mm a')}`;
    } else {
      return format(interviewDate, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  // Get interview status
  const getInterviewStatus = () => {
    const interviewDate = new Date(interview.scheduledDate);
    const now = new Date();
    
    if (interview.outcome !== 'pending') {
      return interview.outcome;
    } else if (isPast(interviewDate)) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colorMap = {
      upcoming: theme.palette.primary.main,
      completed: theme.palette.warning.main,
      passed: theme.palette.success.main,
      failed: theme.palette.error.main,
      cancelled: theme.palette.grey[500],
      rescheduled: theme.palette.info.main
    };
    return colorMap[status] || theme.palette.grey[500];
  };

  const typeInfo = getInterviewTypeInfo(interview.type);
  const outcomeInfo = getInterviewOutcomeInfo(interview.outcome);
  const status = getInterviewStatus();
  const statusColor = getStatusColor(status);

  if (compact) {
    return (
      <Card
        sx={{
          mb: 1,
          border: `1px solid ${alpha(statusColor, 0.3)}`,
          borderLeft: `4px solid ${statusColor}`,
          '&:hover': {
            boxShadow: theme.shadows[2]
          }
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Box sx={{ fontSize: '1.2em' }}>{typeInfo.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true }}>
                  {typeInfo.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ noWrap: true }}>
                  {formatInterviewDate(interview.scheduledDate)}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={outcomeInfo.label}
                size="small"
                sx={{
                  backgroundColor: alpha(statusColor, 0.1),
                  color: statusColor,
                  fontSize: '0.7rem',
                  height: 20
                }}
              />
              
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                disabled={isLoading}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        mb: 2,
        border: `1px solid ${alpha(statusColor, 0.3)}`,
        borderLeft: `4px solid ${statusColor}`,
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-1px)'
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                backgroundColor: alpha(typeInfo.color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5em'
              }}
            >
              {typeInfo.icon}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {typeInfo.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatInterviewDate(interview.scheduledDate)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={outcomeInfo.label}
              sx={{
                backgroundColor: alpha(statusColor, 0.1),
                color: statusColor,
                fontWeight: 600
              }}
            />
            
            <IconButton
              onClick={handleMenuOpen}
              disabled={isLoading}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Interviewer Info */}
        {interview.interviewer && (interview.interviewer.name || interview.interviewer.role) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon fontSize="small" color="action" />
            <Box>
              {interview.interviewer.name && (
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {interview.interviewer.name}
                </Typography>
              )}
              {interview.interviewer.role && (
                <Typography variant="caption" color="text.secondary">
                  {interview.interviewer.role}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Preparation Notes */}
        {interview.preparationNotes && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <NotesIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Preparation Notes
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                pl: 3,
                fontStyle: 'italic',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {interview.preparationNotes}
            </Typography>
          </Box>
        )}

        {/* Feedback (if interview is completed) */}
        {interview.feedback && interview.outcome !== 'pending' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AssessmentIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Feedback
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                pl: 3,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {interview.feedback}
            </Typography>
          </Box>
        )}

        {/* Time indicator for upcoming interviews */}
        {status === 'upcoming' && (
          <Box
            sx={{
              mt: 2,
              p: 1,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <ScheduleIcon fontSize="small" color="primary" />
            <Typography variant="caption" color="primary">
              {isPast(new Date(interview.scheduledDate)) 
                ? 'Interview time has passed - update outcome'
                : `Upcoming interview`
              }
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Interview
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Interview
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default InterviewCard;
