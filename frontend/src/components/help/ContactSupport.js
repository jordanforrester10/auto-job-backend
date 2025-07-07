// frontend/src/components/help/ContactSupport.js
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Email,
  Phone,
  Chat,
  Help,
  BugReport,
  Feedback,
  AccountCircle,
  Send,
  CheckCircle,
  Schedule,
  QuestionAnswer
} from '@mui/icons-material';
import MainLayout from '../layout/MainLayout';
import api from '../../utils/axios'; // Use your existing axios instance

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'normal',
    message: '',
    email: '',
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Make API call to submit support request using your existing axios instance
      const response = await api.post('/support/contact', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        priority: formData.priority,
        message: formData.message.trim()
      });

      if (response.data.success) {
        console.log('Support request submitted successfully:', response.data);
        
        setSubmitSuccess(true);
        setFormData({
          subject: '',
          category: '',
          priority: 'normal',
          message: '',
          email: '',
          name: ''
        });
        
        // Clear any previous errors
        setErrors({});
      } else {
        throw new Error(response.data.error || 'Failed to submit support request');
      }
    } catch (error) {
      console.error('Error submitting support request:', error);
      
      let errorMessage = 'Failed to submit support request. Please try again or email us directly at support@auto-job.ai';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportCategories = [
    { value: 'technical', label: 'Technical Issue', icon: <BugReport /> },
    { value: 'account', label: 'Account & Billing', icon: <AccountCircle /> },
    { value: 'feature', label: 'Feature Request', icon: <Feedback /> },
    { value: 'general', label: 'General Question', icon: <QuestionAnswer /> },
    { value: 'other', label: 'Other', icon: <Help /> }
  ];

  const contactMethods = [
    {
      icon: <Email color="primary" sx={{ fontSize: 40 }} />,
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      contact: 'support@auto-job.ai',
      available: '24/7'
    },
    {
      icon: <Chat color="primary" sx={{ fontSize: 40 }} />,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      contact: 'Available in app',
      available: 'Mon-Fri, 9AM-6PM EST'
    }
  ];

  const commonIssues = [
    {
      title: 'Resume Upload Issues',
      description: 'Problems uploading or processing resume files',
      solution: 'Ensure your file is in PDF or DOCX format and under 10MB'
    },
    {
      title: 'Job Matching Problems',
      description: 'Issues with job recommendations or matching scores',
      solution: 'Try updating your resume with more detailed skills and experience'
    },
    {
      title: 'Account Access',
      description: 'Login issues or password reset problems',
      solution: 'Use the password reset link or clear your browser cache'
    },
    {
      title: 'Recruiter Contact Issues',
      description: 'Problems accessing recruiter information',
      solution: 'Check your subscription plan or contact support for access'
    }
  ];

  if (submitSuccess) {
    return (
      <MainLayout>
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, textAlign: 'center' }}>
          <Card sx={{ p: 4 }}>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Thank You!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              Your support request has been submitted successfully.
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              We've received your message and will get back to you within 24 hours. 
              You should receive a confirmation email shortly.
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                onClick={() => setSubmitSuccess(false)}
              >
                Submit Another Request
              </Button>
              <Button 
                variant="outlined" 
                href="/dashboard"
              >
                Back to Dashboard
              </Button>
            </Box>
          </Card>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Contact Support
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Get help from our team
          </Typography>
          <Chip 
            label="Response time: Within 24 hours" 
            color="success" 
            variant="outlined"
            icon={<Schedule />}
          />
        </Box>

        <Grid container spacing={4}>
          {/* Contact Methods */}
          <Grid item xs={12} lg={4}>
            <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
              How Can We Help?
            </Typography>
            
            {/* Contact Options */}
            <Box sx={{ mb: 4 }}>
              {contactMethods.map((method, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {method.icon}
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">
                          {method.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {method.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      <strong>Contact:</strong> {method.contact}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Available:</strong> {method.available}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Common Issues */}
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Common Issues
            </Typography>
            <Paper sx={{ p: 2 }}>
              <List dense>
                {commonIssues.map((issue, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Help color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.title}
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {issue.description}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
                              Quick Fix: {issue.solution}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {index < commonIssues.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Support Form */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                  Submit a Support Request
                </Typography>
                
                <form onSubmit={handleSubmit}>
                  {/* Show submission error if any */}
                  {errors.submit && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {errors.submit}
                    </Alert>
                  )}
                  
                  <Grid container spacing={3}>
                    {/* Personal Information */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Your Name"
                        value={formData.name}
                        onChange={handleInputChange('name')}
                        error={!!errors.name}
                        helperText={errors.name}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        error={!!errors.email}
                        helperText={errors.email}
                        required
                      />
                    </Grid>

                    {/* Request Details */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.category}>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={formData.category}
                          onChange={handleInputChange('category')}
                          label="Category"
                          required
                        >
                          {supportCategories.map((category) => (
                            <MenuItem key={category.value} value={category.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {category.icon}
                                <Typography sx={{ ml: 1 }}>
                                  {category.label}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.category && (
                          <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                            {errors.category}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={formData.priority}
                          onChange={handleInputChange('priority')}
                          label="Priority"
                        >
                          <MenuItem value="low">Low - General question</MenuItem>
                          <MenuItem value="normal">Normal - Standard issue</MenuItem>
                          <MenuItem value="high">High - Urgent problem</MenuItem>
                          <MenuItem value="critical">Critical - System down</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Subject */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Subject"
                        value={formData.subject}
                        onChange={handleInputChange('subject')}
                        error={!!errors.subject}
                        helperText={errors.subject || "Brief description of your issue"}
                        required
                      />
                    </Grid>

                    {/* Message */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Describe your issue"
                        multiline
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange('message')}
                        error={!!errors.message}
                        helperText={errors.message || `${formData.message.length}/500 characters. Please provide as much detail as possible.`}
                        inputProps={{ maxLength: 500 }}
                        required
                      />
                    </Grid>

                    {/* Submit Button */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          type="button"
                          variant="outlined"
                          href="/dashboard"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isSubmitting}
                          startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </form>

                {/* Additional Help */}
                <Divider sx={{ my: 4 }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Looking for quick answers?
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Help />}
                    href="/getting-started"
                  >
                    Check Getting Started Guide
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default ContactSupport;