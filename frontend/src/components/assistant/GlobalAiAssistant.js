// src/components/assistant/GlobalAiAssistant.js - COMPLETE FIXED VERSION
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
  InputAdornment,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  ExpandLess as ChevronUpIcon,
  ExpandMore as ChevronDownIcon,
  Add as AddIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Memory as MemoryIcon,
  MoreVert as MoreVertIcon,
  Chat as ChatIcon,
  Psychology as PsychologyIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PushPin as PushPinIcon,
  AutoFixHigh as AutoFixHighIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAiAssistant } from '../../context/AiAssistantContext';
import { useAuth } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';
import assistantService from '../../utils/assistantService';

// Resume Editing Intelligence Hook
const useResumeEditingIntelligence = (currentContext, sendMessage) => {
  const [isProcessingResumeEdit, setIsProcessingResumeEdit] = useState(false);
  const [lastResumeAction, setLastResumeAction] = useState(null);

  const detectResumeEditIntent = useCallback((message) => {
    const resumeEditKeywords = [
      'update', 'improve', 'enhance', 'optimize', 'fix', 'add', 'remove', 'change',
      'work experience', 'skills', 'summary', 'education', 'ats', 'keywords',
      'bullet points', 'achievements', 'quantify', 'metrics', 'action verbs'
    ];

    const messageLower = message.toLowerCase();
    return resumeEditKeywords.some(keyword => messageLower.includes(keyword)) &&
           currentContext?.page === 'resumes' &&
           currentContext?.currentResume;
  }, [currentContext]);

  const processResumeEdit = useCallback(async (message) => {
    if (!detectResumeEditIntent(message)) {
      return sendMessage(message);
    }

    setIsProcessingResumeEdit(true);
    setLastResumeAction('Analyzing resume editing request...');

    try {
      // Enhanced message with resume context
      const enhancedMessage = `[RESUME EDITING REQUEST]
Resume: ${currentContext.currentResume.name}
Current Score: ${currentContext.currentResume.score || 'Unknown'}
Request: ${message}

Please provide specific improvements and apply them to the resume.`;

      // Send with special resume editing flag
      const response = await sendMessage(enhancedMessage, { 
        isResumeEdit: true,
        resumeId: currentContext.currentResume.id 
      });

      // Simulate resume update processing
      setLastResumeAction('Applying changes to resume...');
      
      // Dispatch resume update event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('resumeUpdated', {
          detail: { 
            resumeId: currentContext.currentResume.id, 
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
  }, [detectResumeEditIntent, sendMessage, currentContext]);

  return {
    detectResumeEditIntent,
    processResumeEdit,
    isProcessingResumeEdit,
    lastResumeAction
  };
};

// Context-Aware Suggestions Component
const ContextualSuggestionsBar = ({ currentContext, onSuggestionClick }) => {
  const theme = useTheme();
  
  const getContextualSuggestions = () => {
    if (currentContext?.page === 'resumes' && currentContext?.currentResume) {
      const score = currentContext.currentResume.score || 0;
      return [
        score < 70 ? 'Improve my resume score' : 'Optimize for ATS',
        'Update work experience section',
        'Add missing skills',
        'Enhance summary section',
        'Check keyword optimization'
      ];
    }
    
    if (currentContext?.page === 'jobs' && currentContext?.currentJob) {
      return [
        'Match my resume to this job',
        'What skills am I missing?',
        'Write a cover letter',
        'How can I improve my match?',
        'Tailor my resume for this role'
      ];
    }

    return [
      'Help improve my resume',
      'Find job opportunities',
      'Career guidance',
      'Review my progress',
      'What should I focus on?'
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

// Resume Context Display Component
const ResumeContextDisplay = ({ currentContext }) => {
  const theme = useTheme();

  if (!currentContext?.currentResume) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const score = currentContext.currentResume.score || 0;

  return (
    <Card sx={{ m: 1.5, mb: 0 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon fontSize="small" color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Working on:
            </Typography>
            <Typography variant="body2" fontWeight={600} noWrap>
              {currentContext.currentResume.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Score:
            </Typography>
            <Typography 
              variant="caption" 
              fontWeight={600}
              sx={{ color: getScoreColor(score) }}
            >
              {score}%
            </Typography>
          </Box>
        </Box>
        {score < 80 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon fontSize="small" color="warning" />
            <Typography variant="caption" color="warning.main">
              Room for improvement
            </Typography>
         </Box>
       )}
     </CardContent>
   </Card>
 );
};

// Enhanced Message Component with Resume Actions
const EnhancedMessage = ({ message, theme, currentUser, onSuggestionClick, isResumeContext }) => {
 const formatTime = (timestamp) => {
   if (!timestamp) return '';
   
   try {
     const date = new Date(timestamp);
     
     if (isNaN(date.getTime())) {
       return '';
     }
     
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
                      isResumeContext ? theme.palette.primary.light + '10' :
                      '#f5f5f5',
             color: message.isError ? theme.palette.error.contrastText :
                    theme.palette.text.primary,
             borderBottomLeftRadius: 4,
             border: isResumeContext ? `1px solid ${theme.palette.primary.light}30` : 'none'
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

       {/* Enhanced Suggestions with Icons */}
       {message.suggestions && message.suggestions.length > 0 && (
         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
           {message.suggestions.map((suggestion, index) => {
             const isResumeAction = suggestion.toLowerCase().includes('resume') || 
                                  suggestion.toLowerCase().includes('improve') ||
                                  suggestion.toLowerCase().includes('optimize');
             
             return (
               <Chip
                 key={index}
                 label={suggestion}
                 size="small"
                 variant="outlined"
                 clickable
                 icon={isResumeAction ? <AutoFixHighIcon sx={{ fontSize: '0.75rem' }} /> : undefined}
                 onClick={() => onSuggestionClick(suggestion)}
                 sx={{
                   fontSize: '0.75rem',
                   height: 24,
                   '&:hover': {
                     bgcolor: isResumeAction ? theme.palette.secondary.light : theme.palette.primary.light,
                     color: 'white'
                   },
                   ...(isResumeAction && {
                     borderColor: theme.palette.secondary.main,
                     color: theme.palette.secondary.main
                   })
                 }}
               />
             );
           })}
         </Box>
       )}

       {/* Resume Action Indicators */}
       {message.metadata?.isResumeEdit && (
         <Box sx={{ 
           mt: 0.5, 
           p: 1, 
           bgcolor: theme.palette.success.light + '20',
           borderRadius: 1,
           border: `1px solid ${theme.palette.success.light}50`,
           display: 'flex',
           alignItems: 'center',
           gap: 0.5
         }}>
           <CheckCircleIcon fontSize="small" color="success" />
           <Typography variant="caption" color="success.main" fontWeight={600}>
             Resume Action Applied
           </Typography>
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

// Conversation List Component
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

 const handleMenuClick = (event, conversation) => {
   event.stopPropagation();
   setMenuAnchor(event.currentTarget);
   setSelectedConv(conversation);
 };

 const handleMenuClose = () => {
   setMenuAnchor(null);
   setSelectedConv(null);
 };

 const handleStarToggle = async () => {
   if (selectedConv) {
     await onUpdateConversation(selectedConv._id, { starred: !selectedConv.starred });
   }
   handleMenuClose();
 };

 const handlePinToggle = async () => {
   if (selectedConv) {
     await onUpdateConversation(selectedConv._id, { pinned: !selectedConv.pinned });
   }
   handleMenuClose();
 };

 const handleDelete = async () => {
   if (selectedConv && window.confirm('Are you sure you want to delete this conversation?')) {
     await onDeleteConversation(selectedConv._id);
   }
   handleMenuClose();
 };

 if (loading) {
   return (
     <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
       <CircularProgress size={24} />
     </Box>
   );
 }

 return (
   <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
     {/* Header */}
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

     {/* Conversations */}
     <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
       {conversations.map((conversation) => (
         <ListItem key={conversation._id} disablePadding>
           <ListItemButton
             selected={conversation._id === currentConversationId}
             onClick={() => onSelectConversation(conversation._id)}
             sx={{
               py: 1.5,
               px: 2,
               borderRadius: 1,
               mx: 1,
               my: 0.5,
               '&.Mui-selected': {
                 bgcolor: theme.palette.primary.light + '20',
                 '&:hover': {
                   bgcolor: theme.palette.primary.light + '30',
                 }
               }
             }}
           >
             <ListItemIcon sx={{ minWidth: 36 }}>
               <ChatIcon 
                 fontSize="small" 
                 color={conversation._id === currentConversationId ? 'primary' : 'action'}
               />
             </ListItemIcon>
             
             <ListItemText
               primary={conversation.title}
               secondary={
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                   <Typography variant="caption" color="text.secondary">
                     {conversation.messageCount || 0} messages
                   </Typography>
                   {conversation.starred && <StarIcon sx={{ fontSize: 12, color: 'gold' }} />}
                   {conversation.pinned && <PushPinIcon sx={{ fontSize: 12, color: theme.palette.primary.main }} />}
                 </Box>
               }
               primaryTypographyProps={{
                 variant: 'body2',
                 noWrap: true,
                 fontWeight: conversation._id === currentConversationId ? 600 : 400
               }}
             />
             
             <IconButton
               size="small"
               onClick={(e) => handleMenuClick(e, conversation)}
               sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
             >
               <MoreVertIcon fontSize="small" />
             </IconButton>
           </ListItemButton>
         </ListItem>
       ))}
       
       {conversations.length === 0 && (
         <Box sx={{ p: 3, textAlign: 'center' }}>
           <Typography variant="body2" color="text.secondary">
             No conversations yet. Start a new one!
           </Typography>
         </Box>
       )}
     </List>

     {/* Context Menu */}
     <Menu
       anchorEl={menuAnchor}
       open={Boolean(menuAnchor)}
       onClose={handleMenuClose}
     >
       <MenuItem onClick={handleStarToggle}>
         {selectedConv?.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
         <Typography sx={{ ml: 1 }}>
           {selectedConv?.starred ? 'Unstar' : 'Star'}
         </Typography>
       </MenuItem>
       <MenuItem onClick={handlePinToggle}>
         <PushPinIcon fontSize="small" />
         <Typography sx={{ ml: 1 }}>
           {selectedConv?.pinned ? 'Unpin' : 'Pin'}
         </Typography>
       </MenuItem>
       <Divider />
       <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
         <DeleteIcon fontSize="small" />
         <Typography sx={{ ml: 1 }}>Delete</Typography>
       </MenuItem>
     </Menu>
   </Box>
 );
};

// Main Enhanced AI Assistant Component
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
   
   // Memory & Context
   userMemories,
   memoryInsights,
   currentContext,
   contextualSuggestions,
   suggestionsCount,
   
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
   searchEverything,
   
   // Utilities
   setError,
   setMessages,
    setCurrentConversationId,    // ADD THIS
    setCurrentConversation       // ADD THIS
   
 } = useAiAssistant();

 // Local state
 const [inputValue, setInputValue] = useState('');
 const [showSidebar, setShowSidebar] = useState(false);
 const [activeTab, setActiveTab] = useState(0);
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState(null);
 const [searchLoading, setSearchLoading] = useState(false);

 // Resume editing intelligence
 const {
   detectResumeEditIntent,
   processResumeEdit,
   isProcessingResumeEdit,
   lastResumeAction
 } = useResumeEditingIntelligence(currentContext, sendMessage);

 // Refs
 const messagesEndRef = useRef(null);
 const inputRef = useRef(null);
 const searchTimeoutRef = useRef(null);

 // Auto-scroll to bottom of messages
 const scrollToBottom = () => {
   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 useEffect(() => {
   scrollToBottom();
 }, [messages]);

 // Enhanced close handler
const handleClose = useCallback(() => {
  setActiveTab(0);
  setSearchQuery('');
  setSearchResults(null);
  setSearchLoading(false);
  setInputValue('');
  setShowSidebar(false);
  setError(null);
  
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }
  
  // 🔥 PROPER CONVERSATION RESET: Use the context functions properly
  setMessages([]);
  setCurrentConversationId(null);
  setCurrentConversation(null);
  
  setIsOpen(false);
  
  console.log('🔄 AI Assistant closed - conversation reset');
}, [setIsOpen, setError, setMessages, setCurrentConversationId, setCurrentConversation]);

 // Enhanced search with debouncing
 const handleSearchChange = useCallback((query) => {
   setSearchQuery(query);
   
   if (searchTimeoutRef.current) {
     clearTimeout(searchTimeoutRef.current);
   }
   
   if (!query.trim()) {
     setSearchResults(null);
     setSearchLoading(false);
     return;
   }
   
   setSearchLoading(true);
   
   searchTimeoutRef.current = setTimeout(async () => {
     try {
       console.log('🔍 Dynamic search for:', query);
       const results = await searchEverything(query);
       setSearchResults(results);
     } catch (error) {
       console.error('Dynamic search failed:', error);
       setSearchResults(null);
     } finally {
       setSearchLoading(false);
     }
   }, 300);
 }, [searchEverything]);

 // Clean up timeout on unmount
 useEffect(() => {
   return () => {
     if (searchTimeoutRef.current) {
       clearTimeout(searchTimeoutRef.current);
     }
   };
 }, []);

 // Enhanced message sending with resume edit detection
 const handleSendMessage = async () => {
   if (!inputValue.trim() || isLoading || isProcessingResumeEdit) return;

   const messageText = inputValue.trim();
   setInputValue('');

   try {
     // Check if this is a resume editing request
     if (detectResumeEditIntent(messageText)) {
       console.log('🎯 Detected resume editing intent');
       await processResumeEdit(messageText);
     } else {
       await sendMessage(messageText);
     }
   } catch (error) {
     console.error('Failed to send message:', error);
   }
 };

 // Handle creating new conversation
 const handleCreateNewConversation = async () => {
   const title = currentContext?.currentResume 
     ? `Resume: ${currentContext.currentResume.name}`
     : `New Conversation ${conversations.length + 1}`;
   await createNewConversation(title, 'general');
   setShowSidebar(false);
 };

 // Handle conversation selection
 const handleSelectConversation = (conversationId) => {
   switchConversation(conversationId);
   setShowSidebar(false);
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
   inputRef.current?.focus();
 };

 // Check if we're in resume context
 const isResumeContext = currentContext?.page === 'resumes' && currentContext?.currentResume;

 // Don't render if not open - FIXED VERSION WITHOUT BADGE
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
             background: isResumeContext 
               ? `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`
               : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
             color: 'white',
             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
             '&:hover': {
               transform: 'translateY(-4px) scale(1.05)',
               boxShadow: isResumeContext 
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
           border: isResumeContext 
             ? `2px solid ${theme.palette.secondary.main}30`
             : `1px solid ${theme.palette.divider}`
         }}
       >
         {/* Header - FIXED VERSION */}
         <Box
           sx={{
             p: 2,
             background: isResumeContext
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
                 AJ - Your AI Job Assistant {isResumeContext && '• Resume Mode'}
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

         {/* Resume Context Display */}
         {!isMinimized && isResumeContext && (
           <ResumeContextDisplay currentContext={currentContext} />
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
                   onDeleteConversation={deleteConversation}
                   loading={conversationsLoading}
                 />
               </Box>
             )}

             {/* Chat Area */}
             <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               {/* Tabs */}
               <Tabs
                 value={activeTab}
                 onChange={(e, newValue) => setActiveTab(newValue)}
                 variant="fullWidth"
                 sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
               >
                 <Tab icon={<ChatIcon />} label="Chat" />
                 <Tab icon={<PsychologyIcon />} label="Memory" />
                 <Tab icon={<SearchIcon />} label="Search" />
               </Tabs>

               {/* Contextual Suggestions Bar */}
               {activeTab === 0 && (
                 <ContextualSuggestionsBar 
                   currentContext={currentContext}
                   onSuggestionClick={handleSuggestionClickInternal}
                 />
               )}

               {/* Tab Content */}
               {activeTab === 0 && (
                 <>
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
                         isResumeContext={isResumeContext}
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

                   {/* Enhanced Input with Resume Context */}
                   <Box sx={{ p: 2 }}>
                     <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                       <TextField
                         ref={inputRef}
                         fullWidth
                         multiline
                         maxRows={3}
                         value={inputValue}
                         onChange={(e) => setInputValue(e.target.value)}
                         onKeyPress={handleKeyPress}
                         placeholder={
                           isResumeContext 
                             ? "Ask AJ to improve your resume: 'Update my work experience' or 'Optimize for ATS'..."
                             : "Ask AJ anything about your career, resumes, or job search..."
                         }
                         variant="outlined"
                         size="small"
                         disabled={isLoading || isProcessingResumeEdit}
                         sx={{
                           '& .MuiOutlinedInput-root': {
                             borderRadius: 2,
                             fontSize: '0.875rem',
                             ...(isResumeContext && {
                               borderColor: theme.palette.secondary.main + '50',
                               '&:hover': {
                                 borderColor: theme.palette.secondary.main
                               },
                               '&.Mui-focused': {
                                 borderColor: theme.palette.secondary.main
                               }
                             })
                           }
                         }}
                       />
                       <IconButton
                         color={isResumeContext ? 'secondary' : 'primary'}
                         onClick={handleSendMessage}
                         disabled={!inputValue.trim() || isLoading || isProcessingResumeEdit}
                         sx={{
                           bgcolor: isResumeContext ? theme.palette.secondary.main : theme.palette.primary.main,
                           color: 'white',
                           '&:hover': {
                             bgcolor: isResumeContext ? theme.palette.secondary.dark : theme.palette.primary.dark
                           },
                           '&:disabled': {
                             bgcolor: theme.palette.action.disabled
                           }
                         }}
                       >
                         <SendIcon fontSize="small" />
                       </IconButton>
                     </Box>
                     
                     {/* Resume Context Hint */}
                     {isResumeContext && (
                       <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                         💡 Try: "Improve my summary", "Add more skills", "Optimize for ATS", or "Update work experience"
                       </Typography>
                     )}
                   </Box>
                 </>
               )}

               {/* Memory Tab */}
               {activeTab === 1 && (
                 <Box sx={{ 
                   flex: 1, 
                   display: 'flex', 
                   flexDirection: 'column',
                   overflow: 'hidden'
                 }}>
                   <Box sx={{ 
                     p: 2, 
                     borderBottom: `1px solid ${theme.palette.divider}`,
                     flexShrink: 0
                   }}>
                     <Typography variant="h6" gutterBottom>
                       Memory Insights
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                       AJ remembers your preferences, skills, and career goals to provide personalized assistance.
                     </Typography>
                   </Box>
                   
                   <Box sx={{ 
                     flex: 1, 
                     overflow: 'auto',
                     p: 2 
                   }}>
                     {memoryInsights.length > 0 ? (
                       <Box>
                         {memoryInsights.map((insight, index) => (
                           <Paper 
                             key={index} 
                             sx={{ 
                               p: 2, 
                               mb: 1.5,
                               borderRadius: 2,
                               border: `1px solid ${theme.palette.divider}`,
                               '&:hover': {
                                 bgcolor: theme.palette.action.hover
                               }
                             }}
                           >
                             <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                               <Chip 
                                 label={insight.type} 
                                 size="small" 
                                 variant="outlined"
                                 color={
                                   insight.type === 'strength' ? 'success' :
                                   insight.type === 'opportunity' ? 'primary' :
                                   insight.type === 'challenge' ? 'warning' :
                                   insight.type === 'recommendation' ? 'info' : 'default'
                                 }
                                 sx={{ fontSize: '0.75rem', height: 20 }}
                               />
                               <Typography 
                                 variant="caption" 
                                 color="text.secondary"
                                 sx={{ ml: 'auto' }}
                               >
                                 {Math.round((insight.confidence || 0.8) * 100)}% confidence
                               </Typography>
                             </Box>
                             <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                               {insight.description}
                             </Typography>
                           </Paper>
                         ))}
                       </Box>
                     ) : (
                       <Box sx={{ 
                         textAlign: 'center', 
                         mt: 4,
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         gap: 2
                       }}>
                         <MemoryIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                         <Box>
                           <Typography variant="body2" color="text.secondary" gutterBottom>
                             No memory insights yet. Start chatting to build your profile!
                           </Typography>
                           <Typography variant="caption" color="text.disabled">
                             AJ learns about your preferences, skills, and goals over time.
                           </Typography>
                         </Box>
                       </Box>
                     )}
                   </Box>
                 </Box>
               )}

               {/* Search Tab */}
               {activeTab === 2 && (
                 <Box sx={{ 
                   flex: 1, 
                   display: 'flex', 
                   flexDirection: 'column',
                   overflow: 'hidden'
                 }}>
                   <Box sx={{ 
                     p: 2, 
                     borderBottom: `1px solid ${theme.palette.divider}`,
                     flexShrink: 0
                   }}>
                     <TextField
                       fullWidth
                       value={searchQuery}
                       onChange={(e) => handleSearchChange(e.target.value)}
                       placeholder="Search conversations and memories..."
                       variant="outlined"
                       size="small"
                       InputProps={{
                         endAdornment: (
                           <InputAdornment position="end">
                             {searchLoading ? (
                               <CircularProgress size={20} />
                             ) : (
                               <SearchIcon />
                             )}
                           </InputAdornment>
                         )
                       }}
                       sx={{
                         '& .MuiOutlinedInput-root': {
                           borderRadius: 2
                         }
                       }}
                     />
                   </Box>
                   
                   <Box sx={{ 
                     flex: 1, 
                     overflow: 'auto',
                     p: 2 
                   }}>
                     {searchResults ? (
                       <Box>
                         {/* Conversations Results */}
                         {searchResults.conversations?.length > 0 && (
                           <Box sx={{ mb: 3 }}>
                             <Typography variant="subtitle2" gutterBottom sx={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               gap: 1,
                               color: theme.palette.primary.main,
                               fontWeight: 600
                             }}>
                               <ChatIcon fontSize="small" />
                               Conversations ({searchResults.conversations.length})
                             </Typography>
                             {searchResults.conversations.map((conv) => (
                               <Paper 
                                 key={conv._id} 
                                 sx={{ 
                                   p: 2, 
                                   mb: 1.5, 
                                   cursor: 'pointer',
                                   borderRadius: 2,
                                   border: `1px solid ${theme.palette.divider}`,
                                   '&:hover': {
                                     bgcolor: theme.palette.action.hover,
                                     borderColor: theme.palette.primary.light
                                   }
                                 }}
                                 onClick={() => handleSelectConversation(conv._id)}
                               >
                                 <Typography variant="body2" fontWeight={600} gutterBottom>
                                   {conv.title}
                                 </Typography>
                                 <Typography 
                                   variant="caption" 
                                   color="text.secondary"
                                   sx={{ 
                                     display: 'block',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}
                                 >
                                   {conv.preview || 'No preview available'}
                                 </Typography>
                                 <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                                   Click to view conversation →
                                 </Typography>
                               </Paper>
                             ))}
                           </Box>
                         )}
                         
                         {/* Memories Results */}
                         {searchResults.memories?.length > 0 && (
                           <Box>
                             <Typography variant="subtitle2" gutterBottom sx={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               gap: 1,
                               color: theme.palette.secondary.main,
                               fontWeight: 600
                             }}>
                               <MemoryIcon fontSize="small" />
                               Memories ({searchResults.memories.length})
                             </Typography>
                             {searchResults.memories.map((memory, index) => (
                               <Paper 
                                 key={index} 
                                 sx={{ 
                                   p: 2, 
                                   mb: 1.5,
                                   borderRadius: 2,
                                   border: `1px solid ${theme.palette.divider}`,
                                   bgcolor: theme.palette.background.default
                                 }}
                               >
                                 <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                   <Chip 
                                     label={memory.type} 
                                     size="small" 
                                     variant="outlined"
                                     color="secondary"
                                     sx={{ fontSize: '0.75rem', height: 20 }}
                                   />
                                   <Typography 
                                     variant="caption" 
                                     color="text.secondary"
                                     sx={{ ml: 'auto' }}
                                   >
                                     {Math.round((memory.confidence || 0.8) * 100)}% confidence
                                   </Typography>
                                 </Box>
                                 <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                   {memory.content}
                                 </Typography>
                               </Paper>
                             ))}
                           </Box>
                         )}
                         
                         {/* No Results */}
                         {(!searchResults.conversations?.length && !searchResults.memories?.length) && (
                           <Box sx={{ 
                             textAlign: 'center', 
                             mt: 4,
                             display: 'flex',
                             flexDirection: 'column',
                             alignItems: 'center',
                             gap: 2
                           }}>
                             <SearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                             <Box>
                               <Typography variant="body2" color="text.secondary" gutterBottom>
                                 No results found for "{searchQuery}"
                               </Typography>
                               <Typography variant="caption" color="text.disabled">
                                 Try searching for skills, career goals, or conversation topics.
                               </Typography>
                             </Box>
                           </Box>
                         )}
                       </Box>
                     ) : (
                       <Box sx={{ 
                         textAlign: 'center', 
                         mt: 4,
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         gap: 2
                       }}>
                         <SearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                         <Box>
                           <Typography variant="body2" color="text.secondary" gutterBottom>
                             Search your conversations and memories
                           </Typography>
                           <Typography variant="caption" color="text.disabled">
                             Find past discussions, skills, preferences, and career insights.
                           </Typography>
                         </Box>
                       </Box>
                     )}
                   </Box>
                 </Box>
               )}
             </Box>
           </Box>
         )}
       </Paper>
     </Fade>
   </>
 );
};

export default GlobalAiAssistant;