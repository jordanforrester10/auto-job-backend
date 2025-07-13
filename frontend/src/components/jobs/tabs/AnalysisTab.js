// src/components/jobs/tabs/AnalysisTab.js - ENHANCED FOR ROLE-SPECIFIC ANALYSIS
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
  Storage as StorageIcon
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
          Get detailed insights by matching your resume with this job. Our enhanced AI will provide role-specific analysis including:
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
                primary="Role-specific skill matching with technical requirements"
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
                primary="Technical complexity assessment and tools analysis"
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
                primary="Experience level compatibility with role requirements"
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
                primary="Personalized recommendations for this specific role"
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
          Start Enhanced Role-Specific Analysis
        </Button>

        <Typography 
          variant="caption" 
          sx={{ 
            color: theme.palette.text.disabled,
            mt: 3,
            maxWidth: 400
          }}
        >
          Our AI will analyze your resume against this specific {roleCategory.replace('-', ' ')} role to provide detailed compatibility scores and targeted improvement suggestions.
        </Typography>
      </Box>
    );
  }

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
                Enhanced Role-Specific Analysis Complete
              </Typography>
              <Typography variant="body2">
                This analysis was specifically tailored for {roleCategory.replace('-', ' ')} roles with {technicalComplexity} technical complexity
              </Typography>
            </Box>
          </Alert>
        </Grid>
      )}

      {/* Detailed Match Breakdown */}
      <Grid item xs={12}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Detailed Match Analysis" 
            avatar={<SpeedIcon color="primary" />}
            action={
              <Stack direction="row" spacing={1}>
                <Chip 
                  label={`Analyzed ${new Date(job.matchAnalysis.lastAnalyzed || Date.now()).toLocaleDateString()}`} 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                />
                {hasRoleSpecificAnalysis && (
                  <Chip 
                    label="Role-Specific" 
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
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                  <Box sx={{ mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={job.matchAnalysis.categoryScores?.skills || 0}
                      size={80}
                      thickness={6}
                      sx={{ 
                        color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.skills || 0)].main,
                        mb: 1
                      }}
                    />
                  </Box>
                  <Typography variant="h5" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.skills || 0)].main}>
                    {job.matchAnalysis.categoryScores?.skills || 0}%
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={500} color="primary.main">
                    Skills Match
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {job.matchAnalysis.matchedSkills?.filter(s => s.found).length || 0} of {job.matchAnalysis.matchedSkills?.length || 0} skills matched
                  </Typography>
                  
                  {/* Enhanced skills breakdown */}
                  {job.matchAnalysis.matchedSkills && (
                    <Box sx={{ mt: 2 }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Chip 
                          label={`${job.matchAnalysis.matchedSkills.filter(s => s.found && s.matchQuality === 'exact').length} exact`}
                          size="small"
                          color="success"
                        />
                        <Chip 
                          label={`${job.matchAnalysis.matchedSkills.filter(s => s.found && s.matchQuality === 'partial').length} partial`}
                          size="small"
                          color="warning"
                        />
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                  <Box sx={{ mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={job.matchAnalysis.categoryScores?.experience || 0}
                      size={80}
                      thickness={6}
                      sx={{ 
                        color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.experience || 0)].main,
                        mb: 1
                      }}
                    />
                  </Box>
                  <Typography variant="h5" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.experience || 0)].main}>
                    {job.matchAnalysis.categoryScores?.experience || 0}%
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={500} color="primary.main">
                    Experience Match
                  </Typography>
                  
                  {/* Enhanced experience details */}
                  {job.matchAnalysis.experienceAnalysis ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {job.matchAnalysis.experienceAnalysis.relevantYearsExperience || 0} years relevant
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.matchAnalysis.experienceAnalysis.seniorityMatch && 
                          `${job.matchAnalysis.experienceAnalysis.seniorityMatch} level`}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Experience level alignment
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                  <Box sx={{ mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={job.matchAnalysis.categoryScores?.education || 0}
                      size={80}
                      thickness={6}
                      sx={{ 
                        color: theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.education || 0)].main,
                        mb: 1
                      }}
                    />
                  </Box>
                  <Typography variant="h5" fontWeight={600} color={theme.palette[getScoreColor(job.matchAnalysis.categoryScores?.education || 0)].main}>
                    {job.matchAnalysis.categoryScores?.education || 0}%
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={500} color="primary.main">
                    Education Match
                  </Typography>
                  
                  {/* Enhanced education details */}
                  {job.matchAnalysis.educationAnalysis ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {job.matchAnalysis.educationAnalysis.degreeMatch} requirements
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {job.matchAnalysis.educationAnalysis.fieldAlignment} field alignment
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Education requirements met
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ 
              mt: 3, 
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
                  {hasRoleSpecificAnalysis 
                    ? `Our enhanced role-specific AI algorithm analyzed this ${roleCategory.replace('-', ' ')} position using advanced NLP and semantic understanding tailored for this role type.`
                    : 'Our enhanced AI matching algorithm analyzes your resume against this job using advanced NLP and semantic understanding.'
                  } Scores are weighted: Skills (40%), Experience (35%), Education (25%).
                </Typography>
              </Box>
            </Box>
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
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                No matching skills found.
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
                Excellent! No missing skills identified. Your resume includes all required skills.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Enhanced Improvement Suggestions */}
      <Grid item xs={12} md={6}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3, height: 'fit-content' }}>
          <CardHeader 
            title="AI Recommendations" 
            avatar={<LightbulbIcon color="primary" />}
            sx={{ 
              '& .MuiCardHeader-title': { fontWeight: 600 } 
            }}
          />
          <CardContent>
            {job.matchAnalysis.improvementSuggestions && job.matchAnalysis.improvementSuggestions.length > 0 ? (
              <List sx={{ p: 0 }}>
                {job.matchAnalysis.improvementSuggestions.map((suggestion, index) => (
                  <ListItem key={index} sx={{ 
                    backgroundColor: `${theme.palette.info.main}08`, 
                    borderRadius: 2, 
                    mb: 2,
                    px: 2,
                    alignItems: 'flex-start'
                  }}>
                    <ListItemIcon>
                      <LightbulbIcon color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={suggestion}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Great! No major improvements needed. Your resume looks excellent for this job.
              </Alert>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SafeAutoJobLogo iconSize="small" />}
                onClick={onTailorClick}
                fullWidth
                sx={{ borderRadius: 2, py: 1.2 }}
              >
                Get Tailored Resume
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* NEW: Technical Requirements Section */}
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

      {/* NEW: Tools & Technologies Section */}
      {toolsAndTechnologies.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Tools & Technologies" 
              avatar={<ComputerIcon color="primary" />}
              sx={{ 
                '& .MuiCardHeader-title': { fontWeight: 600 } 
              }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Tools and technologies mentioned in this {roleCategory.replace('-', ' ')} role:
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
                {toolsAndTechnologies.map((tool, index) => (
                  <Chip 
                    key={`tool-${index}`}
                    label={tool} 
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

      {/* Enhanced Keywords Section */}
      <Grid item xs={12}>
        <Card elevation={2} sx={{ borderRadius: 3 }}>
          <CardHeader 
            title="Keyword Optimization" 
            avatar={<LightbulbIcon color="primary" />}
            sx={{ 
              pb: 1, 
              '& .MuiCardHeader-title': { fontWeight: 600 } 
            }}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              These keywords will boost your ATS compatibility and match score for this {roleCategory.replace('-', ' ')} position:
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
              {job.matchAnalysis.missingSkills && job.matchAnalysis.missingSkills.map((skill, index) => {
                const skillName = skill && typeof skill === 'object' ? 
                  (skill.name || skill.skill || 'Unknown Skill') : 
                  (typeof skill === 'string' ? skill : 'Unknown Skill');
                
                const importance = skill && typeof skill === 'object' ? skill.importance : 5;
                const category = skill && typeof skill === 'object' ? (skill.category || 'required') : 'required';
                
                return (
                  <Tooltip 
                    key={`keyword-skill-${index}`}
                    title={`Importance: ${importance}/10 | ${category} | Role: ${roleCategory.replace('-', ' ')}`}
                  >
                    <Chip 
                      label={skillName} 
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
                  </Tooltip>
                );
              })}
            </Box>

            {/* Role-Specific Analysis Summary */}
            {hasRoleSpecificAnalysis && (
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: `${theme.palette.success.main}08`, 
                borderRadius: 2,
                border: `1px solid ${theme.palette.success.main}20`,
                display: 'flex',
                alignItems: 'center'
              }}>
                {getRoleSpecificIcon(roleCategory)}
                <Box sx={{ ml: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="success.main">
                    Role-Specific Analysis Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This analysis was specifically optimized for {roleCategory.replace('-', ' ')} roles with {technicalComplexity} technical complexity. 
                    {technicalRequirements.length > 0 && ` Found ${technicalRequirements.length} technical requirements`}
                    {toolsAndTechnologies.length > 0 && ` and ${toolsAndTechnologies.length} relevant tools/technologies.`}
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AnalysisTab;