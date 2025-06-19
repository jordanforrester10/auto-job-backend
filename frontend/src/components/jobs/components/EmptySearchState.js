// src/components/jobs/components/EmptySearchState.js
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import AutoJobLogo from '../../common/AutoJobLogo';

const EmptySearchState = ({ onStartSearch }) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, // Reduced from 5
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          backgroundColor: 'rgba(26, 115, 232, 0.04)',
          border: '1px dashed rgba(26, 115, 232, 0.3)',
          borderRadius: 2,
          mb: 4 // Reduced from 5
        }}
      >
        <Box sx={{ mb: 2 }}> {/* Reduced from 3 */}
          <AutoJobLogo 
            variant="icon-only" 
            size="medium" // Changed from large to medium
            color="primary"
            sx={{ 
              opacity: 0.7,
              filter: 'drop-shadow(0 2px 8px rgba(26, 115, 232, 0.2))'
            }}
          />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight={600}> {/* Changed from h4 to h5 */}
          Start Your AI Agent Job Search
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, fontSize: '0.95rem' }}> {/* Reduced mb and maxWidth, added smaller fontSize */}
          Let our AI Agent continuously search for job opportunities that match your resume.
          Our platform will analyze matches, find relevant positions, and track your search progress automatically.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AutoJobLogo variant="icon-only" size="small" />} // Changed icon to AutoJobLogo
            onClick={onStartSearch}
            size="medium" // Changed from large to medium
            sx={{ 
              py: 1.2, // Reduced from 1.5
              px: 3, // Reduced from 4
              fontSize: '1rem', // Reduced from 1.1rem
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(26, 115, 232, 0.2)'
            }}
          >
            Begin AI Job Search {/* Updated text */}
          </Button>
        </Box>
        <Alert severity="info" sx={{ mt: 2.5, maxWidth: 550, fontSize: '0.875rem' }}> {/* Reduced mt and maxWidth, added smaller fontSize */}
          You need at least one resume to use the AI Agent search feature.
          Please upload a resume first.
        </Alert>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600 }}> {/* Changed from h5 to h6, reduced mb */}
        How Our AI Agent Search Works
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}> {/* Reduced spacing and mb */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, // Reduced from 3
            borderRadius: 2, 
            borderLeft: '4px solid #4caf50',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}> {/* Changed from h6 to subtitle1 */}
              1. AI Resume Analysis
            </Typography>
            <Box sx={{ 
                height: 100, // Reduced from 140
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5 // Reduced from 2
              }}
            >
              <AutoJobLogo 
                variant="icon-only" 
                size="medium" // Reduced from large equivalent
                color="primary"
                sx={{ opacity: 0.7 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}> {/* Added smaller fontSize */}
              Our AI analyzes your resume and career preferences to understand your ideal job profile
              and search criteria.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, // Reduced from 3
            borderRadius: 2, 
            borderLeft: '4px solid #2196f3',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}> {/* Changed from h6 to subtitle1 */}
              2. Continuous Job Discovery
            </Typography>
            <Box sx={{ 
                height: 100, // Reduced from 140
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5 // Reduced from 2
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 60, color: '#2196f3', opacity: 0.7 }} /> {/* Reduced from 80 */}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}> {/* Added smaller fontSize */}
              Searches multiple job boards and company websites 24/7 to find relevant opportunities
              matching your profile.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ 
            p: 2.5, // Reduced from 3
            borderRadius: 2, 
            borderLeft: '4px solid #ff9800',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}> {/* Changed from h6 to subtitle1 */}
              3. Smart Notifications
            </Typography>
            <Box sx={{ 
                height: 100, // Reduced from 140
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5 // Reduced from 2
              }}
            >
              <NotificationsIcon sx={{ fontSize: 60, color: '#ff9800', opacity: 0.7 }} /> {/* Reduced from 80 */}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}> {/* Added smaller fontSize */}
              Get notified when new relevant jobs are found and receive detailed AI reasoning
              for each match.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ 
            p: 2.5, // Reduced from 3
            borderRadius: 2, 
            borderLeft: '4px solid #9c27b0',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}> {/* Changed from h6 to subtitle1 */}
              4. Intelligent Matching
            </Typography>
            <Box sx={{ 
                height: 100, // Reduced from 140
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5 // Reduced from 2
              }}
            >
              <AssessmentIcon sx={{ fontSize: 60, color: '#9c27b0', opacity: 0.7 }} /> {/* Reduced from 80 */}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}> {/* Added smaller fontSize */}
              Each found job is automatically analyzed for compatibility with your resume,
              providing match scores and improvement suggestions.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ 
            p: 2.5, // Reduced from 3
            borderRadius: 2, 
            borderLeft: '4px solid #00bcd4',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}> {/* Changed from h6 to subtitle1 */}
              5. Progress Tracking
            </Typography>
            <Box sx={{ 
                height: 100, // Reduced from 140
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1.5 // Reduced from 2
              }}
            >
              <AutoJobLogo 
                variant="icon-only" 
                size="medium" // Reduced from large equivalent
                color="primary"
                sx={{ opacity: 0.7 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}> {/* Added smaller fontSize */}
              Monitor your AI Agent's progress, view detailed reasoning logs, and manage
              your automated job search campaigns.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmptySearchState;