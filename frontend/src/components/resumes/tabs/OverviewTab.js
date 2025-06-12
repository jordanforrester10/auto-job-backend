// src/components/resumes/tabs/OverviewTab.js
import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  BusinessCenter as BusinessCenterIcon,
  Timeline as TimelineIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import ScoreDisplay from '../components/ScoreDisplay';

/**
 * Overview tab component showing resume scores, strengths, and profile summary
 * @param {object} props - Component props
 * @param {object} props.resume - Resume data
 * @param {object} props.theme - MUI theme object
 * @returns {JSX.Element} Overview tab content
 */
const OverviewTab = ({ resume, theme }) => {
  const COLORS = [
    theme.palette.primary.main, 
    theme.palette.secondary.main, 
    theme.palette.success.main, 
    theme.palette.warning.main, 
    theme.palette.error.main,
    theme.palette.info.main
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        {/* Resume Scores Card */}
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Resume Scores" 
            avatar={<CheckCircleIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
            <ScoreDisplay 
              value={resume.analysis?.overallScore || 0} 
              label="Overall Score"
            />
            
            <Box sx={{ width: '100%', mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1">ATS Compatibility</Typography>
                <Typography variant="h6" fontWeight="medium">
                  {resume.analysis?.atsCompatibility || 0}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={resume.analysis?.atsCompatibility || 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Profile Summary Card */}
        {resume.analysis?.profileSummary && (
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Professional Profile" 
              avatar={<PersonIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <List disablePadding>
                <ListItem disableGutters sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <BusinessCenterIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Current Role" 
                    secondary={resume.analysis.profileSummary.currentRole || 'Not specified'}
                  />
                </ListItem>
                
                <ListItem disableGutters sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <TimelineIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Career Level" 
                    secondary={resume.analysis.profileSummary.careerLevel || 'Mid-level'}
                  />
                </ListItem>
              </List>
              
              {resume.analysis.profileSummary.suggestedJobTitles?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Suggested Job Titles
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {resume.analysis.profileSummary.suggestedJobTitles.map((title, index) => (
                      <Chip 
                        key={index} 
                        label={title} 
                        size="small" 
                        variant="outlined" 
                        color="primary" 
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Grid>

      <Grid item xs={12} md={8}>
        {/* Strengths & Weaknesses */}
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Strengths & Improvement Areas" 
            avatar={<CheckCircleIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom color="success.main" fontWeight={600}>
                  <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Strengths
                </Typography>
                <List dense>
                  {(resume.analysis?.strengths || []).map((strength, index) => (
                    <ListItem key={index} sx={{ 
                      backgroundColor: `${theme.palette.success.main}10`, 
                      borderRadius: 2, 
                      mb: 1,
                      px: 2
                    }}>
                      <ListItemText primary={strength} />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom color="warning.main" fontWeight={600}>
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Improvement Areas
                </Typography>
                <List dense>
                  {(resume.analysis?.weaknesses || []).map((weakness, index) => (
                    <ListItem key={index} sx={{ 
                      backgroundColor: `${theme.palette.warning.main}10`, 
                      borderRadius: 2, 
                      mb: 1,
                      px: 2 
                    }}>
                      <ListItemText primary={weakness} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Keywords */}
        <Card elevation={2} sx={{ borderRadius: 3 }}>
          <CardHeader 
            title="Keyword Recommendations" 
            avatar={<LightbulbIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent>                    
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(resume.analysis?.keywordsSuggestions || []).map((keyword, index) => (
                <Chip 
                  key={index} 
                  label={keyword} 
                  sx={{ 
                    bgcolor: COLORS[index % COLORS.length] + '20',
                    color: COLORS[index % COLORS.length],
                    fontWeight: 500,
                    borderRadius: 2
                  }} 
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;