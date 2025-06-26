// src/context/AiAssistantContext.js - RAG VERSION WITH NO MEMORY SYSTEM
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import assistantService from '../utils/assistantService';

const AiAssistantContext = createContext();

export const useAiAssistant = () => {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistant must be used within an AiAssistantProvider');
  }
  return context;
};

export const AiAssistantProvider = ({ children }) => {
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  
  // 🔥 SIMPLIFIED STATE - No Memory System
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextualSuggestions, setContextualSuggestions] = useState([]);
  
  // 🆕 RAG Context state - attached resumes/jobs per conversation
  const [conversationContexts, setConversationContexts] = useState(new Map());
  
  // Performance tracking
  const [isInitialized, setIsInitialized] = useState(false);
  const initTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // 🔥 SIMPLIFIED storage keys - no memory
  const STORAGE_KEYS = {
    currentConversationId: `ai_conv_${currentUser?._id || 'anon'}`,
    isOpen: `ai_open_${currentUser?._id || 'anon'}`,
    conversationContexts: `ai_contexts_${currentUser?._id || 'anon'}`
  };

  // 🆕 RAG Context Management
  const getConversationContext = useCallback((conversationId) => {
    if (!conversationId) return { resumes: [], jobs: [] };
    return conversationContexts.get(conversationId) || { resumes: [], jobs: [] };
  }, [conversationContexts]);

  const setConversationContext = useCallback((conversationId, context) => {
    if (!conversationId) return;
    
    setConversationContexts(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, context);
      
      // Cache to localStorage
      try {
        const cacheData = {};
        newMap.forEach((value, key) => {
          cacheData[key] = value;
        });
        localStorage.setItem(STORAGE_KEYS.conversationContexts, JSON.stringify(cacheData));
      } catch (e) {
        console.warn('Failed to cache conversation contexts:', e);
      }
      
      return newMap;
    });
  }, [STORAGE_KEYS.conversationContexts]);

  // 🔥 SIMPLIFIED: Basic context update (no external API calls)
  const updateBasicContext = useCallback(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const page = pathSegments[0] || 'dashboard';
    
    // Generate simple suggestions based on page
    const suggestions = generateContextualSuggestions(page);
    setContextualSuggestions(suggestions);
    
    console.log('⚡ Basic context update for page:', page);
  }, [location.pathname]);

  // 🔥 SIMPLIFIED: Generate suggestions without heavy processing
  const generateContextualSuggestions = useCallback((page) => {
    const suggestions = {
      dashboard: ['Help with resume', 'Find jobs', 'Career advice', 'What should I focus on?'],
      resumes: ['Improve resume', 'Optimize for ATS', 'Add skills', 'Update experience'],
      jobs: ['Analyze job posting', 'Match to resume', 'Interview prep', 'Write cover letter'],
      recruiters: ['Find recruiters', 'Write outreach message', 'Track responses', 'Network strategy']
    };

    return suggestions[page] || suggestions.dashboard;
  }, []);

  // 🔥 SIMPLIFIED: Fast initialization without memory system
  const initializeAiAssistant = useCallback(async () => {
    if (isInitialized || !isAuthenticated || !currentUser) return;
    
    try {
      console.log('⚡ Fast AI Assistant initialization (RAG mode)...');
      
      // Load saved UI state immediately
      try {
        const savedIsOpen = localStorage.getItem(STORAGE_KEYS.isOpen) === 'true';
        const savedConversationId = localStorage.getItem(STORAGE_KEYS.currentConversationId);
        const savedContexts = localStorage.getItem(STORAGE_KEYS.conversationContexts);
        
        if (savedIsOpen !== undefined) setIsOpen(savedIsOpen);
        if (savedConversationId) setCurrentConversationId(savedConversationId);
        if (savedContexts) {
          try {
            const parsedContexts = JSON.parse(savedContexts);
            const contextMap = new Map(Object.entries(parsedContexts));
            setConversationContexts(contextMap);
          } catch (e) {
            console.warn('Failed to parse saved contexts');
          }
        }
      } catch (e) {
        console.warn('Failed to load saved state:', e);
      }

      // Load conversations in background
      setTimeout(async () => {
        try {
          await loadConversations();
        } catch (error) {
          console.warn('Background conversation loading failed:', error);
        }
      }, 0);

      // Update basic context
      updateBasicContext();
      
      setIsInitialized(true);
      console.log('✅ Fast AI Assistant initialization completed (RAG mode)');
      
    } catch (error) {
      console.error('AI Assistant initialization failed:', error);
      setError('Failed to initialize AI Assistant');
      setIsInitialized(true);
    }
  }, [isInitialized, isAuthenticated, currentUser, STORAGE_KEYS, updateBasicContext]);

  // 🔥 SIMPLIFIED: Fast conversation loading
  const loadConversations = useCallback(async (options = {}) => {
    try {
      setConversationsLoading(true);

      // Try cache first
      try {
        const cacheKey = `conversations_cache_${currentUser?._id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (Date.now() - parsedCache.timestamp < 2 * 60 * 1000) {
            console.log('📋 Using cached conversations');
            setConversations(parsedCache.conversations || []);
            setConversationsLoading(false);
            
            // Load fresh data in background
            setTimeout(async () => {
              try {
                const fresh = await assistantService.getConversations({ limit: 20 });
                setConversations(fresh.conversations || []);
                localStorage.setItem(cacheKey, JSON.stringify({
                  conversations: fresh.conversations || [],
                  timestamp: Date.now()
                }));
              } catch (error) {
                console.warn('Background conversation refresh failed:', error);
              }
            }, 0);
            return;
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError);
      }

      // Load fresh data
      const response = await assistantService.getConversations({ 
        limit: 20,
        sortBy: 'lastActiveAt'
      });

      setConversations(response.conversations || []);
      
      // Cache the results
      try {
        const cacheKey = `conversations_cache_${currentUser?._id}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          conversations: response.conversations || [],
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache conversations:', cacheError);
      }

      console.log(`✅ Loaded ${response.conversations?.length || 0} conversations`);

    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [currentUser?._id]);

  // 🆕 ENHANCED: Send message with RAG context
  const sendMessage = useCallback(async (message, contextData = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate message
      const validation = assistantService.validateMessage(message);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Add user message immediately
      const userMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: message,
        timestamp: new Date(),
        createdAt: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Get current conversation context
      const currentContext = getConversationContext(currentConversationId);
      
      // Merge with any new context data
      const fullContext = {
        ...currentContext,
        ...contextData,
        conversationId: currentConversationId
      };

      // Determine if new conversation
      const isNewConversation = !currentConversationId || 
                              currentConversationId.startsWith('new-conversation-') ||
                              contextData.newConversation;

      console.log('🤖 Sending message with RAG context:', {
        hasResumes: fullContext.attachedResumes?.length > 0,
        hasJobs: fullContext.attachedJobs?.length > 0,
        conversationId: currentConversationId
      });

      // Send to AI with RAG context
      const response = await assistantService.sendMessage({
        message,
        context: fullContext,
        conversationId: isNewConversation ? null : currentConversationId,
        newConversation: isNewConversation
      });

      // Add AI response
      const aiMessage = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai',
        content: response.message,
        timestamp: new Date(),
        createdAt: new Date(),
        suggestions: response.suggestions || [],
        metadata: response.performance || {}
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle conversation state
      if (response.conversationId) {
        if (isNewConversation) {
          console.log('💾 New conversation created:', response.conversationId);
          
          const newConversation = {
            _id: response.conversationId,
            title: response.conversationTitle || 'New Conversation',
            messages: [userMessage, aiMessage],
            messageCount: 2,
            createdAt: new Date(),
            lastActiveAt: new Date(),
            isActive: true
          };
          
          setCurrentConversationId(response.conversationId);
          setCurrentConversation(newConversation);
          setConversations(prev => [newConversation, ...prev]);
          
          localStorage.setItem(STORAGE_KEYS.currentConversationId, response.conversationId);
          
        } else {
          // Update existing conversation
          const updatedConversation = {
            ...currentConversation,
            messages: [...(currentConversation?.messages || []), userMessage, aiMessage],
            messageCount: (currentConversation?.messageCount || 0) + 2,
            lastActiveAt: new Date()
          };
          
          setCurrentConversation(updatedConversation);
          setConversations(prev => prev.map(conv => 
            conv._id === response.conversationId ? updatedConversation : conv
          ));
        }
      }

      // Update suggestions
      if (response.suggestions && response.suggestions.length > 0) {
        setContextualSuggestions(response.suggestions);
      }

      console.log('✅ Message sent successfully with RAG context');
      return response;

    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Failed to send message');
      
      const errorMessage = {
        id: `msg_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        createdAt: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId, currentConversation, getConversationContext, STORAGE_KEYS.currentConversationId]);

  // 🔥 SIMPLIFIED: Fast conversation switching with context loading
  const switchConversation = useCallback(async (conversationId) => {
    if (conversationId === currentConversationId) return;
    
    console.log('⚡ Fast conversation switch:', conversationId);
    
    // Find conversation in current list first
    const foundConversation = conversations.find(conv => conv._id === conversationId);
    
    if (foundConversation) {
      setCurrentConversationId(conversationId);
      setCurrentConversation(foundConversation);
      setMessages(foundConversation.messages || []);
      setError(null);
      
      localStorage.setItem(STORAGE_KEYS.currentConversationId, conversationId);
      
      console.log('✅ Fast conversation switch completed');
    } else {
      // Load conversation in background
      setCurrentConversationId(conversationId);
      setMessages([]);
      setError(null);
      localStorage.setItem(STORAGE_KEYS.currentConversationId, conversationId);
      
      setTimeout(async () => {
        try {
          const conversation = await assistantService.getConversation(conversationId);
          setCurrentConversation(conversation);
          setMessages(conversation.messages || []);
        } catch (error) {
          console.error('Failed to load conversation:', error);
          setError('Failed to load conversation');
        }
      }, 0);
    }
  }, [currentConversationId, conversations, STORAGE_KEYS.currentConversationId]);

  // 🔥 SIMPLIFIED: Conversation creation
  const createNewConversation = useCallback(async (title, category = 'general') => {
    try {
      console.log('⚡ Creating new conversation...');
      // Create placeholder immediately
      const tempId = `new-conversation-${Date.now()}`;
      const placeholderConversation = {
        _id: tempId,
        title: title || 'New Conversation',
        category,
        messages: [],
        messageCount: 0,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        isPlaceholder: true,
        isActive: true
      };
      
      setConversations(prev => [placeholderConversation, ...prev]);
      setCurrentConversationId(tempId);
      setCurrentConversation(placeholderConversation);
      setMessages([]);
      setError(null);
      
      // Initialize empty context for new conversation
      setConversationContext(tempId, { resumes: [], jobs: [] });
      
      console.log('✅ Placeholder conversation created');
      return placeholderConversation;

    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create new conversation');
      return null;
    }
  }, [setConversationContext]);

  // 🔥 SIMPLIFIED: Conversation management
  const updateConversation = useCallback(async (conversationId, updates) => {
    try {
      if (conversationId.startsWith('new-conversation-')) {
        return null;
      }

      const updatedConversation = await assistantService.updateConversation(conversationId, updates);
      
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId ? { ...conv, ...updatedConversation } : conv
        )
      );

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

  const deleteConversation = useCallback(async (conversationId, permanent = false) => {
    console.log('🗑️ Starting conversation deletion process:', {
      conversationId,
      permanent,
      currentConversationId,
      conversationsCount: conversations.length
    });

    try {
      // Validate input
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      // Handle placeholder conversations (new conversations that haven't been saved yet)
      if (conversationId.startsWith('new-conversation-')) {
        console.log('🔄 Deleting placeholder conversation:', conversationId);
        
        // Remove from local state immediately
        setConversations(prev => {
          const filtered = prev.filter(conv => conv._id !== conversationId);
          console.log('✅ Placeholder conversation removed, remaining:', filtered.length);
          return filtered;
        });
        
        // Remove context for deleted conversation
        setConversationContexts(prev => {
          const newMap = new Map(prev);
          newMap.delete(conversationId);
          console.log('✅ Context removed for placeholder conversation');
          return newMap;
        });
        
        // Handle current conversation switching
        if (conversationId === currentConversationId) {
          console.log('🔄 Deleted conversation was current, switching...');
          const remaining = conversations.filter(conv => conv._id !== conversationId);
          if (remaining.length > 0) {
            console.log('✅ Switching to next conversation:', remaining[0]._id);
            setCurrentConversationId(remaining[0]._id);
            setCurrentConversation(remaining[0]);
            setMessages(remaining[0].messages || []);
          } else {
            console.log('✅ No remaining conversations, clearing state');
            setCurrentConversationId(null);
            setCurrentConversation(null);
            setMessages([]);
            localStorage.removeItem(STORAGE_KEYS.currentConversationId);
          }
        }
        
        console.log('✅ Placeholder conversation deletion completed');
        return { success: true, message: 'Conversation deleted successfully' };
      }

      // For real conversations, call the API
      console.log('🌐 Calling API to delete conversation:', conversationId);
      
      const result = await assistantService.deleteConversation(conversationId, permanent);
      console.log('✅ API delete response:', result);
      
      // Update local state after successful API call
      console.log('🔄 Updating local state after successful deletion...');
      
      setConversations(prev => {
        const filtered = prev.filter(conv => conv._id !== conversationId);
        console.log('✅ Conversation removed from state, remaining:', filtered.length);
        return filtered;
      });
      
      // Remove context for deleted conversation
      setConversationContexts(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        
        // Update localStorage cache
        try {
          const cacheData = {};
          newMap.forEach((value, key) => {
            cacheData[key] = value;
          });
          localStorage.setItem(STORAGE_KEYS.conversationContexts, JSON.stringify(cacheData));
          console.log('✅ Context cache updated');
        } catch (e) {
          console.warn('Failed to update context cache:', e);
        }
        
        console.log('✅ Context removed for real conversation');
        return newMap;
      });
      
      // Handle current conversation switching if needed
      if (conversationId === currentConversationId) {
        console.log('🔄 Deleted conversation was current, switching...');
        
        // Get the current list (before the deletion)
        const remaining = conversations.filter(conv => conv._id !== conversationId);
        
        if (remaining.length > 0) {
          const nextConv = remaining[0];
          console.log('✅ Switching to next conversation:', nextConv._id);
          
          setCurrentConversationId(nextConv._id);
          setCurrentConversation(nextConv);
          setMessages(nextConv.messages || []);
          localStorage.setItem(STORAGE_KEYS.currentConversationId, nextConv._id);
        } else {
          console.log('✅ No remaining conversations, clearing state');
          setCurrentConversationId(null);
          setCurrentConversation(null);
          setMessages([]);
          localStorage.removeItem(STORAGE_KEYS.currentConversationId);
        }
      }
      
      // Clear conversation cache
      try {
        const cacheKey = `conversations_cache_${currentUser?._id}`;
        localStorage.removeItem(cacheKey);
        console.log('✅ Conversation cache cleared');
      } catch (e) {
        console.warn('Failed to clear conversation cache:', e);
      }
      
      console.log('🎉 Conversation deletion completed successfully!');
      return result || { success: true, message: 'Conversation deleted successfully' };

    } catch (error) {
      console.error('❌ Error deleting conversation:', {
        conversationId,
        error: error.message,
        stack: error.stack
      });
      
      // Set error state for user feedback
      setError(`Failed to delete conversation: ${error.message}`);
      
      // Re-throw the error so the UI can handle it
      throw error;
    }
  }, [
    currentConversationId, 
    conversations, 
    currentUser?._id, 
    STORAGE_KEYS.currentConversationId,
    STORAGE_KEYS.conversationContexts
  ]);

  // Also add this helper function to check if assistantService.deleteConversation exists
  const checkApiMethod = useCallback(() => {
    console.log('🔍 Checking assistantService.deleteConversation method:', {
      exists: typeof assistantService.deleteConversation === 'function',
      assistantService: Object.keys(assistantService)
    });
  }, []);

  // Call this once when the component mounts to verify the API method exists
  useEffect(() => {
    if (isAuthenticated) {
      checkApiMethod();
    }
  }, [isAuthenticated, checkApiMethod]);

  // 🆕 RAG: Search functionality for @-mentions
  const searchMentionItems = useCallback(async (query) => {
    try {
      const results = await assistantService.getMentionSuggestions(query);
      return results;
    } catch (error) {
      console.error('Search mention items failed:', error);
      return { resumes: [], jobs: [] };
    }
  }, []);

  // 🔥 SIMPLIFIED: Basic search
  const searchEverything = useCallback(async (query) => {
    try {
      const results = await assistantService.search(query, { limit: 10 });
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return { conversations: [], results: [] };
    }
  }, []);

  // 🔥 SIMPLIFIED: Suggestion handler
  const handleSuggestionClick = useCallback((suggestion) => {
    return sendMessage(suggestion);
  }, [sendMessage]);

  // 🔥 Initialize on auth change
  useEffect(() => {
    if (isAuthenticated && currentUser && !isInitialized) {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      initTimeoutRef.current = setTimeout(() => {
        initializeAiAssistant();
      }, 100);
    } else if (!isAuthenticated) {
      // Reset state when user logs out
      setConversations([]);
      setCurrentConversationId(null);
      setCurrentConversation(null);
      setMessages([]);
      setConversationContexts(new Map()); // Clear RAG contexts
      setError(null);
      setIsInitialized(false);
      
      // Clear stored state
      Object.values(STORAGE_KEYS).forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isAuthenticated, currentUser, isInitialized, initializeAiAssistant, STORAGE_KEYS]);

  // 🔥 Update context on location change (throttled)
  useEffect(() => {
    if (isAuthenticated && currentUser && isInitialized) {
      const now = Date.now();
      
      if (now - lastUpdateRef.current > 500) {
        updateBasicContext();
        lastUpdateRef.current = now;
      }
    }
  }, [location.pathname, isAuthenticated, currentUser, isInitialized, updateBasicContext]);

  // 🔥 Save UI state changes (debounced)
  useEffect(() => {
    if (currentUser?._id) {
      const timeout = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.isOpen, isOpen.toString());
        } catch (e) {}
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen, STORAGE_KEYS.isOpen, currentUser?._id]);

  // 🔥 Save conversation ID changes (debounced)
  useEffect(() => {
    if (currentConversationId && currentUser?._id && 
        !currentConversationId.startsWith('new-conversation-')) {
      const timeout = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.currentConversationId, currentConversationId);
        } catch (e) {}
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [currentConversationId, STORAGE_KEYS.currentConversationId, currentUser?._id]);

  // 🔥 SIMPLIFIED: Context value with RAG support, no memory system
  const contextValue = {
    // UI State
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    
    // Conversation State
    conversations,
    currentConversationId,
    setCurrentConversationId,
    currentConversation,
    setCurrentConversation,
    conversationsLoading,
    isInitialized,
    
    // 🆕 RAG Context State
    getConversationContext,
    setConversationContext,
    conversationContexts,
    
    // Context & Suggestions
    contextualSuggestions,
    
    // Chat
    messages,
    setMessages,
    isLoading,
    error,
    setError,
    
    // Core Actions
    sendMessage,
    createNewConversation,
    switchConversation,
    updateConversation,
    deleteConversation,
    handleSuggestionClick,
    searchEverything,
    
    // 🆕 RAG Actions
    searchMentionItems,
    
    // Data Loading
    loadConversations,
    
    // Utilities
    refreshContext: updateBasicContext,
    clearCache: () => {
      try {
        assistantService.clearCache();
        // Clear local caches including conversation contexts
        Object.keys(localStorage).forEach(key => {
          if (key.includes('conversations_cache_') || 
              key.includes('conversation_') ||
              key.includes('ai_contexts_')) {
            localStorage.removeItem(key);
          }
        });
        console.log('🧹 AI Assistant cache cleared (RAG mode)');
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
    }
  };

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
    </AiAssistantContext.Provider>
  );
};

// 🔥 SIMPLIFIED: Performance monitoring hook (no memory tracking)
export const useAiAssistantPerformance = () => {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const updateMetrics = () => {
      try {
        const perfData = assistantService.getPerformanceInsights?.() || null;
        setMetrics(perfData);
      } catch (error) {
        console.warn('Failed to get performance metrics:', error);
      }
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

// 🔥 Connection quality hook (unchanged)
export const useConnectionQuality = () => {
  const [quality, setQuality] = useState('unknown');
  const [lastCheck, setLastCheck] = useState(0);
  
  const checkQuality = useCallback(async () => {
    const now = Date.now();
    
    if (now - lastCheck < 60000) {
      return quality;
    }
    
    try {
      const startTime = Date.now();
      const healthy = await assistantService.isAvailable();
      const duration = Date.now() - startTime;
      
      let newQuality;
      if (!healthy) {
        newQuality = 'poor';
      } else if (duration < 1000) {
        newQuality = 'excellent';
      } else if (duration < 3000) {
        newQuality = 'good';
      } else {
        newQuality = 'fair';
      }
      
      setQuality(newQuality);
      setLastCheck(now);
      
      return newQuality;
    } catch (error) {
      setQuality('poor');
      setLastCheck(now);
      return 'poor';
    }
  }, [quality, lastCheck]);
  
  return { quality, checkQuality };
};

// 🔥 Smart retry hook (unchanged)
export const useSmartRetry = () => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const retry = useCallback(async (operation, maxRetries = 2) => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error) {
        console.log(`Retry attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [isRetrying]);
  
  return { retry, retryCount, isRetrying };
};

export default AiAssistantContext;