// src/components/resumes/tabs/AnalysisTab.js
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  ArrowUpward as ArrowUpwardIcon,
  Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { renderImprovedSnippet } from '../utils/resumeHelpers';

/**
 * Analysis tab component showing detailed improvement areas and recommendations
 * @param {object} props - Component props
 * @param {object} props.resume - Resume data
 * @param {object} props.theme - MUI theme object
 * @returns {JSX.Element} Analysis tab content
 */
const AnalysisTab = ({ resume, theme }) => {
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
      <Grid item xs={12}>
        <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
          <CardHeader 
            title="Detailed Improvement Areas" 
            avatar={<ArrowUpwardIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent sx={{ pb: 1 }}>
            {(resume.analysis?.improvementAreas || []).map((area, index) => (
              <Accordion 
                key={index} 
                defaultExpanded={index === 0}
                sx={{ 
                  mb: 2, 
                  borderRadius: '8px !important', 
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' 
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {area.section}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {(area.suggestions || []).map((suggestion, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <LightbulbIcon fontSize="small" color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                  
                  {area.improvedSnippets && area.improvedSnippets.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ 
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        AI-Enhanced Examples
                      </Typography>
                      {area.improvedSnippets.map((snippet) => (
                        renderImprovedSnippet(snippet, theme)
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ 
                        color: theme.palette.primary.main,
                        fontWeight: 600
                      }}>
                        No examples available for this section
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Keyword Recommendations" 
            avatar={<LightbulbIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Including these keywords will boost your resume's ATS compatibility and relevance for your target roles:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
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
            
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(33, 150, 243, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(33, 150, 243, 0.2)',
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <CheckCircleIcon color="info" sx={{ mr: 1.5, mt: 0.5 }} />
              <Typography variant="body2">
                Using these keywords strategically throughout your resume helps you pass through Applicant Tracking Systems (ATS) and catch the attention of recruiters looking for these specific skills and qualifications.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {resume.analysis?.profileSummary && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Career Path Analysis" 
              avatar={<TimelineIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                      Current Profile
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="body1" fontWeight={500} paragraph>
                        {resume.analysis.profileSummary.currentRole || 'Product Manager'}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Career Level: {resume.analysis.profileSummary.careerLevel || 'Mid-Senior'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Industry Experience:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(resume.analysis.profileSummary.industries || ['Software', 'SaaS', 'Enterprise']).map((industry, index) => (
                          <Chip 
                            key={index} 
                            label={industry} 
                            size="small" 
                            sx={{ 
                              bgcolor: `${theme.palette.primary.main}20`,
                              color: theme.palette.primary.main 
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                      Career Progression Opportunities
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Suggested Job Titles:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {(resume.analysis.profileSummary.suggestedJobTitles || ['Senior Product Manager', 'Product Lead', 'Director of Product']).map((title, index) => (
                          <Chip 
                            key={index} 
                            label={title} 
                            size="small" 
                            variant="outlined" 
                            color="primary" 
                          />
                        ))}
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Recommended Industries:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(resume.analysis.profileSummary.suggestedIndustries || ['AI/ML', 'FinTech', 'Enterprise SaaS']).map((industry, index) => (
                          <Chip 
                            key={index} 
                            label={industry} 
                            size="small" 
                            sx={{ 
                              bgcolor: `${theme.palette.secondary.main}20`,
                              color: theme.palette.secondary.main
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                      Career Growth Recommendations
                    </Typography>
                    <List dense>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Highlight quantifiable achievements in product launches and user metrics" 
                          secondary="Add specific numbers to demonstrate your impact on business outcomes"
                        />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Showcase strategic thinking and leadership experience" 
                          secondary="Emphasize instances where you've led cross-functional teams or influenced product strategy"
                        />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Emphasize technical skills alongside product management expertise" 
                          secondary="Highlight your understanding of technical concepts, data analysis capabilities, and technical tools"
                        />
                      </ListItem>
                    </List>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default AnalysisTab;