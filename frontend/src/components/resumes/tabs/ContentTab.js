// src/components/resumes/tabs/ContentTab.js - ENHANCED BULLET POINT RENDERING
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
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  BusinessCenter as BusinessCenterIcon,
  Timeline as TimelineIcon,
  FiberManualRecord as BulletIcon
} from '@mui/icons-material';
import { formatDateRange, extractBulletPointsFromText, renderSmartBulletPoints } from '../utils/resumeHelpers';

/**
 * Content tab component showing full resume content in structured format with enhanced bullet point rendering
 * @param {object} props - Component props
 * @param {object} props.resume - Resume data
 * @param {object} props.theme - MUI theme object
 * @returns {JSX.Element} Content tab content
 */
const ContentTab = ({ resume, theme }) => {
  const COLORS = [
    theme.palette.primary.main, 
    theme.palette.secondary.main, 
    theme.palette.success.main, 
    theme.palette.warning.main, 
    theme.palette.error.main,
    theme.palette.info.main
  ];

  /**
   * Smart bullet point renderer with fallback logic
   * @param {object} item - Experience or education item
   * @param {string} section - Section type ('experience' or 'education')
   * @returns {JSX.Element} Rendered bullet points
   */
  const renderBulletPoints = (item, section = 'experience') => {
    let bulletPoints = [];
    
    // Primary: Use highlights array if available
    if (item.highlights && Array.isArray(item.highlights) && item.highlights.length > 0) {
      bulletPoints = item.highlights;
    } 
    // Fallback: Extract from description if highlights are empty
    else if (item.description) {
      bulletPoints = extractBulletPointsFromText(item.description);
    }

    // If we have bullet points to render
    if (bulletPoints.length > 0) {
      return (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {section === 'experience' ? 'Key Achievements:' : 'Highlights:'}
          </Typography>
          <List dense sx={{ pl: 1 }}>
            {bulletPoints.map((point, idx) => (
              <ListItem key={idx} sx={{ px: 0, py: 0.5, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary={point} 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      fontSize: '0.875rem',
                      lineHeight: 1.5
                    } 
                  }} 
                />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    // If no bullet points found, render description as paragraph (if it exists and has no bullet-like content)
    if (item.description && !item.description.match(/^[-•*>→]\s+/m)) {
      return (
        <Typography variant="body2" sx={{ mt: 1.5, lineHeight: 1.6 }}>
          {item.description}
        </Typography>
      );
    }
    
    return null;
  };

  /**
   * Render remaining description after bullet points are extracted
   * @param {object} item - Experience or education item
   * @returns {JSX.Element|null} Rendered description
   */
  const renderRemainingDescription = (item) => {
    if (!item.description) return null;
    
    // If highlights exist, show only non-bullet description
    if (item.highlights && item.highlights.length > 0) {
      // Extract non-bullet content from description
      const nonBulletContent = item.description
        .split(/\r?\n/)
        .filter(line => !line.trim().match(/^[-•*>→]\s+/))
        .join('\n')
        .trim();
      
      if (nonBulletContent && nonBulletContent.length > 20) {
        return (
          <Typography variant="body2" sx={{ mt: 1.5, lineHeight: 1.6 }}>
            {nonBulletContent}
          </Typography>
        );
      }
    }
    
    return null;
  };

  return (
    <Grid container spacing={3}>
      {/* Contact Information */}
      <Grid item xs={12}>
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardHeader 
            title="Contact Information" 
            avatar={<PersonIcon color="primary" />}
            sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <PersonIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1" fontWeight="medium">{resume.parsedData?.contactInfo?.name || 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <EmailIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight="medium">{resume.parsedData?.contactInfo?.email || 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <PhoneIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1" fontWeight="medium">{resume.parsedData?.contactInfo?.phone || 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <LocationOnIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Typography variant="body1" fontWeight="medium">{resume.parsedData?.contactInfo?.location || 'Not specified'}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Summary */}
      {resume.parsedData?.summary && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Professional Summary" 
              avatar={<DescriptionIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                {resume.parsedData.summary}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Experience - ENHANCED BULLET POINT RENDERING */}
      {resume.parsedData?.experience && resume.parsedData.experience.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Work Experience" 
              avatar={<WorkIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              {resume.parsedData.experience.map((exp, index) => (
                <Box key={index} sx={{ 
                  mb: 3, 
                  pb: 3, 
                  borderBottom: index < resume.parsedData.experience.length - 1 ? '1px solid' : 'none', 
                  borderColor: 'divider' 
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600} color="primary">
                        {exp.title}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessCenterIcon fontSize="small" sx={{ mr: 1, color: theme.palette.secondary.main }} />
                        {exp.company}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                      px: 1.5, 
                      py: 0.5, 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      alignSelf: 'flex-start'
                    }}>
                      <TimelineIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDateRange(exp.startDate, exp.endDate)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {exp.location && (
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mt: 0.5 
                    }}>
                      <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} /> {exp.location}
                    </Typography>
                  )}
                  
                  {/* ENHANCED: Smart bullet point rendering with fallback */}
                  {renderRemainingDescription(exp)}
                  {renderBulletPoints(exp, 'experience')}
                  
                  {exp.skills && exp.skills.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        Skills Used:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {exp.skills.map((skill, idx) => (
                          <Chip 
                            key={idx} 
                            label={skill} 
                            size="small" 
                            sx={{ 
                              bgcolor: `${theme.palette.primary.main}15`,
                              color: theme.palette.primary.main 
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Education - ENHANCED BULLET POINT RENDERING */}
      {resume.parsedData?.education && resume.parsedData.education.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Education" 
              avatar={<SchoolIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              {resume.parsedData.education.map((edu, index) => (
                <Box key={index} sx={{ 
                  mb: 3, 
                  pb: 3, 
                  borderBottom: index < resume.parsedData.education.length - 1 ? '1px solid' : 'none', 
                  borderColor: 'divider' 
                }}>
                  <Typography variant="h6" fontWeight={600} color="primary">
                    {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                    <SchoolIcon fontSize="small" sx={{ mr: 1, color: theme.palette.secondary.main }} />
                    {edu.institution}
                  </Typography>
                  <Box sx={{ 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                    px: 1.5, 
                    py: 0.5, 
                    borderRadius: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    mt: 1
                  }}>
                    <TimelineIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatDateRange(edu.startDate, edu.endDate)}
                    </Typography>
                  </Box>
                  
                  {edu.gpa && (
                    <Typography variant="body2" sx={{ mt: 1.5 }}>
                      <b>GPA:</b> {edu.gpa}
                    </Typography>
                  )}
                  
                  {/* ENHANCED: Smart bullet point rendering for education */}
                  {renderRemainingDescription(edu)}
                  {renderBulletPoints(edu, 'education')}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Certifications */}
      {resume.parsedData?.certifications && resume.parsedData.certifications.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Certifications" 
              avatar={<CheckCircleIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Grid container spacing={2}>
                {resume.parsedData.certifications.map((cert, index) => (
                  <Grid item xs={12} sm={6} lg={4} key={index}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        borderColor: theme.palette.primary.light
                      }
                    }}>
                      <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
                        {cert.name}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <BusinessCenterIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.secondary.main }} />
                        {cert.issuer}
                      </Typography>
                      {cert.dateObtained && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                          <TimelineIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {new Date(cert.dateObtained).toLocaleDateString()}
                          {cert.validUntil && ` - ${new Date(cert.validUntil).toLocaleDateString()}`}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Skills */}
      {resume.parsedData?.skills && resume.parsedData.skills.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Skills" 
              avatar={<CodeIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {resume.parsedData.skills.map((skill, index) => {
                  let color;
                  if (typeof skill === 'object' && skill.level) {
                    color = skill.level === 'Expert' ? theme.palette.success.main : 
                            skill.level === 'Advanced' ? theme.palette.info.main : 
                            skill.level === 'Intermediate' ? theme.palette.warning.main : 
                            theme.palette.grey[600];
                  } else {
                    color = COLORS[index % COLORS.length];
                  }
                  
                  return (
                    <Chip 
                      key={index} 
                      label={
                        typeof skill === 'object' ? 
                          skill.level ? 
                            `${skill.name} (${skill.level})` : 
                            skill.name : 
                          skill
                      } 
                      sx={{ 
                        bgcolor: `${color}15`, 
                        color: color,
                        fontWeight: 500,
                        borderRadius: 2,
                        py: 2
                      }} 
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Languages */}
      {resume.parsedData?.languages && resume.parsedData.languages.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
            <CardHeader 
              title="Languages" 
              avatar={<PersonIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Grid container spacing={2}>
                {resume.parsedData.languages.map((lang, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Box sx={{ 
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">{lang.language}</Typography>
                        {lang.proficiency && (
                          <Typography variant="body2" color="text.secondary">{lang.proficiency}</Typography>
                        )}
                      </Box>
                      {lang.proficiency && (
                        <Chip 
                          label={lang.proficiency} 
                          size="small" 
                          sx={{ 
                            bgcolor: theme.palette.primary.main + '20',
                            color: theme.palette.primary.main,
                            fontWeight: 500 
                          }} 
                        />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Projects */}
      {resume.parsedData?.projects && resume.parsedData.projects.length > 0 && (
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardHeader 
              title="Projects" 
              avatar={<WorkIcon color="primary" />}
              sx={{ '& .MuiCardHeader-title': { fontWeight: 600 } }}
            />
            <CardContent>
              <Grid container spacing={3}>
                {resume.parsedData.projects.map((project, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Box sx={{ 
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: theme.palette.primary.light
                      }
                    }}>
                      <Typography variant="h6" fontWeight={600} color="primary">
                        {project.name}
                      </Typography>
                      
                      {project.url && (
                        <Typography variant="body2" color="primary" component="a" href={project.url} target="_blank" sx={{ 
                          display: 'block', 
                          mb: 1,
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}>
                          {project.url}
                        </Typography>
                      )}
                      
                      {(project.startDate || project.endDate) && (
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          mb: 1.5,
                          display: 'flex',
                          alignItems: 'center' 
                        }}>
                          <TimelineIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {formatDateRange(project.startDate, project.endDate)}
                        </Typography>
                      )}
                      
                      {project.description && (
                        <Typography variant="body2" sx={{ mb: 1.5 }}>
                          {project.description}
                        </Typography>
                      )}
                      
                      {project.skills && project.skills.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="body2" fontWeight="bold" color="text.secondary">
                            Technologies Used:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {project.skills.map((skill, idx) => (
                              <Chip 
                                key={idx} 
                                label={skill} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${theme.palette.secondary.main}15`,
                                  color: theme.palette.secondary.main 
                                }} 
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default ContentTab;