// src/components/resumes/ResumeWithAssistant.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Fab,
  Tooltip,
  Chip,
  Alert,
  Zoom,
  useTheme,
  alpha
} from '@mui/material';
import {
  SmartToy as RobotIcon,
  AutoFixHigh as SuggestionIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import AiAssistantWidget from '../assistant/AiAssistantWidget';
import resumeService from '../../utils/resumeService';
import assistantService from '../../utils/assistantService';
import MainLayout from '../layout/MainLayout';

const ResumeWithAssistant = () => {
  const theme = useTheme();
  const { id: resumeId } = useParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assistantActive, setAssistantActive] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    if (resumeId) {
      fetchResume();
    }
  }, [resumeId]);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const resumeData = await resumeService.getResumeById(resumeId);
      setResume(resumeData);
    } catch (err) {
      console.error('Error fetching resume:', err);
      setError('Failed to load resume');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpdate = async (changes) => {
    try {
      // Apply changes to resume
      const updatedResume = await assistantService.applyResumeChanges(resumeId, changes);
      setResume(updatedResume.resume);
      
      // Show success feedback
      setPendingSuggestions(prev => prev.filter(s => s.id !== changes.id));
      
    } catch (error) {
      console.error('Error applying resume changes:', error);
    }
  };

  const handleAssistantToggle = () => {
    setShowAssistant(!showAssistant);
  };

  const ResumePreview = () => (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        height: 'fit-content',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          {resume?.name || 'Resume Preview'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Resume">
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {/* Navigate to edit */}}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip title="Preview Resume">
            <Button
              variant="outlined"
              size="small"
              startIcon={<PreviewIcon />}
              onClick={() => {/* Open preview */}}
            >
              Preview
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Resume Sections */}
      {resume?.parsedData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Contact Info */}
          {resume.parsedData.contactInfo && (
            <Box>
              <Typography variant="h6" fontWeight={500} sx={{ mb: 1, color: theme.palette.primary.main }}>
                Contact Information
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {resume.parsedData.contactInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {resume.parsedData.contactInfo.email} | {resume.parsedData.contactInfo.phone}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {resume.parsedData.contactInfo.location}
              </Typography>
            </Box>
          )}

          {/* Summary */}
          {resume.parsedData.summary && (
            <Box>
              <Typography variant="h6" fontWeight={500} sx={{ mb: 1, color: theme.palette.primary.main }}>
                Professional Summary
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {resume.parsedData.summary}
              </Typography>
            </Box>
          )}

          {/* Experience */}
          {resume.parsedData.experience?.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={500} sx={{ mb: 2, color: theme.palette.primary.main }}>
                Experience
              </Typography>
              {resume.parsedData.experience.slice(0, 3).map((exp, index) => (
                <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < 2 ? `1px solid ${theme.palette.divider}` : 'none' }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {exp.title} at {exp.company}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {exp.startDate} - {exp.endDate || 'Present'} | {exp.location}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {exp.description}
                  </Typography>
                  {exp.highlights?.length > 0 && (
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                      {exp.highlights.slice(0, 3).map((highlight, i) => (
                        <Typography component="li" variant="body2" key={i} sx={{ mb: 0.5 }}>
                          {highlight}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Skills */}
          {resume.parsedData.skills?.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={500} sx={{ mb: 2, color: theme.palette.primary.main }}>
                Skills
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {resume.parsedData.skills.slice(0, 12).map((skill, index) => (
                  <Chip
                    key={index}
                    label={typeof skill === 'string' ? skill : skill.name}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
                  />
                ))}
                {resume.parsedData.skills.length > 12 && (
                  <Chip
                    label={`+${resume.parsedData.skills.length - 12} more`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Education */}
          {resume.parsedData.education?.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={500} sx={{ mb: 2, color: theme.palette.primary.main }}>
                Education
              </Typography>
              {resume.parsedData.education.map((edu, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {edu.degree} in {edu.field}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {edu.institution} | {edu.endDate}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );

  const AssistantPanel = () => (
    <Box sx={{ position: 'sticky', top: 24 }}>
      {/* AI Suggestions Banner */}
      {pendingSuggestions.length > 0 && (
        <Alert 
          severity="info" 
          icon={<SuggestionIcon />}
          sx={{ 
            mb: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            borderRadius: 2
          }}
          action={
            <Button 
              size="small" 
              onClick={handleAssistantToggle}
              sx={{ color: theme.palette.info.main }}
            >
              Review
            </Button>
          }
        >
          AJ has {pendingSuggestions.length} suggestion{pendingSuggestions.length > 1 ? 's' : ''} for your resume
        </Alert>
      )}

      {/* Assistant Status */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          borderRadius: 2,
          background: `linear-gradient(45deg, ${alpha(theme.palette.secondary.main, 0.05)} 30%, ${alpha(theme.palette.secondary.light, 0.05)} 90%)`,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <RobotIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} />
          <Typography variant="h6" fontWeight={500}>
            AJ Assistant
          </Typography>
          {assistantActive && (
            <Chip 
              label="Active" 
              size="small" 
              color="success" 
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Your AI career assistant is ready to help optimize your resume and provide career guidance.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ChatIcon />}
            onClick={handleAssistantToggle}
            size="small"
            fullWidth
          >
            Chat with AJ
          </Button>
        </Box>

        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary">
            Quick Actions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            <Chip 
              label="Analyze Resume" 
              size="small" 
              variant="outlined" 
              clickable
              onClick={() => {/* Handle quick action */}}
            />
            <Chip 
              label="Improve Summary" 
              size="small" 
              variant="outlined" 
              clickable
            />
            <Chip 
              label="Enhance Skills" 
              size="small" 
              variant="outlined" 
              clickable
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography>Loading resume...</Typography>
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: '1400px', mx: 'auto' }}>
        <Grid container spacing={3}>
          {/* Main Resume Content */}
          <Grid item xs={12} md={8}>
            <ResumePreview />
          </Grid>

          {/* AI Assistant Panel */}
          <Grid item xs={12} md={4}>
            <AssistantPanel />
          </Grid>
        </Grid>

        {/* AI Assistant Widget */}
        {showAssistant && (
          <Zoom in={showAssistant}>
            <Box>
              <AiAssistantWidget
                resumeId={resumeId}
                resumeData={resume?.parsedData}
                onResumeUpdate={handleResumeUpdate}
                position={{ bottom: 100, right: 24 }}
              />
            </Box>
          </Zoom>
        )}

        {/* Floating Assistant Button (when not shown in panel) */}
        {!showAssistant && (
          <Zoom in={!showAssistant}>
            <Fab
              color="secondary"
              onClick={handleAssistantToggle}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
                boxShadow: '0 8px 24px rgba(0, 196, 180, 0.3)',
                '&:hover': {
// Continuation of ResumeWithAssistant.js

                  background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 30%, ${theme.palette.secondary.main} 90%)`,
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <RobotIcon sx={{ fontSize: 28 }} />
            </Fab>
          </Zoom>
        )}
      </Box>
    </MainLayout>
  );
};

export default ResumeWithAssistant;