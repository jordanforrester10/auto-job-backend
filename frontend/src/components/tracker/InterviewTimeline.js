// frontend/src/components/tracker/InterviewTimeline.js - Chronological interview timeline
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Add as AddIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Assessment as AssessmentIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import InterviewCard from './InterviewCard';
import InterviewDialog from './InterviewDialog';
import useInterviewManager from './hooks/useInterviewManager';

const InterviewTimeline = ({ trackedJob, onInterviewUpdate }) => {
  const theme = useTheme();
  const { getInterviewTypeInfo, getInterviewOutcomeInfo } = useInterviewManager();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  const interviews = trackedJob?.interviews || [];
  const sortedInterviews = [...interviews].sort((a, b) => 
    new Date(a.scheduledDate) - new Date(b.scheduledDate)
  );

  // Handle add interview
  const handleAddInterview = () => {
    setShowAddDialog(true);
  };

  // Handle edit interview
  const handleEditInterview = (interview) => {
    setEditingInterview(interview);
  };

  // Handle interview saved
  const handleInterviewSaved = (savedInterview) => {
    if (onInterviewUpdate) {
      onInterviewUpdate();
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditingInterview(null);
  };

  // Export interview history
  const handleExportHistory = () => {
    const jobTitle = trackedJob?.jobDetails?.[0]?.title || 'Unknown Job';
    const company = trackedJob?.jobDetails?.[0]?.company || 'Unknown Company';
    
    let exportData = `Interview History - ${jobTitle} at ${company}\n`;
    exportData += `Generated on: ${format(new Date(), 'PPP')}\n\n`;

    sortedInterviews.forEach((interview, index) => {
      const typeInfo = getInterviewTypeInfo(interview.type);
      const outcomeInfo = getInterviewOutcomeInfo(interview.outcome);
      
      exportData += `${index + 1}. ${typeInfo.label}\n`;
      exportData += `   Date: ${format(new Date(interview.scheduledDate), 'PPP p')}\n`;
      exportData += `   Status: ${outcomeInfo.label}\n`;
      
      if (interview.interviewer?.name) {
        exportData += `   Interviewer: ${interview.interviewer.name}`;
        if (interview.interviewer.role) {
          exportData += ` (${interview.interviewer.role})`;
        }
        exportData += '\n';
      }
      
      if (interview.preparationNotes) {
        exportData += `   Preparation Notes: ${interview.preparationNotes}\n`;
      }
      
      if (interview.feedback) {
        exportData += `   Feedback: ${interview.feedback}\n`;
      }
      
      exportData += '\n';
    });

    // Create and download file
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-history-${company.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Get timeline dot color based on interview status
  const getTimelineDotColor = (interview) => {
    const interviewDate = new Date(interview.scheduledDate);
    const now = new Date();
    
    if (interview.outcome === 'passed') return 'success';
    if (interview.outcome === 'failed') return 'error';
    if (interview.outcome === 'cancelled') return 'grey';
    if (interview.outcome === 'rescheduled') return 'info';
    if (isPast(interviewDate)) return 'warning';
    return 'primary';
  };

  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No Interviews Scheduled
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Schedule your first interview to start tracking your progress
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddInterview}
            sx={{ borderRadius: 2 }}
          >
            Schedule Interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Interview Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {interviews.length} interview{interviews.length !== 1 ? 's' : ''} scheduled
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {interviews.length > 0 && (
            <Tooltip title="Export interview history">
              <IconButton onClick={handleExportHistory}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddInterview}
            sx={{ borderRadius: 2 }}
          >
            Add Interview
          </Button>
        </Box>
      </Box>

      {/* Timeline */}
      <Timeline position="right">
        {sortedInterviews.map((interview, index) => {
          const typeInfo = getInterviewTypeInfo(interview.type);
          const outcomeInfo = getInterviewOutcomeInfo(interview.outcome);
          const dotColor = getTimelineDotColor(interview);
          const isLast = index === sortedInterviews.length - 1;

          return (
            <TimelineItem key={interview._id}>
              <TimelineOppositeContent sx={{ flex: 0.3, py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(interview.scheduledDate), 'MMM d')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(interview.scheduledDate), 'h:mm a')}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot color={dotColor} sx={{ p: 1 }}>
                  <Box sx={{ fontSize: '1.2em' }}>{typeInfo.icon}</Box>
                </TimelineDot>
                {!isLast && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent sx={{ py: 1 }}>
                <Card
                  sx={{
                    mb: 2,
                    border: `1px solid ${alpha(theme.palette[dotColor]?.main || theme.palette.grey[300], 0.3)}`,
                    '&:hover': {
                      boxShadow: theme.shadows[2]
                    }
                  }}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    {/* Interview Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {typeInfo.label}
                      </Typography>
                      <Chip
                        label={outcomeInfo.label}
                        size="small"
                        sx={{
                          backgroundColor: alpha(theme.palette[dotColor]?.main || theme.palette.grey[500], 0.1),
                          color: theme.palette[dotColor]?.main || theme.palette.grey[700]
                        }}
                      />
                    </Box>

                    {/* Interviewer Info */}
                    {interview.interviewer && (interview.interviewer.name || interview.interviewer.role) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {interview.interviewer.name}
                          {interview.interviewer.role && ` (${interview.interviewer.role})`}
                        </Typography>
                      </Box>
                    )}

                    {/* Preparation Notes */}
                    {interview.preparationNotes && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <NotesIcon fontSize="small" color="action" />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
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
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {interview.preparationNotes}
                        </Typography>
                      </Box>
                    )}

                    {/* Feedback */}
                    {interview.feedback && interview.outcome !== 'pending' && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <AssessmentIcon fontSize="small" color="action" />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Feedback
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            pl: 3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {interview.feedback}
                        </Typography>
                      </Box>
                    )}

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        size="small"
                        onClick={() => handleEditInterview(interview)}
                        sx={{ borderRadius: 1 }}
                      >
                        Edit
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>

      {/* Progress Summary */}
      <Card sx={{ mt: 3, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Interview Progress Summary
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {['pending', 'passed', 'failed', 'cancelled'].map(outcome => {
              const count = interviews.filter(i => i.outcome === outcome).length;
              const outcomeInfo = getInterviewOutcomeInfo(outcome);
              
              if (count === 0) return null;
              
              return (
                <Chip
                  key={outcome}
                  label={`${count} ${outcomeInfo.label}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main'
                  }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Interview Dialogs */}
      <InterviewDialog
        open={showAddDialog}
        onClose={handleDialogClose}
        trackedJob={trackedJob}
        onInterviewSaved={handleInterviewSaved}
      />

      <InterviewDialog
        open={!!editingInterview}
        onClose={handleDialogClose}
        trackedJob={trackedJob}
        interview={editingInterview}
        onInterviewSaved={handleInterviewSaved}
      />
    </Box>
  );
};

export default InterviewTimeline;
