import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  LinearProgress,
  StepContent,
  Chip
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Psychology as PsychologyIcon,
  DataObject as DataObjectIcon,
  Memory as MemoryIcon,
  Error as ErrorIcon,
  Lock as LockIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom'; // ADD THIS IMPORT
import resumeService from '../../utils/resumeService';
import jobService from '../../utils/jobService'; // ADD THIS IMPORT
import { useSubscription } from '../../context/SubscriptionContext';
import UpgradePrompt from '../subscription/shared/UpgradePrompt';

const ResumeUploadDialog = ({ open, onClose, onResumeUploaded }) => {
  const navigate = useNavigate(); // ADD THIS
  
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('uploading'); // 'uploading', 'parsing', 'analyzing', 'completed', 'error'
  const [uploadComplete, setUploadComplete] = useState(false);
  const [resumeId, setResumeId] = useState(null);
  const [processingTimeout, setProcessingTimeout] = useState(false);
  const [canClose, setCanClose] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Subscription context
  const {
    canPerformAction,
    getUsagePercentage,
    planInfo,
    usage,
    planLimits,
    refreshSubscription
  } = useSubscription();

  // ADD THIS: Check job count function
  const checkJobCount = async () => {
    try {
      const jobs = await jobService.getAllJobs();
      return jobs ? jobs.length : 0;
    } catch (error) {
      console.error('Error checking job count:', error);
      return 0;
    }
  };

  // Clear any intervals when the component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function
    };
  }, []);

  const steps = [
    { label: 'Select Resume', icon: <DescriptionIcon /> },
    { label: 'Add Details', icon: <DataObjectIcon /> },
    { label: 'Processing', icon: <MemoryIcon /> }
  ];

  const processingSteps = [
    { label: 'Uploading', value: 10, icon: <CloudUploadIcon color="primary" /> },
    { label: 'Parsing', value: 30, icon: <DataObjectIcon color="info" /> },
    { label: 'AI Analyzing', value: 75, icon: <PsychologyIcon color="secondary" /> },
    { label: 'Complete', value: 100, icon: <CheckCircleIcon color="success" /> }
  ];

  const getProcessingStepIndex = () => {
    switch (processingStage) {
      case 'uploading': return 0;
      case 'parsing': return 1;
      case 'analyzing': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const resetForm = () => {
    setFile(null);
    setName('');
    setError('');
    setActiveStep(0);
    setUploadProgress(0);
    setProcessingStage('uploading');
    setUploadComplete(false);
    setResumeId(null);
    setProcessingTimeout(false);
    setCanClose(true);
  };

  const handleClose = () => {
    if (canClose) {
      resetForm();
      onClose();
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file) => {
    // 🔒 FEATURE GATING: Check upload limits before allowing file selection
    const uploadCheck = canPerformAction('resumeUploads', 1);
    
    if (!uploadCheck.allowed) {
      setError(`Upload limit reached: ${uploadCheck.reason}`);
      setShowUpgradePrompt(true);
      return;
    }

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    setError('');
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }
    
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setFile(file);
    if (!name) {
      // Set the name field to file name without extension
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setName(fileName);
    }
    
    setActiveStep(1);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleProgressUpdate = (status) => {
    if (!status) return;
    
    console.log('Status update:', status); // Log the status for debugging
    
    // Update processing stage based on status
    const stage = status.stage || status.status || 'uploading';
    setProcessingStage(stage);
    
    // Update progress percentage
    if (status.percentage) {
      setUploadProgress(status.percentage);
    } else {
      // If no percentage is provided, use default values based on stage
      switch (stage) {
        case 'uploading':
          setUploadProgress(10);
          break;
        case 'parsing':
          setUploadProgress(30);
          break;
        case 'analyzing':
          setUploadProgress(75);
          break;
        case 'completed':
          setUploadProgress(100);
          setUploadComplete(true);
          setCanClose(true);
          break;
        case 'error':
          setError(status.error || status.message || 'An error occurred during processing');
          setCanClose(true);
          break;
        default:
          break;
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!name.trim()) {
      setError('Please enter a name for your resume');
      return;
    }

    // 🔒 FEATURE GATING: Double-check usage limits before upload
    const uploadCheck = canPerformAction('resumeUploads', 1);
    
    if (!uploadCheck.allowed) {
      setError(`Upload limit reached: ${uploadCheck.reason}`);
      setShowUpgradePrompt(true);
      return;
    }

    try {
      setLoading(true);
      setActiveStep(2);
      setProcessingStage('uploading');
      setUploadProgress(10);
      setCanClose(false); // Prevent closing during upload
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      
      // Upload the resume
      const response = await resumeService.uploadResume(formData);
      
      console.log('Upload response:', response); // Log the response structure
      
      // Extract resume ID from the response (handle different response structures)
      let resumeId = null;
      
      if (response && response.resume && response.resume._id) {
        // Standard structure
        resumeId = response.resume._id;
      } else if (response && response._id) {
        // Alternative structure where resume is the root object
        resumeId = response._id;
      } else if (response && response.id) {
        // Alternative structure with 'id' instead of '_id'
        resumeId = response.id;
      } else if (response && response.resume && response.resume.id) {
        // Alternative structure with 'id' instead of '_id'
        resumeId = response.resume.id;
      } else if (response && response.data && response.data.resume && response.data.resume._id) {
        // Structure with data wrapper
        resumeId = response.data.resume._id;
      } else if (response && response.data && response.data._id) {
        // Structure with data wrapper
        resumeId = response.data._id;
      }
      
      if (resumeId) {
        setResumeId(resumeId);
        
        // 🔒 FEATURE GATING: Refresh subscription data to update usage stats after successful upload
        await refreshSubscription();
        
        try {
          // Start polling for status updates
          await resumeService.pollResumeStatus(resumeId, handleProgressUpdate, 300000);
          
          // ENHANCED: After processing completes, check job count and navigate accordingly
          if (uploadComplete) {
            const jobCount = await checkJobCount();
            console.log('🔍 Job count after upload completion:', jobCount);
            
            // Call the parent callback
            if (onResumeUploaded) {
              onResumeUploaded(resumeId);
            }
            
            // Close the dialog first
            handleClose();
            
            // Navigate based on job count with slight delay to ensure dialog closes
            setTimeout(() => {
              if (jobCount === 0) {
                // First-time user flow - show enhanced onboarding
                console.log('🎯 Navigating to onboarding flow');
                navigate(`/resumes/${resumeId}?showOnboarding=true`);
              } else {
                // Existing user flow - normal resume detail
                console.log('✅ Navigating to normal resume detail');
                navigate(`/resumes/${resumeId}`);
              }
            }, 300);
          }
        } catch (pollError) {
          console.error('Error polling resume status:', pollError);
          
          if (pollError.message && pollError.message.includes('timed out')) {
            setProcessingTimeout(true);
            setError('Processing is taking longer than expected. You can close this dialog and check back later.');
          } else {
            setError(pollError.message || 'An error occurred while processing your resume');
          }
          
          setCanClose(true);
        }
      } else {
        console.error('Could not extract resume ID from response:', response);
        throw new Error('Invalid response from server - could not find resume ID');
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
      
      // 🔒 FEATURE GATING: Handle usage limit errors from backend
      if (err.response?.status === 403) {
        const errorData = err.response.data;
        if (errorData.feature === 'resumeUploads') {
          setError(`Upload limit reached: ${errorData.error}`);
          setShowUpgradePrompt(true);
        } else {
          setError(errorData.message || 'Upload not allowed');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to upload resume. Please try again.');
      }
      
      setCanClose(true);
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Handle View Resume button with navigation logic
  const handleViewResume = async () => {
    if (resumeId) {
      const jobCount = await checkJobCount();
      console.log('🔍 Job count on View Resume click:', jobCount);
      
      // Call the parent callback
      if (onResumeUploaded) {
        onResumeUploaded(resumeId);
      }
      
      // Close the dialog
      handleClose();
      
      // Navigate based on job count
      setTimeout(() => {
        if (jobCount === 0) {
          console.log('🎯 Navigating to onboarding flow from View Resume');
          navigate(`/resumes/${resumeId}?showOnboarding=true`);
        } else {
          console.log('✅ Navigating to normal resume detail from View Resume');
          navigate(`/resumes/${resumeId}`);
        }
      }, 300);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    return file.type === 'application/pdf' 
      ? <PdfIcon color="error" fontSize="large" />
      : <DescriptionIcon color="primary" fontSize="large" />;
  };

  const getProcessingStageIcon = () => {
    switch (processingStage) {
      case 'uploading':
        return <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main' }} />;
      case 'parsing':
        return <DataObjectIcon sx={{ fontSize: 64, color: 'info.main' }} />;
      case 'analyzing':
        return <PsychologyIcon sx={{ fontSize: 64, color: 'secondary.main' }} />;
      case 'completed':
        return <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />;
      default:
        return <MemoryIcon sx={{ fontSize: 64, color: 'primary.main' }} />;
    }
  };

  const getProcessingStageText = () => {
    switch (processingStage) {
      case 'uploading':
        return {
          title: 'Uploading your resume...',
          description: 'Your file is being securely uploaded to our servers.'
        };
      case 'parsing':
        return {
          title: 'Parsing your resume...',
          description: 'Our AI is extracting information from your resume, identifying your experience, skills, and qualifications.'
        };
      case 'analyzing':
        return {
          title: 'Analyzing your resume...',
          description: 'We\'re now analyzing your resume to provide personalized recommendations, identify strengths and weaknesses, and prepare improvement suggestions.'
        };
      case 'completed':
        return {
          title: 'Processing complete!',
          description: 'Your resume has been successfully processed and analyzed.'
        };
      case 'error':
        return {
          title: 'Processing error',
          description: 'There was an error processing your resume. Please try again.'
        };
      default:
        return {
          title: 'Processing your resume...',
          description: 'This may take a moment.'
        };
    }
  };

  // 🔒 FEATURE GATING: Get current usage stats
  const getUploadUsageStats = () => {
    if (!usage || !planLimits) return { used: 0, limit: 1, percentage: 0 };
    
    const used = usage.resumeUploads?.used || 0;
    const limit = planLimits.resumeUploads;
    const percentage = limit === -1 ? 0 : Math.round((used / limit) * 100);
    
    return { used, limit, percentage };
  };

  const uploadStats = getUploadUsageStats();
  const isUploadBlocked = uploadStats.used >= uploadStats.limit && uploadStats.limit !== -1;

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            {/* 🔒 FEATURE GATING: Usage Warning */}
            {isUploadBlocked && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  You've reached your upload limit of {uploadStats.limit} resume{uploadStats.limit !== 1 ? 's' : ''} this month.
                  <Button 
                    size="small" 
                    onClick={() => setShowUpgradePrompt(true)}
                    sx={{ ml: 1 }}
                  >
                    Upgrade Plan
                  </Button>
                </Typography>
              </Alert>
            )}

            <Box 
              sx={{ 
                mt: 2, 
                border: '2px dashed',
                borderColor: isUploadBlocked ? 'grey.400' : (dragActive ? 'primary.main' : 'divider'),
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: isUploadBlocked ? 'not-allowed' : 'pointer',
                backgroundColor: isUploadBlocked ? 'grey.50' : (dragActive ? 'action.hover' : 'background.paper'),
                transition: 'all 0.2s ease',
                opacity: isUploadBlocked ? 0.6 : 1
              }}
              onDrop={isUploadBlocked ? undefined : handleFileDrop}
              onDragOver={isUploadBlocked ? undefined : handleDragOver}
              onDragLeave={isUploadBlocked ? undefined : handleDragLeave}
              onClick={isUploadBlocked ? () => setShowUpgradePrompt(true) : () => document.getElementById('resume-file-upload').click()}
            >
              <input
                id="resume-file-upload"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploadBlocked}
              />
              
              {isUploadBlocked ? (
                <LockIcon sx={{ fontSize: 64, color: 'grey.500', mb: 2 }} />
              ) : (
                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              )}
              
              <Typography variant="h6" gutterBottom fontWeight={500}>
                {isUploadBlocked 
                  ? 'Upload Limit Reached'
                  : 'Drag & drop your resume here'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isUploadBlocked 
                  ? 'Upgrade your plan to upload more resumes'
                  : 'or click to browse your files'
                }
              </Typography>
              {!isUploadBlocked && (
                <Typography variant="body2" color="text.secondary">
                  Supported formats: PDF, DOCX (Max size: 10MB)
                </Typography>
              )}
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              {getFileIcon()}
              <Box sx={{ ml: 2, flexGrow: 1 }}>
                <Typography variant="body1" fontWeight="medium">
                  {file?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(file?.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            </Box>
            
            <TextField
              label="Resume Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              placeholder="e.g., Software Developer Resume"
              helperText="Give your resume a descriptive name to easily identify it later"
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
              <InfoIcon color="info" sx={{ mr: 1.5, alignSelf: 'flex-start' }} />
              <Typography variant="body2">
                Your resume will be analyzed with AI to provide personalized insights, skills assessment, and improvement suggestions. This process may take a few minutes to complete.
              </Typography>
            </Box>
          </Box>
        );
      case 2:
        const stageText = getProcessingStageText();
        const processingStepIndex = getProcessingStepIndex();
        
        return (
          <Box sx={{ mt: 2 }}>
            {/* Processing steps stepper */}
            <Stepper activeStep={processingStepIndex} orientation="vertical" sx={{ mb: 3 }}>
              {processingSteps.map((step, index) => (
                <Step key={step.label} completed={index < processingStepIndex}>
                  <StepLabel 
                    StepIconComponent={() => step.icon}
                    sx={{ 
                      '& .MuiStepLabel-label': { 
                        fontWeight: index === processingStepIndex ? 600 : 400 
                      }
                    }}
                  >
                    {step.label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      {index === 0 && 'Uploading your file to our secure servers'}
                      {index === 1 && 'Extracting information from your resume'}
                      {index === 2 && 'Our AI is analyzing your resume for insights and recommendations'}
                      {index === 3 && 'All done! Your resume has been processed successfully'}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            
            {/* Progress visualization */}
            <Box sx={{ textAlign: 'center', px: 2, mb: 3 }}>
              {getProcessingStageIcon()}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {stageText.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3, mx: 'auto', maxWidth: 400 }}>
                {stageText.description}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ height: 8, borderRadius: 4, mb: 1 }} 
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(uploadProgress)}% Complete
              </Typography>
            </Box>
            
            {/* Warning message */}
            {!uploadComplete && !processingTimeout && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={500}>
                  Please don't close this window
                </Typography>
                <Typography variant="body2">
                  Closing this dialog before processing is complete may result in incomplete analysis.
                </Typography>
              </Alert>
            )}
            
            {/* Timeout message */}
            {processingTimeout && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={500}>
                  Processing is taking longer than expected
                </Typography>
                <Typography variant="body2">
                  You can close this dialog and check back later. Your resume will continue processing in the background.
                </Typography>
              </Alert>
            )}
            
            {/* Success message */}
            {uploadComplete && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={500}>
                  Resume processing complete!
                </Typography>
                <Typography variant="body2">
                  Your resume has been successfully processed and analyzed. You can now view your analysis and improvement suggestions.
                </Typography>
              </Alert>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={canClose ? handleClose : undefined} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Upload Resume</Typography>
              {/* 🔒 FEATURE GATING: Show usage indicator in dialog title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Usage: 
                </Typography>
                <Chip 
                  size="small"
                  label={uploadStats.limit === -1 ? 'Unlimited' : `${uploadStats.used}/${uploadStats.limit}`}
                  color={isUploadBlocked ? 'error' : 'default'}
                />
                {planInfo && (
                  <Chip 
                    size="small" 
                    label={planInfo.displayName} 
                    sx={{ 
                      backgroundColor: planInfo.backgroundColor,
                      color: planInfo.color,
                      fontWeight: 500
                    }}
                  />
                )}
              </Box>
            </Box>
            {canClose && (
              <IconButton onClick={handleClose} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step) => (
              <Step key={step.label}>
                <StepLabel StepIconComponent={() => step.icon}>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {renderStepContent()}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {activeStep === 0 && (
            <Button onClick={handleClose} disabled={!canClose}>
              Cancel
            </Button>
          )}
          
          {activeStep === 1 && (
            <>
              <Button onClick={() => setActiveStep(0)} disabled={loading}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                color="primary"
                disabled={!file || !name.trim() || loading || isUploadBlocked}
                startIcon={isUploadBlocked ? <LockIcon /> : undefined}
              >
                {isUploadBlocked ? 'Upload Limit Reached' : 'Upload'}
              </Button>
            </>
          )}
          
          {activeStep === 2 && (
            <>
              {(processingTimeout || uploadComplete || processingStage === 'error') && (
                <Button 
                  onClick={uploadComplete ? handleViewResume : handleClose} 
                  variant="contained" 
                  color="primary"
                >
                  {uploadComplete ? 'View Resume' : 'Close'}
                </Button>
              )}
              
              {!uploadComplete && !processingTimeout && processingStage !== 'error' && (
                <Button 
                  disabled={!canClose}
                  variant="outlined"
                  color="primary"
                >
                  Processing...
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 🔒 FEATURE GATING: Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt 
          open={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          feature="resumeUploads"
          title="Resume Upload Limit Reached"
          description={`You've used all ${uploadStats.limit} resume uploads for this month.`}
          currentPlan={planInfo?.tier}
        />
      )}
    </>
  );
};

export default ResumeUploadDialog;
