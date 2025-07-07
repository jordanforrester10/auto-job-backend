// frontend/src/components/help/GettingStartedGuide.js
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Grid,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Upload,
  Work,
  Person,
  SmartToy,
  TrendingUp,
  Help,
  Speed,
  Security,
  Lock,
  Upgrade,
  Star
} from '@mui/icons-material';
import MainLayout from '../layout/MainLayout';
import { useSubscription } from '../../context/SubscriptionContext';

const GettingStartedGuide = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  const { currentSubscription, hasFeatureAccess } = useSubscription();

  const userPlan = currentSubscription?.tier || 'free';

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Feature access helper
  const getFeatureStatus = (feature) => {
    const hasAccess = hasFeatureAccess(feature);
    const requiredPlan = getRequiredPlan(feature);
    
    return {
      hasAccess,
      requiredPlan,
      isLocked: !hasAccess
    };
  };

  const getRequiredPlan = (feature) => {
    const featurePlans = {
      'recruiterAccess': 'casual',
      'aiJobDiscovery': 'casual', 
      'aiAssistant': 'hunter',
      'resumeTailoring': 'free', // Available to all
      'resumeUploads': 'free' // Basic available to all
    };
    return featurePlans[feature] || 'free';
  };

  const getPlanColor = (plan) => {
    const colors = {
      'free': 'default',
      'casual': 'primary',
      'hunter': 'warning'
    };
    return colors[plan] || 'default';
  };

  const getPlanName = (plan) => {
    const names = {
      'free': 'Free',
      'casual': 'Casual',
      'hunter': 'Hunter'
    };
    return names[plan] || 'Free';
  };

  // Feature card component with plan requirements
  const FeatureCard = ({ icon, title, description, feature, href }) => {
    const status = getFeatureStatus(feature);
    
    return (
      <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
        <CardContent sx={{ textAlign: 'center', pb: 3 }}>
          {status.isLocked && (
            <Chip
              size="small"
              label={`${getPlanName(status.requiredPlan)}+ Required`}
              color={getPlanColor(status.requiredPlan)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            />
          )}
          <Box sx={{ mb: 2, opacity: status.isLocked ? 0.5 : 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" sx={{ opacity: status.isLocked ? 0.7 : 1 }}>
            {title}
            {status.isLocked && <Lock sx={{ ml: 1, fontSize: 16, verticalAlign: 'middle' }} />}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          {status.isLocked ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Upgrade />}
              href="/settings" // Assuming settings has subscription management
            >
              Upgrade to {getPlanName(status.requiredPlan)}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              href={href}
            >
              Get Started
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const steps = [
    {
      label: 'Welcome to auto-job.ai',
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              You're currently on the <strong>{getPlanName(userPlan)}</strong> plan. 
              {userPlan === 'free' && ' Upgrade to access more powerful features!'}
            </Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Welcome to auto-job.ai! We're here to help you secure interviews faster with AI agents. 
            Let's get you set up and ready to supercharge your job search.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<Upload color="primary" sx={{ fontSize: 40 }} />}
                title="Upload Resume"
                description="Start by uploading your resume for AI analysis"
                feature="resumeUploads"
                href="/resumes"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<Work color="primary" sx={{ fontSize: 40 }} />}
                title="Find Jobs"
                description="Search and import jobs that match your skills"
                feature="resumeTailoring"
                href="/jobs"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<Person color="primary" sx={{ fontSize: 40 }} />}
                title="Connect with Recruiters"
                description="Get personalized outreach to relevant recruiters"
                feature="recruiterAccess"
                href="/recruiters"
              />
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Upload Your First Resume',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Start by uploading your resume. Our AI will analyze it to identify strengths, 
            weaknesses, and optimization opportunities.
          </Typography>
          {userPlan === 'free' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Free Plan:</strong> You can upload 1 resume. 
                <Button variant="text" size="small" href="/settings" sx={{ ml: 1 }}>
                  Upgrade for more
                </Button>
              </Typography>
            </Alert>
          )}
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Navigate to 'My Resumes'" 
                secondary="Click on the 'My Resumes' section in the sidebar"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Upload your resume" 
                secondary="Click 'Upload Resume' and select your PDF or DOCX file"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Review AI analysis" 
                secondary="Get instant feedback on your resume's strengths and areas for improvement"
              />
            </ListItem>
          </List>
          <Button 
            variant="contained" 
            startIcon={<Upload />}
            href="/resumes"
            sx={{ mt: 2 }}
          >
            Upload Resume Now
          </Button>
        </Box>
      ),
    },
    {
      label: 'Explore Job Opportunities',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Use our Jobs Portal to find and import job opportunities that match your profile.
          </Typography>
          {userPlan === 'free' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Free Plan:</strong> You can import 3 jobs. 
                <Button variant="text" size="small" href="/settings" sx={{ ml: 1 }}>
                  Upgrade for 25+ jobs
                </Button>
              </Typography>
            </Alert>
          )}
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Go to Jobs Portal" 
                secondary="Access the Jobs Portal from the main navigation"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Import job descriptions" 
                secondary="Add jobs manually or via URL from job boards"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Get match analysis" 
                secondary="See how well your resume matches each job opportunity"
              />
            </ListItem>
          </List>
          <Button 
            variant="contained" 
            startIcon={<Work />}
            href="/jobs"
            sx={{ mt: 2 }}
          >
            Explore Jobs
          </Button>
        </Box>
      ),
    },
    {
      label: 'Connect with Recruiters',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Access our recruiter database to find and connect with industry professionals.
          </Typography>
          {!hasFeatureAccess('recruiterAccess') && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Recruiter Access:</strong> Available with Casual plan and above.
                <Button variant="text" size="small" href="/settings" sx={{ ml: 1 }}>
                  Upgrade Now
                </Button>
              </Typography>
            </Alert>
          )}
          <List>
            <ListItem>
              <ListItemIcon>
                {hasFeatureAccess('recruiterAccess') ? <CheckCircle color="primary" /> : <Lock color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Browse recruiters" 
                secondary="Search for recruiters by company, industry, or role"
                sx={{ opacity: hasFeatureAccess('recruiterAccess') ? 1 : 0.6 }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {hasFeatureAccess('recruiterAccess') ? <CheckCircle color="primary" /> : <Lock color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Generate personalized outreach" 
                secondary="Use AI to create customized messages for each recruiter"
                sx={{ opacity: hasFeatureAccess('recruiterAccess') ? 1 : 0.6 }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {hasFeatureAccess('recruiterAccess') ? <CheckCircle color="primary" /> : <Lock color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Track your outreach" 
                secondary="Monitor responses and manage follow-ups"
                sx={{ opacity: hasFeatureAccess('recruiterAccess') ? 1 : 0.6 }}
              />
            </ListItem>
          </List>
          {hasFeatureAccess('recruiterAccess') ? (
            <Button 
              variant="contained" 
              startIcon={<Person />}
              href="/recruiters"
              sx={{ mt: 2 }}
            >
              Find Recruiters
            </Button>
          ) : (
            <Button 
              variant="outlined" 
              startIcon={<Upgrade />}
              href="/settings"
              sx={{ mt: 2 }}
            >
              Upgrade to Access Recruiters
            </Button>
          )}
        </Box>
      ),
    },
    {
      label: 'Optimize Your Success',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Use these advanced features to maximize your job search success.
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <SmartToy color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    AI Resume Tailoring
                    {userPlan === 'free' && <Chip size="small" label="1 per month" color="default" />}
                    {userPlan === 'casual' && <Chip size="small" label="25 per month" color="primary" />}
                    {userPlan === 'hunter' && <Chip size="small" label="50 per month" color="warning" />}
                  </Box>
                }
                secondary="Customize your resume for specific job descriptions"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {hasFeatureAccess('aiAssistant') ? <SmartToy color="primary" /> : <Lock color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    AI Assistant
                    {!hasFeatureAccess('aiAssistant') && <Chip size="small" label="Hunter Required" color="warning" />}
                  </Box>
                }
                secondary="Get personalized job search guidance and advice"
                sx={{ opacity: hasFeatureAccess('aiAssistant') ? 1 : 0.6 }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {hasFeatureAccess('aiJobDiscovery') ? <TrendingUp color="primary" /> : <Lock color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    AI Job Discovery
                    {!hasFeatureAccess('aiJobDiscovery') && <Chip size="small" label="Casual+ Required" color="primary" />}
                  </Box>
                }
                secondary="Automatically find relevant job opportunities"
                sx={{ opacity: hasFeatureAccess('aiJobDiscovery') ? 1 : 0.6 }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Speed color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Dashboard Analytics" 
                secondary="View your job search progress and metrics"
              />
            </ListItem>
          </List>
          {userPlan === 'free' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> Upgrade to Casual or Hunter plan to unlock AI-powered features that can 10x your job search success!
              </Typography>
            </Alert>
          )}
        </Box>
      ),
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Getting Started Guide
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Learn how to use auto-job.ai to accelerate your job search
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip 
              label="Estimated time: 10 minutes" 
              color="primary" 
              variant="outlined"
              sx={{ fontSize: '0.9rem', py: 2 }}
            />
            <Chip 
              label={`Current Plan: ${getPlanName(userPlan)}`} 
              color={getPlanColor(userPlan)} 
              variant="filled"
              sx={{ fontSize: '0.9rem', py: 2 }}
            />
          </Box>
        </Box>

        {/* Step-by-Step Guide */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 3, textAlign: 'center' }}>
            Step-by-Step Setup
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    optional={
                      index === steps.length - 1 ? (
                        <Typography variant="caption">Last step</Typography>
                      ) : null
                    }
                  >
                    <Typography variant="h6">{step.label}</Typography>
                  </StepLabel>
                  <StepContent>
                    {step.content}
                    <Box sx={{ mb: 2 }}>
                      <div>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          sx={{ mt: 1, mr: 1 }}
                          startIcon={index === steps.length - 1 ? <CheckCircle /> : <PlayArrow />}
                        >
                          {index === steps.length - 1 ? 'Finish' : 'Continue'}
                        </Button>
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Back
                        </Button>
                      </div>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {activeStep === steps.length && (
              <Paper square elevation={0} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🎉 Congratulations! You're all set up!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  You're now ready to start using auto-job.ai to accelerate your job search. 
                  Head to your dashboard to begin exploring jobs and connecting with recruiters.
                </Typography>
                <Button 
                  variant="contained" 
                  href="/dashboard"
                  sx={{ mr: 1 }}
                >
                  Go to Dashboard
                </Button>
                <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                  Reset Guide
                </Button>
              </Paper>
            )}
          </Paper>
        </Box>

        {/* Need Help */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Need additional help?
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<Help />}
            href="/contact-support"
          >
            Contact Support
          </Button>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default GettingStartedGuide;