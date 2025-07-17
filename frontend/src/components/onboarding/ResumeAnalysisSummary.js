import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const ResumeAnalysisSummary = ({ analysis, onNext }) => {
  const theme = useTheme();

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
      {/* Header with Button */}
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
        {/* Icon and Button on same line */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          mb: 2 
        }}>
          <PsychologyIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          
          {/* Button positioned to the right */}
          <Button
            variant="contained"
            size="medium"
            onClick={onNext}
            endIcon={<ArrowForwardIcon />}
            sx={{ 
              position: 'absolute',
              right: 0,
              borderRadius: 2,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            See Your Job Matches
          </Button>
        </Box>
        
        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Preview Your Resume Analysis
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          We have analyzed your resume and identified some key strengths and areas for improvement. With our paid plans you can optimize your resume for ATS (applicant tracking systems) to get the best chance of securing an interview.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Overall Score */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Current Overall Score
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: `${getScoreColor(analysis.overallScore)}.main` }}>
                  {analysis.overallScore}%
                </Typography>
                <Chip 
                  label={getScoreLabel(analysis.overallScore)}
                  color={getScoreColor(analysis.overallScore)}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={analysis.overallScore} 
                color={getScoreColor(analysis.overallScore)}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Your resume scores {analysis.overallScore}% based on content quality, structure, and keyword optimization.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* ATS Compatibility */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ATS Compatibility
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: `${getScoreColor(analysis.atsCompatibility)}.main` }}>
                  {analysis.atsCompatibility}%
                </Typography>
                <Chip 
                  label={getScoreLabel(analysis.atsCompatibility)}
                  color={getScoreColor(analysis.atsCompatibility)}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={analysis.atsCompatibility} 
                color={getScoreColor(analysis.atsCompatibility)}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Your resume is {analysis.atsCompatibility}% compatible with Applicant Tracking Systems used by employers.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Strengths */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StarIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Key Strengths
                </Typography>
              </Box>
              
              <List dense>
                {(analysis.strengths || []).slice(0, 4).map((strength, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={typeof strength === 'string' ? strength : strength.section || strength.text || 'Strength identified'}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
              
              {(analysis.strengths || []).length > 4 && (
                <Typography variant="caption" color="text.secondary">
                  +{(analysis.strengths || []).length - 4} more strengths identified
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Improvement Areas */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LightbulbIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  Improvement Opportunities
                </Typography>
              </Box>
              
              <List dense>
                {(analysis.improvementAreas || []).slice(0, 4).map((area, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={typeof area === 'string' ? area : area.section || area.text || area.suggestions || 'Improvement opportunity identified'}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
              
              {(analysis.improvementAreas || []).length > 4 && (
                <Typography variant="caption" color="text.secondary">
                  +{(analysis.improvementAreas || []).length - 4} more opportunities identified
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Paper>
  );
};

export default ResumeAnalysisSummary;
