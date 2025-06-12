// src/components/resumes/components/BeforeAfterComparison.js - FIXED READABILITY
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Timeline as TimelineIcon,
  Work as WorkIcon,
  Code as CodeIcon
} from '@mui/icons-material';

/**
 * Before/After Comparison Dialog Component - FIXED UI READABILITY
 * @param {object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {function} props.onClose - Close dialog handler
 * @param {object} props.comparisonData - Comparison data from backend
 * @returns {JSX.Element} Before/After comparison dialog
 */
const BeforeAfterComparison = ({ open, onClose, comparisonData }) => {
  const [tabValue, setTabValue] = useState(0);

  if (!comparisonData) return null;

  const { scores, changes, summary, summaryText } = comparisonData;

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  const renderScoreComparison = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎉 Optimization Results
          </Typography>
          <Typography variant="body1">
            {summaryText}
          </Typography>
        </Alert>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Before Optimization
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Box>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {scores.before.overallScore}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overall Score
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {scores.before.atsCompatibility}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ATS Score
              </Typography>
            </Box>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ 
          textAlign: 'center', 
          p: 2, 
          bgcolor: 'success.light', 
          border: '2px solid',
          borderColor: 'success.main'
        }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'success.dark', fontWeight: 600 }}>
            After Optimization
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                {scores.after.overallScore}
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 500 }}>
                Overall Score
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                {scores.after.atsCompatibility}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 500 }}>
                ATS Score
              </Typography>
            </Box>
          </Box>
          {(scores.after.atsCompatibility - scores.before.atsCompatibility) > 0 && (
            <Chip 
              icon={<TrendingUpIcon />}
              label={`+${scores.after.atsCompatibility - scores.before.atsCompatibility}% improvement`}
              color="success"
              variant="outlined"
              sx={{ 
                mt: 2,
                bgcolor: 'white',
                color: 'success.dark',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: 'success.main'
                }
              }}
            />
          )}
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📊 Summary Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {summary.sectionsModified}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sections Enhanced
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {summary.improvementsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Improvements Made
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {summary.keywordsAdded}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Keywords Added
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDetailedChanges = () => (
    <Box>
      {changes.map((change, index) => (
        <Card key={index} variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {change.section === 'experience' ? <WorkIcon color="primary" /> : <CodeIcon color="primary" />}
              <Box sx={{ ml: 1 }}>
                <Typography variant="h6" color="primary">
                  {change.section === 'experience' ? 'Work Experience' : 'Skills'} Enhancement
                </Typography>
                {change.jobTitle && (
                  <Typography variant="body2" color="text.secondary">
                    {change.jobTitle} at {change.company}
                  </Typography>
                )}
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Chip 
                  label={change.changeType} 
                  color="primary" 
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {change.impact}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {change.field === 'highlights' ? (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      Before:
                    </Typography>
                    <List dense>
                      {change.before.map((item, idx) => (
                        <ListItem key={idx} sx={{ pl: 0, py: 0.5 }}>
                          <ListItemText 
                            primary={item}
                            sx={{ 
                              '& .MuiListItemText-primary': { 
                                fontSize: '0.875rem',
                                bgcolor: 'rgba(255, 0, 0, 0.05)',
                                p: 1,
                                borderRadius: 1,
                                border: '1px solid rgba(255, 0, 0, 0.2)'
                              }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      After:
                    </Typography>
                    <List dense>
                      {change.after.map((item, idx) => (
                        <ListItem key={idx} sx={{ pl: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={item}
                            sx={{ 
                              '& .MuiListItemText-primary': { 
                                fontSize: '0.875rem',
                                bgcolor: 'rgba(0, 255, 0, 0.05)',
                                p: 1,
                                borderRadius: 1,
                                border: '1px solid rgba(0, 255, 0, 0.2)'
                              }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  Before:
                </Typography>
                <Typography variant="body2" sx={{ 
                  bgcolor: 'rgba(255, 0, 0, 0.05)', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid rgba(255, 0, 0, 0.2)',
                  mb: 2
                }}>
                  {change.before}
                </Typography>
                
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  After:
                </Typography>
                <Typography variant="body2" sx={{ 
                  bgcolor: 'rgba(0, 255, 0, 0.05)', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid rgba(0, 255, 0, 0.2)'
                }}>
                  {change.after}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      {changes.length === 0 && (
        <Alert severity="info">
          <Typography variant="body1">
            No detailed changes to display. The optimization focused on overall improvements and keyword enhancements.
          </Typography>
        </Alert>
      )}
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TimelineIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h5" fontWeight="bold">
            ATS Optimization Results
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab 
            label="Score Comparison" 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Detailed Changes" 
            icon={<CheckCircleIcon />} 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {renderScoreComparison()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderDetailedChanges()}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          startIcon={<CheckCircleIcon />}
          size="large"
        >
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BeforeAfterComparison;