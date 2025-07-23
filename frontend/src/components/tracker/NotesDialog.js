// frontend/src/components/tracker/NotesDialog.js - Dialog to view and manage job notes
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTrackerActions } from './hooks/useTrackerActions';

const NotesDialog = ({ 
  open, 
  onClose, 
  trackedJob,
  onNotesUpdated 
}) => {
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { addJobNote } = useTrackerActions();

  const jobTitle = trackedJob?.jobDetails?.[0]?.title || 'Unknown Position';
  const company = trackedJob?.jobDetails?.[0]?.company || 'Unknown Company';
  const notes = trackedJob?.notes || [];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const result = await addJobNote(trackedJob._id, newNote.trim());
      
      if (result.success) {
        setNewNote('');
        
        // Call the callback to refresh data
        if (onNotesUpdated) {
          onNotesUpdated();
        }
        
        // Show success message (optional)
        console.log('✅ Note added successfully');
      } else {
        console.error('Failed to add note:', result.error);
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      handleAddNote();
    }
  };

  // Simple close - just close the dialog, don't navigate
  const handleDialogClose = () => {
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh'
        },
        onClick: (e) => e.stopPropagation()
      }}
    >
      <DialogTitle sx={{ pb: 1 }} onClick={(e) => e.stopPropagation()}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NoteIcon color="primary" />
            <Box>
              <Typography variant="h6" component="div">
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {jobTitle} at {company}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleDialogClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }} onClick={(e) => e.stopPropagation()}>
        {/* Add new note section */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            mb: 3,
            backgroundColor: 'background.default'
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Add New Note
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a note about this job application..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAddingNote}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Press Ctrl+Enter to add note quickly
            </Typography>
            <Button
              variant="contained"
              startIcon={isAddingNote ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleAddNote}
              disabled={!newNote.trim() || isAddingNote}
              size="small"
            >
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </Box>
        </Paper>

        {/* Notes list */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              All Notes
            </Typography>
            <Chip 
              label={notes.length} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>

          {notes.length === 0 ? (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                backgroundColor: 'background.default'
              }}
            >
              <NoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notes yet. Add your first note above!
              </Typography>
            </Paper>
          ) : (
            <List sx={{ p: 0 }}>
              {notes
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((note, index) => (
                  <React.Fragment key={note._id || index}>
                    <ListItem
                      sx={{
                        px: 0,
                        py: 2,
                        alignItems: 'flex-start'
                      }}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          width: '100%',
                          backgroundColor: 'background.paper'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(note.createdAt)}
                          </Typography>
                          {index === 0 && (
                            <Chip 
                              label="Latest" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5
                          }}
                        >
                          {note.content}
                        </Typography>
                      </Paper>
                    </ListItem>
                    {index < notes.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </React.Fragment>
                ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} onClick={(e) => e.stopPropagation()}>
        <Button onClick={handleDialogClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotesDialog;
