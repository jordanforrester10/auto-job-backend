// src/components/subscription/limits/JobImportLimit.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  useTheme,
  alpha,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const JobImportLimit = ({ 
  open, 
  onClose, 
  currentUsage = { used: 0, limit: 3 },
  currentPlan = 'free',
  onUpgrade = null 
}) => {
  const theme = useTheme();

  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 100;

  const planBenefits = {
    casual: {
      name: 'Casual Plan',
      price: '$19.99/month',
      color: theme.palette.primary.main,
      jobImports: 25,
      features: [
        '25 job imports per month',
        'AI-powered job analysis',
        'Resume-job matching',
        'Recruiter database access',
        '25 recruiter unlocks per month',
        '1 AI job discovery per month'
      ]
    },
    hunter: {
      name: 'Hunter Plan',
      price: '$34.99/month',
      color: theme.palette.warning.main,
      jobImports: 'Unlimited',
      features: [
        'Unlimited job imports',
        'Premium AI job analysis',
        'Advanced resume matching',
        'Full recruiter access',
        'Unlimited recruiter unlocks',
        'Unlimited AI job discovery',
        'AI Assistant access',
        '50 resume tailorings per month'
      ]
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Job Import Limit Reached
            </Typography>
          </Box>
          <Button 
            color="inherit" 
            onClick={onClose}
            sx={{ 
              minWidth: 'auto', 
              p: 1,
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Current Usage Status */}
        <Box sx={{ p: 3 }}>
          <Card 
            sx={{ 
              borderRadius: 2,
              border: `1px solid ${theme.palette.error.main}`,
              backgroundColor: alpha(theme.palette.error.main, 0.05)
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Current Usage - {currentPlan === 'free' ? 'Free Plan' : `${currentPlan} Plan`}
                </Typography>
                <Chip 
                  label={`${currentUsage.used}/${currentUsage.limit} Jobs`}
                  color="error"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={Math.min(usagePercentage, 100)}
                color="error"
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary">
                You've reached your monthly limit of {currentUsage.limit} job imports. 
                Upgrade your plan to import more jobs and unlock additional features.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Plan Information Section */}
        <Box sx={{ p: 3, pt: 0 }}>
          <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
            Available Plans
          </Typography>

          <Grid container spacing={3}>
            {/* Casual Plan */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  border: `2px solid ${planBenefits.casual.color}`,
                  backgroundColor: alpha(planBenefits.casual.color, 0.05)
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUpIcon sx={{ color: planBenefits.casual.color }} />
                    <Typography variant="h6" fontWeight={600}>
                      {planBenefits.casual.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: planBenefits.casual.color }}>
                    {planBenefits.casual.price}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Perfect for active job seekers
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Job Import Capacity:
                    </Typography>
                    <Chip 
                      label={`${planBenefits.casual.jobImports} jobs/month`}
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Box>

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Features Included:
                  </Typography>
                  <Box>
                    {planBenefits.casual.features.map((feature, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Hunter Plan */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  border: `2px solid ${planBenefits.hunter.color}`,
                  backgroundColor: alpha(planBenefits.hunter.color, 0.05),
                  position: 'relative'
                }}
              >
                {/* Popular Badge */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -1,
                    right: 20,
                    backgroundColor: planBenefits.hunter.color,
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: '0 0 8px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <StarIcon sx={{ fontSize: 14 }} />
                  MOST POPULAR
                </Box>

                <CardContent sx={{ p: 3, pt: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <StarIcon sx={{ color: planBenefits.hunter.color }} />
                    <Typography variant="h6" fontWeight={600}>
                      {planBenefits.hunter.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: planBenefits.hunter.color }}>
                    {planBenefits.hunter.price}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Complete AI-powered job hunting suite
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Job Import Capacity:
                    </Typography>
                    <Chip 
                      label={`${planBenefits.hunter.jobImports} jobs`}
                      color="warning"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Box>

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Features Included:
                  </Typography>
                  <Box>
                    {planBenefits.hunter.features.map((feature, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Value Proposition */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: alpha(theme.palette.info.main, 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              💡 <strong>Why upgrade?</strong> Premium plans include advanced AI analysis, 
              unlimited job storage, and powerful automation features to accelerate your job search.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        px: 3, 
        py: 2, 
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: 'rgba(0,0,0,0.02)'
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobImportLimit;