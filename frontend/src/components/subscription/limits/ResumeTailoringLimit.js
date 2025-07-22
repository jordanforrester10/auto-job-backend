// src/components/subscription/limits/ResumeTailoringLimit.js
import React from 'react';
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
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Upgrade as UpgradeIcon,
  AutoFixHigh as AutoFixHighIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';

const ResumeTailoringLimit = ({ 
  open, 
  onClose, 
  currentUsage = { used: 0, limit: 1 },
  currentPlan = 'free',
  onUpgrade = null 
}) => {
  const theme = useTheme();

  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 100;

  const planBenefits = {
    casual: {
      name: 'Casual Plan',
      price: '$14.99/month',
      color: theme.palette.primary.main,
      tailorings: 25,
      features: [
        '25 resume tailorings per month',
        'AI-powered optimization',
        'Job-specific customization',
        'ATS compatibility analysis',
        '25 manual job imports per month',
        'Up to 50 Jobs Automatically Delivered per week',
        'Recruiter database access'
      ]
    },
    hunter: {
      name: 'Hunter Plan',
      price: '$24.99/month',
      color: theme.palette.warning.main,
      tailorings: 50,
      features: [
        '50 resume tailorings per month',
        'Premium AI optimization',
        'Advanced customization',
        'Real-time ATS scoring',
        'Unlimited manual job imports',
        'AI Assistant access',
        'Up to 100 Jobs Automatically Delivered per week',
        'Priority support'
      ]
    }
  };

  const handleUpgrade = (plan) => {
    if (onUpgrade) {
      onUpgrade(plan);
    } else {
      // Default action - open pricing page
      window.open('/pricing', '_blank');
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
        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoFixHighIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Resume Tailoring Limit Reached
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
      
      <DialogContent sx={{ p: 3 }}>
        {/* Current Usage Status */}
        <Card 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.warning.main}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.05)
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Current Usage - {currentPlan === 'free' ? 'Free Plan' : `${currentPlan} Plan`}
              </Typography>
              <Chip 
                label={`${currentUsage.used}/${currentUsage.limit} Tailorings`}
                color="warning"
                sx={{ fontWeight: 500 }}
              />
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={Math.min(usagePercentage, 100)}
              color="warning"
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              You've reached your monthly limit of {currentUsage.limit} resume tailoring{currentUsage.limit === 1 ? '' : 's'}. 
              Upgrade your plan to create more tailored resumes with AI optimization.
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
          Unlock More Resume Tailorings
        </Typography>

        <Grid container spacing={3}>
          {/* Casual Plan */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                border: `2px solid ${planBenefits.casual.color}`,
                backgroundColor: alpha(planBenefits.casual.color, 0.05),
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px ${alpha(planBenefits.casual.color, 0.3)}`
                }
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
                    Resume Tailoring Capacity:
                  </Typography>
                  <Chip 
                    label={`${planBenefits.casual.tailorings} tailorings/month`}
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Features Included:
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {planBenefits.casual.features.map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleUpgrade('casual')}
                  startIcon={<UpgradeIcon />}
                  sx={{ 
                    mt: 'auto',
                    borderRadius: 2,
                    py: 1.5,
                    backgroundColor: planBenefits.casual.color,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    }
                  }}
                >
                  Upgrade to Casual
                </Button>
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
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px ${alpha(planBenefits.hunter.color, 0.3)}`
                }
              }}
            >
              {/* Recommended Badge */}
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
                RECOMMENDED
              </Box>

              <CardContent sx={{ p: 3, pt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SmartToyIcon sx={{ color: planBenefits.hunter.color }} />
                  <Typography variant="h6" fontWeight={600}>
                    {planBenefits.hunter.name}
                  </Typography>
                </Box>
                
                <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: planBenefits.hunter.color }}>
                  {planBenefits.hunter.price}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Complete AI-powered optimization
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Resume Tailoring Capacity:
                  </Typography>
                  <Chip 
                    label={`${planBenefits.hunter.tailorings} tailorings/month`}
                    color="warning"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Features Included:
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {planBenefits.hunter.features.map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleUpgrade('hunter')}
                  startIcon={<UpgradeIcon />}
                  sx={{ 
                    mt: 'auto',
                    borderRadius: 2,
                    py: 1.5,
                    backgroundColor: planBenefits.hunter.color,
                    '&:hover': {
                      backgroundColor: theme.palette.warning.dark,
                    }
                  }}
                >
                  Upgrade to Hunter
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Value Proposition */}
        <Box sx={{ 
          mt: 3, 
          p: 2.5, 
          bgcolor: alpha(theme.palette.success.main, 0.1),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AutoFixHighIcon sx={{ color: theme.palette.success.main }} />
            <Typography variant="subtitle2" fontWeight={600} color="success.main">
              Why Resume Tailoring Matters
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Tailored resumes increase your interview chances by up to <strong>3x</strong>. 
            Our AI analyzes job requirements and optimizes your resume content, keywords, 
            and formatting to beat ATS systems and impress hiring managers.
          </Typography>
        </Box>

        {/* Feature Comparison */}
        <Card sx={{ mt: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              What You Get with Tailored Resumes:
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">Job-specific optimization</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">ATS keyword matching</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">Enhanced bullet points</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">Skills gap analysis</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">Format optimization</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="body2">Instant score improvement</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
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
        <Button 
          onClick={() => handleUpgrade('hunter')}
          variant="contained" 
          color="warning"
          startIcon={<UpgradeIcon />}
          sx={{ borderRadius: 2 }}
        >
          Start Tailoring Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResumeTailoringLimit;