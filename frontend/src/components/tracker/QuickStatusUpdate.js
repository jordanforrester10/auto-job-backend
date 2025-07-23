// frontend/src/components/tracker/QuickStatusUpdate.js - Inline status update component
import React, { useState } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  TrendingFlat as ArrowIcon
} from '@mui/icons-material';
import StatusBadge from './StatusBadge';
import trackerService from '../../utils/trackerService';
import useTrackerActions from './hooks/useTrackerActions';

const QuickStatusUpdate = ({
  trackedJob,
  currentStatus,
  onStatusUpdate,
  size = 'small',
  disabled = false,
  showEditIcon = true
}) => {
  const theme = useTheme();
  const { updateJobStatus, isUpdatingStatus } = useTrackerActions();
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Status progression for validation
  const statusProgression = {
    interested: { order: 1, label: 'Interested' },
    applied: { order: 2, label: 'Applied' },
    interviewing: { order: 3, label: 'Interviewing' },
    closed: { order: 4, label: 'Closed' }
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (disabled) return;
    
    if (isEditing) {
      // Cancel editing
      setSelectedStatus(currentStatus);
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  // Handle status change
  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  // Handle status update submission
  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) {
      setIsEditing(false);
      return;
    }

    try {
      // Check if it's a backward transition
      const isBackward = statusProgression[currentStatus]?.order > statusProgression[selectedStatus]?.order;
      
      // For backward transitions, we might want to show a confirmation
      // For now, we'll allow it but show a different message
      const message = isBackward 
        ? `Status moved back to ${trackerService.getStatusInfo(selectedStatus).label}`
        : `Status updated to ${trackerService.getStatusInfo(selectedStatus).label}`;

      await updateJobStatus(trackedJob._id, selectedStatus);
      
      if (onStatusUpdate) {
        onStatusUpdate(trackedJob._id, selectedStatus);
      }

      setNotification({
        open: true,
        message,
        severity: isBackward ? 'warning' : 'success'
      });

      setIsEditing(false);
    } catch (error) {
      setNotification({
        open: true,
        message: error.message || 'Failed to update status',
        severity: 'error'
      });
      
      // Reset to original status on error
      setSelectedStatus(currentStatus);
      setIsEditing(false);
    }
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Render status options
  const renderStatusOptions = () => {
    const statuses = ['interested', 'applied', 'interviewing', 'closed'];
    
    return statuses.map((status) => {
      const statusInfo = trackerService.getStatusInfo(status);
      const isBackward = statusProgression[currentStatus]?.order > statusProgression[status]?.order;
      
      return (
        <MenuItem key={status} value={status}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <StatusBadge 
              status={status} 
              size="small" 
              showTooltip={false}
            />
            {isBackward && status !== currentStatus && (
              <Typography variant="caption" color="warning.main" sx={{ ml: 'auto' }}>
                ←
              </Typography>
            )}
          </Box>
        </MenuItem>
      );
    });
  };

  // Render quick action buttons for common transitions
  const renderQuickActions = () => {
    if (isEditing || disabled) return null;

    const currentOrder = statusProgression[currentStatus]?.order || 1;
    const nextStatus = Object.keys(statusProgression).find(
      status => statusProgression[status].order === currentOrder + 1
    );

    if (!nextStatus) return null;

    const nextStatusInfo = trackerService.getStatusInfo(nextStatus);

    return (
      <Tooltip title={`Quick update to ${nextStatusInfo.label}`}>
        <IconButton
          size="small"
          onClick={() => {
            setSelectedStatus(nextStatus);
            setTimeout(handleStatusUpdate, 100);
          }}
          disabled={isUpdatingStatus}
          sx={{
            ml: 0.5,
            color: nextStatusInfo.bgColor,
            '&:hover': {
              backgroundColor: alpha(nextStatusInfo.bgColor, 0.1)
            }
          }}
        >
          <ArrowIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            disabled={isUpdatingStatus}
            sx={{
              '& .MuiSelect-select': {
                py: 0.5,
                fontSize: size === 'small' ? '0.8rem' : '0.9rem'
              }
            }}
          >
            {renderStatusOptions()}
          </Select>
        </FormControl>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isUpdatingStatus ? (
            <CircularProgress size={16} />
          ) : (
            <>
              <Tooltip title="Save changes">
                <IconButton
                  size="small"
                  onClick={handleStatusUpdate}
                  disabled={selectedStatus === currentStatus}
                  sx={{ 
                    color: 'success.main',
                    '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) }
                  }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={handleEditToggle}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: alpha(theme.palette.text.secondary, 0.1) }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleNotificationClose}
            severity={notification.severity}
            variant="filled"
            sx={{ borderRadius: 2 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <StatusBadge
        status={currentStatus}
        size={size}
        onClick={disabled ? undefined : handleEditToggle}
        disabled={disabled}
        sx={{
          cursor: disabled ? 'default' : 'pointer',
          '&:hover': !disabled ? {
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[2]
          } : {}
        }}
      />
      
      {showEditIcon && !disabled && (
        <Tooltip title="Click to edit status">
          <IconButton
            size="small"
            onClick={handleEditToggle}
            sx={{
              opacity: 0.6,
              '&:hover': {
                opacity: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {renderQuickActions()}

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Compact version for use in cards
export const CompactQuickStatusUpdate = (props) => (
  <QuickStatusUpdate
    {...props}
    size="small"
    showEditIcon={false}
  />
);

// Status update with confirmation for backward moves
export const ConfirmedQuickStatusUpdate = ({ onConfirmBackward, ...props }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const handleStatusUpdate = (jobId, newStatus) => {
    const currentOrder = statusProgression[props.currentStatus]?.order || 1;
    const newOrder = statusProgression[newStatus]?.order || 1;
    
    if (newOrder < currentOrder) {
      // Backward transition - show confirmation
      setPendingStatus(newStatus);
      setShowConfirmation(true);
    } else {
      // Forward transition - proceed normally
      if (props.onStatusUpdate) {
        props.onStatusUpdate(jobId, newStatus);
      }
    }
  };

  const handleConfirmBackward = () => {
    if (props.onStatusUpdate && pendingStatus) {
      props.onStatusUpdate(props.trackedJob._id, pendingStatus);
    }
    setShowConfirmation(false);
    setPendingStatus(null);
  };

  const handleCancelBackward = () => {
    setShowConfirmation(false);
    setPendingStatus(null);
  };

  return (
    <>
      <QuickStatusUpdate
        {...props}
        onStatusUpdate={handleStatusUpdate}
      />
      
      {/* Confirmation dialog would go here */}
      {showConfirmation && onConfirmBackward && (
        onConfirmBackward(pendingStatus, handleConfirmBackward, handleCancelBackward)
      )}
    </>
  );
};

export default QuickStatusUpdate;
