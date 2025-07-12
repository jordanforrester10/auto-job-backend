// src/components/recruiters/OutreachComposer.js - PHONE FEATURES REMOVED
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Collapse,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoFixHigh as AutoFixHighIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon,
  Drafts as DraftsIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  ContentCopy as ContentCopyIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import recruiterService from '../../utils/recruiterService';
import resumeService from '../../utils/resumeService';
import jobService from '../../utils/jobService';
import AutoJobLogo from '../common/AutoJobLogo';

const OutreachComposer = ({ 
  open, 
  onClose, 
  recruiter, 
  onSend, 
  onSave,
  defaultMessage = '',
  mode = 'create'
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  // Form state
  const [messageContent, setMessageContent] = useState(defaultMessage);
  const [messageType, setMessageType] = useState('introduction');
  const [tone, setTone] = useState('professional');
  const [sentVia, setSentVia] = useState('email'); // PHONE REMOVED - Only email available
  const [selectedResume, setSelectedResume] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [customRequirements, setCustomRequirements] = useState('');
  
  // UI state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [error, setError] = useState('');
  const [generationHistory, setGenerationHistory] = useState([]);
  
  // Email-specific state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [formattedEmailBody, setFormattedEmailBody] = useState('');
  const [manualStatus, setManualStatus] = useState('sent');
  const [showClipboardFallback, setShowClipboardFallback] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Data state
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load user data on mount
  useEffect(() => {
    if (open) {
      loadUserData();
      setMessageContent(defaultMessage);
      setCharacterCount(defaultMessage.length);
    }
  }, [open, defaultMessage]);

  // Update character count when message changes
  useEffect(() => {
    setCharacterCount(messageContent.length);
  }, [messageContent]);

  const loadUserData = async () => {
    try {
      setLoadingData(true);
      const [resumesResponse, jobsResponse] = await Promise.all([
        resumeService.getUserResumes(),
        jobService.getUserJobs()
      ]);
      
      setResumes(resumesResponse || []);
      setJobs(jobsResponse || []);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load your resumes and jobs');
    } finally {
      setLoadingData(false);
    }
  };

  // Email utility functions
  const generateSubjectLine = (recruiter, messageType, jobTitle = null) => {
    const companyName = recruiter?.company?.name || 'your company';
    
    const templates = {
      introduction: `Exploring opportunities at ${companyName}`,
      application: `Application for ${jobTitle || 'Software Developer'} position`,
      follow_up: `Following up - ${companyName} opportunities`,
      thank_you: `Thank you for your time - ${recruiter?.firstName || 'Recruiter'}`
    };
    
    return templates[messageType] || `Professional inquiry - ${companyName}`;
  };

  const formatEmailMessage = (content, recruiterData, userData) => {
    const recruiterFirstName = recruiterData?.firstName || 'there';
    
    // Remove any subject lines from the AI content
    let cleanedContent = content.replace(/^Subject:.*$/gim, '').trim();
    
    // Check if the content already has a greeting
    const hasGreeting = cleanedContent.toLowerCase().includes('dear ') || 
                       cleanedContent.toLowerCase().includes('hello ') ||
                       cleanedContent.toLowerCase().includes('hi ');
    
    // Check if the content already has a signature/closing
    const hasSignature = cleanedContent.toLowerCase().includes('best regards') || 
                        cleanedContent.toLowerCase().includes('warm regards') ||
                        cleanedContent.toLowerCase().includes('sincerely') ||
                        cleanedContent.toLowerCase().includes('regards,');
    
    let formattedContent = cleanedContent;
    
    // Add greeting only if none exists
    if (!hasGreeting) {
      formattedContent = `Dear ${recruiterFirstName},

${cleanedContent}`;
    }
    
    // Add signature only if none exists
    if (!hasSignature && !hasGreeting) {
      const userFirstName = userData?.firstName || 'Best regards';
      formattedContent = `${formattedContent}

Best regards,
${userFirstName}`;
    }
    
    return formattedContent;
  };

  const handleGenerateMessage = async () => {
    if (!recruiter) return;
    
    try {
      setIsGenerating(true);
      setError('');
      
      const messageParams = {
        recruiterId: recruiter.id,
        resumeId: selectedResume?._id,
        jobId: selectedJob?._id,
        messageType,
        tone,
        customRequirements
      };

      console.log('🤖 Generating message with params:', messageParams);
      
      const response = await recruiterService.generatePersonalizedMessage(messageParams);
      
      // Save to generation history
      setGenerationHistory(prev => [{
        message: response.message,
        params: messageParams,
        timestamp: new Date()
      }, ...prev.slice(0, 4)]);
      
      setMessageContent(response.message);
      
    } catch (error) {
      console.error('Message generation failed:', error);
      setError('Failed to generate message. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendViaEmail = () => {
    try {
      // Generate subject line
      const subject = generateSubjectLine(recruiter, messageType, selectedJob?.title);
      
      // Format message with signature
      const formattedMessage = formatEmailMessage(messageContent, recruiter, currentUser);
      
      setEmailSubject(subject);
      setFormattedEmailBody(formattedMessage);
      setShowEmailPreview(true);
      
    } catch (error) {
      console.error('Email preparation failed:', error);
      setError('Failed to prepare email. Please try again.');
    }
  };

  const copyToClipboard = async () => {
    try {
      const fullEmailContent = `To: ${recruiter.email}
Subject: ${emailSubject}

${formattedEmailBody}`;
      
      await navigator.clipboard.writeText(fullEmailContent);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowEmailPreview(false);
        setShowStatusDialog(true);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const fullEmailContent = `To: ${recruiter.email}
Subject: ${emailSubject}

${formattedEmailBody}`;
      
      const textArea = document.createElement('textarea');
      textArea.value = fullEmailContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowEmailPreview(false);
        setShowStatusDialog(true);
      }, 1500);
    }
  };

  // Proper data structure for status update
  const handleStatusUpdate = async () => {
    try {
      // Validate required fields
      if (!recruiter?.id) {
        setError('Recruiter information is missing. Please try again.');
        return;
      }

      if (!messageContent?.trim()) {
        setError('Message content cannot be empty.');
        return;
      }

      console.log('📋 Status update - Recruiter:', recruiter);
      console.log('📋 Status update - Message length:', messageContent.length);
      console.log('📋 Status update - Selected status:', manualStatus);

      // Create proper outreach data structure matching the backend expectations
      const outreachData = {
        recruiterId: recruiter.id,
        messageContent: messageContent.trim(),
        messageTemplate: messageType,
        sentVia: 'email', // Always email now that phone is removed
        jobId: selectedJob?._id || null,
        customizations: [],
        // Add additional fields that might be expected
        subject: emailSubject || generateSubjectLine(recruiter, messageType, selectedJob?.title),
        formattedContent: formattedEmailBody || messageContent.trim()
      };

      console.log('📤 Sending outreach data:', outreachData);

      // Validate the data before sending
      const validation = recruiterService.validateOutreachData(outreachData);
      if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors);
        setError(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Handle different status outcomes
      if (manualStatus === 'sent') {
        console.log('📧 Marking as sent...');
        await onSend(outreachData);
      } else if (manualStatus === 'drafted') {
        console.log('📝 Saving as draft...');
        await onSave(outreachData);
      } else {
        // For 'cancelled' status, we still save it but mark it appropriately
        console.log('❌ Marking as cancelled...');
        const cancelledData = { ...outreachData, status: 'cancelled' };
        await onSave(cancelledData);
      }
      
      console.log('✅ Status update successful');
      setShowStatusDialog(false);
      handleClose();
      
    } catch (error) {
      console.error('❌ Status update failed:', error);
      
      // Better error handling with specific messages
      let errorMessage = 'Failed to update status. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show specific error based on status
      if (error.response?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your message content and try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Recruiter not found. Please refresh the page and try again.';
      }
      
      setError(errorMessage);
      
      // Don't close the dialog on error, let user try again
      setShowStatusDialog(false);
      setShowEmailPreview(true); // Go back to email preview
    }
  };

  // Improved send handler with better error handling
  const handleSend = async () => {
    // Only email is available now - always go to email preview
    handleSendViaEmail();
    return;
  };

  // Improved save handler
  const handleSave = async () => {
    try {
      // Validate required fields
      if (!recruiter?.id) {
        setError('Recruiter information is missing. Please refresh and try again.');
        return;
      }

      if (!messageContent?.trim()) {
        setError('Message content cannot be empty.');
        return;
      }

      const outreachData = {
        recruiterId: recruiter.id,
        messageContent: messageContent.trim(),
        messageTemplate: messageType,
        sentVia: 'email', // Always email now
        jobId: selectedJob?._id || null,
        customizations: []
      };

      console.log('💾 Save draft - outreach data:', outreachData);

      // Validate the outreach data
      const validation = recruiterService.validateOutreachData(outreachData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      await onSave(outreachData);
      handleClose();
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      
      let errorMessage = 'Failed to save draft. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setMessageContent('');
    setError('');
    setGenerationHistory([]);
    setShowAdvancedOptions(false);
    setShowEmailPreview(false);
    setShowStatusDialog(false);
    setEmailSubject('');
    setFormattedEmailBody('');
    setManualStatus('sent');
    setShowClipboardFallback(false);
    setCopySuccess(false);
    onClose();
  };

  // Use synchronous methods for templates and options
  const messageTemplates = recruiterService.getDefaultMessageTemplates();
  const toneOptions = recruiterService.getDefaultToneOptions();

  const getCharacterCountColor = () => {
    if (characterCount > 2000) return 'error';
    if (characterCount > 1500) return 'warning';
    return 'primary';
  };

  // PHONE REMOVED - Only email icon now
  const getSentViaIcon = (method) => {
    return <EmailIcon />;
  };

  const getTemplateIcon = (template) => {
    switch (template) {
      case 'introduction': return <PersonIcon sx={{ color: theme.palette.primary.main }} />;
      case 'follow_up': return <TrendingUpIcon sx={{ color: theme.palette.secondary.main }} />;
      case 'application': return <AssignmentIcon sx={{ color: theme.palette.success.main }} />;
      case 'thank_you': return <StarIcon sx={{ color: theme.palette.warning.main }} />;
      default: return <DescriptionIcon sx={{ color: theme.palette.info.main }} />;
    }
  };

  const getToneIcon = (toneValue) => {
    switch (toneValue) {
      case 'professional': return <BusinessIcon sx={{ color: theme.palette.primary.main }} />;
      case 'friendly': return <PersonIcon sx={{ color: theme.palette.success.main }} />;
      case 'casual': return <LightbulbIcon sx={{ color: theme.palette.warning.main }} />;
      case 'formal': return <SchoolIcon sx={{ color: theme.palette.info.main }} />;
      default: return <DescriptionIcon />;
    }
  };

  // Add debug info for troubleshooting
  console.log('🔍 OutreachComposer Debug Info:', {
    recruiterPresent: !!recruiter,
    recruiterId: recruiter?.id,
    messageContentLength: messageContent?.length || 0,
    hasOnSend: typeof onSend === 'function',
    hasOnSave: typeof onSave === 'function'
  });

  if (!recruiter) {
    console.warn('⚠️ OutreachComposer: No recruiter provided');
    return null;
  }

  return (
    <>
      <Dialog
        open={open && !showStatusDialog}
        onClose={handleClose}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 2,
            minHeight: '600px',
            maxHeight: '85vh',
            width: '92vw',
            maxWidth: '1200px',
            margin: 'auto'
          }
        }}
      >
        {/* Enhanced Header */}
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 40,
                    height: 40,
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {recruiter.firstName?.[0]}{recruiter.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    Compose Message
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    To {recruiter.firstName} {recruiter.lastName} at {recruiter.company?.name}
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                onClick={handleClose}
                size="small"
                sx={{ 
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Status Chips */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip
                icon={<WorkIcon sx={{ fontSize: '0.875rem' }} />}
                label={recruiter.title}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ borderRadius: 1 }}
              />
              <Chip
                icon={<BusinessIcon sx={{ fontSize: '0.875rem' }} />}
                label={recruiter.company?.name}
                size="small"
                variant="outlined"
                color="secondary"
                sx={{ borderRadius: 1 }}
              />
              {recruiter.industry && (
                <Chip
                  label={recruiter.industry}
                  size="small"
                  variant="filled"
                  color="info"
                  sx={{ borderRadius: 1 }}
                />
              )}
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {loadingData && (
            <Box sx={{ p: 2 }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Loading your resumes and jobs...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2.5 }}>
              <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            </Box>
          )}

          <Box sx={{ p: 3, height: 'calc(85vh - 180px)', overflow: 'auto' }}>
            <Grid container spacing={3}>
              {/* Left Column - AI Generation */}
              <Grid item xs={12} lg={7.5}>
                {/* Enhanced AI Generation Controls */}
                <Card 
                  elevation={0} 
                  sx={{ 
                    mb: 3,
                    border: `1px solid ${theme.palette.primary.light}`,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}05)`
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography 
                      variant="subtitle1"
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        mb: 2
                      }}
                    >
                      <PsychologyIcon sx={{ fontSize: '1.25rem' }} />
                      AI Message Generator
                    </Typography>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ color: theme.palette.primary.main }}>Message Type</InputLabel>
                          <Select
                            value={messageType}
                            label="Message Type"
                            onChange={(e) => setMessageType(e.target.value)}
                            sx={{ borderRadius: 2 }}
                          >
                            {Object.entries(messageTemplates).map(([key, template]) => (
                              <MenuItem key={key} value={key} sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getTemplateIcon(key)}
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {template.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {template.description}
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ color: theme.palette.secondary.main }}>Tone</InputLabel>
                          <Select
                            value={tone}
                            label="Tone"
                            onChange={(e) => setTone(e.target.value)}
                            sx={{ borderRadius: 2 }}
                          >
                            {toneOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value} sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getToneIcon(option.value)}
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {option.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.description}
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          startIcon={isGenerating ? <LinearProgress sx={{ width: 20 }} /> : 
                            <AutoJobLogo 
                              variant="icon-only" 
                              size="small" 
                              sx={{ width: 20, height: 20 }} 
                            />
                          }
                          onClick={handleGenerateMessage}
                          disabled={isGenerating}
                          fullWidth
                          sx={{ 
                            borderRadius: 2,
                            py: 1.25,
                            background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
                            '&:hover': {
                              background: `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`
                            },
                            '&:disabled': {
                              background: theme.palette.grey[300]
                            }
                          }}
                        >
                          {isGenerating ? 'Generating Magic...' : '✨ Generate AI Message'}
                        </Button>
                      </Grid>
                    </Grid>

                    {/* Advanced Options */}
                    <Box sx={{ mt: 2.5 }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        endIcon={showAdvancedOptions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        Advanced Options
                      </Button>
                      
                      <Collapse in={showAdvancedOptions}>
                        <Box sx={{ mt: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Autocomplete
                                options={resumes}
                                getOptionLabel={(option) => option?.name || ''}
                                value={selectedResume}
                                onChange={(e, value) => setSelectedResume(value)}
                                isOptionEqualToValue={(option, value) => option?._id === value?._id}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Use Resume"
                                    placeholder="Select resume for context..."
                                    size="small"
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: <DescriptionIcon sx={{ mr: 1, color: theme.palette.success.main, fontSize: '1rem' }} />
                                    }}
                                  />
                                )}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                              <Autocomplete
                                options={jobs}
                                getOptionLabel={(option) => option ? `${option.title} at ${option.company}` : ''}
                                value={selectedJob}
                                onChange={(e, value) => setSelectedJob(value)}
                                isOptionEqualToValue={(option, value) => option?._id === value?._id}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Target Job"
                                    placeholder="Select job if applying..."
                                    size="small"
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: <WorkIcon sx={{ mr: 1, color: theme.palette.warning.main, fontSize: '1rem' }} />
                                    }}
                                  />
                                )}
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Custom Requirements"
                                placeholder="Any specific points you want to mention..."
                                value={customRequirements}
                                onChange={(e) => setCustomRequirements(e.target.value)}
                                size="small"
                                InputProps={{
                                  startAdornment: <LightbulbIcon sx={{ mr: 1, color: theme.palette.info.main, alignSelf: 'flex-start', mt: 1, fontSize: '1rem' }} />
                                }}/>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </Box>
                  </CardContent>
                </Card>

                {/* Enhanced Message Content */}
                <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ color: theme.palette.primary.main, fontSize: '1.125rem' }} />
                      Message Content
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={12}
                      placeholder="Write your message here or use the AI generator above..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      error={characterCount > 2000}
                      helperText={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {characterCount > 2000 && 'Message too long. '}
                            {messageTemplates[messageType]?.suggestedLength && 
                              `Suggested: ${messageTemplates[messageType].suggestedLength}`}
                          </span>
                          <span style={{ color: theme.palette[getCharacterCountColor()].main, fontWeight: 600 }}>
                            {characterCount}/2000
                          </span>
                        </Box>
                      }
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.9rem',
                          lineHeight: 1.6
                        }
                      }}
                    />
                  </Box>
                </Paper>

                {/* Generation History */}
                {generationHistory.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                      Recent Generations
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {generationHistory.map((generation, index) => (
                        <Chip
                          key={index}
                          label={`${generation.params.messageType} (${generation.params.tone})`}
                          size="small"
                          variant="outlined"
                          onClick={() => setMessageContent(generation.message)}
                          sx={{ 
                            cursor: 'pointer',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            '&:hover': {
                              backgroundColor: theme.palette.primary.main + '10'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Right Column - Settings and Preview */}
              <Grid item xs={12} lg={4.5}>
                {/* Communication Method - PHONE REMOVED */}
                <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SendIcon sx={{ color: theme.palette.success.main, fontSize: '1.125rem' }} />
                      Send Via
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Only Email Option Now */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                      <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Email (Recommended)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Shows email preview with copy functionality
                        </Typography>
                      </Box>
                    </Box>
                    {!recruiter.email && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        Email not available for this recruiter
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Recruiter Info */}
                <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ color: theme.palette.secondary.main, fontSize: '1.125rem' }} />
                      Recruiter Details
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          TITLE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {recruiter.title}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          COMPANY
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {recruiter.company?.name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          EMAIL
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {recruiter.email || 'Not available'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          INDUSTRY
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {recruiter.industry}
                        </Typography>
                      </Box>
                      {recruiter.experienceYears && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            EXPERIENCE
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {recruiter.experienceYears} years
                          </Typography>
                        </Box>
                      )}
                      {recruiter.specializations && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
                            SPECIALIZATIONS
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {recruiter.specializations.slice(0, 3).map((spec, index) => (
                              <Chip 
                                key={index} 
                                label={spec} 
                                size="small" 
                                variant="outlined"
                                sx={{ borderRadius: 1, fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Enhanced Template Guide */}
                {messageTemplates[messageType] && (
                  <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LightbulbIcon sx={{ color: theme.palette.warning.main, fontSize: '1.125rem' }} />
                        Template Guide
                      </Typography>
                    </Box>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.6 }}>
                        {messageTemplates[messageType].description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          SUGGESTED LENGTH:
                        </Typography>
                        <Chip 
                          label={messageTemplates[messageType].suggestedLength} 
                          size="small" 
                          color="info"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        {/* Enhanced Footer Actions */}
        <DialogActions sx={{ 
          p: 2.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, ${theme.palette.grey[25]})`,
          gap: 1.5
        }}>
          <Button 
            onClick={handleClose} 
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 2.5,
              minWidth: 100
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="outlined"
            startIcon={<SaveIcon sx={{ fontSize: '1rem' }} />}
            disabled={!messageContent.trim()}
            sx={{ 
              borderRadius: 2,
              px: 2.5,
              minWidth: 120
            }}
          >
            Save Draft
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            startIcon={isSending ? <LinearProgress sx={{ width: 16 }} /> : getSentViaIcon(sentVia)}
            disabled={!messageContent.trim() || isSending || characterCount > 2000 || !recruiter.email}
            sx={{ 
              borderRadius: 2,
              px: 3,
              minWidth: 140,
              background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
              color: '#ffffff !important',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`
              },
              '&:disabled': {
                background: theme.palette.grey[300],
                color: theme.palette.grey[500] + ' !important'
              }
            }}
          >
            {isSending ? 'Processing...' : 'Prepare Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Preview Dialog - Consistent with Compose Message Style */}
      <Dialog
        open={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: theme.shadows[6],
            width: '85vw',
            maxWidth: '900px'
          }
        }}
      >
        {/* Header matching compose style */}
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: theme.palette.primary.main,
                width: 40,
                height: 40
              }}>
                <EmailIcon sx={{ fontSize: '1.25rem' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  📧 Email Preview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review your email before copying to your email client
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <IconButton
                  onClick={() => setShowEmailPreview(false)}
                  size="small"
                  sx={{
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            
            {/* Email details in consistent card style */}
            <Card elevation={0} sx={{ 
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.8)'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1rem' }} />
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.secondary, 
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        To
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500,
                      color: theme.palette.text.primary
                    }}>
                      {recruiter.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <DescriptionIcon sx={{ color: theme.palette.primary.main, fontSize: '1rem' }} />
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.secondary, 
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Subject
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      lineHeight: 1.3
                    }}>
                      {emailSubject}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Email content matching message content style */}
          <Box sx={{ p: 3 }}>
            <Paper elevation={0} sx={{ 
              border: `1px solid ${theme.palette.divider}`, 
              borderRadius: 2,
              minHeight: 300
            }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: '1.125rem' }} />
                  Email Content
                </Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                    color: theme.palette.text.primary,
                    fontSize: '0.9rem'
                  }}
                >
                  {formattedEmailBody}
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Info section matching component style */}
          <Box sx={{ 
            p: 3, 
            pt: 0,
            bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}05, ${theme.palette.secondary.main}03)`
          }}>
            <Alert 
              severity="info" 
              icon={<LightbulbIcon sx={{ color: theme.palette.primary.main }} />}
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${theme.palette.primary.light}`,
                bgcolor: 'rgba(255,255,255,0.9)'
              }}
            >
              <Typography variant="body2" sx={{ 
                fontWeight: 600, 
                color: theme.palette.primary.main, 
                mb: 0.5
              }}>
                📋 What happens next:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.875rem' }}>
                Copy the email content below, then paste it into your preferred email client. 
                This maintains your professional reputation while leveraging AI-generated content.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>

        {/* Dialog actions matching main dialog style */}
        <DialogActions sx={{ 
          p: 2.5,
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, white)`,
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: 1.5
        }}>
          <Button 
            onClick={() => setShowEmailPreview(false)}
            variant="outlined"
            startIcon={<EditIcon sx={{ fontSize: '1rem' }} />}
            sx={{ 
              borderRadius: 2,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              fontWeight: 500,
              px: 2.5,
              minWidth: 140,
              '&:hover': {
                bgcolor: theme.palette.primary.main + '08',
                borderColor: theme.palette.primary.dark
              }
            }}
          >
            Edit Message
          </Button>
          <Button
            onClick={copyToClipboard}
            variant="contained"
            startIcon={copySuccess ? <CheckCircleIcon sx={{ fontSize: '1rem' }} /> : <ContentCopyIcon sx={{ fontSize: '1rem' }} />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              minWidth: 160,
              background: copySuccess 
                ? `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                : `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
              color: '#ffffff !important',
              '&:hover': {
                background: copySuccess
                  ? `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`
                  : `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                transform: 'translateY(-1px)'
              }
            }}
          >
            {copySuccess ? 'Email Copied!' : 'Copy Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog with Better Error Handling */}
      <Dialog
        open={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 2,
            boxShadow: theme.shadows[6],
            minWidth: 500
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.success.main}15, ${theme.palette.primary.main}15)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ 
                bgcolor: theme.palette.success.main,
                width: 40,
                height: 40
              }}>
                <CheckCircleIcon sx={{ fontSize: '1.25rem' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.success.main
                }}>
                  Update Email Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Let us know what happened with your email
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          {/* Show error if there's an issue */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
            After copying the email content for <strong>{recruiter.firstName} {recruiter.lastName}</strong>, 
            please update the status below to help us track your outreach effectiveness:
          </Typography>

          <RadioGroup
            value={manualStatus}
            onChange={(e) => setManualStatus(e.target.value)}
            sx={{ gap: 0.75 }}
          >
            <FormControlLabel
              value="sent"
              control={<Radio size="small" sx={{ color: theme.palette.success.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: '1.125rem' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Email sent successfully
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I copied the content and sent the email
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                border: `1px solid ${theme.palette.success.light}`,
                borderRadius: 1.5,
                p: 1,
                m: 0.25,
                '&:hover': {
                  bgcolor: theme.palette.success.main + '05'
                }
              }}
            />
            <FormControlLabel
              value="drafted"
              control={<Radio size="small" sx={{ color: theme.palette.warning.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <DraftsIcon sx={{ color: theme.palette.warning.main, fontSize: '1.125rem' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Saved as draft for later
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I saved the email content to send later
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                border: `1px solid ${theme.palette.warning.light}`,
                borderRadius: 1.5,
                p: 1,
                m: 0.25,
                '&:hover': {
                  bgcolor: theme.palette.warning.main + '05'
                }
              }}
            />
            <FormControlLabel
              value="cancelled"
              control={<Radio size="small" sx={{ color: theme.palette.error.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <CancelIcon sx={{ color: theme.palette.error.main, fontSize: '1.125rem' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Decided not to send
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I chose not to send this email
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                border: `1px solid ${theme.palette.error.light}`,
                borderRadius: 1.5,
                p: 1,
                m: 0.25,
                '&:hover': {
                  bgcolor: theme.palette.error.main + '05'
                }
              }}
            />
          </RadioGroup>
        </DialogContent>

        <DialogActions sx={{ 
          p: 2.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, white)`,
          gap: 1.5
        }}>
          <Button 
            onClick={() => setShowStatusDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              fontWeight: 500,
              px: 2.5,
              minWidth: 100
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={isSending}
            sx={{ 
              borderRadius: 2,
              fontWeight: 600,
              px: 3,
              minWidth: 140,
              background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
              color: '#ffffff !important',
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`
              },
              '&:disabled': {
                background: theme.palette.grey[300],
                color: theme.palette.grey[500] + ' !important'
              }
            }}
          >
            {isSending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OutreachComposer;