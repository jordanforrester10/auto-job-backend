// frontend/src/components/tracker/AddToTrackerButton.js - Reusable button to add jobs to tracker
import React, { useState } from 'react';
import {
  Button,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  PlaylistAdd as PlaylistAddIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTrackerActions } from './hooks/useTrackerActions';

const AddToTrackerButton = ({ 
  job, 
  size = 'small', 
  variant = 'contained', 
  color = 'primary',
  onSuccess,
  onError,
  sx = {},
  ...props 
}) => {
  const [isTracked, setIsTracked] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { trackJob, isLoading, error } = useTrackerActions();

  const handleAddToTracker = async (e) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    try {
      // Prepare job data for tracking
      const trackingData = {
        jobId: job._id,
        status: 'interested', // Default initial status
        priority: 'medium', // Default priority
        notes: `Added from jobs page on ${new Date().toLocaleDateString()}`,
        source: 'manual' // Must match backend enum values
      };

      const result = await trackJob(trackingData);
      
      if (result.success) {
        setIsTracked(true);
        setSnackbar({
          open: true,
          message: 'Job added to tracker successfully!',
          severity: 'success'
        });
        
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        throw new Error(result.message || 'Failed to add job to tracker');
      }
    } catch (err) {
      console.error('Error adding job to tracker:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add job to tracker';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      
      if (onError) {
        onError(err);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // If job is already tracked, show different state
  if (isTracked) {
    return (
      <>
        <Tooltip title="Job added to tracker" arrow>
          <Button
            size={size}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled
            sx={{
              minWidth: '150px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              py: 1.5,
              px: 3,
              ...sx
            }}
            {...props}
          >
            Added to Tracker
          </Button>
        </Tooltip>
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity} 
            sx={{ width: '100%', borderRadius: 2 }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      <Tooltip title="Add this job to your application tracker" arrow>
        <Button
          size={size}
          variant={variant}
          color={color}
          onClick={handleAddToTracker}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PlaylistAddIcon />
            )
          }
          sx={{
            minWidth: '150px',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            py: 1.5,
            px: 3,
            borderRadius: 2,
            ...sx
          }}
          {...props}
        >
          {isLoading ? 'Adding...' : 'Track Job'}
        </Button>
      </Tooltip>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%', borderRadius: 2 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddToTrackerButton;
