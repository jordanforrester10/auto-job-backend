// frontend/src/components/tracker/InterviewDialog.js - Interview management dialog
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Alert,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Event as EventIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import useInterviewManager from './hooks/useInterviewManager';

const InterviewDialog = ({
  open,
  onClose,
  trackedJob,
  interview = null, // null for new interview, object for editing
  onInterviewSaved
}) => {
  const theme = useTheme();
  const { addInterview, updateInterview, isLoading, error } = useInterviewManager();

  // Form state
  const [formData, setFormData] = useState({
    type: 'phone',
    scheduledDate: new Date(),
    interviewerName: '',
    interviewerRole: '',
    interviewerContact: '',
    preparationNotes: '',
    outcome: 'pending',
    feedback: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Interview types
  const interviewTypes = [
    { value: 'phone', label: 'Phone Screen' },
    { value: 'video', label: 'Video Call' },
    { value: 'onsite', label: 'On-site' },
    { value: 'technical', label: 'Technical Interview' },
    { value: 'behavioral', label: 'Behavioral Interview' },
    { value: 'final', label: 'Final Round' },
    { value: 'other', label: 'Other' }
  ];

  // Interview outcomes
  const interviewOutcomes = [
    { value: 'pending', label: 'Pending' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' }
  ];

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (interview) {
        // Editing existing interview
        setFormData({
          type: interview.type || 'phone',
          scheduledDate: new Date(interview.scheduledDate),
          interviewerName: interview.interviewer?.name || '',
          interviewerRole: interview.interviewer?.role || '',
          interviewerContact: interview.interviewer?.contact || '',
          preparationNotes: interview.preparationNotes || '',
          outcome: interview.outcome || 'pending',
          feedback: interview.feedback || '',
          notes: interview.notes || ''
        });
      } else {
        // New interview - reset form
        setFormData({
          type: 'phone',
          scheduledDate: new Date(),
          interviewerName: '',
          interviewerRole: '',
          interviewerContact: '',
          preparationNotes: '',
          outcome: 'pending',
          feedback: '',
          notes: ''
        });
      }
      setFormErrors({});
    }
  }, [open, interview]);

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.scheduledDate) {
      errors.scheduledDate = 'Interview date is required';
    }

    if (!formData.type) {
      errors.type = 'Interview type is required';
    }

    if (formData.interviewerName && formData.interviewerName.length > 100) {
      errors.interviewerName = 'Interviewer name must be less than 100 characters';
    }

    if (formData.preparationNotes && formData.preparationNotes.length > 2000) {
      errors.preparationNotes = 'Preparation notes must be less than 2000 characters';
    }

    if (formData.feedback && formData.feedback.length > 2000) {
      errors.feedback = 'Feedback must be less than 2000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const interviewData = {
        type: formData.type,
        scheduledDate: formData.scheduledDate,
        interviewer: {
          name: formData.interviewerName.trim(),
          role: formData.interviewerRole.trim(),
          contact: formData.interviewerContact.trim()
        },
        preparationNotes: formData.preparationNotes.trim(),
        outcome: formData.outcome,
        feedback: formData.feedback.trim(),
        notes: formData.notes.trim()
      };

      let savedInterview;
      if (interview) {
        // Update existing interview
        savedInterview = await updateInterview(trackedJob._id, interview._id, interviewData);
      } else {
        // Add new interview
        savedInterview = await addInterview(trackedJob._id, interviewData);
      }

      if (onInterviewSaved) {
        onInterviewSaved(savedInterview);
      }

      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to save interview:', err);
    }
  };

  // Get dialog title
  const getDialogTitle = () => {
    if (interview) {
      return `Edit ${interviewTypes.find(t => t.value === interview.type)?.label || 'Interview'}`;
    }
    return 'Schedule New Interview';
  };

  const jobTitle = trackedJob?.jobDetails?.[0]?.title || 'Unknown Job';
  const company = trackedJob?.jobDetails?.[0]?.company || 'Unknown Company';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {getDialogTitle()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {jobTitle} at {company}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Interview Details Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EventIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Interview Details
                </Typography>
              </Box>
            </Grid>

            {/* Interview Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.type}>
                <InputLabel>Interview Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Interview Type"
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                >
                  {interviewTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.type && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {formErrors.type}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Scheduled Date */}
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Interview Date & Time"
                value={formData.scheduledDate}
                onChange={(newValue) => handleFieldChange('scheduledDate', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={!!formErrors.scheduledDate}
                    helperText={formErrors.scheduledDate}
                  />
                )}
                minDateTime={new Date()}
              />
            </Grid>

            {/* Interviewer Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Interviewer Information (Optional)
                </Typography>
              </Box>
            </Grid>

            {/* Interviewer Name */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Interviewer Name"
                value={formData.interviewerName}
                onChange={(e) => handleFieldChange('interviewerName', e.target.value)}
                fullWidth
                error={!!formErrors.interviewerName}
                helperText={formErrors.interviewerName}
              />
            </Grid>

            {/* Interviewer Role */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Role/Title"
                value={formData.interviewerRole}
                onChange={(e) => handleFieldChange('interviewerRole', e.target.value)}
                fullWidth
                placeholder="e.g., Senior Engineer, Hiring Manager"
              />
            </Grid>

            {/* Interviewer Contact */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Contact Info"
                value={formData.interviewerContact}
                onChange={(e) => handleFieldChange('interviewerContact', e.target.value)}
                fullWidth
                placeholder="Email or phone"
              />
            </Grid>

            {/* Preparation Notes */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NotesIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Preparation Notes
                </Typography>
              </Box>
              <TextField
                multiline
                rows={3}
                fullWidth
                placeholder="Key points to discuss, questions to ask, topics to prepare..."
                value={formData.preparationNotes}
                onChange={(e) => handleFieldChange('preparationNotes', e.target.value)}
                error={!!formErrors.preparationNotes}
                helperText={formErrors.preparationNotes || `${formData.preparationNotes.length}/2000 characters`}
              />
            </Grid>

            {/* Outcome Section (only show if editing existing interview) */}
            {interview && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AssessmentIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Interview Outcome
                    </Typography>
                  </Box>
                </Grid>

                {/* Outcome */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Outcome</InputLabel>
                    <Select
                      value={formData.outcome}
                      label="Outcome"
                      onChange={(e) => handleFieldChange('outcome', e.target.value)}
                    >
                      {interviewOutcomes.map((outcome) => (
                        <MenuItem key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Feedback */}
                <Grid item xs={12}>
                  <TextField
                    label="Feedback & Notes"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="How did the interview go? Key takeaways, next steps..."
                    value={formData.feedback}
                    onChange={(e) => handleFieldChange('feedback', e.target.value)}
                    error={!!formErrors.feedback}
                    helperText={formErrors.feedback || `${formData.feedback.length}/2000 characters`}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ borderRadius: 2 }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isLoading}
            sx={{ borderRadius: 2 }}
          >
            {isLoading ? 'Saving...' : (interview ? 'Update Interview' : 'Schedule Interview')}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default InterviewDialog;
