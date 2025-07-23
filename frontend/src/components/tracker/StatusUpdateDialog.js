// frontend/src/components/tracker/StatusUpdateDialog.js - Comprehensive status update dialog
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingFlat as ArrowIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import StatusBadge, { StatusComparison } from './StatusBadge';
import trackerService from '../../utils/trackerService';
import useTrackerActions from './hooks/useTrackerActions';

const StatusUpdateDialog = ({
  open,
  onClose,
  trackedJob,
  currentStatus,
  onStatusUpdate
}) => {
  const theme = useTheme();
  const { updateJobStatus, isUpdatingStatus } = useTrackerActions();
  
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'interested');
  const [note, setNote] = useState('');
  const [interviewDate, setInterviewDate] = useState(null);
  const [interviewType, setInterviewType] = useState('phone');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  // Status progression mapping
  const statusProgression = {
    interested: { order: 1, label: 'Interested', next: 'applied' },
    applied: { order: 2, label: 'Applied', next: 'interviewing' },
    interviewing: { order: 3, label: 'Interviewing', next: 'closed' },
    closed: { order: 4, label: 'Closed', next: null }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus || 'interested');
      setNote('');
      setInterviewDate(null);
      setInterviewType('phone');
      setShowConfirmation(false);
      setError('');
    }
  }, [open, currentStatus]);

  // Check if status change is backward
  const isBackwardTransition = () => {
    const currentOrder = statusProgression[currentStatus]?.order || 1;
    const selectedOrder = statusProgression[selectedStatus]?.order || 1;
    return selectedOrder < currentOrder;
  };

  // Get status change description
  const getStatusChangeDescription = () => {
    const descriptions = {
      interested: 'Mark this job as interesting and worth considering',
      applied: 'Record that you have submitted your application',
      interviewing: 'Move to interview phase - schedule and track interviews',
      closed: 'Mark application as complete (hired, rejected, or withdrawn)'
    };
    return descriptions[selectedStatus] || '';
  };

  // Get auto-date display
  const getAutoDateDisplay = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    
    switch (selectedStatus) {
      case 'applied':
        return `Applied on ${dateStr}`;
      case 'interviewing':
        return interviewDate 
          ? `Interview scheduled for ${interviewDate.toLocaleDateString()}`
          : `Moved to interviewing on ${dateStr}`;
      case 'closed':
        return `Closed on ${dateStr}`;
      default:
        return `Updated on ${dateStr}`;
    }
  };

  // Handle status selection
  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    setError('');
    
    // Show confirmation for backward transitions
    if (statusProgression[currentStatus]?.order > statusProgression[newStatus]?.order) {
      setShowConfirmation(true);
    } else {
      setShowConfirmation(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setError('');
      
      // Prepare update data
      const updateData = {
        status: selectedStatus,
        note: note.trim() || undefined
      };

      // Add interview data if moving to interviewing
      if (selectedStatus === 'interviewing' && interviewDate) {
        updateData.interview = {
          type: interviewType,
          scheduledDate: interviewDate,
          outcome: 'pending'
        };
      }

      await updateJobStatus(trackedJob._id, selectedStatus, note.trim());
      
      if (onStatusUpdate) {
        onStatusUpdate(trackedJob._id, selectedStatus, updateData);
      }
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
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
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">
                {statusInfo.label}
              </Typography>
            </Box>
            {isBackward && (
              <Chip
                label="Backward"
                size="small"
                color="warning"
                sx={{ height: 18, fontSize: '0.6rem' }}
              />
            )}
          </Box>
        </MenuItem>
      );
    });
  };

  // Render interview scheduling section
  const renderInterviewScheduling = () => {
    if (selectedStatus !== 'interviewing') return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Interview Details (Optional)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Interview Type</InputLabel>
            <Select
              value={interviewType}
              label="Interview Type"
              onChange={(e) => setInterviewType(e.target.value)}
            >
              <MenuItem value="phone">Phone Screen</MenuItem>
              <MenuItem value="video">Video Call</MenuItem>
              <MenuItem value="onsite">On-site</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="final">Final Round</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateTimePicker
            label="Interview Date & Time"
            value={interviewDate}
            onChange={setInterviewDate}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                fullWidth
                helperText="Optional - you can schedule this later"
              />
            )}
            minDateTime={new Date()}
          />
        </LocalizationProvider>
      </Box>
    );
  };

  // Render status flow visualization
  const renderStatusFlow = () => {
    const statuses = ['interested', 'applied', 'interviewing', 'closed'];
    
    return (
      <Box sx={{ my: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Application Progress
        </Typography>
        
        <Stepper activeStep={statusProgression[selectedStatus]?.order - 1} alternativeLabel>
          {statuses.map((status) => {
            const isActive = status === selectedStatus;
            const isPassed = statusProgression[status].order <= statusProgression[selectedStatus].order;
            
            return (
              <Step key={status} completed={isPassed && !isActive}>
                <StepLabel
                  StepIconComponent={() => (
                    <StatusBadge 
                      status={status} 
                      size="small" 
                      showTooltip={false}
                      variant={isPassed ? 'filled' : 'outlined'}
                    />
                  )}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.secondary'
                    }}
                  >
                    {statusProgression[status].label}
                  </Typography>
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    );
  };

  const jobTitle = trackedJob?.jobDetails?.[0]?.title || 'Unknown Job';
  const company = trackedJob?.jobDetails?.[0]?.company || 'Unknown Company';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Update Job Status
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {jobTitle} at {company}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Current vs New Status */}
        {currentStatus !== selectedStatus && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Status Change
            </Typography>
            <StatusComparison 
              fromStatus={currentStatus} 
              toStatus={selectedStatus} 
              size="medium"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {getAutoDateDisplay()}
            </Typography>
          </Box>
        )}

        {/* Status Selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={selectedStatus}
            label="New Status"
            onChange={handleStatusChange}
          >
            {renderStatusOptions()}
          </Select>
        </FormControl>

        {/* Status Description */}
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<CheckCircleIcon />}
        >
          {getStatusChangeDescription()}
        </Alert>

        {/* Backward Transition Warning */}
        {showConfirmation && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<WarningIcon />}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Backward Status Change
            </Typography>
            You're moving from a later stage back to an earlier one. This is allowed but please confirm this is intentional.
          </Alert>
        )}

        {/* Status Flow Visualization */}
        {renderStatusFlow()}

        {/* Interview Scheduling */}
        {renderInterviewScheduling()}

        {/* Notes */}
        <TextField
          label="Notes (Optional)"
          multiline
          rows={3}
          fullWidth
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any notes about this status change..."
          helperText={`${note.length}/500 characters`}
          inputProps={{ maxLength: 500 }}
          sx={{ mt: 2 }}
        />

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
          disabled={isUpdatingStatus}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isUpdatingStatus || !selectedStatus}
          sx={{ borderRadius: 2 }}
        >
          {isUpdatingStatus ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusUpdateDialog;
