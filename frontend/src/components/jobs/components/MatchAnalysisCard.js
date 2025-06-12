// src/components/jobs/components/MatchAnalysisCard.js
import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  LinearProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { EnhancedCircularProgress } from './EnhancedCircularProgress';

const MatchAnalysisCard = ({ job }) => {
  const theme = useTheme();

  const getScoreColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'info';
    if (score >= 55) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score) => {
    if (score >= 85) return <CheckCircleIcon color="success" />;
    if (score >= 70) return <InfoIcon color="info" />;
    if (score >= 55) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  if (!job.matchAnalysis?.overallScore) {
    return null;
  }

  return (
    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
      <CardHeader 
        title="Match Analysis" 
        avatar={<SpeedIcon color="primary" />}
        sx={{ 
          pb: 1, 
          '& .MuiCardHeader-title': { fontWeight: 600 } 
        }}
      />
      <CardContent sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <EnhancedCircularProgress 
          value={job.matchAnalysis.overallScore}
          size={120}
        />
        
        <Box sx={{ width: '100%', mt: 3 }}>
          {['skills', 'experience', 'education'].map((category) => {
            const score = job.matchAnalysis.categoryScores?.[category] || 0;
            return (
              <Box key={category} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {category} Match
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getScoreIcon(score)}
                    <Typography variant="h6" fontWeight="medium" color={getScoreColor(score)}>
                      {score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={score}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: theme.palette[getScoreColor(score)].main,
                    }
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {job.matchAnalysis.matchedSkills && (
          <Box sx={{ width: '100%', mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Skills:</strong> {job.matchAnalysis.matchedSkills.filter(s => s.found).length} of {job.matchAnalysis.matchedSkills.length} matched
            </Typography>
            {job.matchAnalysis.experienceAnalysis && (
              <Typography variant="body2" color="text.secondary">
                <strong>Experience:</strong> {job.matchAnalysis.experienceAnalysis.relevantYearsExperience || 0} years relevant
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchAnalysisCard;