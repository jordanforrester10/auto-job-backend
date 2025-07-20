// src/components/jobs/tabs/OverviewTab.js - FIXED AREAS FOR IMPROVEMENT LOGIC
import React from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Chip,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
  Code as CodeIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Import our component files
import JobDetailsCard from '../components/JobDetailsCard';
import MatchAnalysisCard from '../components/MatchAnalysisCard';
import SkillChip from '../components/SkillChip';
import AutoJobLogo from '../../common/AutoJobLogo';

const OverviewTab = ({ job, onTailorClick }) => {
  const theme = useTheme();

  // Safe AutoJobLogo wrapper component
  const SafeAutoJobLogo = ({ size = 'small' }) => {
    try {
      return (
        <AutoJobLogo 
          variant="icon-only" 
          size={size} 
          showTagline={false}
        />
      );
    } catch (error) {
      // Fallback to SmartToy icon if AutoJobLogo fails
      console.warn('AutoJobLogo failed to render:', error);
      return <SmartToyIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
    }
  };

  // Enhanced logic to check for valid improvement suggestions
  const hasValidImprovements = job.matchAnalysis?.improvementSuggestions && 
                              Array.isArray(job.matchAnalysis.improvementSuggestions) &&
                              job.matchAnalysis.improvementSuggestions.length > 0 &&
                              job.matchAnalysis.improvementSuggestions.some(suggestion => 
                                suggestion && suggestion.trim().length > 0
                              );

  // Get filtered improvement suggestions (remove empty ones)
  const validImprovementSuggestions = hasValidImprovements 
    ? job.matchAnalysis.improvementSuggestions.filter(suggestion => 
        suggestion && suggestion.trim().length > 0
      )
    : [];

  // Enhanced logic for missing skills as fallback improvements
  const missingSkillsAsImprovements = job.matchAnalysis?.missingSkills && 
                                     Array.isArray(job.matchAnalysis.missingSkills) &&
                                     job.matchAnalysis.missingSkills.length > 0
    ? job.matchAnalysis.missingSkills.map(skill => {
        const skillName = skill && typeof skill === 'object' ? skill.skill : skill;
        const suggestion = skill && typeof skill === 'object' && skill.suggestionToAdd 
          ? skill.suggestionToAdd 
          : `Consider adding experience with ${skillName} to better match this role's requirements`;
        return suggestion;
      })
    : [];

  // Combine improvement suggestions and missing skills
  const allImprovements = [
    ...validImprovementSuggestions,
    ...missingSkillsAsImprovements.slice(0, Math.max(0, 4 - validImprovementSuggestions.length))
  ];

  const overallScore = job.matchAnalysis?.overallScore || 0;

  // Function to determine what type of improvements to show based on score
  const getImprovementContext = (score) => {
    if (score >= 85) return { color: 'success', message: 'Minor optimizations available' };
    if (score >= 70) return { color: 'info', message: 'Good match with enhancement opportunities' };
    if (score >= 50) return { color: 'warning', message: 'Several improvements recommended' };
    return { color: 'error', message: 'Significant improvements needed' };
  };

  const improvementContext = getImprovementContext(overallScore);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        {/* Job Details Card Component */}
        <JobDetailsCard job={job} />
        
        {/* Match Analysis Card Component */}
        <MatchAnalysisCard job={job} />
      </Grid>

      <Grid item xs={12} md={8}>
        {job.matchAnalysis?.overallScore ? (
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Match Insights & Recommendations" 
              avatar={<CheckCircleIcon color="primary" />}
              action={
                job.matchAnalysis.analysisMetadata?.analysisType === 'contextual-personalized' && (
                  <Chip 
                    label="Personalized AI" 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                )
              }
              sx={{ 
                pb: 0, 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: theme.palette.success.main,
                    fontWeight: 600
                  }}>
                    <CheckCircleIcon sx={{ mr: 1 }} /> Your Strengths
                  </Typography>
                  
                  {/* Show strengths from new enhanced matching */}
                  {job.matchAnalysis.strengthsHighlight && job.matchAnalysis.strengthsHighlight.length > 0 ? (
                    <List dense>
                      {job.matchAnalysis.strengthsHighlight.map((strength, index) => (
                        <ListItem key={index} sx={{ 
                          backgroundColor: `${theme.palette.success.main}15`, 
                          borderRadius: 2, 
                          mb: 1,
                          px: 2
                        }}>
                          <ListItemIcon>
                            <StarIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={strength}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    /* Fallback to matched skills */
                    <List dense>
                      {job.matchAnalysis.matchedSkills && job.matchAnalysis.matchedSkills.filter(s => s.found).length > 0 ? (
                        job.matchAnalysis.matchedSkills.filter(s => s.found).slice(0, 4).map((skill, index) => (
                          <ListItem key={index} sx={{ 
                            backgroundColor: `${theme.palette.success.main}15`, 
                            borderRadius: 2, 
                            mb: 1,
                            px: 2
                          }}>
                            <ListItemIcon>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={skill.skill} 
                              secondary={skill.matchQuality ? `${skill.matchQuality} match` : null}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          <Typography variant="body2">
                            Skills analysis in progress. Try refreshing for detailed insights.
                          </Typography>
                        </Alert>
                      )}
                    </List>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: theme.palette[improvementContext.color].main,
                    fontWeight: 600
                  }}>
                    <WarningIcon sx={{ mr: 1 }} /> Areas for Improvement
                  </Typography>

                  {/* Enhanced improvement suggestions logic */}
                  {allImprovements.length > 0 ? (
                    <>
                      {/* Context alert based on score */}
                      <Alert 
                        severity={improvementContext.color} 
                        sx={{ mb: 2, borderRadius: 2 }} 
                        icon={overallScore >= 70 ? <InfoIcon /> : <WarningIcon />}
                      >
                        <Typography variant="body2">
                          {improvementContext.message} (Score: {overallScore}%)
                        </Typography>
                      </Alert>

                      <List dense>
                        {allImprovements.slice(0, 4).map((suggestion, index) => (
                          <ListItem key={index} sx={{ 
                            backgroundColor: `${theme.palette[improvementContext.color].main}15`, 
                            borderRadius: 2, 
                            mb: 1,
                            px: 2 
                          }}>
                            <ListItemIcon>
                              <LightbulbIcon color={improvementContext.color} fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={suggestion}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : (
                    /* Enhanced fallback message based on score */
                    <Alert 
                      severity={overallScore >= 85 ? "success" : "info"} 
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {overallScore >= 85 
                          ? 'Excellent match!' 
                          : overallScore >= 70 
                          ? 'Strong alignment detected!' 
                          : 'Analysis in progress...'}
                      </Typography>
                      <Typography variant="body2">
                        {overallScore >= 85 
                          ? 'Your resume shows outstanding alignment with this role. Minor optimizations through tailoring could perfect your application.'
                          : overallScore >= 70 
                          ? 'Your qualifications align well with this position. A tailored resume could highlight your strongest matches.'
                          : overallScore > 0 
                          ? 'Our AI is analyzing improvement opportunities based on your specific background and this job\'s requirements.'
                          : 'Complete the resume analysis to get personalized improvement recommendations.'}
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SafeAutoJobLogo size="small" />}
                  onClick={onTailorClick}
                  sx={{ borderRadius: 2, py: 1.2 }}
                >
                  {overallScore >= 80 
                    ? 'Perfect Your Resume' 
                    : overallScore >= 60 
                    ? 'Optimize Your Resume' 
                    : 'Transform Your Resume'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Tailor My Resume To This Job" 
              avatar={<PsychologyIcon color="primary" />}
              sx={{ 
                pb: 1, 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Box 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  border: '3px dashed', 
                  borderColor: 'primary.main',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 3,
                  mx: 'auto'
                }}
              >
                <SafeAutoJobLogo size="medium" />
              </Box>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Tailor My Resume To This Job
              </Typography>
              <Typography variant="body1" paragraph sx={{ mb: 3, mx: 'auto', maxWidth: 600 }}>
                Get intelligent insights by matching your resume with this job. Our enhanced AI will analyze skills, experience, 
                and education to provide accurate compatibility scores and personalized recommendations.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SafeAutoJobLogo size="small" />}
                onClick={onTailorClick}
                sx={{ borderRadius: 2, px: 3, py: 1.2 }}
              >
                Start Contextual Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Key Requirements */}
        {job.parsedData && (
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Job Requirements Analysis" 
              avatar={<AssignmentIcon color="primary" />}
              sx={{ 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                {job.parsedData.keySkills && job.parsedData.keySkills.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <CodeIcon sx={{ mr: 1 }} /> Required Skills
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Skills are color-coded by importance and match status: <span style={{ color: theme.palette.success.main }}>Matched</span>, 
                      <span style={{ color: theme.palette.error.main }}> Missing Critical</span>, 
                      <span style={{ color: theme.palette.warning.main }}> Missing Important</span>, 
                      <span style={{ color: theme.palette.info.main }}> Missing Nice-to-have</span>
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1.5,
                      p: 2,
                      bgcolor: 'rgba(0,0,0,0.02)',
                      borderRadius: 2
                    }}>
                      {job.parsedData.keySkills && job.parsedData.keySkills.map((skill, index) => {
                        const skillName = skill && typeof skill === 'object' ? (skill.name || skill.skill || '') : skill;
                        const matchedSkill = job.matchAnalysis?.matchedSkills?.find(s => 
                          (s.skill === skillName) || 
                          (typeof s.skill === 'object' && s.skill.name === skillName)
                        );
                        const isMatched = matchedSkill?.found || false;
                        
                        return (
                          <SkillChip
                            key={`key-skill-${index}`}
                            skill={skill}
                            isMatched={isMatched}
                            importance={skill && typeof skill === 'object' ? skill.importance : undefined}
                            matchQuality={matchedSkill?.matchQuality}
                          />
                        );
                      })}
                    </Box>
                  </Grid>
                )}

                {job.parsedData.qualifications && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <SchoolIcon sx={{ mr: 1 }} /> Qualifications
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0,0,0,0.02)',
                      borderRadius: 2
                    }}>
                      {job.parsedData.qualifications.required && job.parsedData.qualifications.required.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: theme.palette.secondary.main }}>
                            Required Qualifications:
                          </Typography>
                          <List dense disablePadding>
                            {job.parsedData.qualifications.required.slice(0, 5).map((qual, index) => (
                              <ListItem key={index} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                  <CheckCircleIcon fontSize="small" color="secondary" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={qual}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {job.parsedData.qualifications.preferred && job.parsedData.qualifications.preferred.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: theme.palette.info.main }}>
                            Preferred Qualifications:
                          </Typography>
                          <List dense disablePadding>
                            {job.parsedData.qualifications.preferred.slice(0, 3).map((qual, index) => (
                              <ListItem key={index} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                  <CheckCircleIcon fontSize="small" color="info" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={qual}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}

                {/* Enhanced job metadata */}
                {(job.parsedData.industryContext || job.parsedData.roleCategory || job.parsedData.technicalComplexity) && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <InfoIcon sx={{ mr: 1 }} /> Job Context
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0,0,0,0.02)',
                      borderRadius: 2
                    }}>
                      {job.parsedData.industryContext && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">Industry:</Typography>
                          <Typography variant="body1" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                            {job.parsedData.industryContext}
                          </Typography>
                        </Box>
                      )}
                      {job.parsedData.roleCategory && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">Role Category:</Typography>
                          <Typography variant="body1" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                            {job.parsedData.roleCategory.replace('-', ' ')}
                          </Typography>
                        </Box>
                      )}
                      {job.parsedData.technicalComplexity && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">Technical Complexity:</Typography>
                          <Chip 
                            label={job.parsedData.technicalComplexity} 
                            size="small" 
                            color={
                              job.parsedData.technicalComplexity === 'high' ? 'error' :
                              job.parsedData.technicalComplexity === 'medium' ? 'warning' : 'success'
                            }
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      )}
                      
                      {/* Add contextual analysis info */}
                      {job.matchAnalysis?.analysisMetadata?.analysisType === 'contextual-personalized' && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="body2" color="text.secondary">Analysis Type:</Typography>
                          <Chip 
                            label="Personalized AI Analysis" 
                            size="small" 
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
};

export default OverviewTab;