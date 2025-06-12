// src/components/jobs/components/AiSearchDeleteDialog.js
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const AiSearchDeleteDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  selectedSearch, 
  isLoading 
}) => {
  const theme = useTheme();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6">Cancel Agent Job Search?</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography>
          Are you sure you want to cancel this Agent job search? This action cannot be undone.
          The search will be stopped and removed from your active searches.
        </Typography>
        {selectedSearch && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DescriptionIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="body2" fontWeight={500}>
                Resume: {selectedSearch.resumeName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <WorkIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="body2" fontWeight={500}>
                Jobs found: {selectedSearch.totalJobsFound}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssessmentIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="body2" fontWeight={500}>
                Status: {selectedSearch.status}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
        >
          Keep Search
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
        >
          Cancel Search
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AiSearchDeleteDialog;