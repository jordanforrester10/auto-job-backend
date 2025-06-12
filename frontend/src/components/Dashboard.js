// src/components/Dashboard.js - Redesigned Dashboard
import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Chip,
  useTheme,
  Paper,
  Alert,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MainLayout from './layout/MainLayout';
import AutoJobLogo from './common/AutoJobLogo';
import resumeService from '../utils/resumeService';
import jobService from '../utils/jobService';

const Dashboard = () => {
  const theme = useTheme();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    resumeCount: 0,
    jobMatches: 0,
    applications: 0,
    resumeScore: 0,
    hasActiveResume: false,
    hasAnalyzedResumes: false
  });

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load resumes and jobs in parallel
        const [resumesData, jobsData] = await Promise.all([
          resumeService.getUserResumes().catch(() => []),
          jobService.getUserJobs().catch(() => [])
        ]);
        
        setResumes(resumesData);
        setJobs(jobsData);
        
        // Calculate stats
        const activeResume = resumesData.find(r => r.isActive);
        const completedJobs = jobsData.filter(j => j.analysisStatus?.status === 'completed');
        const applications = jobsData.filter(j => j.applicationStatus && j.applicationStatus !== 'Not Applied');
        
        // Calculate average resume score from all analyzed resumes
        let resumeScore = 0;
        const analyzedResumes = resumesData.filter(r => r.analysis?.overallScore);
        if (analyzedResumes.length > 0) {
          const totalScore = analyzedResumes.reduce((sum, r) => sum + r.analysis.overallScore, 0);
          resumeScore = Math.round(totalScore / analyzedResumes.length);
        }
        
        setStats({
          resumeCount: resumesData.length,
          jobMatches: completedJobs.length,
          applications: applications.length,
          resumeScore: resumeScore,
          hasActiveResume: !!activeResume
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // Get user's first name
  const firstName = currentUser?.firstName || 'there';
  
  // Determine user journey stage
  const isFirstTimeUser = stats.resumeCount === 0;
  const hasResumes = stats.resumeCount > 0;
  const hasJobs = stats.jobMatches > 0;
  const hasApplications = stats.applications > 0;

  // Get contextual message based on user journey
  const getContextualMessage = () => {
    if (isFirstTimeUser) {
      return {
        title: `Welcome to auto-job.ai, ${firstName}!`,
        message: "Let's get you started! Upload your resume and I'll analyze it with AI to help you find perfect job matches and optimize your applications."
      };
    }
    
    if (!stats.hasAnalyzedResumes) {
      return {
        title: `Hi ${firstName}! Let's analyze your resumes`,
        message: "I see you have resumes uploaded. Let me analyze them with AI to identify strengths, weaknesses, and optimization opportunities for better job matches."
      };
    }
    
    if (stats.resumeScore > 0 && stats.resumeScore < 70) {
      return {
        title: `Hi ${firstName}! Your resume shows potential`,
        message: `Your average resume score is ${stats.resumeScore}/100. Let's work together to boost that score and find you better job opportunities!`
      };
    }
    
    if (stats.resumeScore >= 70 && stats.resumeScore < 85 && !hasJobs) {
      return {
        title: `Great progress, ${firstName}! Ready to find jobs?`,
        message: `Your resumes average ${stats.resumeScore}/100 - solid! Now let's put my AI agents to work finding you the perfect job matches.`
      };
    }

    if (stats.resumeScore >= 85 && !hasJobs) {
      return {
        title: `Excellent work, ${firstName}! Time to hunt for jobs`,
        message: `Your resumes average ${stats.resumeScore}/100 - outstanding! With scores like these, let's find you some amazing opportunities.`
      };
    }
    
    if (hasJobs && !hasApplications) {
      return {
        title: `Perfect timing, ${firstName}!`,
        message: `I found ${stats.jobMatches} job matches for you! Ready to start applying? I can help you tailor your applications for better results.`
      };
    }
    
    if (hasApplications && stats.applications < 10) {
      return {
        title: `You're building momentum, ${firstName}!`,
        message: `You've applied to ${stats.applications} positions - great start! Let's keep the applications flowing and find even more opportunities.`
      };
    }
    
    return {
      title: `You're crushing it, ${firstName}!`,
      message: `With ${stats.applications} applications and ${stats.jobMatches} matches, you're in full job-hunting mode! I'm continuously finding new opportunities that match your profile.`
    };
  };

  // Welcome Speech Bubble Component
  const WelcomeSpeechBubble = () => {
    const contextMessage = getContextualMessage();
    
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}12 0%, ${theme.palette.secondary.main}08 100%)`,
          border: `2px solid ${theme.palette.primary.main}25`,
          borderRadius: 3,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flexShrink: 0, mt: 0.5 }}>
            <AutoJobLogo variant="icon-only" size="medium" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              {contextMessage.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {contextMessage.message}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Progress Steps Component
  const ProgressSteps = () => {
    const steps = [
      {
        id: 'upload',
        title: 'Upload Resume',
        description: 'Add your resume files',
        completed: hasResumes,
        action: () => navigate('/resumes'),
        icon: <DescriptionIcon />,
        actionText: hasResumes ? 'Add More Resumes' : 'Upload Resume'
      },
      {
        id: 'analyze',
        title: 'Analysis',
        description: 'Get resume insights',
        completed: stats.hasAnalyzedResumes,
        action: () => navigate('/resumes'),
        icon: <AutoAwesomeIcon />,
        actionText: stats.hasAnalyzedResumes ? 'View Analysis' : 'Analyze Resumes'
      },
      {
        id: 'search',
        title: 'Find Jobs',
        description: 'Discover opportunities',
        completed: hasJobs,
        action: () => hasJobs ? navigate('/jobs') : navigate('/jobs/ai-searches'),
        icon: <SearchIcon />,
        actionText: hasJobs ? 'View Matches' : 'Start Job Search'
      },
      {
        id: 'apply',
        title: 'Apply & Track',
        description: 'Submit applications',
        completed: hasApplications,
        action: () => navigate('/jobs'),
        icon: <SendIcon />,
        actionText: hasApplications ? 'Track Applications' : 'Start Applying'
      }
    ];

    const completedSteps = steps.filter(s => s.completed).length;
    const progressPercentage = (completedSteps / steps.length) * 100;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Your Journey Progress
            </Typography>
            <Chip 
              label={`${completedSteps}/${steps.length} Complete`}
              color={completedSteps === steps.length ? 'success' : 'primary'}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ 
              height: 8, 
              borderRadius: 4, 
              mb: 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
              }
            }} 
          />
          
          <Grid container spacing={2}>
            {steps.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={step.id}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    height: 140, // Fixed height for consistency
                    borderRadius: 2,
                    backgroundColor: step.completed ? 'success.main' : 'background.paper',
                    color: step.completed ? 'white' : 'text.primary',
                    border: step.completed ? 'none' : `2px solid ${theme.palette.grey[200]}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                      borderColor: step.completed ? 'transparent' : theme.palette.primary.main,
                      backgroundColor: step.completed ? 'success.dark' : 'background.paper'
                    }
                  }}
                  onClick={step.action}
                >
                  <Box sx={{ color: step.completed ? 'white' : theme.palette.primary.main, mb: 1 }}>
                    {step.completed ? <CheckCircleIcon /> : step.icon}
                  </Box>
                  
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1 }}>
                      {step.description}
                    </Typography>
                  </Box>
                  
                  {!step.completed && (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ 
                        fontSize: '0.7rem', 
                        minHeight: 'auto',
                        py: 0.5,
                        px: 1,
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                          color: 'white'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        step.action();
                      }}
                    >
                      {step.actionText}
                    </Button>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Stats Overview for existing users
  const StatsOverview = () => {
    if (isFirstTimeUser) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.resumeScore}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Resume Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WorkIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.jobMatches}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Job Matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.applications}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 32, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                {stats.resumeCount}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Resumes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Feature Discovery Component
  const FeatureDiscovery = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoJobLogo variant="icon-only" size="small" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI-Powered Features
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 2, mt: 0.5 }}>
                <AutoAwesomeIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Smart Resume Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI analyzes your resume and suggests improvements for better job matches
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 2, mt: 0.5 }}>
                <SearchIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Intelligent Job Discovery
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our AI agents continuously search for jobs that match your profile
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32, mr: 2, mt: 0.5 }}>
                <PeopleIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Recruiter Outreach
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect directly with recruiters and hiring managers in your field
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 3 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
          <Grid container spacing={3}>
            {[...Array(4)].map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <WelcomeSpeechBubble />
        
        {!isFirstTimeUser && <StatsOverview />}
        
        <ProgressSteps />
        
        {!isFirstTimeUser && <FeatureDiscovery />}
        
        {/* First-time user special prompt */}
        {isFirstTimeUser && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: 28
              }
            }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/resumes')}
                sx={{ fontWeight: 600 }}
              >
                Upload Now
              </Button>
            }
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Ready to get started?
            </Typography>
            Upload your resume to unlock AI-powered job matching, resume optimization, and recruiter connections.
          </Alert>
        )}
      </Box>
    </MainLayout>
  );
};

export default Dashboard;