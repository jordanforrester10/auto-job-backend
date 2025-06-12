// src/components/resumes/components/ProcessingView.js
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import MainLayout from '../../layout/MainLayout';

/**
 * Processing view component shown while resume is being analyzed
 * @param {object} props - Component props
 * @param {function} props.navigate - Navigation function
 * @returns {JSX.Element} Processing view component
 */
const ProcessingView = ({ navigate }) => {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/resumes')}
          sx={{ mb: 3 }}
        >
          Back to Resumes
        </Button>
        
        <Card sx={{ maxWidth: 700, mx: 'auto', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress size={80} thickness={4} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight={500}>
              Processing Your Resume
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
              Our AI is currently analyzing your resume. This process may take a few minutes.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="primary">
              This page will automatically update when processing is complete.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
};

export default ProcessingView;