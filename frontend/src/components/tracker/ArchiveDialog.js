// frontend/src/components/tracker/ArchiveDialog.js - Archive confirmation dialog
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
  useTheme,
  alpha
} from '@mui/material';
import {
  Archive as ArchiveIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Undo as UndoIcon,
  DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';
import StatusBadge from './StatusBadge';
import trackerService from '../../utils/trackerService';

const ArchiveDialog = ({
  open,
  onClose,
  jobs = [],
  onArchive,
  isArchiving = false,
  type = 'single' // 'single', 'bulk', 'bulk-closed'
}) => {
  const theme = useTheme();
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const isBulk = type === 'bulk' || type === 'bulk-closed';
  const jobCount = jobs.length;

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setConfirmUnderstood(false);
      setArchiveReason('');
    }
  }, [open]);

  // Handle archive confirmation
  const handleArchive = () => {
    if (onArchive) {
      onArchive(jobs.map(job => job._id), archiveReason);
    }
  };

  // Get archive impact message
  const getArchiveImpactMessage = () => {
    if (type === 'bulk-closed') {
      return `This will archive all ${jobCount} closed jobs. They will be moved to your archive where you can still search and restore them if needed.`;
    } else if (isBulk) {
      return `This will archive ${jobCount} selected jobs. They will be moved to your archive where you can still search and restore them if needed.`;
    } else {
      const job = jobs[0];
      const jobTitle = job?.jobDetails?.[0]?.title || 'Unknown Job';
      const company = job?.jobDetails?.[0]?.company || 'Unknown Company';
      return `This will archive "${jobTitle}" at ${company}. You can restore it from your archive at any time.`;
    }
  };

  // Get storage impact info
  const getStorageInfo = () => {
    const estimatedSize = jobCount * 0.1; // Rough estimate in MB
    return {
      size: estimatedSize.toFixed(1),
      cleanupDays: 90
    };
  };

  // Render job list for bulk operations
  const renderJobList = () => {
    if (!isBulk || jobCount <= 3) {
      return (
        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
          {jobs.slice(0, 5).map((job, index) => {
            const jobTitle = job?.jobDetails?.[0]?.title || 'Unknown Job';
            const company = job?.jobDetails?.[0]?.company || 'Unknown Company';
            
            return (
              <ListItem key={job._id || index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <StatusBadge 
                    status={job.status} 
                    size="small" 
                    showTooltip={false}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={jobTitle}
                  secondary={company}
                  primaryTypographyProps={{ fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.8rem' }}
                />
              </ListItem>
            );
          })}
          {jobCount > 5 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    ... and {jobCount - 5} more jobs
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      );
    }

    return (
      <Box sx={{ 
        p: 2, 
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        borderRadius: 2,
        textAlign: 'center'
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {jobCount}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          jobs selected for archiving
        </Typography>
      </Box>
    );
  };

  // Render archive benefits
  const renderArchiveBenefits = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        What happens when you archive jobs:
      </Typography>
      <List dense>
        <ListItem sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ArchiveIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Jobs are moved to your archive"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
        <ListItem sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <UndoIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText
            primary="You can restore them anytime"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
        <ListItem sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ScheduleIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText
            primary={`Auto-cleanup after ${getStorageInfo().cleanupDays} days (with warning)`}
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
      </List>
    </Box>
  );

  const storageInfo = getStorageInfo();

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
          <ArchiveIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {type === 'bulk-closed' ? 'Archive All Closed Jobs' : 
             isBulk ? 'Archive Selected Jobs' : 'Archive Job'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Archive Impact Message */}
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<InfoIcon />}
        >
          {getArchiveImpactMessage()}
        </Alert>

        {/* Job List */}
        {renderJobList()}

        {/* Storage Information */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: alpha(theme.palette.grey[500], 0.05),
          borderRadius: 2 
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Storage Impact
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              label={`~${storageInfo.size} MB`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Estimated archive size
            </Typography>
          </Box>
        </Box>

        {/* Archive Benefits */}
        {renderArchiveBenefits()}

        {/* Bulk Operation Warning */}
        {isBulk && jobCount > 10 && (
          <Alert 
            severity="warning" 
            sx={{ mt: 3, borderRadius: 2 }}
            icon={<WarningIcon />}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Large Bulk Operation
            </Typography>
            You're archiving {jobCount} jobs at once. This operation cannot be undone in bulk - you'll need to restore jobs individually if needed.
          </Alert>
        )}

        {/* Confirmation Checkbox */}
        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmUnderstood}
                onChange={(e) => setConfirmUnderstood(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I understand that {isBulk ? 'these jobs' : 'this job'} will be moved to the archive and can be restored later
              </Typography>
            }
          />
        </Box>

        {/* Auto-cleanup Notice */}
        <Alert 
          severity="warning" 
          sx={{ mt: 2, borderRadius: 2 }}
          icon={<DeleteSweepIcon />}
        >
          <Typography variant="caption">
            <strong>Auto-cleanup Notice:</strong> Archived jobs are automatically deleted after {storageInfo.cleanupDays} days. 
            You'll receive warnings before this happens and can extend the retention period.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
          disabled={isArchiving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleArchive}
          variant="contained"
          disabled={!confirmUnderstood || isArchiving}
          sx={{ borderRadius: 2 }}
          startIcon={isArchiving ? null : <ArchiveIcon />}
        >
          {isArchiving ? 'Archiving...' : 
           type === 'bulk-closed' ? `Archive ${jobCount} Jobs` :
           isBulk ? `Archive ${jobCount} Jobs` : 'Archive Job'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Specialized dialogs for different archive types
export const SingleArchiveDialog = (props) => (
  <ArchiveDialog {...props} type="single" />
);

export const BulkArchiveDialog = (props) => (
  <ArchiveDialog {...props} type="bulk" />
);

export const BulkClosedArchiveDialog = (props) => (
  <ArchiveDialog {...props} type="bulk-closed" />
);

export default ArchiveDialog;
