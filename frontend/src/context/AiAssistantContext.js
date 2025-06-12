// src/context/AiAssistantContext.js - COMPLETE FILE WITH NEW CONVERSATION FIX
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import resumeService from '../utils/resumeService';
import jobService from '../utils/jobService';
import assistantService from '../utils/assistantService';

// Create the context
const AiAssistantContext = createContext();

// Custom hook to use the context
export const useAiAssistant = () => {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistant must be used within an AiAssistantProvider');
  }
  return context;
};

// Provider component
export const AiAssistantProvider = ({ children }) => {
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  
  // AI Assistant state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Enhanced conversation state
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationError, setConversationError] = useState(null);
  
  // Memory state
  const [userMemories, setUserMemories] = useState([]);
  const [memoryInsights, setMemoryInsights] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  
  // Context awareness
  const [currentContext, setCurrentContext] = useState({
    page: 'dashboard',
    resumeCount: 0,
    jobCount: 0,
    currentResume: null,
    currentJob: null,
    userProfile: null
  });
  
  // Suggestions and analytics
  const [contextualSuggestions, setContextualSuggestions] = useState([]);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize on authentication
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      initializeAiAssistant();
    } else {
      resetState();
    }
  }, [isAuthenticated, currentUser]);

  // Update context when location changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      updateContextFromLocation();
    }
  }, [location.pathname, isAuthenticated, currentUser]);

  // Load conversation when current conversation changes
  useEffect(() => {
    if (currentConversationId && !currentConversationId.startsWith('new-conversation-')) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  /**
   * Initialize AI Assistant system
   */
  const initializeAiAssistant = useCallback(async () => {
    try {
      await Promise.all([
        loadConversations(),
        loadMemoryInsights(),
        updateContextFromLocation()
      ]);
    } catch (error) {
      console.error('Failed to initialize AI Assistant:', error);
      setError('Failed to initialize AI Assistant');
    }
  }, []);

  /**
   * Reset all state
   */
  const resetState = useCallback(() => {
    setConversations([]);
    setCurrentConversationId(null);
    setCurrentConversation(null);
    setUserMemories([]);
    setMemoryInsights([]);
    setMessages([]);
    setContextualSuggestions([]);
    setAnalytics(null);
    setError(null);
    setCurrentContext({
      page: 'auth',
      resumeCount: 0,
      jobCount: 0,
      currentResume: null,
      currentJob: null,
      userProfile: null
    });
  }, []);

  /**
   * Load user's conversations
   */
  const loadConversations = useCallback(async (options = {}) => {
    try {
      setConversationsLoading(true);
      setConversationError(null);

      const response = await assistantService.getConversations({
        limit: 20,
        sortBy: 'lastActiveAt',
        ...options
      });

      // Filter out placeholder conversations
      const realConversations = response.conversations?.filter(conv => !conv.isPlaceholder) || [];
      setConversations(realConversations);
      
      // Set current conversation to most recent if none selected
      if (!currentConversationId && realConversations.length > 0) {
        setCurrentConversationId(realConversations[0]._id);
      }

    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversationError('Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  }, [currentConversationId]);

  /**
   * Load specific conversation
   */
  const loadConversation = useCallback(async (conversationId) => {
    try {
      const conversation = await assistantService.getConversation(conversationId);
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation');
    }
  }, []);

  /**
   * Create new conversation - PROPERLY FIXED
   */
  const createNewConversation = useCallback(async (title, category = 'general') => {
    try {
      console.log('Creating new conversation...');
      
      // Create a temporary conversation placeholder
      const tempConversationId = `new-conversation-${Date.now()}`;
      const placeholderConversation = {
        _id: tempConversationId,
        title: title || 'New Conversation',
        category,
        messages: [],
        messageCount: 0,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        isPlaceholder: true,
        status: 'active'
      };
      
      // Add to conversations list and set as current
      setConversations(prev => [placeholderConversation, ...prev]);
      setCurrentConversationId(tempConversationId);
      setCurrentConversation(placeholderConversation);
      setMessages([]);
      setError(null);
      
      console.log('New conversation placeholder created:', tempConversationId);
      return placeholderConversation;

    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create new conversation');
      return null;
    }
  }, []);

  /**
   * Send message - ENHANCED to handle new conversations
   */
  const sendMessage = useCallback(async (message, options = {}) => {
  try {
    setIsLoading(true);
    setError(null);

    // Add user message immediately to UI with proper timestamp
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: message,
      timestamp: new Date(), // FIXED: Use Date object instead of timestamp
      createdAt: new Date() // FIXED: Add createdAt for consistency
    };
    setMessages(prev => [...prev, userMessage]);

    // Check if this is a new conversation (placeholder)
    const isNewConversation = !currentConversationId || 
                             currentConversationId.startsWith('new-conversation-') ||
                             options.newConversation;

    // Prepare request data
    const requestData = {
      message,
      context: currentContext,
      conversationId: isNewConversation ? null : currentConversationId,
      newConversation: isNewConversation,
      conversationHistory: isNewConversation ? [] : messages.slice(-5)
    };

    console.log('Sending message:', { 
      isNewConversation, 
      currentConversationId, 
      messageLength: message.length 
    });

    // Send to AI
    const response = await assistantService.sendMessage(requestData);

    // Add AI response to UI with proper timestamp
    const aiMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ai',
      content: response.message,
      timestamp: new Date(), // FIXED: Use Date object
      createdAt: new Date(), // FIXED: Add createdAt
      suggestions: response.suggestions || [],
      actions: response.actions || [],
      memoryInsights: response.memoryInsights || []
    };

    setMessages(prev => [...prev, aiMessage]);

    // Handle new conversation ID from backend
    if (response.conversationId) {
      // If this was a new conversation, update the ID and remove placeholder
      if (isNewConversation) {
        console.log('New conversation created with ID:', response.conversationId);
        
        // Remove the placeholder conversation
        setConversations(prev => prev.filter(conv => !conv.isPlaceholder));
        
        // Set the real conversation ID
        setCurrentConversationId(response.conversationId);
        
        // Refresh conversations to get the real conversation data
        setTimeout(() => {
          loadConversations();
        }, 500);
      }
      
      // Update conversation title if provided
      if (response.conversationTitle) {
        setCurrentConversation(prev => ({
          ...prev,
          title: response.conversationTitle
        }));
      }
    }

    // Update suggestions
    if (response.suggestions && response.suggestions.length > 0) {
      setContextualSuggestions(response.suggestions);
      setSuggestionsCount(response.suggestions.length);
    }

    return response;

  } catch (error) {
    console.error('Failed to send message:', error);
    setError('Failed to send message. Please try again.');
    
    // Add error message to UI with proper timestamp
    const errorMessage = {
      id: `msg_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ai',
      content: "I'm having trouble connecting right now. Please try again in a moment.",
      timestamp: new Date(), // FIXED: Use Date object
      createdAt: new Date(), // FIXED: Add createdAt
      isError: true
    };
    setMessages(prev => [...prev, errorMessage]);

  } finally {
    setIsLoading(false);
  }
}, [currentContext, currentConversationId, messages, loadConversations]);

  /**
   * Switch to different conversation
   */
  const switchConversation = useCallback(async (conversationId) => {
    if (conversationId === currentConversationId) return;
    
    console.log('Switching to conversation:', conversationId);
    setCurrentConversationId(conversationId);
    setMessages([]);
    setError(null);
    
    // Don't load placeholder conversations
    if (!conversationId.startsWith('new-conversation-')) {
      // The useEffect will handle loading the conversation
    }
  }, [currentConversationId]);

  /**
   * Update conversation metadata
   */
  const updateConversation = useCallback(async (conversationId, updates) => {
    try {
      // Don't update placeholder conversations
      if (conversationId.startsWith('new-conversation-')) {
        return null;
      }

      const updatedConversation = await assistantService.updateConversation(conversationId, updates);
      
      // Update in conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId ? { ...conv, ...updatedConversation } : conv
        )
      );

      // Update current conversation if it's the one being updated
      if (conversationId === currentConversationId) {
        setCurrentConversation(prev => ({ ...prev, ...updatedConversation }));
      }

      return updatedConversation;

    } catch (error) {
      console.error('Failed to update conversation:', error);
      setError('Failed to update conversation');
      return null;
    }
  }, [currentConversationId]);

  /**
   * Delete conversation
   */
  const deleteConversation = useCallback(async (conversationId, permanent = false) => {
    try {
      // Handle placeholder conversations
      if (conversationId.startsWith('new-conversation-')) {
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        if (conversationId === currentConversationId) {
          const remaining = conversations.filter(conv => conv._id !== conversationId);
          if (remaining.length > 0) {
            setCurrentConversationId(remaining[0]._id);
          } else {
            setCurrentConversationId(null);
            setCurrentConversation(null);
            setMessages([]);
          }
        }
        return;
      }

      await assistantService.deleteConversation(conversationId, permanent);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      // If it was the current conversation, switch to another one
      if (conversationId === currentConversationId) {
        const remainingConversations = conversations.filter(conv => conv._id !== conversationId);
        if (remainingConversations.length > 0) {
          setCurrentConversationId(remainingConversations[0]._id);
        } else {
          setCurrentConversationId(null);
          setCurrentConversation(null);
          setMessages([]);
        }
      }

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError('Failed to delete conversation');
    }
  }, [currentConversationId, conversations]);

  /**
   * Load memory insights
   */
  const loadMemoryInsights = useCallback(async () => {
    try {
      setMemoriesLoading(true);
      const response = await assistantService.getMemoryInsights();
      setMemoryInsights(response.insights || []);
      setUserMemories(response.analytics || {});
    } catch (error) {
      console.error('Failed to load memory insights:', error);
    } finally {
      setMemoriesLoading(false);
    }
  }, []);

  /**
   * Search across conversations and memories
   */
  const searchEverything = useCallback(async (query) => {
    try {
      const results = await assistantService.search(query);
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return { conversations: [], memories: [] };
    }
  }, []);

  /**
   * Get analytics
   */
  const loadAnalytics = useCallback(async (timeframe = '30d') => {
    try {
      const analyticsData = await assistantService.getAnalytics(timeframe);
      setAnalytics(analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Failed to load analytics:', error);
      return null;
    }
  }, []);

  /**
   * Update context from current location
   */
  const updateContextFromLocation = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setCurrentContext({
        page: 'auth',
        resumeCount: 0,
        jobCount: 0,
        currentResume: null,
        currentJob: null,
        userProfile: null
      });
      return;
    }

    try {
      console.log('🤖 AJ: Updating context for:', location.pathname);
      
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const page = pathSegments[0] || 'dashboard';
      
      let newContext = {
        page,
        resumeCount: 0,
        jobCount: 0,
        currentResume: null,
        currentJob: null,
        userProfile: {
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          email: currentUser.email
        }
      };

      // Get user's resumes and jobs count
      try {
        const [resumes, jobs] = await Promise.all([
          resumeService.getUserResumes(),
          jobService.getUserJobs()
        ]);

        newContext.resumeCount = resumes?.length || 0;
        newContext.jobCount = jobs?.length || 0;

        // Page-specific context
        switch (page) {
          case 'resumes':
            if (pathSegments[1] && resumes) {
              const currentResume = resumes.find(r => r._id === pathSegments[1]);
              if (currentResume) {
                newContext.currentResume = {
                  id: currentResume._id,
                  name: currentResume.name,
                  analysis: currentResume.analysis,
                  score: currentResume.analysis?.overallScore
                };
              }
            }
            break;

          case 'jobs':
            if (pathSegments[1] && pathSegments[1] !== 'ai-searches' && jobs) {
              const currentJob = jobs.find(j => j._id === pathSegments[1]);
              if (currentJob) {
                newContext.currentJob = {
                  id: currentJob._id,
                  title: currentJob.title,
                  company: currentJob.company,
                  matchAnalysis: currentJob.matchAnalysis
                };
              }
            }
            
            if (pathSegments[1] === 'ai-searches') {
              newContext.page = 'ai-searches';
            }
            break;

          default:
            break;
        }

      } catch (error) {
        console.warn('🤖 AJ: Error fetching user data for context:', error);
      }

      // Generate contextual suggestions
      const suggestions = generateContextualSuggestions(newContext);
      
      setCurrentContext(newContext);
      setContextualSuggestions(suggestions);
      setSuggestionsCount(suggestions.length);

      console.log('🤖 AJ: Context updated:', newContext);

    } catch (error) {
      console.error('🤖 AJ: Error updating context:', error);
    }
  }, [location.pathname, isAuthenticated, currentUser]);

  /**
   * Generate contextual suggestions
   */
  const generateContextualSuggestions = useCallback((context) => {
    const suggestions = [];

    switch (context.page) {
      case 'dashboard':
        if (context.resumeCount === 0) {
          suggestions.push('Upload your first resume');
        } else {
          suggestions.push('Which resume needs the most work?');
        }
        
        if (context.jobCount === 0) {
          suggestions.push('Find job opportunities');
        } else {
          suggestions.push('Review my job matches');
        }
        
        suggestions.push('Show my career progress');
        suggestions.push('What should I focus on today?');
        break;

      case 'resumes':
        if (context.currentResume) {
          suggestions.push('Improve this resume');
          suggestions.push('Check ATS compatibility');
          if (context.currentResume.score && context.currentResume.score < 80) {
            suggestions.push('What can I improve?');
          }
        } else {
          suggestions.push('Which resume is best?');
          suggestions.push('Compare my resumes');
        }
        suggestions.push('Create new resume');
        break;

      case 'jobs':
        if (context.currentJob) {
          suggestions.push('Match my resume to this job');
          suggestions.push('How can I improve my match?');
          suggestions.push('Write a cover letter');
        } else {
          suggestions.push('Find new job opportunities');
          suggestions.push('Review my job matches');
        }
        suggestions.push('Help with applications');
        break;

      case 'ai-searches':
        suggestions.push('Optimize search criteria');
        suggestions.push('Review found opportunities');
        suggestions.push('Adjust search parameters');
        break;

      default:
        suggestions.push('Help with resume');
        suggestions.push('Find job opportunities');
        suggestions.push('Career guidance');
        suggestions.push('Review my progress');
        break;
    }

    return suggestions.slice(0, 4);
  }, []);

  /**
   * Handle suggestion clicks
   */
  const handleSuggestionClick = useCallback((suggestion) => {
    return sendMessage(suggestion);
  }, [sendMessage]);

  /**
   * Refresh all data
   */
  const refreshContext = useCallback(async () => {
    await Promise.all([
      updateContextFromLocation(),
      loadConversations(),
      loadMemoryInsights()
    ]);
  }, [updateContextFromLocation, loadConversations, loadMemoryInsights]);

// Context value
const contextValue = {
  // State
  isOpen,
  setIsOpen,
  isMinimized,
  setIsMinimized,
  
  // Conversations
  conversations,
  currentConversationId,
  setCurrentConversationId,     // ADD THIS LINE
  currentConversation,
  setCurrentConversation,       // ADD THIS LINE
  conversationsLoading,
  conversationError,
  
  // Memory
  userMemories,
  memoryInsights,
  memoriesLoading,
  
  // Context
  currentContext,
  setCurrentContext,  // ADD THIS LINE
  contextualSuggestions,
  suggestionsCount,
  analytics,
  
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
  
  // Data management
  loadConversations,
  loadMemoryInsights,
  loadAnalytics,
  searchEverything,
  refreshContext,
  updateContextFromLocation,  // ADD THIS LINE TOO
  
  // Utilities
  setError,
  setMessages
};

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
    </AiAssistantContext.Provider>
  );
};