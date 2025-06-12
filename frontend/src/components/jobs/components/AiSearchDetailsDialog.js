// src/components/jobs/components/AiSearchDetailsDialog.js
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Code as CodeIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';
import { getStatusColor, getStatusIcon, formatDate } from '../utils/searchUtils';
import AiReasoningLogs from './AiReasoningLogs';

const AiSearchDetailsDialog = ({ 
  open, 
  onClose, 
  selectedSearch, 
  onViewJobs 
}) => {
  const theme = useTheme();

  if (!selectedSearch) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
        color: 'white',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          minHeight: '32px' // Ensure consistent height
        }}>
          <AutoJobLogo 
            variant="icon-only" 
            size="medium" 
            color="white"
            sx={{ 
              width: 32, 
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            AI Search Details & Reasoning
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(26, 115, 232, 0.04)',
                  borderRadius: 2,
                  height: '100%'
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: theme.palette.primary.main }}>
                  Search Configuration
                </Typography>
                <List disablePadding>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DescriptionIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Resume</Typography>}
                      secondary={selectedSearch.resumeName}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <WorkIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Target Job Title</Typography>}
                      secondary={selectedSearch.searchCriteria.jobTitle}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LocationIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Location</Typography>}
                      secondary={selectedSearch.searchCriteria.location}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TrendingUpIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Experience Level</Typography>}
                      secondary={selectedSearch.searchCriteria.experienceLevel}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(0, 196, 180, 0.04)',
                  borderRadius: 2,
                  height: '100%'
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: theme.palette.secondary.main }}>
                  Search Performance
                </Typography>
                <List disablePadding>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CalendarIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Started</Typography>}
                      secondary={formatDate(selectedSearch.createdAt)}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <WorkIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Total Jobs Found</Typography>}
                      secondary={`${selectedSearch.totalJobsFound} jobs`}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TrendingUpIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Today's Progress</Typography>}
                      secondary={`${selectedSearch.jobsFoundToday}/${selectedSearch.dailyLimit} jobs`}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <AssessmentIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>Current Status</Typography>}
                      secondary={
                        <Chip 
                          label={selectedSearch.status} 
                          size="small" 
                          color={getStatusColor(selectedSearch.status)}
                          icon={getStatusIcon(selectedSearch.status)}
                        />
                      }
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>

          {selectedSearch.searchCriteria.skills && selectedSearch.searchCriteria.skills.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: theme.palette.info.main }}>
                Target Skills
              </Typography>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(33, 150, 243, 0.04)',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedSearch.searchCriteria.skills.slice(0, 10).map((skill, index) => (
                    <Chip 
                      key={index}
                      label={skill} 
                      size="small" 
                      variant="outlined"
                      color="info"
                      icon={<CodeIcon />}
                    />
                  ))}
                  {selectedSearch.searchCriteria.skills.length > 10 && (
                    <Chip 
                      label={`+${selectedSearch.searchCriteria.skills.length - 10} more`}
                      size="small" 
                      variant="outlined"
                      color="default"
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          )}

          {selectedSearch.jobsFound && selectedSearch.jobsFound.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: theme.palette.success.main }}>
                Recent Jobs Found
              </Typography>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(52, 168, 83, 0.04)',
                  borderRadius: 2,
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                {selectedSearch.jobsFound.slice(-5).reverse().map((job, index) => (
                  <Box key={index} sx={{ mb: index < 4 ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WorkIcon 
                          fontSize="small" 
                          sx={{ mr: 1, color: theme.palette.success.main }} 
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {job.title} at {job.company}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ ml: 2 }}
                      >
                        {formatDate(job.foundAt)}
                      </Typography>
                    </Box>
                    {index < 4 && <Divider sx={{ mt: 1.5 }} />}
                  </Box>
                ))}
              </Paper>
            </Box>
          )}

          {/* AI Reasoning Logs Section */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AutoJobLogo 
                variant="icon-only" 
                size="small" 
                sx={{ width: 24, height: 24 }}
              />
              <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                AI Reasoning & Decision Making
              </Typography>
              <Chip 
                label={`${selectedSearch.reasoningLogs?.length || 0} entries`}
                size="small" 
                color="primary"
                variant="outlined"
              />
            </Box>
            <Paper 
              elevation={0} 
              sx={{ 
                backgroundColor: 'rgba(26, 115, 232, 0.02)',
                borderRadius: 2,
                border: '1px solid rgba(26, 115, 232, 0.1)',
                maxHeight: 400,
                overflow: 'hidden'
              }}
            >
              <AiReasoningLogs search={selectedSearch} />
            </Paper>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={onViewJobs}
          startIcon={<SearchIcon />}
        >
          View All Jobs
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AiSearchDetailsDialog;