// src/components/jobs/tabs/ContentTab.js
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
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  Code as CodeIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const ContentTab = ({ job }) => {
  return (
    <>
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
      
      {job.parsedData && (
        <Grid container spacing={3}>
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
          
          {job.parsedData.requirements && job.parsedData.requirements.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title={`Requirements (${job.parsedData.requirements.length})`}
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

          {/* Enhanced Technical Details */}
          {(job.parsedData.technicalSkills || job.parsedData.toolsAndTechnologies) && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title="Technical Requirements"
                  avatar={<CodeIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  {job.parsedData.technicalSkills && job.parsedData.technicalSkills.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        Technical Skills:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {job.parsedData.technicalSkills && job.parsedData.technicalSkills.map((skill, index) => {
                          // Extract skill name safely
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
                  )}
                  
                  {job.parsedData.toolsAndTechnologies && job.parsedData.toolsAndTechnologies.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="secondary">
                        Tools & Technologies:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {job.parsedData.toolsAndTechnologies && job.parsedData.toolsAndTechnologies.map((tool, index) => {
                          // Extract tool name safely
                          const toolName = tool && typeof tool === 'object' ? 
                            (tool.name || tool.skill || tool.tool || 'Unknown Tool') : 
                            (typeof tool === 'string' ? tool : 'Unknown Tool');
                          
                          return (
                            <Chip 
                              key={`tool-tech-${index}`} 
                              label={toolName} 
                              size="small" 
                              color="secondary"
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Enhanced Soft Skills */}
          {job.parsedData.softSkills && job.parsedData.softSkills.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                  title="Soft Skills & Attributes"
                  avatar={<PersonIcon color="primary" />}
                  sx={{ 
                    '& .MuiCardHeader-title': { fontWeight: 600 } 
                  }}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {job.parsedData.softSkills && job.parsedData.softSkills.map((skill, index) => {
                      // Extract skill name safely
                      const skillName = skill && typeof skill === 'object' ? 
                        (skill.name || skill.skill || 'Unknown Skill') : 
                        (typeof skill === 'string' ? skill : 'Unknown Skill');
                      
                      return (
                        <Chip 
                          key={`soft-skill-${index}`} 
                          label={skillName} 
                          size="small" 
                          color="info"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          {job.parsedData.benefits && job.parsedData.benefits.length > 0 && (
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
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
                      <Grid item xs={12} md={6} key={index}>
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
        </Grid>
      )}
    </>
  );
};

export default ContentTab;