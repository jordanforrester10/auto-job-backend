// src/components/assistant/GlobalAiAssistant.js - WITH WORKING CONVERSATION DELETION
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Fade,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  LinearProgress,
  Card,
  CardContent,
  Autocomplete,
  InputAdornment,
  Popper,
  ClickAwayListener,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  ExpandLess as ChevronUpIcon,
  ExpandMore as ChevronDownIcon,
  Add as AddIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PushPin as PushPinIcon,
  AutoFixHigh as AutoFixHighIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAiAssistant } from '../../context/AiAssistantContext';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';
import assistantService from '../../utils/assistantService';


// Confirmation Dialog Component for Conversation Deletion
const DeleteConfirmationDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  conversationTitle,
  isDeleting 
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[20]
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
        color: theme.palette.error.main
      }}>
        <WarningIcon />
        Delete Conversation?
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to delete this conversation?
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600,
            p: 2,
            bgcolor: theme.palette.grey[100],
            borderRadius: 1,
            mb: 2
          }}
        >
          "{conversationTitle || 'Untitled Conversation'}"
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          This action cannot be undone. All messages in this conversation will be permanently deleted.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={isDeleting}
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={isDeleting}
          variant="contained"
          color="error"
          startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          sx={{ minWidth: 120 }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// @-Mention Component for RAG Context Selection
const MentionInput = ({ 
  inputValue, 
  setInputValue, 
  onSendMessage, 
  disabled, 
  currentContext, 
  attachedContext, 
  onAttachContext, 
  onRemoveContext 
}) => {
  const theme = useTheme();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOptions, setMentionOptions] = useState({ resumes: [], jobs: [] });
  const [loading, setLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const popperRef = useRef(null);

  // Handle input changes and detect @ mentions
  const handleInputChange = async (event) => {
    const value = event.target.value;
    const cursorPos = event.target.selectionStart;
    
    setInputValue(value);
    setCursorPosition(cursorPos);

    // Check if user typed @ at current position
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      // User just typed @, show mention popup
      setShowMentions(true);
      setMentionQuery('');
      await loadMentionOptions('');
    } else if (lastAtIndex !== -1 && cursorPos > lastAtIndex) {
      // User is typing after @, filter options
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      if (query.length <= 50 && !query.includes(' ')) { // Reasonable query length
        setMentionQuery(query);
        await loadMentionOptions(query);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Load mention options from API
  const loadMentionOptions = async (query) => {
    setLoading(true);
    try {
      const options = await assistantService.getMentionSuggestions(query);
      setMentionOptions(options);
    } catch (error) {
      console.error('Failed to load mention options:', error);
      setMentionOptions({ resumes: [], jobs: [] });
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a mention option - FIXED
  const handleSelectMention = (item, type) => {
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const textAfterCursor = inputValue.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Replace @query with @[ItemName]
    const beforeAt = inputValue.substring(0, lastAtIndex);
    const mentionText = `@[${item.name || item.title}] `;
    const newValue = beforeAt + mentionText + textAfterCursor;
    
    setInputValue(newValue);
    setShowMentions(false);
    
    // Attach context to conversation
    onAttachContext(item, type);
    
    // FIXED: Use setTimeout with proper null checks for focus management
    setTimeout(() => {
      if (inputRef.current) {
        try {
          const newPos = beforeAt.length + mentionText.length;
          inputRef.current.focus();
          
          // Only call setSelectionRange if the method exists and input is focused
          if (inputRef.current.setSelectionRange && document.activeElement === inputRef.current) {
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        } catch (error) {
          console.warn('Focus management error (non-critical):', error);
          // Fallback: just focus without setting cursor position
          if (inputRef.current.focus) {
            inputRef.current.focus();
          }
        }
      }
    }, 100); // Increased timeout for better reliability
  };

  // Handle key presses
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !showMentions) {
      event.preventDefault();
      onSendMessage();
    } else if (event.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleClickAway = () => {
    setShowMentions(false);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative' }}>
        {/* Attached Context Display */}
        {(attachedContext.resumes.length > 0 || attachedContext.jobs.length > 0) && (
          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {attachedContext.resumes.map((resume) => (
              <Chip
                key={resume.id}
                icon={<DescriptionIcon />}
                label={resume.name}
                size="small"
                variant="outlined"
                color="secondary"
                onDelete={() => onRemoveContext(resume.id, 'resume')}
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
            {attachedContext.jobs.map((job) => (
              <Chip
                key={job.id}
                icon={<WorkIcon />}
                label={`${job.title} at ${job.company}`}
                size="small"
                variant="outlined"
                color="primary"
                onDelete={() => onRemoveContext(job.id, 'job')}
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        )}

        {/* Input Field */}
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={3}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Ask AJ anything about your career... Type @ to reference resumes or jobs"
          variant="outlined"
          size="small"
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AutoJobLogo variant="icon-only" size="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Type @ to reference resumes or jobs">
                  <IconButton size="small" disabled>
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontSize: '0.875rem'
            }
          }}
        />

        {/* Mention Suggestions Popup */}
        {showMentions && (
          <Paper
            ref={popperRef}
            elevation={8}
            sx={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              mb: 1,
              maxHeight: 300,
              overflow: 'auto',
              zIndex: 1400,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                Select an item to add context:
              </Typography>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense>
                {/* Resumes Section */}
                {mentionOptions.resumes.length > 0 && (
                  <>
                    <ListItem>
                      <Typography variant="overline" color="text.secondary">
                        Resumes
                      </Typography>
                    </ListItem>
                    {mentionOptions.resumes.map((resume) => (
                      <ListItemButton
                        key={resume._id}
                        onClick={() => handleSelectMention(resume, 'resume')}
                        sx={{ py: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <DescriptionIcon fontSize="small" color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={resume.name}
                          secondary={`Score: ${resume.analysis?.overallScore || 'N/A'}%`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    ))}
                  </>
                )}

                {/* Jobs Section */}
                {mentionOptions.jobs.length > 0 && (
                  <>
                    <ListItem>
                      <Typography variant="overline" color="text.secondary">
                        Jobs
                      </Typography>
                    </ListItem>
                    {mentionOptions.jobs.map((job) => (
                      <ListItemButton
                        key={job._id}
                        onClick={() => handleSelectMention(job, 'job')}
                        sx={{ py: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <WorkIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={job.title}
                          secondary={job.company}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    ))}
                  </>
                )}

                {/* No Results */}
                {mentionOptions.resumes.length === 0 && mentionOptions.jobs.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No items found"
                      secondary="Try a different search term"
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

// Resume Editing Intelligence Hook (keep existing)
const useResumeEditingIntelligence = (attachedContext, sendMessage) => {
  const [isProcessingResumeEdit, setIsProcessingResumeEdit] = useState(false);
  const [lastResumeAction, setLastResumeAction] = useState(null);

  const detectResumeEditIntent = useCallback((message) => {
    const resumeEditKeywords = [
      'update', 'improve', 'enhance', 'optimize', 'fix', 'add', 'remove', 'change',
      'work experience', 'skills', 'summary', 'education', 'ats', 'keywords',
      'bullet points', 'achievements', 'quantify', 'metrics', 'action verbs',
      'help', 'suggestions', 'advice', 'better'
    ];

    const messageLower = message.toLowerCase();
    return resumeEditKeywords.some(keyword => messageLower.includes(keyword)) &&
           attachedContext.resumes.length > 0; // Check if resume is attached
  }, [attachedContext.resumes.length]);

  const processResumeEdit = useCallback(async (message, attachedResume) => {
    if (!attachedResume || !detectResumeEditIntent(message)) {
      // 🔧 FIXED: Build proper context when not doing resume editing
      const contextData = {
        attachedResumes: attachedContext.resumes.map(resume => ({
          id: resume.id,
          name: resume.name,
          score: resume.score,
          data: resume.data
        })),
        attachedJobs: attachedContext.jobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          data: job.data
        }))
      };
      return sendMessage(message, contextData);
    }

    setIsProcessingResumeEdit(true);
    setLastResumeAction('Analyzing resume editing request...');

    try {
      // 🔧 FIXED: Build proper context for resume editing
      const enhancedMessage = `[RESUME EDITING REQUEST]
Resume: ${attachedResume.name}
Current Score: ${attachedResume.score || 'Unknown'}
Request: ${message}

Please provide specific improvements and apply them to the resume.`;

      const contextData = {
        attachedResumes: [{
          id: attachedResume.id,
          name: attachedResume.name,
          score: attachedResume.score,
          data: attachedResume.data
        }],
        attachedJobs: attachedContext.jobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          data: job.data
        })),
        isResumeEdit: true,
        resumeId: attachedResume.id
      };

      console.log('🎯 Processing resume edit with context:', contextData);

      const response = await sendMessage(enhancedMessage, contextData);

      setLastResumeAction('Applying changes to resume...');
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('resumeUpdated', {
          detail: { 
            resumeId: attachedResume.id, 
            message: '✅ Resume successfully updated!',
            changes: message
          }
        }));
        setLastResumeAction('Resume updated successfully!');
        setTimeout(() => setLastResumeAction(null), 3000);
      }, 2000);

      return response;
    } catch (error) {
      console.error('Resume editing failed:', error);
      setLastResumeAction('❌ Resume editing failed. Please try again.');
      setTimeout(() => setLastResumeAction(null), 3000);
      throw error;
    } finally {
      setIsProcessingResumeEdit(false);
    }
  }, [detectResumeEditIntent, sendMessage, attachedContext]);

  return {
    detectResumeEditIntent,
    processResumeEdit,
    isProcessingResumeEdit,
    lastResumeAction
  };
};

// Context-Aware Suggestions Component (updated)
const ContextualSuggestionsBar = ({ attachedContext, onSuggestionClick }) => {
  const theme = useTheme();
  
  const getContextualSuggestions = () => {
    const hasResume = attachedContext.resumes.length > 0;
    const hasJob = attachedContext.jobs.length > 0;

    if (hasResume && hasJob) {
      return [
        'How well do I match this job?',
        'Tailor my resume for this role',
        'Prepare interview questions',
        'Write a cover letter'
      ];
    }
    
    if (hasResume) {
      return [
        'Improve this resume',
        'Optimize for ATS',
        'Add missing skills',
        'Enhance work experience'
      ];
    }
    
    if (hasJob) {
      return [
        'Analyze this job posting',
        'What skills are required?',
        'Interview preparation tips',
        'Company research insights'
      ];
    }

    return [
      'Help improve my resume',
      'Find job opportunities',
      'Career guidance',
      'Interview preparation'
    ];
  };

  const suggestions = getContextualSuggestions();

  if (!suggestions.length) return null;

  return (
    <Box sx={{ 
      p: 1.5, 
      borderBottom: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.default
    }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Quick Actions:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <Chip
            key={index}
            label={suggestion}
            size="small"
            variant="outlined"
            clickable
            onClick={() => onSuggestionClick(suggestion)}
            sx={{
              fontSize: '0.7rem',
              height: 22,
              '&:hover': {
                bgcolor: theme.palette.primary.light,
                color: 'white'
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// Enhanced Message Component (keep existing logic)
const EnhancedMessage = ({ message, theme, currentUser, onSuggestionClick, hasAttachedContext }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting timestamp:', error);
      return '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1.5
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          fontSize: '0.875rem',
          fontWeight: 600,
          ...(message.type === 'user' ? {
            bgcolor: theme.palette.primary.main,
            color: 'white'
          } : {
            bgcolor: 'transparent',
            p: 0.5
          })
        }}
      >
        {message.type === 'user' ? (
          `${currentUser?.firstName?.[0] || 'U'}${currentUser?.lastName?.[0] || ''}`
        ) : (
          <AutoJobLogo 
            variant="icon-only" 
            size="small"
          />
        )}
      </Avatar>

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Paper
          elevation={message.type === 'user' ? 2 : 1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            ...(message.type === 'user' ? {
              bgcolor: theme.palette.primary.main,
              color: 'white',
              borderBottomRightRadius: 4
            } : {
              bgcolor: message.isError ? theme.palette.error.light :
                       hasAttachedContext ? theme.palette.primary.light + '10' :
                       '#f5f5f5',
              color: message.isError ? theme.palette.error.contrastText :
                     theme.palette.text.primary,
              borderBottomLeftRadius: 4,
              border: hasAttachedContext ? `1px solid ${theme.palette.primary.light}30` : 'none'
            })
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ 
              __html: assistantService.formatResponse(message.content)
            }}
          />
        </Paper>

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {message.suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                size="small"
                variant="outlined"
                clickable
                onClick={() => onSuggestionClick(suggestion)}
                sx={{
                  fontSize: '0.75rem',
                  height: 24,
                  '&:hover': {
                    bgcolor: theme.palette.primary.light,
                    color: 'white'
                  }
                }}
              />
            ))}
          </Box>
        )}

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.disabled,
            fontSize: '0.6875rem',
            textAlign: message.type === 'user' ? 'right' : 'left'
          }}
        >
          {formatTime(message.timestamp)}
        </Typography>
      </Box>
    </Box>
  );
};

// FIXED Conversation List Component with Working Deletion


const ConversationList = ({ 
  conversations, 
  currentConversationId, 
  onSelectConversation, 
  onCreateNew,
  onUpdateConversation,
  onDeleteConversation,
  loading 
}) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // FIXED: Better menu handling with proper conversation tracking
  const handleMenuClick = (event, conversation) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('🔍 Menu clicked for conversation:', {
      id: conversation._id,
      title: conversation.title,
      conversation: conversation
    });
    
    setMenuAnchor(event.currentTarget);
    setSelectedConv(conversation); // Make sure we store the full conversation object
  };

  const handleMenuClose = () => {
    console.log('🔄 Closing menu, selectedConv was:', selectedConv?._id);
    setMenuAnchor(null);
    // Don't clear selectedConv here - keep it for the delete dialog
  };

  const handleDeleteClick = () => {
    console.log('🗑️ Delete clicked for conversation:', {
      selectedConv: selectedConv,
      id: selectedConv?._id,
      title: selectedConv?.title
    });
    
    if (!selectedConv) {
      console.error('❌ No conversation selected when delete clicked');
      return;
    }
    
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteCancel = () => {
    console.log('🚫 Delete cancelled');
    setDeleteDialogOpen(false);
    setSelectedConv(null); // Clear selection when cancelled
  };

  const handleDeleteConfirm = async () => {
    console.log('🗑️ Delete confirm clicked, selectedConv:', {
      selectedConv: selectedConv,
      id: selectedConv?._id,
      title: selectedConv?.title
    });

    if (!selectedConv || !selectedConv._id) {
      console.error('❌ No conversation selected for deletion', { selectedConv });
      alert('Error: No conversation selected for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ Starting deletion process for:', selectedConv._id);
      
      // Call the deleteConversation function from context
      const result = await onDeleteConversation(selectedConv._id);
      
      console.log('✅ Conversation deleted successfully:', result);
      
      // Show success message
      setSuccessMessage(`Conversation "${selectedConv.title || 'Untitled'}" deleted successfully`);
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setSelectedConv(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      
      // Show error to user
      alert(`Failed to delete conversation: ${error.message || 'Unknown error'}`);
      
      // Close dialog but keep selectedConv for retry
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Debug: Log whenever selectedConv changes
  useEffect(() => {
    console.log('🔄 selectedConv changed:', {
      id: selectedConv?._id,
      title: selectedConv?.title,
      hasConversation: !!selectedConv
    });
  }, [selectedConv]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Loading conversations...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Success Message */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreateNew}
          sx={{ mb: 1 }}
        >
          New Conversation
        </Button>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {conversations.map((conversation) => (
          <ListItem key={conversation._id} disablePadding>
            <ListItemButton
              selected={conversation._id === currentConversationId}
              onClick={() => onSelectConversation(conversation._id)}
              sx={{ py: 1.5, px: 2, borderRadius: 1, mx: 1, my: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <ChatIcon fontSize="small" />
              </ListItemIcon>
              
              <ListItemText
                primary={conversation.title || 'Untitled Conversation'}
                secondary={`${conversation.messageCount || 0} messages`}
                primaryTypographyProps={{
                  variant: 'body2',
                  noWrap: true,
                  fontWeight: conversation._id === currentConversationId ? 600 : 400,
                  component: 'span'
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  component: 'span'
                }}
                sx={{
                  '& .MuiListItemText-primary': {
                    display: 'block'
                  },
                  '& .MuiListItemText-secondary': {
                    display: 'block',
                    mt: 0.5
                  }
                }}
              />
              
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, conversation)}
                sx={{ 
                  opacity: 0.7, 
                  '&:hover': { opacity: 1 },
                  ml: 1
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </ListItem>
        ))}
        
        {conversations.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No conversations yet
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Start a new conversation to see your chat history here
            </Typography>
          </Box>
        )}
      </List>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem 
          onClick={handleDeleteClick} 
          sx={{ 
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText'
            }
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        conversationTitle={selectedConv?.title}
        isDeleting={isDeleting}
      />
      

    </Box>
  );
};

// Main AI Assistant Component (UPDATED - REMOVED MEMORY TAB)
const GlobalAiAssistant = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const {
    // State
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    
    // Conversations
    conversations,
    currentConversationId,
    currentConversation,
    conversationsLoading,
    
    // Chat
    messages,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    createNewConversation,
    switchConversation,
    updateConversation,
    deleteConversation,
    handleSuggestionClick,
    
    // Utilities
    setError,
    setMessages,
    setCurrentConversationId,
    setCurrentConversation
  } = useAiAssistant();

  // Local state
  const [showSidebar, setShowSidebar] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [attachedContext, setAttachedContext] = useState({
    resumes: [],
    jobs: []
  });

  // Resume editing intelligence
  const attachedResume = attachedContext.resumes[0] || null;
  const {
    detectResumeEditIntent,
    processResumeEdit,
    isProcessingResumeEdit,
    lastResumeAction
  } = useResumeEditingIntelligence(attachedContext, sendMessage);

  // Refs
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle context attachment
  const handleAttachContext = (item, type) => {
    setAttachedContext(prev => {
      if (type === 'resume') {
        // Replace existing resume (only one at a time for simplicity)
        return {
          ...prev,
          resumes: [{
            id: item._id,
            name: item.name,
            score: item.analysis?.overallScore || 0,
            data: item
          }]
        };
      } else if (type === 'job') {
        // Replace existing job (only one at a time for simplicity)
        return {
          ...prev,
          jobs: [{
            id: item._id,
            title: item.title,
            company: item.company,
            data: item
          }]
        };
      }
      return prev;
    });
  };

  // Handle context removal
  const handleRemoveContext = (id, type) => {
    setAttachedContext(prev => {
      if (type === 'resume') {
        return {
          ...prev,
          resumes: prev.resumes.filter(r => r.id !== id)
        };
      } else if (type === 'job') {
        return {
          ...prev,
          jobs: prev.jobs.filter(j => j.id !== id)
        };
      }
      return prev;
    });
  };

  // Enhanced message sending with context - FIXED
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isProcessingResumeEdit) return;

    const messageText = inputValue.trim();
    setInputValue('');

    try {
      // 🔧 FIXED: Build proper context data for RAG
      const contextData = {
        attachedResumes: attachedContext.resumes.map(resume => ({
          id: resume.id,
          name: resume.name,
          score: resume.score,
          data: resume.data // Include full data if available
        })),
        attachedJobs: attachedContext.jobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          data: job.data // Include full data if available
        })),
        // Additional context
        page: 'assistant', // Current page context
        hasContext: attachedContext.resumes.length > 0 || attachedContext.jobs.length > 0
      };

      console.log('🚀 Sending message with context:', {
        message: messageText.substring(0, 50) + '...',
        hasAttachedResumes: contextData.attachedResumes.length > 0,
        hasAttachedJobs: contextData.attachedJobs.length > 0,
        resumeNames: contextData.attachedResumes.map(r => r.name),
        jobTitles: contextData.attachedJobs.map(j => j.title)
      });

      // Check if this is a resume editing request
      if (attachedResume && detectResumeEditIntent(messageText)) {
        console.log('🎯 Detected resume editing intent with attached context');
        await processResumeEdit(messageText, attachedResume);
      } else {
        // 🔧 FIXED: Pass contextData properly to sendMessage
        await sendMessage(messageText, contextData);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle creating new conversation
  const handleCreateNewConversation = async () => {
    const title = attachedContext.resumes.length > 0 || attachedContext.jobs.length > 0
      ? `Conversation with Context`
      : `New Conversation ${conversations.length + 1}`;
    await createNewConversation(title, 'general');
    setShowSidebar(false);
    // Keep attached context for new conversation
  };

  // Handle conversation selection (continued)
  const handleSelectConversation = (conversationId) => {
    switchConversation(conversationId);
    setShowSidebar(false);
    // Clear attached context when switching conversations
    setAttachedContext({ resumes: [], jobs: [] });
  };

  // Handle conversation deletion with proper error handling
  const handleDeleteConversation = async (conversationId) => {
    try {
      console.log('🗑️ GlobalAiAssistant: Attempting to delete conversation:', conversationId);
      
      // Call the deleteConversation function from the AI Assistant context
      const result = await deleteConversation(conversationId);
      
      console.log('✅ GlobalAiAssistant: Conversation deleted successfully');
      
      // If the deleted conversation was the current one, switch to another or clear
      if (currentConversationId === conversationId) {
        if (conversations.length > 1) {
          // Switch to the first conversation that's not being deleted
          const nextConversation = conversations.find(conv => conv._id !== conversationId);
          if (nextConversation) {
            switchConversation(nextConversation._id);
          } else {
            // No conversations left, clear current conversation
            setCurrentConversationId(null);
            setCurrentConversation(null);
            setMessages([]);
          }
        } else {
          // This was the only conversation, clear everything
          setCurrentConversationId(null);
          setCurrentConversation(null);
          setMessages([]);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ GlobalAiAssistant: Failed to delete conversation:', error);
      throw error; // Re-throw so the ConversationList component can handle the error
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle suggestion clicks
  const handleSuggestionClickInternal = (suggestion) => {
    setInputValue(suggestion);
  };

  // Enhanced close handler
  const handleClose = useCallback(() => {
    setInputValue('');
    setShowSidebar(false);
    setError(null);
    setIsOpen(false);
    // Keep attached context when closing (user might reopen)
    console.log('🔄 AI Assistant closed - conversation and context preserved');
  }, [setIsOpen, setError]);

  // Check if we have attached context
  const hasAttachedContext = attachedContext.resumes.length > 0 || attachedContext.jobs.length > 0;

  // Don't render if not open
  if (!isOpen) {
    return (
      <Tooltip title="Ask AJ - Your AI Job Assistant" placement="left">
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            cursor: 'pointer'
          }}
          onClick={() => setIsOpen(true)}
        >
          <Paper
            elevation={8}
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: hasAttachedContext 
                ? `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              color: 'white',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px) scale(1.05)',
                boxShadow: hasAttachedContext 
                  ? '0 12px 24px rgba(0, 188, 180, 0.3)'
                  : '0 12px 24px rgba(26, 115, 232, 0.3)'
              }
            }}
          >
            <AutoJobLogo 
              variant="icon-only" 
              size="small" 
              color="white"
            />
          </Paper>
        </Box>
      </Tooltip>
    );
  }

  return (
    <>
      <Fade in={isOpen}>
        <Paper
          elevation={16}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: isMinimized ? 400 : 500,
            height: isMinimized ? 60 : 700,
            zIndex: 1300,
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: hasAttachedContext 
              ? `2px solid ${theme.palette.secondary.main}30`
              : `1px solid ${theme.palette.divider}`
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: hasAttachedContext
                ? `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: isMinimized ? 60 : 'auto',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              flex: 1,
              minWidth: 0
            }}>
              <AutoJobLogo 
                variant="icon-only" 
                size="small" 
                color="white"
              />
              <Box sx={{ 
                minWidth: 0,
                flex: 1 
              }}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight={600}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: isMinimized ? '0.9rem' : '1rem',
                    lineHeight: 1.2
                  }}
                >
                  AJ - Your AI Job Assistant {hasAttachedContext && '• Context Mode'}
                </Typography>
                {!isMinimized && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}
                  >
                    {currentConversation?.title || 'AI Career Assistant'}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              flexShrink: 0
            }}>
              <IconButton
                size="small"
                onClick={() => setShowSidebar(!showSidebar)}
                sx={{ 
                  color: 'white',
                  display: isMinimized ? 'none' : 'flex'
                }}
              >
                <HistoryIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setIsMinimized(!isMinimized)}
                sx={{ color: 'white' }}
              >
                {isMinimized ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </IconButton>
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Context Status Display */}
          {!isMinimized && hasAttachedContext && (
            <Box sx={{ px: 2, py: 1, bgcolor: theme.palette.info.light + '20' }}>
              <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon fontSize="small" />
                Context Active: {attachedContext.resumes.length > 0 && `${attachedContext.resumes[0].name}`}
                {attachedContext.resumes.length > 0 && attachedContext.jobs.length > 0 && ' + '}
                {attachedContext.jobs.length > 0 && `${attachedContext.jobs[0].title}`}
              </Typography>
            </Box>
          )}

          {/* Resume Processing Indicator */}
          {!isMinimized && (isProcessingResumeEdit || lastResumeAction) && (
            <Box sx={{ px: 2, py: 1, bgcolor: theme.palette.info.light + '20' }}>
              {isProcessingResumeEdit && (
                <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
              )}
              <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoFixHighIcon fontSize="small" />
                {lastResumeAction || 'Processing resume changes...'}
              </Typography>
            </Box>
          )}

          {/* Main Content - Hidden when minimized */}
          {!isMinimized && (
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Sidebar */}
              {showSidebar && (
                <Box
                  sx={{
                    width: 280,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <ConversationList
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onSelectConversation={handleSelectConversation}
                    onCreateNew={handleCreateNewConversation}
                    onUpdateConversation={updateConversation}
                    onDeleteConversation={handleDeleteConversation}
                    loading={conversationsLoading}
                  />
                </Box>
              )}

              {/* Chat Area */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* SIMPLIFIED HEADER - Only Chat (no tabs) */}
                <Box sx={{ 
                  p: 1.5, 
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChatIcon color="primary" />
                    <Typography variant="h6" sx={{ flex: 1 }}>
                      Chat with AJ
                    </Typography>
                    {hasAttachedContext && (
                      <Chip 
                        label="Context Active" 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>

                {/* Contextual Suggestions Bar */}
                <ContextualSuggestionsBar 
                  attachedContext={attachedContext}
                  onSuggestionClick={handleSuggestionClickInternal}
                />

                {/* Messages */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  {messages.map((message) => (
                    <EnhancedMessage
                      key={message.id}
                      message={message}
                      theme={theme}
                      currentUser={currentUser}
                      onSuggestionClick={handleSuggestionClickInternal}
                      hasAttachedContext={hasAttachedContext}
                    />
                  ))}

                  {/* Loading indicator */}
                  {(isLoading || isProcessingResumeEdit) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', p: 0.5 }}>
                        <AutoJobLogo variant="icon-only" size="small" />
                      </Avatar>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isProcessingResumeEdit ? theme.palette.secondary.light + '20' : '#f5f5f5',
                          borderBottomLeftRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          border: isProcessingResumeEdit ? `1px solid ${theme.palette.secondary.light}50` : 'none'
                        }}
                      >
                        <CircularProgress size={16} color={isProcessingResumeEdit ? 'secondary' : 'primary'} />
                        <Typography variant="body2" color="text.secondary">
                          {isProcessingResumeEdit ? 'AJ is updating your resume...' : 'AJ is thinking...'}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {/* Error message */}
                  {error && (
                    <Alert 
                      severity="error" 
                      onClose={() => setError(null)}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {error}
                    </Alert>
                  )}

                  <div ref={messagesEndRef} />
                </Box>

                <Divider />

                {/* Enhanced Input with @-mention RAG */}
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: 1 }}>
                      <MentionInput
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSendMessage={handleSendMessage}
                        disabled={isLoading || isProcessingResumeEdit}
                        currentContext={null}
                        attachedContext={attachedContext}
                        onAttachContext={handleAttachContext}
                        onRemoveContext={handleRemoveContext}
                      />
                    </Box>
                    <IconButton
                      color={hasAttachedContext ? 'secondary' : 'primary'}
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading || isProcessingResumeEdit}
                      sx={{
                        bgcolor: hasAttachedContext ? theme.palette.secondary.main : theme.palette.primary.main,
                        color: 'white',
                        '&:hover': {
                          bgcolor: hasAttachedContext ? theme.palette.secondary.dark : theme.palette.primary.dark
                        },
                        '&:disabled': {
                          bgcolor: theme.palette.action.disabled
                        }
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {/* Context Hint */}
                  {hasAttachedContext ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      💡 AJ now has full context of your {attachedContext.resumes.length > 0 ? 'resume' : ''}{attachedContext.resumes.length > 0 && attachedContext.jobs.length > 0 ? ' and ' : ''}{attachedContext.jobs.length > 0 ? 'job posting' : ''}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      💡 Type @ to reference specific resumes or jobs for contextual help
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Fade>
    </>
  );
};

export default GlobalAiAssistant;