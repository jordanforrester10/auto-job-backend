// src/components/recruiters/OutreachComposer.js - ENHANCED WITH IMPROVED UI
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
  Phone as PhoneIcon,
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
  mode = 'create' // 'create' or 'edit'
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  // Form state
  const [messageContent, setMessageContent] = useState(defaultMessage);
  const [messageType, setMessageType] = useState('introduction');
  const [tone, setTone] = useState('professional');
  const [sentVia, setSentVia] = useState('email'); // Default to email
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
      }, ...prev.slice(0, 4)]); // Keep last 5 generations
      
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
      setTimeout(() => setCopySuccess(false), 3000);
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
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      const outreachData = {
        recruiterId: recruiter.id,
        messageContent,
        messageTemplate: messageType,
        sentVia: 'email',
        jobId: selectedJob?._id,
        customizations: [],
        status: manualStatus === 'sent' ? 'sent' : 'drafted'
      };

      if (manualStatus === 'sent') {
        await onSend(outreachData);
      } else {
        await onSave(outreachData);
      }
      
      setShowStatusDialog(false);
      handleClose();
      
    } catch (error) {
      console.error('Status update failed:', error);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleSend = async () => {
    if (sentVia === 'email') {
      handleSendViaEmail();
      return;
    }

    // Original send logic for other methods
    try {
      setIsSending(true);
      setError('');
      
      const outreachData = {
        recruiterId: recruiter.id,
        messageContent,
        messageTemplate: messageType,
        sentVia,
        jobId: selectedJob?._id,
        customizations: []
      };

      // Validate the outreach data
      const validation = recruiterService.validateOutreachData(outreachData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      await onSend(outreachData);
      handleClose();
      
    } catch (error) {
      console.error('Send failed:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = async () => {
    try {
      const outreachData = {
        recruiterId: recruiter.id,
        messageContent,
        messageTemplate: messageType,
        sentVia,
        jobId: selectedJob?._id,
        customizations: []
      };

      await onSave(outreachData);
      handleClose();
      
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save draft. Please try again.');
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

  const messageTemplates = recruiterService.getMessageTemplates();
  const toneOptions = recruiterService.getToneOptions();

  const getCharacterCountColor = () => {
    if (characterCount > 2000) return 'error';
    if (characterCount > 1500) return 'warning';
    return 'primary';
  };

  const getSentViaIcon = (method) => {
    switch (method) {
      case 'email': return <EmailIcon />;
      case 'phone': return <PhoneIcon />;
      default: return <BusinessIcon />;
    }
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

  if (!recruiter) return null;

  return (
    <>
      <Dialog
        open={open && !showStatusDialog}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, minHeight: '700px' }
        }}
      >
        {/* Enhanced Header */}
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 48,
                    height: 48,
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                  }}
                >
                  {recruiter.firstName?.[0]}{recruiter.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    Compose Message
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    To {recruiter.firstName} {recruiter.lastName} at {recruiter.company?.name}
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                onClick={handleClose}
                sx={{ 
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Status Chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<WorkIcon />}
                label={recruiter.title}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ borderRadius: 1 }}
              />
              <Chip
                icon={<BusinessIcon />}
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

        <DialogContent sx={{ p: 0 }}>
          {loadingData && (
            <Box sx={{ p: 2 }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Loading your resumes and jobs...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            </Box>
          )}

          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Left Column - AI Generation */}
              <Grid item xs={12} lg={8}>
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
                  <CardContent sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        mb: 3
                      }}
                    >
                      <PsychologyIcon />
                      AI Message Generator
                    </Typography>

                    <Grid container spacing={3}>
                      {/* IMPROVED: Adjusted grid sizes for better width distribution */}
                      <Grid item xs={12} md={7}>
                        <FormControl fullWidth>
                          <InputLabel sx={{ color: theme.palette.primary.main }}>Message Type</InputLabel>
                          <Select
                            value={messageType}
                            label="Message Type"
                            onChange={(e) => setMessageType(e.target.value)}
                            sx={{ borderRadius: 2 }}
                          >
                            {Object.entries(messageTemplates).map(([key, template]) => (
                              <MenuItem key={key} value={key} sx={{ py: 1.5 }}>
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

                      {/* IMPROVED: Adjusted grid size for better width distribution */}
                      <Grid item xs={12} md={5}>
                        <FormControl fullWidth>
                          <InputLabel sx={{ color: theme.palette.secondary.main }}>Tone</InputLabel>
                          <Select
                            value={tone}
                            label="Tone"
                            onChange={(e) => setTone(e.target.value)}
                            sx={{ borderRadius: 2 }}
                          >
                            {toneOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value} sx={{ py: 1.5 }}>
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
                              sx={{ width: 24, height: 24 }} 
                            />
                          }
                          onClick={handleGenerateMessage}
                          disabled={isGenerating}
                          fullWidth
                          size="large"
                          sx={{ 
                            borderRadius: 2,
                            py: 1.5,
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
                    <Box sx={{ mt: 3 }}>
                      <Button
                        variant="text"
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
                                      startAdornment: <DescriptionIcon sx={{ mr: 1, color: theme.palette.success.main }} />
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
                                      startAdornment: <WorkIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
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
                                  startAdornment: <LightbulbIcon sx={{ mr: 1, color: theme.palette.info.main, alignSelf: 'flex-start', mt: 1 }} />
                                }}
                              />
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
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ color: theme.palette.primary.main }} />
                      Message Content
                    </Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
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
                          fontSize: '0.95rem',
                          lineHeight: 1.6
                        }
                      }}
                    />
                  </Box>
                </Paper>

                {/* Generation History */}
                {generationHistory.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.primary.main }}>
                      Recent Generations
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
              <Grid item xs={12} lg={4}>
                {/* Enhanced Communication Method */}
                <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SendIcon sx={{ color: theme.palette.success.main }} />
                      Send Via
                    </Typography>
                  </Box>
                  <CardContent>
                    <RadioGroup
                      value={sentVia}
                      onChange={(e) => setSentVia(e.target.value)}
                    >
                      <FormControlLabel
                        value="email"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <EmailIcon sx={{ color: theme.palette.primary.main }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Email (Recommended)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Shows email preview with copy functionality
                              </Typography>
                            </Box>
                          </Box>
                        }
                        disabled={!recruiter.email}
                      />
                      <FormControlLabel
                        value="phone"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <PhoneIcon sx={{ color: theme.palette.success.main }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Phone Call
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Script for phone conversation
                              </Typography>
                            </Box>
                          </Box>
                        }
                        disabled={!recruiter.phone}
                      />
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Enhanced Recruiter Info */}
                <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ color: theme.palette.secondary.main }} />
                      Recruiter Details
                    </Typography>
                  </Box>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          TITLE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {recruiter.title}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          COMPANY
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {recruiter.company?.name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          EMAIL
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {recruiter.email || 'Not available'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          INDUSTRY
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {recruiter.industry}
                        </Typography>
                      </Box>
                      {recruiter.experienceYears && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            EXPERIENCE
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {recruiter.experienceYears} years
                          </Typography>
                        </Box>
                      )}
                      {recruiter.specializations && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                            SPECIALIZATIONS
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {recruiter.specializations.slice(0, 3).map((spec, index) => (
                              <Chip 
                                key={index} 
                                label={spec} 
                                size="small" 
                                variant="outlined"
                                sx={{ borderRadius: 1, fontSize: '0.75rem' }}
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
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LightbulbIcon sx={{ color: theme.palette.warning.main }} />
                        Template Guide
                      </Typography>
                    </Box>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {messageTemplates[messageType].description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
          p: 3, 
          borderTop: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, ${theme.palette.grey[25]})`
        }}>
          <Button 
            onClick={handleClose} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="outlined"
            startIcon={<SaveIcon />}
            disabled={!messageContent.trim()}
            sx={{ borderRadius: 2 }}
          >
            Save Draft
          </Button>
          {/* IMPROVED: Fixed Prepare Email button with proper text color */}
          <Button
            onClick={handleSend}
            variant="contained"
            startIcon={isSending ? <LinearProgress sx={{ width: 20 }} /> : getSentViaIcon(sentVia)}
            disabled={!messageContent.trim() || isSending || characterCount > 2000}
            sx={{ 
              borderRadius: 2,
              background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
              color: '#ffffff !important', // Ensure white text
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
            {isSending ? 'Processing...' : 
             sentVia === 'email' ? 'Prepare Email' : `Send via ${sentVia}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMPROVED: Enhanced Email Preview Dialog with Better Theme Integration */}
      <Dialog
        open={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3, 
            overflow: 'hidden',
            boxShadow: theme.shadows[8]
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          position: 'relative'
        }}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                width: 56, 
                height: 56,
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <EmailIcon sx={{ fontSize: '1.8rem' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                  📧 Email Preview
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <PreviewIcon sx={{ fontSize: '1rem' }} />
                  Review your email before copying to your email client
                </Typography>
              </Box>
            </Box>
            
            {/* IMPROVED: Email client mockup header with better styling */}
            <Paper sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              borderRadius: 2, 
              p: 2.5,
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }} />
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      TO
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}>
                    {recruiter.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }} />
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      SUBJECT
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    lineHeight: 1.3
                  }}>
                    {emailSubject}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Close button */}
            <IconButton
              onClick={() => setShowEmailPreview(false)}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* IMPROVED: Email body mockup with better styling */}
          <Box sx={{ 
            p: 4, 
            bgcolor: `linear-gradient(135deg, ${theme.palette.grey[50]}, ${theme.palette.grey[25]})`,
            minHeight: 300
          }}>
            <Paper 
              elevation={4}
              sx={{ 
                p: 4, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff, #fafafa)',
                border: `2px solid ${theme.palette.primary.light}`,
                position: 'relative',
                boxShadow: theme.shadows[6],
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3
                }
              }}
            >
              {/* Email content with better typography */}
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                  color: theme.palette.text.primary,
                  fontSize: '1.05rem',
                  letterSpacing: '0.02em'
                }}
              >
                {formattedEmailBody}
              </Typography>
            </Paper>
          </Box>

          {/* IMPROVED: Enhanced info section with theme colors */}
          <Box sx={{ 
            p: 3, 
            bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}05)`,
            borderTop: `1px solid ${theme.palette.divider}`
          }}>
            <Alert 
              severity="info" 
              icon={<LightbulbIcon sx={{ color: theme.palette.primary.main }} />}
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${theme.palette.primary.light}`,
                bgcolor: 'rgba(255,255,255,0.9)',
                '& .MuiAlert-icon': {
                  color: theme.palette.primary.main
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.primary.main, 
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <CheckCircleIcon sx={{ fontSize: '1.1rem' }} />
                    What happens next:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Copy the email content using the button below, then paste it into your preferred email client. 
                    This approach maintains your professional reputation while leveraging AI-generated content.
                  </Typography>
                </Box>
              </Box>
            </Alert>
          </Box>
        </DialogContent>

        {/* IMPROVED: Enhanced dialog actions with better button styling */}
        <DialogActions sx={{ 
          p: 3, 
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, white)`,
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: 2
        }}>
          <Button 
            onClick={() => setShowEmailPreview(false)}
            variant="outlined"
            startIcon={<EditIcon />}
            sx={{ 
              borderRadius: 2,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: theme.palette.primary.main + '10',
                borderColor: theme.palette.primary.dark
              }
            }}
          >
            Edit Message
          </Button>
          <Button
            onClick={copyToClipboard}
            variant="contained"
            startIcon={copySuccess ? <CheckCircleIcon /> : <ContentCopyIcon />}
            size="large"
            sx={{ 
              borderRadius: 2,
              px: 4,
              fontWeight: 700,
              background: copySuccess 
                ? `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                : `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
              color: '#ffffff !important',
              boxShadow: theme.shadows[4],
              '&:hover': {
                background: copySuccess
                  ? `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`
                  : `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                boxShadow: theme.shadows[6],
                transform: 'translateY(-1px)'
              }
            }}
          >
            {copySuccess ? 'Email Copied!' : 'Copy Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMPROVED: Enhanced Status Update Dialog */}
      <Dialog
        open={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            boxShadow: theme.shadows[8]
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.success.main}15, ${theme.palette.primary.main}15)`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              bgcolor: theme.palette.success.main,
              width: 56,
              height: 56
            }}>
              <CheckCircleIcon sx={{ fontSize: '1.5rem' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: theme.palette.success.main,
                mb: 0.5
              }}>
                Update Email Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Let us know what happened with your email
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            After copying the email content for <strong>{recruiter.firstName} {recruiter.lastName}</strong>, 
            please update the status below to help us track your outreach effectiveness:
          </Typography>

          <RadioGroup
            value={manualStatus}
            onChange={(e) => setManualStatus(e.target.value)}
          >
            <FormControlLabel
              value="sent"
              control={<Radio sx={{ color: theme.palette.success.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <CheckCircleIcon sx={{ color: theme.palette.success.main }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Email sent successfully
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I copied the content and sent the email
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="drafted"
              control={<Radio sx={{ color: theme.palette.warning.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <DraftsIcon sx={{ color: theme.palette.warning.main }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Saved as draft for later
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I saved the email content to send later
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="cancelled"
              control={<Radio sx={{ color: theme.palette.error.main }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <CancelIcon sx={{ color: theme.palette.error.main }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Decided not to send
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      I chose not to send this email
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          borderTop: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.grey[50]}, white)`
        }}>
          <Button 
            onClick={() => setShowStatusDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            sx={{ 
              borderRadius: 2,
              fontWeight: 700,
              px: 3,
              background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
              color: '#ffffff !important',
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`
              }
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OutreachComposer;