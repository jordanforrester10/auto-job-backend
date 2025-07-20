// src/components/jobs/tabs/AnalysisTab.js - ENHANCED FOR CONTEXTUAL AI RECOMMENDATIONS
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
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Tooltip,
  useTheme,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  SmartToy as SmartToyIcon,
  Lightbulb as LightbulbIcon,
  Code as CodeIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Build as BuildIcon,
  Psychology as PsychologyIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  Engineering as EngineeringIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import SkillChip from '../components/SkillChip';
import AutoJobLogo from '../../common/AutoJobLogo';

const AnalysisTab = ({ job, onTailorClick }) => {
  const theme = useTheme();

  // Safe AutoJobLogo wrapper component
  const SafeAutoJobLogo = ({ iconSize = 'small' }) => {
    try {
      return (
        <AutoJobLogo 
          variant="icon-only" 
          size={iconSize} 
          showTagline={false}
        />
      );
    } catch (error) {
      console.warn('AutoJobLogo failed to render:', error);
      return <SmartToyIcon sx={{ fontSize: iconSize === 'small' ? 16 : 20 }} />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'info';
    if (score >= 55) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    if (score >= 55) return 'Fair Match';
    return 'Needs Improvement';
  };

  const getRecommendationSeverity = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getRecommendationMessage = (score, hasImprovements) => {
    if (score >= 85) {
      return hasImprovements 
        ? 'Excellent match! Just a few minor optimizations suggested.'
        : 'Outstanding match! Your resume aligns exceptionally well with this role.';
    }
    if (score >= 70) {
      return hasImprovements 
        ? 'Good match with room for targeted improvements.'
        : 'Strong alignment with this role. Consider minor enhancements to optimize further.';
    }
    if (score >= 55) {
      return hasImprovements 
        ? 'Moderate match. Several improvements recommended to strengthen your application.'
        : 'Fair match. Focus on highlighting relevant experience and skills for this role.';
    }
    return hasImprovements 
      ? 'Significant gaps identified. Multiple improvements needed to better align with this role.'
      : 'Major improvements needed to better match this job\'s requirements.';
  };

  const getRoleSpecificIcon = (roleCategory) => {
    const iconMap = {
      'data-engineering': <StorageIcon />,
      'software-engineering': <CodeIcon />,
      'product-management': <PsychologyIcon />,
      'data-science': <AnalyticsIcon />,
      'devops': <EngineeringIcon />,
      'design': <BuildIcon />,
      'marketing': <TrendingUpIcon />,
      'sales': <AssignmentIcon />
    };
    return iconMap[roleCategory] || <ComputerIcon />;
  };

  const COLORS = [
    theme.palette.primary.main, 
    theme.palette.secondary.main, 
    theme.palette.success.main, 
    theme.palette.warning.main, 
    theme.palette.error.main,
    theme.palette.info.main
  ];

  // Check if we have role-specific analysis data
  const hasRoleSpecificAnalysis = job.parsedData?.analysisMetadata?.roleSpecificAnalysis;
  const technicalRequirements = job.parsedData?.technicalRequirements || [];
  const toolsAndTechnologies = job.parsedData?.toolsAndTechnologies || [];
  const roleCategory = job.parsedData?.roleCategory || 'general';
  const technicalComplexity = job.parsedData?.technicalComplexity || 'medium';

  if (!job.matchAnalysis?.overallScore) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        textAlign: 'center',
        px: 3,
        py: 6
      }}>
        {/* Enhanced Analysis Available Badge */}
        {hasRoleSpecificAnalysis && (
          <Chip 
            label="✨ Enhanced Role-Specific Analysis Available" 
            color="primary" 
            variant="outlined"
            sx={{ mb: 2, fontWeight: 500 }}
          />
        )}

        {/* Main Icon Container */}
        <Box sx={{ 
          mb: 3,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${theme.palette.primary.main}20`,
              position: 'relative',
              boxShadow: `0px 4px 8px ${theme.palette.primary.main}20`,
            }}
          >
            <AutoAwesomeIcon sx={{ 
              fontSize: 32, 
              color: theme.palette.primary.main
            }} />
          </Box>
        </Box>

        <Typography 
          variant="h5" 
          gutterBottom 
          fontWeight={600}
          sx={{ 
            color: theme.palette.text.primary,
            mb: 1
          }}
        >
          No Match Analysis Available
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: theme.palette.text.secondary,
            mb: 4,
            maxWidth: 500,
            lineHeight: 1.5
          }}
        >
          Get detailed insights by matching your resume with this job. Our enhanced AI will provide contextual, personalized analysis including:
        </Typography>

        {/* Enhanced Features List */}
        <Paper 
          elevation={1}
          sx={{ 
            maxWidth: 520, 
            mb: 4,
            p: 3,
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <List dense sx={{ '& .MuiListItem-root': { py: 0.75 } }}>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Contextual skill matching based on your actual resume content"
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: theme.palette.text.primary
                }}
              />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EngineeringIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Personalized recommendations referencing your specific experience"
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: theme.palette.text.primary
                }}
              />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <TrendingUpIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Gap analysis with actionable steps to improve your match"
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: theme.palette.text.primary
                }}
              />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LightbulbIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Tactical advice for repositioning your background for this role"
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: theme.palette.text.primary
                }}
              />
            </ListItem>
          </List>
        </Paper>

        <Button
          variant="contained"
          size="large"
          onClick={onTailorClick}
          startIcon={<SafeAutoJobLogo iconSize="small" />}
          sx={{ 
            borderRadius: 2,
            px: 4,
            py: 1.2,
            fontSize: '0.95rem',
            fontWeight: 600,
            bgcolor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            boxShadow: theme.shadows[3],
            '&:hover': {
              bgcolor: theme.palette.secondary.dark,
              boxShadow: theme.shadows[6],
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Start Contextual Analysis
        </Button>

        <Typography 
          variant="caption" 
          sx={{ 
            color: theme.palette.text.disabled,
            mt: 3,
            maxWidth: 400
          }}
        >
          Our AI will analyze your specific resume content against this {roleCategory.replace('-', ' ')} role to provide personalized, actionable recommendations.
        </Typography>
      </Box>
    );
  }

  const overallScore = job.matchAnalysis.overallScore || 0;
  
  // Enhanced logic to check for valid improvement suggestions (check both field names)
  const improvementSuggestions = job.matchAnalysis?.improvementSuggestions || 
                                 job.matchAnalysis?.improvementAreas || 
                                 [];
  
  const hasImprovements = Array.isArray(improvementSuggestions) &&
                          improvementSuggestions.length > 0 &&
                          improvementSuggestions.some(suggestion => 
                            suggestion && suggestion.trim().length > 0
                          );
  
  // Debug logging to see what data we have
  console.log('=== DEBUG ANALYSIS TAB ===');
  console.log('Match Analysis:', job.matchAnalysis);
  console.log('Improvement Suggestions:', job.matchAnalysis?.improvementSuggestions);
  console.log('Improvement Areas (legacy):', job.matchAnalysis?.improvementAreas);
  console.log('Final suggestions array:', improvementSuggestions);
  console.log('Has Improvements:', hasImprovements);
  console.log('========================');

  return (
    <Grid container spacing={3}>
      {/* Role-Specific Analysis Header */}
      {hasRoleSpecificAnalysis && (
        <Grid item xs={12}>
          <Alert 
            severity="success" 
            sx={{ 
              borderRadius: 2,
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }
            }}
          >
            {getRoleSpecificIcon(roleCategory)}
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Enhanced Contextual Analysis Complete
              </Typography>
              <Typography variant="body2">
                This analysis was specifically tailored for {roleCategory.replace('-', ' ')} roles with personalized recommendations based on your resume content
              </Typography>
            </Box>
          </Alert>
        </Grid>
      )}

      {/* Overall Match Score with Context */}
      <Grid item xs={12}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Overall Match Analysis" 
            avatar={<SpeedIcon color="primary" />}
            action={
              <Stack direction="row" spacing={1}>
                <Chip 
                  label={getScoreLabel(overallScore)}
                  color={getScoreColor(overallScore)}
                  variant="filled"
                />
                <Chip 
                  label={`Analyzed ${new Date(job.matchAnalysis.lastAnalyzed || Date.now()).toLocaleDateString()}`} 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                />
                {job.matchAnalysis.analysisMetadata?.analysisType === 'contextual-personalized' && (
                  <Chip 
                    label="Personalized" 
                    size="small" 
                    color="primary"
                    variant="filled"
                  />
                )}
              </Stack>
            }
            sx={{ 
              '& .MuiCardHeader-title': { fontWeight: 600 } 
            }}
          />
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <CircularProgress
                variant="determinate"
                value={overallScore}
                size={120}
                thickness={6}
                sx={{ 
                  color: theme.palette[getScoreColor(overallScore)].main,
                  mb: 2
                }}
              />
              <Typography variant="h3" fontWeight={700} color={theme.palette[getScoreColor(overallScore)].main}>
                {overallScore}%
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
                Match Score
              </Typography>
            </Box>

            {/* Score-Based Recommendation Alert */}
            <Alert 
              severity={getRecommendationSeverity(overallScore)}
              sx={{ mb: 3, borderRadius: 2 }}
              icon={overallScore >= 70 ? <CheckCircleIcon /> : 
                    overallScore >= 40 ? <InfoIcon /> : <WarningIcon />}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {getRecommendationMessage(overallScore, hasImprovements)}
              </Typography>
              {overallScore < 60 && (
                <Typography variant="body2">
                  Focus on the improvement suggestions below to significantly boost your match score.
                </Typography>
              )}
            </Alert>

            {/* Category Breakdown */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={job.matchAnalysis.categoryScores?.skills || 0}
                    size={60}
                    thickness={6}
                    sx={{ 
                      color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.skills || 0)].main,
                      mb: 1
                    }}
                  />
                  <Typography variant="h6" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.skills || 0)].main}>
                    {job.matchAnalysis.categoryScores?.skills || 0}%
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={500} color="primary.main">
                    Skills Match
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {job.matchAnalysis.matchedSkills?.filter(s => s.found).length || 0} of {job.matchAnalysis.matchedSkills?.length || 0} matched
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={job.matchAnalysis.categoryScores?.experience || 0}
                    size={60}
                    thickness={6}
                    sx={{ 
                      color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.experience || 0)].main,
                      mb: 1
                    }}
                  />
                  <Typography variant="h6" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.experience || 0)].main}>
                    {job.matchAnalysis.categoryScores?.experience || 0}%
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={500} color="primary.main">
                    Experience Match
                  </Typography>
                  {job.matchAnalysis.experienceAnalysis?.relevantYearsExperience && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {job.matchAnalysis.experienceAnalysis.relevantYearsExperience} years relevant
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={job.matchAnalysis.categoryScores?.education || 0}
                    size={60}
                    thickness={6}
                    sx={{ 
                      color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.education || 0)].main,
                      mb: 1
                    }}
                  />
                  <Typography variant="h6" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.education || 0)].main}>
                    {job.matchAnalysis.categoryScores?.education || 0}%
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={500} color="primary.main">
                    Education Match
                  </Typography>
                  {job.matchAnalysis.educationAnalysis?.degreeMatch && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                      {job.matchAnalysis.educationAnalysis.degreeMatch} requirements
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Enhanced Skills Analysis */}
      <Grid item xs={12} md={6}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3, height: 'fit-content' }}>
          <CardHeader 
            title="Skills Analysis" 
            avatar={<CodeIcon color="primary" />}
            sx={{ 
              '& .MuiCardHeader-title': { fontWeight: 600 } 
            }}
          />
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ 
              color: theme.palette.success.main, 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <CheckCircleIcon sx={{ mr: 1 }} /> Matched Skills ({job.matchAnalysis.matchedSkills?.filter(s => s.found).length || 0})
            </Typography>
            
            {job.matchAnalysis.matchedSkills && job.matchAnalysis.matchedSkills.filter(s => s.found).length > 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1, 
                mb: 3,
                p: 2,
                bgcolor: `${theme.palette.success.main}08`,
                borderRadius: 2
              }}>
                {job.matchAnalysis.matchedSkills && job.matchAnalysis.matchedSkills.filter(s => s && s.found).map((skill, index) => (
                  <SkillChip
                    key={`matched-skill-${index}`}
                    skill={skill}
                    isMatched={true}
                    importance={skill && typeof skill === 'object' ? skill.importance : undefined}
                    matchQuality={skill && typeof skill === 'object' ? skill.matchQuality : undefined}
                  />
                ))}
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                No matching skills found between your resume and this job's requirements.
              </Alert>
            )}

            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ 
              color: theme.palette.warning.main, 
              display: 'flex', 
              alignItems: 'center',
              mt: 4
            }}>
              <WarningIcon sx={{ mr: 1 }} /> Missing Skills ({job.matchAnalysis.missingSkills?.length || 0})
            </Typography>
            
            {job.matchAnalysis.missingSkills && job.matchAnalysis.missingSkills.length > 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                p: 2,
                bgcolor: `${theme.palette.warning.main}08`,
                borderRadius: 2
              }}>
                {job.matchAnalysis.missingSkills && job.matchAnalysis.missingSkills.map((skill, index) => (
                  <SkillChip
                    key={`missing-skill-${index}`}
                    skill={skill}
                    isMatched={false}
                    importance={skill && typeof skill === 'object' ? skill.importance : undefined}
                  />
                ))}
              </Box>
            ) : (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Excellent! Your resume includes all required skills for this position.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ENHANCED: Contextual AI Recommendations */}
      <Grid item xs={12} md={6}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3, height: 'fit-content' }}>
          <CardHeader 
            title="Personalized AI Recommendations" 
            avatar={<LightbulbIcon color="primary" />}
            action={
              job.matchAnalysis.analysisMetadata?.analysisType === 'contextual-personalized' && (
                <Chip 
                  label="Contextual" 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
              )
            }
            sx={{ 
              '& .MuiCardHeader-title': { fontWeight: 600 } 
            }}
          />
          <CardContent>
            {/* Score-based recommendation display */}
            {hasImprovements ? (
              <>
                <Alert 
                  severity={getRecommendationSeverity(overallScore)}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  <Typography variant="body2">
                    {overallScore < 50 
                      ? 'Multiple improvements recommended to strengthen your application for this role.'
                      : overallScore < 70 
                      ? 'Several targeted improvements can enhance your match score.'
                      : 'Minor optimizations suggested to perfect your application.'}
                  </Typography>
                </Alert>

                <List sx={{ p: 0 }}>
                  {improvementSuggestions
                    .filter(suggestion => suggestion && suggestion.trim().length > 0)
                    .map((suggestion, index) => (
                    <ListItem key={index} sx={{ 
                      backgroundColor: `${theme.palette.info.main}08`, 
                      borderRadius: 2, 
                      mb: 2,
                      px: 2,
                      alignItems: 'flex-start'
                    }}>
                      <ListItemIcon sx={{ mt: 0.5 }}>
                        <LightbulbIcon color="info" />
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
              <Alert 
                severity={overallScore >= 85 ? "success" : overallScore >= 70 ? "info" : "warning"} 
                sx={{ borderRadius: 2, mb: 2 }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {overallScore >= 85 
                    ? 'Outstanding match!' 
                    : overallScore >= 70 
                    ? 'Strong match!' 
                    : overallScore < 50
                    ? 'Analysis in progress...'
                    : 'Good potential match!'}
                </Typography>
                <Typography variant="body2">
                  {overallScore >= 85 
                    ? 'Your resume aligns exceptionally well with this role. Consider the tailored resume option for final optimization.'
                    : overallScore >= 70 
                    ? 'Your qualifications are well-suited for this position. Minor enhancements could perfect your application.'
                    : overallScore < 50
                    ? 'Our AI is generating personalized recommendations based on your resume and this job. This may take a moment for new analyses.'
                    : 'Your background shows good alignment. A tailored resume could optimize your application further.'}
                </Typography>
              </Alert>
            )}

            {/* Action button based on score */}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color={overallScore >= 70 ? "primary" : "secondary"}
                startIcon={<SafeAutoJobLogo iconSize="small" />}
                onClick={onTailorClick}
                fullWidth
                sx={{ borderRadius: 2, py: 1.2 }}
              >
                {overallScore >= 80 
                  ? 'Perfect Your Application' 
                  : overallScore >= 60 
                  ? 'Optimize Your Resume' 
                  : 'Transform Your Resume'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Contextual Keywords Section */}
      {job.matchAnalysis.contextualKeywords && job.matchAnalysis.contextualKeywords.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Recommended Keywords for This Role" 
              avatar={<LightbulbIcon color="primary" />}
              sx={{ 
                pb: 1, 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Based on your resume and this specific {job.title} role, consider incorporating these keywords:
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1.5,
                '& .MuiChip-root': {
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }
              }}>
                {job.matchAnalysis.contextualKeywords.map((keyword, index) => (
                  <Chip 
                    key={`contextual-keyword-${index}`}
                    label={keyword} 
                    sx={{ 
                      bgcolor: COLORS[index % COLORS.length] + '20',
                      color: COLORS[index % COLORS.length],
                      fontWeight: 500,
                      borderRadius: 2,
                      border: `1px solid ${COLORS[index % COLORS.length]}40`,
                      '&:hover': {
                        bgcolor: COLORS[index % COLORS.length] + '30',
                      }
                    }} 
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Technical Requirements Section (if available) */}
      {technicalRequirements.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Technical Requirements Analysis" 
              avatar={<EngineeringIcon color="primary" />}
              sx={{ 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Role-specific technical requirements extracted from the job description:
              </Typography>
              
              <List sx={{ p: 0 }}>
                {technicalRequirements.map((requirement, index) => (
                  <ListItem key={index} sx={{ 
                    backgroundColor: `${theme.palette.primary.main}05`, 
                    borderRadius: 2, 
                    mb: 1,
                    px: 2,
                    border: `1px solid ${theme.palette.primary.main}20`
                  }}>
                    <ListItemIcon>
                      <BuildIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={requirement}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Analysis Quality Indicator */}
      <Grid item xs={12}>
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: `${theme.palette.info.main}10`, 
          borderRadius: 2,
          border: `1px solid ${theme.palette.info.main}20`,
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          <AnalyticsIcon color="info" sx={{ mr: 1.5, mt: 0.5 }} />
          <Box>
            <Typography variant="body2" paragraph>
              {job.matchAnalysis.analysisMetadata?.analysisType === 'contextual-personalized'
                ? `Our enhanced contextual AI analyzed your specific resume content against this ${job.title} position, providing personalized recommendations based on your actual experience and the job requirements.`
                : hasRoleSpecificAnalysis 
                ? `This analysis was specifically optimized for ${roleCategory.replace('-', ' ')} roles using advanced NLP and semantic understanding tailored for this role type.`
                : 'Our enhanced AI matching algorithm analyzes your resume against this job using advanced NLP and semantic understanding.'
              } 
              Scores are weighted: Skills (40%), Experience (35%), Education (25%).
            </Typography>
            
            {job.matchAnalysis.analysisMetadata?.analysisType === 'contextual-personalized' && (
              <Typography variant="caption" color="text.secondary">
                Analysis Version: {job.matchAnalysis.analysisMetadata.algorithmVersion || '3.0-contextual'} • 
                Personalized recommendations based on your resume content
              </Typography>
            )}
          </Box>
        </Box>
      </Grid>

      {/* Strengths Highlight Section */}
      {job.matchAnalysis.strengthsHighlight && job.matchAnalysis.strengthsHighlight.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Your Key Strengths for This Role" 
              avatar={<CheckCircleIcon color="success" />}
              sx={{ 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <List sx={{ p: 0 }}>
                {job.matchAnalysis.strengthsHighlight.map((strength, index) => (
                  <ListItem key={index} sx={{ 
                    backgroundColor: `${theme.palette.success.main}08`, 
                    borderRadius: 2, 
                    mb: 1,
                    px: 2,
                    border: `1px solid ${theme.palette.success.main}20`
                  }}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={strength}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};
export default AnalysisTab;