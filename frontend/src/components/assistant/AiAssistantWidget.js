// src/components/assistant/AiAssistantWidget.js - UPDATED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  Divider,
  Slide,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  SmartToy as RobotIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon,
  Description as ResumeIcon,
  Edit as EditIcon,
  AutoFixHigh as SuggestionIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
// import assistantService from '../../utils/assistantService'; // Comment out for now

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AiAssistantWidget = ({ 
  resumeId = null, 
  resumeData = null, 
  onResumeUpdate = null,
  position = { bottom: 24, right: 24 },
  // NEW: Accept external open control
  externalOpen = null,
  onExternalClose = null,
  showFab = true // NEW: Control whether to show the floating button
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  // Use external open state if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== null ? externalOpen : internalOpen;
  
  const [fullscreen, setFullscreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chat session
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      console.log('🤖 Initializing AI Assistant session...');
      
      // For now, just add a welcome message without backend call
      const welcomeMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `Hi! I'm AJ, your AI career assistant. I'm here to help you optimize your resume and discuss your career goals. ${resumeData ? `I can see you're working on your resume.` : ''} How can I help you today?`,
        timestamp: new Date(),
        suggestions: [
          'Analyze my resume strengths',
          'Suggest improvements', 
          'Help with job descriptions',
          'Review my experience section'
        ]
      };
      
      setMessages([welcomeMessage]);
      setSessionId('test-session-' + Date.now()); // Temporary session ID
      
      console.log('✅ AI Assistant session initialized (test mode)');
    } catch (error) {
      console.error('❌ Failed to initialize assistant session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user', 
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setAssistantTyping(true);

    try {
      // Simulate AI response for testing
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `Thanks for your message: "${currentMessage}". This is a test response! In the full version, I'll analyze your resume and provide specific suggestions based on your content.`,
          timestamp: new Date(),
          suggestions: ['Tell me more', 'Analyze my experience', 'Help with skills section']
        };

        setMessages(prev => [...prev, aiResponse]);
        setLoading(false);
        setAssistantTyping(false);
      }, 1500);

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'I apologize, but I encountered an error. This is test mode - the full AI backend is not yet connected.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
      setAssistantTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpen = () => {
    console.log('🤖 Opening AI Assistant...');
    if (externalOpen !== null) {
      // If externally controlled, don't set internal state
      return;
    }
    setInternalOpen(true);
  };

  const handleClose = () => {
    console.log('🤖 Closing AI Assistant...');
    setFullscreen(false);
    
    if (onExternalClose) {
      onExternalClose();
    } else {
      setInternalOpen(false);
    }
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.type === 'user';
    const isError = message.isError;

    return (
      <ListItem 
        sx={{ 
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          pb: 2
        }}
      >
        <ListItemAvatar sx={{ 
          minWidth: 'auto', 
          ml: isUser ? 1 : 0, 
          mr: isUser ? 0 : 1 
        }}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
              fontSize: '0.875rem'
            }}
          >
            {isUser ? currentUser?.firstName?.[0] || 'U' : <RobotIcon fontSize="small" />}
          </Avatar>
        </ListItemAvatar>
        
        <Box sx={{ 
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start'
        }}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isError 
                ? alpha(theme.palette.error.main, 0.1)
                : isUser 
                  ? theme.palette.primary.main 
                  : theme.palette.background.paper,
              color: isUser ? 'white' : 'inherit',
              borderRadius: 2,
              border: isError ? `1px solid ${theme.palette.error.main}` : 'none'
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          </Paper>

          {/* Suggestions */}
          {message.suggestions && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {message.suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }
                  }}
                />
              ))}
            </Box>
          )}

          {/* Resume Edit Actions */}
          {message.resumeEdits && (
            <Box sx={{ mt: 1 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 1.5, 
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EditIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                  <Typography variant="body2" fontWeight={500}>
                    Resume Updates Available
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => onResumeUpdate && onResumeUpdate(message.resumeEdits)}
                  startIcon={<SuggestionIcon />}
                >
                  Apply Changes
                </Button>
              </Paper>
            </Box>
          )}

          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ mt: 0.5 }}
          >
            {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Box>
      </ListItem>
    );
  };

  const ChatInterface = () => (
    <Box sx={{ 
      height: fullscreen ? '100vh' : 500,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: alpha(theme.palette.primary.main, 0.05)
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ 
            width: 40, 
            height: 40, 
            bgcolor: theme.palette.secondary.main, 
            mr: 2 
          }}>
            <RobotIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              AJ Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {resumeData ? `Working on your resume` : 'Ready to help with your resume'}
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton onClick={toggleFullscreen}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        bgcolor: alpha(theme.palette.background.default, 0.3)
      }}>
        <List sx={{ p: 1 }}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {/* Typing indicator */}
          {assistantTyping && (
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: theme.palette.secondary.main 
                }}>
                  <RobotIcon fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  AJ is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
          
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input */}
      <Box sx={{ 
        p: 2, 
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask AJ about your resume, career goals, or get editing suggestions..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || loading}
            color="primary"
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              },
              '&:disabled': {
                bgcolor: theme.palette.action.disabled
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          </IconButton>
        </Box>
        
        {resumeData && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <ResumeIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Context: Resume with {resumeData.experience?.length || 0} jobs
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Floating Action Button - Only show if not externally controlled */}
      {showFab && externalOpen === null && (
        <Tooltip title="Chat with AJ - Your AI Career Assistant">
          <Fab
            color="secondary"
            onClick={handleOpen}
            sx={{
              position: 'fixed',
              bottom: position.bottom,
              right: position.right,
              zIndex: 1000,
              background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
              boxShadow: '0 8px 24px rgba(0, 196, 180, 0.3)',
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 30%, ${theme.palette.secondary.main} 90%)`,
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <RobotIcon sx={{ fontSize: 28 }} />
          </Fab>
        </Tooltip>
      )}

      {/* Chat Dialog */}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        TransitionComponent={Transition}
        maxWidth={fullscreen ? false : 'sm'}
        fullWidth
        fullScreen={fullscreen}
        PaperProps={{
          sx: {
            borderRadius: fullscreen ? 0 : 2,
            overflow: 'hidden'
          }
        }}
      >
        <ChatInterface />
      </Dialog>
    </>
  );
};

export default AiAssistantWidget;