// src/components/jobs/ResumeTailoring.js - FIXED USAGE LIMITS
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  useTheme,
  alpha,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  SmartToy as SmartToyIcon,
  Lightbulb as LightbulbIcon,
  Business as BusinessIcon,
  WorkOutline as WorkOutlineIcon,
  FormatListBulleted as FormatListBulletedIcon,
  CropFree as CropFreeIcon,
  Keyboard as KeyboardIcon,
  Info as InfoIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import jobService from '../../utils/jobService';
import resumeService from '../../utils/resumeService';
import MainLayout from '../layout/MainLayout';
import { useSubscription } from '../../context/SubscriptionContext';

const ResumeTailoring = () => {
  const theme = useTheme();
  const { jobId, resumeId } = useParams();
  const navigate = useNavigate();
  const { 
    subscription, 
    usage, 
    planLimits, 
    canPerformAction, 
    getUsagePercentage,
    planInfo 
  } = useSubscription();
  
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [tailoringData, setTailoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [tailoringSaving, setTailoringSaving] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [usageData, setUsageData] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [canCreateTailoredResume, setCanCreateTailoredResume] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const steps = ['Analyze Match', 'Review Recommendations', 'Create Tailored Version'];

  useEffect(() => {
    fetchData();
  }, [jobId, resumeId]);

  useEffect(() => {
    if (resume && job) {
      setVersionName(`AI Tailored - ${resume.name} for ${job.title} at ${job.company}`);
    }
  }, [resume, job]);

  // Check usage limits for final creation step only
  useEffect(() => {
    if (usage && planLimits) {
      const tailoringUsage = usage.resumeTailoring || { used: 0, limit: planLimits.resumeTailoring };
      setUsageData(tailoringUsage);
      
      // Check if user can create tailored resume (only for final step)
      const permission = canPerformAction('resumeTailoring', 1);
      setCanCreateTailoredResume(permission.allowed);
      
      if (!permission.allowed) {
        setShowUpgradePrompt(true);
      } else {
        setShowUpgradePrompt(false);
      }
    }
  }, [usage, planLimits, canPerformAction]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch job details
      const jobData = await jobService.getJobById(jobId);
      setJob(jobData);
      
      // Fetch resume details
      const resumeData = await resumeService.getResumeById(resumeId);
      setResume(resumeData.resume);
      
      // If no match analysis exists, create one
      if (!jobData.matchAnalysis || !jobData.matchAnalysis.overallScore) {
        await jobService.matchResumeWithJob(jobId, resumeId);
        // Refresh job data to get match analysis
        const updatedJobData = await jobService.getJobById(jobId);
        setJob(updatedJobData);
      }
      
      // Get tailoring recommendations (NO USAGE TRACKING HERE)
      const tailoringResult = await jobService.getTailoringRecommendations(jobId, resumeId);
      setTailoringData(tailoringResult.tailoringResult);
      
      setActiveStep(1); // Move to recommendations step
    } catch (err) {
      console.error('Error fetching tailoring data:', err);
      
      // Check if it's a different kind of error (not usage limits)
      if (err.response?.status === 403 && err.response?.data?.upgradeRequired) {
        setError(err.response.data.message);
        setShowUpgradePrompt(true);
      } else {
        setError('Failed to load tailoring data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleUpgrade = () => {
    // Navigate to pricing/subscription page
    window.open('/pricing', '_blank');
  };

  const handleSaveTailoredResume = async () => {
    if (!versionName) {
      showSnackbar('Please provide a name for your tailored resume', 'warning');
      return;
    }

    // Final usage check before submission (this is where usage should be checked)
    const permission = canPerformAction('resumeTailoring', 1);
    if (!permission.allowed) {
      setError(permission.reason);
      setShowUpgradePrompt(true);
      showSnackbar('Resume tailoring limit reached. Please upgrade your plan.', 'error');
      return;
    }
    
    setTailoringSaving(true);
    
    try {
      console.log('Creating tailored resume with options:', {
        name: versionName,
        notes: versionNotes
      });
      
      // Call API to create tailored resume (THIS IS WHERE USAGE IS TRACKED)
      const response = await resumeService.createTailoredResume(resumeId, jobId, {
        name: versionName,
        notes: versionNotes
      });
      
      console.log('Tailored resume creation response:', response);
      
      // Show success message with analysis info
      const analysisInfo = response.resume?.analysis?.overallScore 
        ? ` (New Resume Score: ${response.resume.analysis.overallScore}%)`
        : '';
      
      showSnackbar(`Tailored resume created successfully!${analysisInfo}`, 'success');
      
      // Wait a moment, then show success and navigate
      setTimeout(async () => {
        // Show final success message
        showSnackbar('✅ Tailored resume created and job match updated!', 'success');
        
        // Navigate to the new tailored resume detail page
        if (response.resume?.id) {
          setTimeout(() => {
            navigate(`/resumes/${response.resume.id}`);
          }, 1500);
        } else {
          // Fallback to resumes list
          setTimeout(() => {
            navigate('/resumes');
          }, 1500);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error saving tailored resume:', error);
      
      // Handle specific usage limit errors
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        setError(error.response.data.message);
        setShowUpgradePrompt(true);
        setCanCreateTailoredResume(false);
        showSnackbar('Resume tailoring limit reached. Please upgrade your plan.', 'error');
      } else {
        let errorMessage = 'Failed to create tailored resume. Please try again.';
        
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showSnackbar(errorMessage, 'error');
      }
      setTailoringSaving(false);
    }
  };

  // Calculate usage percentage and status
  const usagePercentage = usageData ? getUsagePercentage('resumeTailoring') : 0;
  const isApproachingLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100 || !canCreateTailoredResume;

  // Usage status color
  const getUsageColor = () => {
    if (isAtLimit) return 'error';
    if (isApproachingLimit) return 'warning';
    return 'success';
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ my: 2 }}>
            <Typography variant="body1" gutterBottom>
              Analyzing resume match with job description...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 4 }}>
              <CircularProgress size={60} />
            </Box>
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ my: 2 }}>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Tailoring Recommendations
            </Typography>
            
            <Grid container spacing={3}>
              {/* Summary Recommendations */}
              <Grid item xs={12}>
                <Accordion 
                  defaultExpanded
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': {
                      display: 'none',
                    },
                    mb: 2
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SmartToyIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Professional Summary
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            height: '100%',
                            borderRadius: 2,
                            borderColor: theme.palette.divider,
                            boxShadow: 'none'
                          }}
                        >
                          <CardHeader 
                            title="Original Version" 
                            titleTypographyProps={{ 
                              variant: 'subtitle2', 
                              fontWeight: 600,
                              color: theme.palette.text.primary
                            }} 
                            sx={{ 
                              p: 2, 
                              pb: 1,
                              backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            }}
                          />
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {tailoringData?.summary?.original || "No summary found in original resume."}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            height: '100%',
                            borderRadius: 2,
                            borderColor: theme.palette.success.main,
                            backgroundColor: alpha(theme.palette.success.main, 0.05),
                            boxShadow: 'none'
                          }}
                        >
                          <CardHeader 
                            title="Tailored Version" 
                            titleTypographyProps={{ 
                              variant: 'subtitle2', 
                              fontWeight: 600,
                              color: theme.palette.text.primary 
                            }} 
                            sx={{ 
                              p: 2, 
                              pb: 1,
                              backgroundColor: alpha(theme.palette.success.main, 0.12),
                              borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                            }}
                          />
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {tailoringData?.summary?.tailored || "No tailored summary available."}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              {/* Experience Improvements */}
              <Grid item xs={12}>
                <Accordion 
                  defaultExpanded
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': {
                      display: 'none',
                    },
                    mb: 2
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WorkOutlineIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Experience Improvements
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    {tailoringData?.experienceImprovements?.length > 0 ? (
                      tailoringData.experienceImprovements.map((exp, index) => (
                        <Box key={index} sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <BusinessIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                            <Typography variant="subtitle1" fontWeight={600}>
                              {exp.company} - {exp.position}
                            </Typography>
                          </Box>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                              <Card 
                                variant="outlined" 
                                sx={{ 
                                  mb: 2,
                                  borderRadius: 2,
                                  borderColor: theme.palette.divider,
                                  boxShadow: 'none'
                                }}
                              >
                                <CardHeader 
                                  title="Original Bullet Points" 
                                  titleTypographyProps={{ 
                                    variant: 'subtitle2', 
                                    fontWeight: 600,
                                    color: theme.palette.text.primary
                                  }} 
                                  sx={{ 
                                    p: 2, 
                                    pb: 1.5,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                  }}
                                />
                                <CardContent sx={{ p: 2 }}>
                                  <List dense disablePadding>
                                    {exp.original.map((bullet, i) => (
                                      <ListItem key={i} sx={{ px: 1, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                          <FormatListBulletedIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary={bullet} 
                                          primaryTypographyProps={{ 
                                            variant: 'body2',
                                            color: 'text.secondary' 
                                          }} 
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Card 
                                variant="outlined" 
                                sx={{ 
                                  mb: 2,
                                  borderRadius: 2,
                                  borderColor: theme.palette.success.main,
                                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                                  boxShadow: 'none'
                                }}
                              >
                                <CardHeader 
                                  title="Tailored Bullet Points" 
                                  titleTypographyProps={{ 
                                    variant: 'subtitle2', 
                                    fontWeight: 600,
                                    color: theme.palette.text.primary
                                  }} 
                                  sx={{ 
                                    p: 2, 
                                    pb: 1.5,
                                    backgroundColor: alpha(theme.palette.success.main, 0.12),
                                    borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                                  }}
                                />
                                <CardContent sx={{ p: 2 }}>
                                  <List dense disablePadding>
                                    {exp.tailored.map((bullet, i) => (
                                      <ListItem key={i} sx={{ px: 1, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                          <CheckCircleIcon fontSize="small" color="success" />
                                        </ListItemIcon>
                                        <ListItemText 
                                          primary={bullet} 
                                          primaryTypographyProps={{ 
                                            variant: 'body2',
                                            color: 'text.secondary'  
                                          }} 
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>
                          {index < tailoringData.experienceImprovements.length - 1 && <Divider sx={{ my: 3 }} />}
                        </Box>
                      ))
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No experience improvements recommended.
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              {/* Skills Improvements */}
              <Grid item xs={12}>
                <Accordion 
                  defaultExpanded
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': {
                      display: 'none',
                    },
                    mb: 2
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CropFreeIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Skills Recommendations
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <LightbulbIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                          Skills to Add
                        </Typography>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2,
                            borderColor: theme.palette.primary.main,
                            backgroundColor: alpha(theme.palette.primary.main, 0.05)
                          }}
                        >
                          {tailoringData?.skillsImprovements?.skillsToAdd?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {tailoringData.skillsImprovements.skillsToAdd.map((skill, index) => (
                                <Chip 
                                  key={index} 
                                  label={skill} 
                                  color="primary"
                                  variant="outlined"
                                  sx={{ borderRadius: 6 }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No additional skills recommended.
                            </Typography>
                          )}
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: theme.palette.success.main }} />
                          Skills to Emphasize
                        </Typography>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2,
                            borderColor: theme.palette.success.main,
                            backgroundColor: alpha(theme.palette.success.main, 0.05)
                          }}
                        >
                          {tailoringData?.skillsImprovements?.skillsToEmphasize?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {tailoringData.skillsImprovements.skillsToEmphasize.map((skill, index) => (
                                <Chip 
                                  key={index} 
                                  label={skill} 
                                  color="success"
                                  variant="outlined"
                                  sx={{ borderRadius: 6 }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No skills to emphasize recommended.
                            </Typography>
                          )}
                        </Card>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              {/* Keyword Suggestions */}
              <Grid item xs={12}>
                <Accordion 
                  defaultExpanded
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': {
                      display: 'none',
                    },
                    mb: 2
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <KeyboardIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Keyword Suggestions
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Including these keywords will boost your resume's ATS compatibility and relevance for this job:
                    </Typography>
                    {tailoringData?.keywordSuggestions?.length > 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        mt: 2,
                        '& .MuiChip-root': {
                          borderRadius: 6
                        }
                      }}>
                        {tailoringData.keywordSuggestions.map((keyword, index) => (
                          <Chip 
                            key={index} 
                            label={keyword} 
                            color="info"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
                        No keyword suggestions available.
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              {/* Format Suggestions */}
              <Grid item xs={12}>
                <Accordion 
                  defaultExpanded
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': {
                      display: 'none',
                    },
                    mb: 2
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 1.5, color: theme.palette.warning.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Format Suggestions
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    {tailoringData?.formatSuggestions?.length > 0 ? (
                      <List sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2, p: 2 }}>
                        {tailoringData.formatSuggestions.map((suggestion, index) => (
                          <ListItem key={index} sx={{ px: 1, py: 0.5 }}>
                            <ListItemIcon>
                              <WarningIcon color="warning" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={suggestion} 
                              primaryTypographyProps={{ color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No format suggestions available.
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              {/* General Advice */}
              <Grid item xs={12}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: 'none'
                  }}
                >
                  <CardHeader 
                    title="General Advice" 
                    avatar={<InfoIcon color="primary" />}
                    titleTypographyProps={{ fontWeight: 600 }}
                    sx={{ 
                      p: 2, 
                      pb: 1.5,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {tailoringData?.generalAdvice || "No general advice available."}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ my: 2 }}>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Create Tailored Resume
            </Typography>
            
            <Typography variant="body1" paragraph color="text.secondary">
              Based on the recommendations, we'll create a tailored version of your resume 
              specifically optimized for this job. The AI will apply all the suggested improvements.
            </Typography>
            
            <Box sx={{ 
              mt: 3, 
              p: 2.5, 
              bgcolor: alpha(theme.palette.info.main, 0.1), 
              borderRadius: 2, 
              display: 'flex', 
              alignItems: 'flex-start',
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
            }}>
              <SmartToyIcon sx={{ mr: 2, color: theme.palette.info.main, mt: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                This will create a new resume in your collection with the AI recommended improvements applied.
                Your original resume will remain unchanged.
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Resume Name
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Enter a name for your tailored resume"
              size="medium"
              disabled={isAtLimit}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              Notes (Optional)
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Add any notes about this tailored version..."
              disabled={isAtLimit}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>
        );
      
      default:
        return null;
    }
  };

  if (loading && activeStep === 0) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/jobs/${jobId}`)}
            sx={{ mb: 4 }}
            variant="outlined"
          >
            Back to Job
          </Button>
          
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom fontWeight={500}>
                Analyzing Resume Match
              </Typography>
              <CircularProgress size={60} thickness={4} sx={{ my: 4 }} />
              <Typography variant="body1" color="text.secondary">
                Please wait while we analyze your resume against the job requirements...
              </Typography>
            </Box>
          </Paper>
        </Box>
      </MainLayout>
    );
  }

  if (error && showUpgradePrompt) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/jobs/${jobId}`)}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            Back to Job
          </Button>
          
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleUpgrade}
                startIcon={<UpgradeIcon />}
                sx={{ fontWeight: 600 }}
              >
                Upgrade Plan
              </Button>
            }
          >
            {error}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Resume Tailoring Limits:</strong><br/>
                • <strong>Free Plan:</strong> 1 tailoring per month<br/>
                • <strong>Casual Plan ($19.99/month):</strong> 25 tailorings per month<br/>
                • <strong>Hunter Plan ($34.99/month):</strong> 50 tailorings per month
              </Typography>
            </Box>
          </Alert>
          
          {usageData && (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Resume Tailoring Usage - {planInfo?.displayName || 'Current Plan'}
                  </Typography>
                  <Chip 
                    label={planLimits?.resumeTailoring === -1 ? 'Unlimited' : `${usageData.used || 0}/${planLimits?.resumeTailoring || 0}`}
                    color="warning"
                    size="small"
                  />
                </Box>
                
                {planLimits?.resumeTailoring !== -1 && (
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(usagePercentage, 100)}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/jobs/${jobId}`)}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            Back to Job
          </Button>
          
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={fetchData}
          >
            Try Again
          </Button>
        </Box>
      </MainLayout>
    );
  }

  if (!job || !resume || !tailoringData) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/jobs/${jobId}`)}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            Back to Job
          </Button>
          
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Unable to load tailoring data. Please try again.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/jobs/${jobId}`)}
          sx={{ mb: 2 }}
          variant="outlined"
        >
          Back to Job
        </Button>
        
        <Paper sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Tailor Resume for {job.title}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {job.company}
              </Typography>
            </Box>
            <Box>
              <Chip 
                label={`Match Score: ${job.matchAnalysis?.overallScore || 0}%`}
                color={getScoreColor(job.matchAnalysis?.overallScore || 0)}
                sx={{ fontWeight: 500, borderRadius: 6, height: 36 }}
              />
            </Box>
          </Box>

          {/* Usage Status Card - Only show on final step */}
          {usageData && activeStep === 2 && (
            <Card 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: `1px solid ${theme.palette[getUsageColor()].main}`,
                backgroundColor: `${theme.palette[getUsageColor()].main}08`
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon color={getUsageColor()} />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Resume Tailoring Usage - {planInfo?.displayName || 'Current Plan'}
                    </Typography>
                  </Box>
                  <Chip 
                    label={planLimits?.resumeTailoring === -1 ? 'Unlimited' : `${usageData.used || 0}/${planLimits?.resumeTailoring || 0}`}
                    color={getUsageColor()}
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
                
                {planLimits?.resumeTailoring !== -1 && (
                  <Box sx={{ mb: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(usagePercentage, 100)}
                      color={getUsageColor()}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  {planLimits?.resumeTailoring === -1 
                    ? '✨ You have unlimited resume tailoring with your Hunter plan!'
                    : isAtLimit 
                      ? '⚠️ You\'ve reached your monthly limit. Upgrade to tailor more resumes.'
                      : isApproachingLimit
                        ? '⚠️ You\'re approaching your monthly limit.'
                        : `🎯 ${planLimits?.resumeTailoring - (usageData.used || 0)} tailorings remaining this month.`
                  }
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Alert for at-limit users - Only show on final step */}
          {isAtLimit && activeStep === 2 && (
            <Alert 
              severity="warning" 
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleUpgrade}
                  startIcon={<UpgradeIcon />}
                  sx={{ fontWeight: 600 }}
                >
                  Upgrade Plan
                </Button>
              }
            >
              You've reached your resume tailoring limit for this month.
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  • <strong>Casual Plan ($19.99/month):</strong> 25 tailorings per month<br/>
                  • <strong>Hunter Plan ($34.99/month):</strong> 50 tailorings per month
                </Typography>
              </Box>
            </Alert>
          )}
          
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              mb: 4,
              '& .MuiStepLabel-root': {
                '& .MuiStepLabel-iconContainer': {
                  '& .MuiStepIcon-root': {
                    '&.Mui-active': {
                      color: theme.palette.primary.main,
                    },
                    '&.Mui-completed': {
                      color: theme.palette.success.main,
                    },
                  },
                },
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {renderStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/jobs/${jobId}`)}
              sx={{ mr: 1, borderRadius: 2 }}
            >
              Cancel
            </Button>
            
            <Box>
              {activeStep === 2 && (
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ mr: 1, borderRadius: 2 }}
                  disabled={loading || tailoringSaving}
                >
                  Back to Recommendations
                </Button>
              )}
              
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  disabled={loading || activeStep === 0}
                  sx={{ borderRadius: 2 }}
                >
                  Next
                </Button>
              ) : isAtLimit ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleUpgrade}
                  startIcon={<UpgradeIcon />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  Upgrade to Continue
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveTailoredResume}
                  startIcon={tailoringSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={tailoringSaving || !canCreateTailoredResume}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  {tailoringSaving ? 'Creating...' : 'Create Tailored Resume'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%', borderRadius: 2 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

// Helper function to get color based on score
const getScoreColor = (score) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

export default ResumeTailoring;