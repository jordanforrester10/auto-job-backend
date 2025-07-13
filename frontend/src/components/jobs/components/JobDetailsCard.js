// src/components/jobs/components/JobDetailsCard.js - ENHANCED FOR ROLE-SPECIFIC ANALYSIS
import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Box,
  Stack,
  useTheme
} from '@mui/material';
import {
  Work as WorkIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Engineering as EngineeringIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Psychology as PsychologyIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Verified as VerifiedIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

const JobDetailsCard = ({ job }) => {
  const theme = useTheme();

  // Check if we have role-specific analysis
  const hasRoleSpecificAnalysis = job.parsedData?.analysisMetadata?.roleSpecificAnalysis;
  const roleCategory = job.parsedData?.roleCategory || 'general';
  const technicalComplexity = job.parsedData?.technicalComplexity || 'medium';
  const experienceLevel = job.parsedData?.experienceLevel || 'mid';
  const workArrangement = job.parsedData?.workArrangement || 'unknown';
  const industryContext = job.parsedData?.industryContext || 'general';

  const getRoleSpecificIcon = (roleCategory) => {
    const iconMap = {
      'data-engineering': <StorageIcon />,
      'software-engineering': <ComputerIcon />,
      'product-management': <PsychologyIcon />,
      'data-science': <TrendingUpIcon />,
      'devops': <EngineeringIcon />,
      'design': <BuildIcon />,
      'marketing': <TrendingUpIcon />,
      'sales': <AssignmentIcon />
    };
    return iconMap[roleCategory] || <WorkIcon />;
  };

  const getComplexityColor = (complexity) => {
    switch(complexity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const getExperienceLevelColor = (level) => {
    switch(level) {
      case 'entry': return 'success';
      case 'junior': return 'info';
      case 'mid': return 'primary';
      case 'senior': return 'warning';
      case 'lead': return 'error';
      case 'principal': return 'error';
      case 'executive': return 'error';
      default: return 'primary';
    }
  };

  const formatExperienceLevel = (level) => {
    const levelMap = {
      'entry': 'Entry Level',
      'junior': 'Junior Level',
      'mid': 'Mid Level',
      'senior': 'Senior Level',
      'lead': 'Lead Level',
      'principal': 'Principal Level',
      'executive': 'Executive Level'
    };
    return levelMap[level] || 'Mid Level';
  };

  const formatWorkArrangement = (arrangement) => {
    const arrangementMap = {
      'remote': 'Fully Remote',
      'hybrid': 'Hybrid Work',
      'onsite': 'On-site',
      'unknown': 'Not Specified'
    };
    return arrangementMap[arrangement] || 'Not Specified';
  };

  return (
    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
      <CardHeader 
        title="Job Details" 
        avatar={getRoleSpecificIcon(roleCategory)}
        action={
          hasRoleSpecificAnalysis && (
            <Chip 
              label="Enhanced Analysis" 
              size="small" 
              color="primary"
              variant="filled"
              icon={<VerifiedIcon />}
            />
          )
        }
        sx={{ 
          pb: 1, 
          '& .MuiCardHeader-title': { fontWeight: 600 } 
        }}
      />
      <CardContent>
        <List sx={{ '& .MuiListItem-root': { py: 1.5 } }}>
          <ListItem>
            <ListItemIcon>
              <BusinessIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Company</Typography>}
              secondary={<Typography variant="body1" fontWeight={500}>{job.company}</Typography>}
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <LocationOnIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Location</Typography>}
              secondary={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {job.location?.city 
                      ? `${job.location.city}${job.location.state ? `, ${job.location.state}` : ''}`
                      : job.location?.remote ? 'Remote' : 'Location not specified'}
                  </Typography>
                  {hasRoleSpecificAnalysis && workArrangement !== 'unknown' && (
                    <Chip 
                      label={formatWorkArrangement(workArrangement)}
                      size="small"
                      color={workArrangement === 'remote' ? 'success' : workArrangement === 'hybrid' ? 'info' : 'default'}
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <ScheduleIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">Job Type</Typography>}
              secondary={<Typography variant="body1" fontWeight={500}>{job.jobType?.replace('_', ' ') || 'Full-time'}</Typography>}
            />
          </ListItem>

          {/* NEW: Role Category */}
          {hasRoleSpecificAnalysis && roleCategory !== 'general' && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  {getRoleSpecificIcon(roleCategory)}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Role Category</Typography>}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                        {roleCategory.replace('-', ' ')}
                      </Typography>
                      <Chip 
                        label={`${technicalComplexity.charAt(0).toUpperCase() + technicalComplexity.slice(1)} Complexity`}
                        size="small"
                        color={getComplexityColor(technicalComplexity)}
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
            </>
          )}

          {/* Enhanced Experience Requirements */}
          {(job.parsedData?.yearsOfExperience || hasRoleSpecificAnalysis) && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <TrendingUpIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Experience Required</Typography>}
                  secondary={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {job.parsedData?.yearsOfExperience?.minimum || 0}
                        {job.parsedData?.yearsOfExperience?.preferred && job.parsedData.yearsOfExperience.preferred !== job.parsedData.yearsOfExperience.minimum 
                          ? `-${job.parsedData.yearsOfExperience.preferred}` 
                          : '+'} years
                      </Typography>
                      {hasRoleSpecificAnalysis && (
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip 
                            label={formatExperienceLevel(experienceLevel)}
                            size="small"
                            color={getExperienceLevelColor(experienceLevel)}
                            variant="outlined"
                          />
                          {industryContext !== 'general' && (
                            <Chip 
                              label={industryContext.charAt(0).toUpperCase() + industryContext.slice(1)}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </>
          )}
          
          {/* Enhanced Salary Information */}
          {job.salary?.min && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Salary Range</Typography>}
                  secondary={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {`${job.salary.currency || '$'}${job.salary.min?.toLocaleString()}${job.salary.max ? ` - ${job.salary.max?.toLocaleString()}` : '+'}`}
                      </Typography>
                      {job.salary.isExplicit && (
                        <Chip 
                          label="Salary Listed" 
                          size="small" 
                          color="success"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </>
          )}

          {/* NEW: Technical Requirements Count */}
          {hasRoleSpecificAnalysis && job.parsedData?.technicalRequirements?.length > 0 && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <EngineeringIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Technical Requirements</Typography>}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {job.parsedData.technicalRequirements.length} specific requirements
                      </Typography>
                      <Chip 
                        label="Role-Specific" 
                        size="small" 
                        color="primary"
                        variant="filled"
                      />
                    </Box>
                  }
                />
              </ListItem>
            </>
          )}

          {/* NEW: Tools & Technologies Count */}
          {hasRoleSpecificAnalysis && job.parsedData?.toolsAndTechnologies?.length > 0 && (
            <>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemIcon>
                  <ComputerIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" color="text.secondary">Tools & Technologies</Typography>}
                  secondary={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {job.parsedData.toolsAndTechnologies.length} tools mentioned
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {job.parsedData.toolsAndTechnologies.slice(0, 3).map((tool, index) => (
                          <Chip 
                            key={index}
                            label={tool} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                          />
                        ))}
                        {job.parsedData.toolsAndTechnologies.length > 3 && (
                          <Chip 
                            label={`+${job.parsedData.toolsAndTechnologies.length - 3} more`} 
                            size="small" 
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </>
          )}
        </List>

        {/* NEW: Enhanced Analysis Summary */}
        {hasRoleSpecificAnalysis && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: `${theme.palette.primary.main}08`, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.primary.main}20`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VerifiedIcon color="primary" sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                Enhanced Role-Specific Analysis
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              This job was analyzed using our advanced AI specifically trained for {roleCategory.replace('-', ' ')} roles, 
              extracting {job.parsedData?.technicalRequirements?.length || 0} technical requirements and 
              {job.parsedData?.toolsAndTechnologies?.length || 0} relevant tools/technologies.
            </Typography>
            
            {job.parsedData?.analysisMetadata && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip 
                    label={`Model: ${job.parsedData.analysisMetadata.model || 'GPT-4o'}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={`Quality: ${job.parsedData.analysisMetadata.qualityLevel || 'Premium'}`}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                  {job.parsedData.analysisMetadata.activeJobsDbOptimized && (
                    <Chip 
                      label="ActiveJobs DB Optimized"
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default JobDetailsCard;