// src/components/resumes/hooks/useAiIntegration.js - COMPLETE FIXED VERSION WITH ANALYSIS REFRESH
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAiAssistant } from '../../../context/AiAssistantContext';
import axios from '../../../utils/axios';

/**
 * Custom hook for AI integration functionality with REAL SSE progress tracking and ANALYSIS REFRESH
 * @param {object} resume - Resume data object
 * @param {function} fetchResumeDetails - Function to refresh resume data
 * @returns {object} AI processing states and functions
 */
export const useAiIntegration = (resume, fetchResumeDetails) => {
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  
  // SSE connection ref
  const eventSourceRef = useRef(null);
  
  // Safely get AI assistant functions
  let setAiOpen = () => {};
  let updateContextFromLocation = () => {};
  
  try {
    const aiAssistant = useAiAssistant();
    setAiOpen = aiAssistant?.setIsOpen || (() => {});
    updateContextFromLocation = aiAssistant?.updateContextFromLocation || (() => {});
    
    // Log available functions for debugging
    console.log('Available AI functions:', Object.keys(aiAssistant));
  } catch (error) {
    console.warn('AI Assistant not available:', error);
  }

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log('🧹 Cleaning up SSE connection on unmount');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Trigger context update when resume changes
  useEffect(() => {
    if (resume && updateContextFromLocation) {
      // Use the existing context update function
      updateContextFromLocation();
      console.log('Updated AI context for resume:', resume.name);
    }
  }, [resume, updateContextFromLocation]);

  // 🔥 CRITICAL FIX: Listen for AI resume updates AND refresh analysis
  useEffect(() => {
    const handleResumeUpdate = async (event) => {
      if (event.detail?.resumeId === resume?.id) {
        console.log('🔄 Resume update event received, refreshing analysis data...');
        
        // Force a complete refresh of resume data including analysis
        await fetchResumeDetails();
        
        // Show success message
        setAiSuccess(event.detail.message || '✅ AJ updated your resume!');
        
        // 🔥 ENHANCED: If the event includes new analysis data, use it
        if (event.detail.newAnalysis) {
          console.log('📊 New analysis data received:', event.detail.newAnalysis);
          setAiSuccess(prev => prev + `\n📊 New Scores: Overall ${event.detail.newAnalysis.overallScore}%, ATS ${event.detail.newAnalysis.atsCompatibility}%`);
        }
        
        setTimeout(() => setAiSuccess(''), 8000); // Longer timeout for detailed messages
      }
    };

    window.addEventListener('resumeUpdated', handleResumeUpdate);
    return () => window.removeEventListener('resumeUpdated', handleResumeUpdate);
  }, [resume?.id, fetchResumeDetails]);

  /**
   * Start real-time progress tracking via SSE - FIXED VERSION
   */
  const startProgressTracking = useCallback((resumeId) => {
    console.log('🚀 Starting real-time progress tracking via SSE for resume:', resumeId);
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Get auth token for SSE request
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No auth token available for SSE connection');
        setProgressStage('Authentication required');
        return;
      }

      // 🔧 FIX: Construct the URL properly with backend port
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : window.location.origin;
      
      const sseUrl = `${baseUrl}/api/resumes/${resumeId}/optimization-progress?token=${encodeURIComponent(token)}`;
      console.log('📡 Connecting to SSE URL:', sseUrl);
      
      // 🔧 FIX: Add a small delay to ensure backend is ready
      setTimeout(() => {
        try {
          // Create EventSource connection
          eventSourceRef.current = new EventSource(sseUrl);
          
          eventSourceRef.current.onopen = (event) => {
            console.log('📡 SSE connection opened successfully', event);
            setProgressStage('Connected to progress stream');
          };
          
          eventSourceRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('📡 Parsed SSE update:', data);
              
              if (data.type === 'progress') {
                console.log(`📊 Real Progress Update: ${data.percentage}% - ${data.message}`);
                setProgressPercentage(data.percentage);
                setProgressStage(data.message);
                
                // If optimization is complete, we'll handle it in the main API response
                if (data.percentage >= 100) {
                  console.log('✅ SSE Progress Complete - awaiting final API response');
                  setProgressStage('Optimization complete - finalizing...');
                }
              } else if (data.type === 'connected') {
                console.log('📡 SSE Connection confirmed:', data.message);
                setProgressStage('Progress tracking connected');
              } else if (data.type === 'complete') {
                console.log('🎉 SSE Optimization complete signal received');
                setProgressPercentage(100);
                setProgressStage(data.message);
              } else if (data.type === 'error') {
                console.error('❌ SSE Error received:', data.message);
                setProgressStage(`Error: ${data.message}`);
              } else if (data.type === 'heartbeat') {
                // Ignore heartbeat messages, just log them
                console.log('💓 SSE Heartbeat received');
              }
            } catch (parseError) {
              console.error('❌ Error parsing SSE data:', parseError, 'Raw data:', event.data);
            }
          };
          
          eventSourceRef.current.onerror = (error) => {
            console.error('❌ SSE Connection Error:', error);
            console.error('❌ SSE ReadyState:', eventSourceRef.current?.readyState);
            console.error('❌ SSE URL was:', sseUrl);
            
            // 🔧 FIX: Better error handling with specific messages
            const readyState = eventSourceRef.current?.readyState;
            let errorMessage = 'Connection error';
            
            if (readyState === 0) {
              errorMessage = 'Connecting to progress stream...';
            } else if (readyState === 2) {
              errorMessage = 'Connection closed - continuing without live updates';
            } else {
              errorMessage = 'Connection failed - continuing without live updates';
            }
            
            setProgressStage(errorMessage);
            
            // Close and cleanup on error
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          };

          console.log('📡 SSE Connection setup complete');
          
        } catch (connectionError) {
          console.error('❌ Failed to create SSE connection:', connectionError);
          setProgressStage('Failed to connect - continuing without live updates');
        }
      }, 100); // Small delay to ensure everything is ready
      
    } catch (error) {
      console.error('❌ Failed to establish SSE connection:', error);
      setProgressStage('Failed to connect - continuing without live updates');
    }
  }, []);

  /**
   * Stop progress tracking and cleanup SSE connection
   */
  const stopProgressTracking = useCallback(() => {
    console.log('🛑 Stopping progress tracking and closing SSE connection');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('📡 SSE connection closed');
    }
  }, []);

  const openAiChat = useCallback(() => {
    try {
      setAiOpen(true);
    } catch (error) {
      console.warn('Cannot open AI chat:', error);
      setAiSuccess('AI Assistant not available. Please check your setup.');
      setTimeout(() => setAiSuccess(''), 3000);
    }
  }, [setAiOpen]);

  const handleQuickAction = useCallback(async (action) => {
    if (!resume) return;
    
    console.log(`🤖 AJ: Starting ${action} with real progress tracking...`);
    
    setAiProcessing(true);
    setProgressPercentage(0);
    setProgressStage('Initializing...');
    setComparisonData(null);
    
    try {
      if (action === 'Auto-Fix for ATS') {
        console.log('🤖 AJ: Starting ATS optimization with real progress...');
        
        // 🔧 FIX: Start SSE connection FIRST, then add delay before API call
        startProgressTracking(resume.id);
        
        // 🔧 FIX: Wait longer to ensure SSE connection is established
        setProgressStage('Connecting to progress stream...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay
        
        setProgressStage('Starting ATS optimization...');
        
        // Call the real backend API for ATS optimization
        const response = await axios.post(`/resumes/${resume.id}/optimize-ats`, {
          targetJob: null // Could be enhanced to include specific job targeting
        });
        
console.log('✅ AJ: ATS optimization response:', response.data);
       
       if (response.data.success) {
         const { data } = response.data;
         
         // Store comparison data for before/after dialog
         if (data.comparison) {
           console.log('📊 Setting comparison data for before/after view');
           setComparisonData(data.comparison);
         }
         
         // Show detailed success message with improvement metrics
         const improvementMessage = `✅ ATS Optimization Complete! 
📈 ATS Score: ${data.previousATSScore}% → ${data.newATSScore}% 
🚀 Improvement: +${data.improvementGain}%`;
         
         setAiSuccess(improvementMessage);
         setProgressPercentage(100);
         setProgressStage('Optimization completed successfully!');
         
         // 🔥 CRITICAL FIX: Force complete resume refresh with analysis
         console.log('🔄 Forcing complete resume data refresh with new analysis...');
         await fetchResumeDetails();
         
         // 🔥 ENHANCED: Wait a moment then force another refresh to ensure analysis is updated
         setTimeout(async () => {
           console.log('🔄 Secondary refresh to ensure analysis scores are updated...');
           await fetchResumeDetails();
         }, 2000);
         
         // Dispatch update event with detailed info
         window.dispatchEvent(new CustomEvent('resumeUpdated', {
           detail: { 
             resumeId: resume.id, 
             message: `ATS optimization complete: ${data.newATSScore}% compatibility`,
             atsScore: data.newATSScore,
             improvement: data.improvementGain,
             // 🔥 CRITICAL: Include new analysis data for UI refresh
             newAnalysis: {
               overallScore: data.newATSScore,
               atsCompatibility: data.newATSScore
             }
           }
         }));
         
       } else {
         throw new Error(response.data.message || 'ATS optimization failed');
       }
       
     } else {
       // Handle other actions (if any in the future)
       console.log(`🤖 AJ: Processing action: ${action}`);
       
       // Simulate other actions for now
       setProgressStage('Processing...');
       setProgressPercentage(50);
       await new Promise(resolve => setTimeout(resolve, 2000));
       setProgressPercentage(100);
       setProgressStage('Complete!');
       
       setAiSuccess(`✅ ${action} completed successfully!`);
       
       // 🔥 CRITICAL FIX: Force complete resume refresh for all actions
       await fetchResumeDetails();
       
       window.dispatchEvent(new CustomEvent('resumeUpdated', {
         detail: { resumeId: resume.id, message: `AI completed: ${action}` }
       }));
     }
     
   } catch (error) {
     console.error('❌ AI action failed:', error);
     
     // Enhanced error handling with specific messages
     let errorMessage = '❌ AI action failed. Please try again.';
     
     if (error.response?.status === 401) {
       errorMessage = '❌ Authentication error. Please log in again.';
     } else if (error.response?.status === 404) {
       errorMessage = '❌ Resume not found. Please refresh and try again.';
     } else if (error.response?.status === 500) {
       errorMessage = '❌ Server error. Our AI is temporarily unavailable.';
     } else if (error.response?.data?.message) {
       errorMessage = `❌ ${error.response.data.message}`;
     }
     
     setAiSuccess(errorMessage);
     setProgressStage(errorMessage);
     
   } finally {
     // Always cleanup SSE connection when done
     stopProgressTracking();
     
     setAiProcessing(false);
     setTimeout(() => {
       setAiSuccess('');
       setProgressStage('');
       setProgressPercentage(0);
     }, 8000); // Longer timeout for detailed messages
   }
 }, [resume, fetchResumeDetails, startProgressTracking, stopProgressTracking]);

 return { 
   aiProcessing, 
   aiSuccess, 
   openAiChat, 
   handleQuickAction,
   progressPercentage,
   progressStage,
   comparisonData
 };
};