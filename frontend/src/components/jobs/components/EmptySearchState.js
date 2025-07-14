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
          Start Your AI Automated Job Search
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, fontSize: '0.95rem' }}> {/* Reduced mb and maxWidth, added smaller fontSize */}
          Let our AI Agent continuously search for job opportunities that match your resume every week.
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
            Begin Your Weekly Job Search {/* Updated text */}
          </Button>
        </Box>
        <Alert severity="info" sx={{ mt: 2.5, maxWidth: 550, fontSize: '0.875rem' }}> {/* Reduced mt and maxWidth, added smaller fontSize */}
          You need at least one resume to use the AI Agent search feature.
          Please upload a resume first.
        </Alert>
      </Paper>



      
    </Box>
  );
};

export default EmptySearchState;