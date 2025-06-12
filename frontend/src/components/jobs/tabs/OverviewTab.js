// src/components/jobs/tabs/OverviewTab.js
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
  Chip
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
  Star as StarIcon
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
                          <ListItemText primary={strength} />
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
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText primary="No matching skills found." />
                        </ListItem>
                      )}
                    </List>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: theme.palette.warning.main,
                    fontWeight: 600
                  }}>
                    <WarningIcon sx={{ mr: 1 }} /> Areas for Improvement
                  </Typography>
                  <List dense>
                    {job.matchAnalysis.improvementSuggestions && job.matchAnalysis.improvementSuggestions.length > 0 ? (
                      job.matchAnalysis.improvementSuggestions.slice(0, 4).map((suggestion, index) => (
                        <ListItem key={index} sx={{ 
                          backgroundColor: `${theme.palette.warning.main}15`, 
                          borderRadius: 2, 
                          mb: 1,
                          px: 2 
                        }}>
                          <ListItemIcon>
                            <LightbulbIcon color="warning" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={suggestion} />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No improvement suggestions available." />
                      </ListItem>
                    )}
                  </List>
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
                  Get Tailored Resume
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
                Get Tailored Resume
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
                      Skills are color-coded by importance: <span style={{ color: theme.palette.error.main }}>Critical</span>, 
                      <span style={{ color: theme.palette.warning.main }}> Important</span>, 
                      <span style={{ color: theme.palette.info.main }}> Nice-to-have</span>
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
                                <ListItemText primary={qual} />
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
                                <ListItemText primary={qual} />
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