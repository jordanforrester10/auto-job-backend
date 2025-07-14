// src/components/subscription/limits/WeeklyAiJobLimit.js
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
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  SmartToy as SmartToyIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  AttachMoney as AttachMoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const WeeklyAiJobLimit = ({ 
  open, 
  onClose, 
  currentUsage = { used: 0, limit: 1 },
  weeklyStats = { weeklyUsed: 0, weeklyLimit: 50, weeklyPercentage: 0 },
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
      aiSearchSlots: 1,
      weeklyJobs: 50,
      features: [
        '1 AI job search slot',
        'Up to 50 jobs automatically discovered per week',
        'Multi-location search support',
        'Enhanced salary extraction',
        'Weekly automation',
        'Premium job analysis',
        '25 manual job imports per month',
        '25 recruiter contact unlocks per month',
        'Resume-job matching'
      ]
    },
    hunter: {
      name: 'Hunter Plan',
      price: '$34.99/month',
      color: theme.palette.warning.main,
      aiSearchSlots: 1,
      weeklyJobs: 100,
      features: [
        '1 AI job search slot',
        'Up to 100 jobs automatically discovered per week',
        'Multi-location search support',
        'Enhanced salary extraction',
        'Weekly automation',
        'Premium job analysis',
        'Unlimited manual job imports',
        'Unlimited recruiter contact unlocks',
        'AI Assistant access',
        '50 resume tailorings per month'
      ]
    }
  };

  const getCurrentWeekString = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
            <SmartToyIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Weekly AI Job Discovery Limit
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
        {/* Current Status */}
        <Box sx={{ p: 3 }}>
          <Card 
            sx={{ 
              borderRadius: 2,
              border: `1px solid ${theme.palette.warning.main}`,
              backgroundColor: alpha(theme.palette.warning.main, 0.05)
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom color="warning.main">
                {currentPlan === 'free' ? 'Free Plan Limitation' : 'Weekly Search Status'}
              </Typography>
              
              {currentPlan === 'free' ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Weekly AI job discovery is not available on the Free plan.
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="body2">
                      Upgrade to Casual or Hunter plan to unlock weekly AI job discovery with automatic job finding.
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      AI Search Slots - {currentPlan === 'casual' ? 'Casual Plan' : 'Hunter Plan'}
                    </Typography>
                    <Chip 
                      label={`${currentUsage.used}/${currentUsage.limit} Slots`}
                      color={currentUsage.used >= currentUsage.limit ? "error" : "success"}
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(usagePercentage, 100)}
                    color={usagePercentage >= 100 ? "error" : "primary"}
                    sx={{ height: 8, borderRadius: 4, mb: 3 }}
                  />

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Weekly Job Discovery - {getCurrentWeekString()}
                    </Typography>
                    <Chip 
                      label={`${weeklyStats.weeklyUsed}/${weeklyStats.weeklyLimit} Jobs`}
                      color={weeklyStats.weeklyPercentage > 80 ? "warning" : "info"}
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(weeklyStats.weeklyPercentage, 100)}
                    color={weeklyStats.weeklyPercentage > 80 ? "warning" : "info"}
                    sx={{ height: 8, borderRadius: 4, mb: 2 }}
                  />
                  
                  <Typography variant="body2" color="text.secondary">
                    Your AI search discovers up to {weeklyStats.weeklyLimit} jobs automatically every Monday.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Plan Comparison */}
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
                      Weekly AI Discovery:
                    </Typography>
                    <Chip 
                      label={`${planBenefits.casual.weeklyJobs} jobs/week`}
                      color="primary"
                      variant="outlined"
                      icon={<CalendarIcon />}
                      sx={{ mb: 1 }}
                    />
                    <Chip 
                      label={`${planBenefits.casual.aiSearchSlots} search slot`}
                      color="primary"
                      variant="outlined"
                      icon={<SearchIcon />}
                      sx={{ ml: 1, mb: 2 }}
                    />
                  </Box>

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Features Included:
                  </Typography>
                  <Box>
                    {planBenefits.casual.features.slice(0, 6).map((feature, index) => (
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
                    <AutoAwesomeIcon sx={{ color: planBenefits.hunter.color }} />
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
                      Enhanced Weekly AI Discovery:
                    </Typography>
                    <Chip 
                      label={`${planBenefits.hunter.weeklyJobs} jobs/week`}
                      color="warning"
                      variant="outlined"
                      icon={<CalendarIcon />}
                      sx={{ mb: 1 }}
                    />
                    <Chip 
                      label={`${planBenefits.hunter.aiSearchSlots} search slot`}
                      color="warning"
                      variant="outlined"
                      icon={<SearchIcon />}
                      sx={{ ml: 1, mb: 2 }}
                    />
                  </Box>

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Features Included:
                  </Typography>
                  <Box>
                    {planBenefits.hunter.features.slice(0, 7).map((feature, index) => (
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

          {/* How Weekly AI Discovery Works */}
          <Card sx={{ mt: 3, borderRadius: 2, border: `1px solid ${theme.palette.info.main}`, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom color="info.main">
                🤖 How Weekly AI Job Discovery Works
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Automated Weekly Search"
                    secondary="Runs every Monday morning to find fresh job opportunities"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <LocationIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Multi-Location Support"
                    secondary="Search across multiple cities and remote opportunities simultaneously"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <AttachMoneyIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Enhanced Salary Extraction"
                    secondary="Extracts salary information from job descriptions and company data"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <SpeedIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Premium Job Analysis"
                    secondary="Every job gets full AI analysis with skill matching and ATS optimization"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Value Proposition */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: alpha(theme.palette.success.main, 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              💡 <strong>Why upgrade?</strong> Save hours every week with automated job discovery. 
              Our AI finds {currentPlan === 'free' ? '50-100' : currentPlan === 'casual' ? '100' : '50'} quality jobs weekly 
              while you focus on applications and interviews.
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
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, ml: 1 }}
          >
            Upgrade Plan
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WeeklyAiJobLimit;