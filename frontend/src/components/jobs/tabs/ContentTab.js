// src/components/jobs/tabs/ContentTab.js - ENHANCED FOR ROLE-SPECIFIC ANALYSIS
import React from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Divider,
  Stack,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  Code as CodeIcon,
  Person as PersonIcon,
  Engineering as EngineeringIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
  School as SchoolIcon,
  Star as StarIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

const ContentTab = ({ job }) => {
  const theme = useTheme();

  // Check if we have role-specific analysis
  const hasRoleSpecificAnalysis = job.parsedData?.analysisMetadata?.roleSpecificAnalysis;
  const technicalRequirements = job.parsedData?.technicalRequirements || [];
  const toolsAndTechnologies = job.parsedData?.toolsAndTechnologies || [];
  const roleCategory = job.parsedData?.roleCategory || 'general';
  const technicalComplexity = job.parsedData?.technicalComplexity || 'medium';

  const getRoleSpecificIcon = (roleCategory) => {
    const iconMap = {
      'data-engineering': <StorageIcon />,
      'software-engineering': <CodeIcon />,
      'product-management': <PsychologyIcon />,
      'data-science': <TrendingUpIcon />,
      'devops': <EngineeringIcon />,
      'design': <BuildIcon />,
      'marketing': <TrendingUpIcon />,
      'sales': <AssignmentIcon />
    };
    return iconMap[roleCategory] || <ComputerIcon />;
  };

  const getComplexityColor = (complexity) => {
    switch(complexity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  return (
    <>
      {/* Role-Specific Analysis Header */}
      {hasRoleSpecificAnalysis && (
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 2, 
            mb: 3,
            '& .MuiAlert-message': { 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              width: '100%'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getRoleSpecificIcon(roleCategory)}
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Enhanced Role-Specific Content Analysis
              </Typography>
              <Typography variant="body2">
                {roleCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {technicalComplexity.charAt(0).toUpperCase() + technicalComplexity.slice(1)} Complexity
              </Typography>
            </Box>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Stack direction="row" spacing={1}>
              <Chip 
                label={roleCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                size="small" 
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`${technicalComplexity.charAt(0).toUpperCase() + technicalComplexity.slice(1)} Complexity`}
                size="small" 
                color={getComplexityColor(technicalComplexity)}
                variant="outlined"
              />
            </Stack>
          </Box>
        </Alert>
      )}

      {/* Full Job Description */}
      <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
        <CardHeader 
          title="Full Job Description" 
          avatar={<DescriptionIcon color="primary" />}
          sx={{ 
            '& .MuiCardHeader-title': { fontWeight: 600 } 
          }}
        />
        <CardContent>
          <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
            {job.description}
          </Typography>
        </CardContent>
      </Card>

      {/* Role-Specific Analysis Sections */}
      {job.parsedData && (
        <Grid container spacing={3}>
          {/* NEW: Technical Requirements Section (Priority) */}
          {technicalRequirements.length > 0 && (
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderRadius: 3, border: `2px solid ${theme.palette.primary.main}20` }}>
                <CardHeader 
                  title={`Technical Requirements (${technicalRequirements.length})`}
                  avatar={<EngineeringIcon color="primary" />}
                  action={
                    <Chip 
                      label="Role-Specific" 
                      size="small" 
                      color="primary"
                      variant="filled"
                    />
                  }
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 },
                    bgcolor: `${theme.palette.primary.main}05`
                  }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Technical requirements specifically extracted for this {roleCategory.replace('-', ' ')} role:
                  </Typography>
                  
                  <List sx={{ p: 0 }}>
                    {technicalRequirements.map((requirement, index) => (
                      <ListItem key={index} sx={{ 
                        backgroundColor: `${theme.palette.primary.main}08`, 
                        borderRadius: 2, 
                        mb: 1,
                        px: 2,
                        border: `1px solid ${theme.palette.primary.main}20`,
                        alignItems: 'flex-start'
                      }}>
                        <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                          <VerifiedIcon color="primary" fontSize="small" />
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
                  title={`Tools & Technologies (${toolsAndTechnologies.length})`}
                  avatar={<ComputerIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Tools and technologies mentioned for this {roleCategory.replace('-', ' ')} position:
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {toolsAndTechnologies.map((tool, index) => {
                      // Color coding based on tool type
                      const getToolColor = (tool) => {
                        const toolLower = tool.toLowerCase();
                        if (['python', 'javascript', 'java', 'sql', 'react', 'node.js'].includes(toolLower)) {
                          return 'primary';
                        } else if (['aws', 'azure', 'docker', 'kubernetes'].includes(toolLower)) {
                          return 'secondary';
                        } else if (['git', 'jira', 'slack'].includes(toolLower)) {
                          return 'info';
                        }
                        return 'default';
                      };

                      return (
                        <Chip 
                          key={`tool-${index}`}
                          label={tool} 
                          color={getToolColor(tool)}
                          variant="outlined"
                          sx={{ 
                            fontWeight: 500,
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 1
                            },
                            transition: 'all 0.2s ease'
                          }} 
                        />
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Responsibilities */}
          {job.parsedData.responsibilities && job.parsedData.responsibilities.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title={`Key Responsibilities (${job.parsedData.responsibilities.length})`}
                  avatar={<WorkIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <List>
                    {job.parsedData.responsibilities.map((resp, index) => (
                      <ListItem key={index} sx={{ py: 0.5, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                          <CheckCircleIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={resp}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          {/* Enhanced Requirements */}
          {job.parsedData.requirements && job.parsedData.requirements.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title={`Job Requirements (${job.parsedData.requirements.length})`}
                  avatar={<AssignmentIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <List>
                    {job.parsedData.requirements.map((req, index) => (
                      <ListItem key={index} sx={{ py: 0.5, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                          <CheckCircleIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={req}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Qualifications - Required vs Preferred */}
          {(job.parsedData.qualifications?.required?.length > 0 || job.parsedData.qualifications?.preferred?.length > 0) && (
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardHeader 
                  title="Qualifications Breakdown"
                  avatar={<SchoolIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Required Qualifications */}
                    {job.parsedData.qualifications?.required?.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ 
                            color: theme.palette.error.main, 
                            display: 'flex', 
                            alignItems: 'center',
                            fontWeight: 600
                          }}>
                            <StarIcon sx={{ mr: 1, fontSize: 18 }} /> Required Qualifications ({job.parsedData.qualifications.required.length})
                          </Typography>
                          <List dense sx={{ bgcolor: `${theme.palette.error.main}08`, borderRadius: 2, p: 1 }}>
                            {job.parsedData.qualifications.required.map((qual, index) => (
                              <ListItem key={index} sx={{ py: 0.25 }}>
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                  <CheckCircleIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={qual}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      </Grid>
                    )}

                    {/* Preferred Qualifications */}
                    {job.parsedData.qualifications?.preferred?.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ 
                            color: theme.palette.info.main, 
                            display: 'flex', 
                            alignItems: 'center',
                            fontWeight: 600
                          }}>
                            <StarIcon sx={{ mr: 1, fontSize: 18 }} /> Preferred Qualifications ({job.parsedData.qualifications.preferred.length})
                          </Typography>
                          <List dense sx={{ bgcolor: `${theme.palette.info.main}08`, borderRadius: 2, p: 1 }}>
                            {job.parsedData.qualifications.preferred.map((qual, index) => (
                              <ListItem key={index} sx={{ py: 0.25 }}>
                                <ListItemIcon sx={{ minWidth: 24 }}>
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
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Technical vs Soft Skills */}
          {((job.parsedData.technicalSkills && job.parsedData.technicalSkills.length > 0) || 
            (job.parsedData.softSkills && job.parsedData.softSkills.length > 0)) && (
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardHeader 
                  title="Skills Breakdown"
                  avatar={<CodeIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Technical Skills */}
                    {job.parsedData.technicalSkills && job.parsedData.technicalSkills.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                            Technical Skills ({job.parsedData.technicalSkills.length}):
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {job.parsedData.technicalSkills.map((skill, index) => {
                              const skillName = skill && typeof skill === 'object' ? 
                                (skill.name || skill.skill || 'Unknown Skill') : 
                                (typeof skill === 'string' ? skill : 'Unknown Skill');
                              
                              return (
                                <Chip 
                                  key={`tech-skill-${index}`} 
                                  label={skillName} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      </Grid>
                    )}

                    {/* Soft Skills */}
                    {job.parsedData.softSkills && job.parsedData.softSkills.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="secondary" sx={{ fontWeight: 600 }}>
                            Soft Skills ({job.parsedData.softSkills.length}):
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {job.parsedData.softSkills.map((skill, index) => {
                              const skillName = skill && typeof skill === 'object' ? 
                                (skill.name || skill.skill || 'Unknown Skill') : 
                                (typeof skill === 'string' ? skill : 'Unknown Skill');
                              
                              return (
                                <Chip 
                                  key={`soft-skill-${index}`} 
                                  label={skillName} 
                                  size="small" 
                                  color="secondary"
                                  variant="outlined"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Education Requirements */}
          {job.parsedData.educationRequirements && job.parsedData.educationRequirements.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title={`Education Requirements (${job.parsedData.educationRequirements.length})`}
                  avatar={<SchoolIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <List>
                    {job.parsedData.educationRequirements.map((req, index) => (
                      <ListItem key={index} sx={{ py: 0.5, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                          <SchoolIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={req}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Benefits */}
          {job.parsedData.benefits && job.parsedData.benefits.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title={`Benefits & Perks (${job.parsedData.benefits.length})`}
                  avatar={<WorkIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Grid container spacing={2}>
                    {job.parsedData.benefits.map((benefit, index) => (
                      <Grid item xs={12} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <CheckCircleIcon color="success" sx={{ mt: 0.5, mr: 1.5 }} />
                          <Typography variant="body2">{benefit}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* NEW: Role-Specific Analysis Summary */}
          {hasRoleSpecificAnalysis && (
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderRadius: 3, bgcolor: `${theme.palette.success.main}05` }}>
                <CardHeader 
                  title="Role-Specific Analysis Summary"
                  avatar={getRoleSpecificIcon(roleCategory)}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main" fontWeight={600}>
                          {technicalRequirements.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Technical Requirements
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="secondary.main" fontWeight={600}>
                          {toolsAndTechnologies.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tools & Technologies
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main" fontWeight={600}>
                          {job.parsedData.responsibilities?.length || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Key Responsibilities
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main" fontWeight={600}>
                          {technicalComplexity.charAt(0).toUpperCase() + technicalComplexity.slice(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Technical Complexity
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    This enhanced analysis extracted role-specific information for {roleCategory.replace('-', ' ')} positions, 
                    providing more accurate technical requirements and skill matching compared to generic job analysis.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
};

export default ContentTab;