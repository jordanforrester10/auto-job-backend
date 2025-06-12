// frontend/src/components/Dashboard.jsx
import React from 'react';
import { 
  Container, Box, Typography, Button, Paper, 
  Grid, Card, CardContent, Divider 
} from '@mui/material';
import { useAuth } from '../context/authContext';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Welcome, {currentUser.firstName}!
          </Typography>
          <Button variant="contained" color="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2">
                  <strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {currentUser.email}
                </Typography>
                {currentUser.phoneNumber && (
                  <Typography variant="body2">
                    <strong>Phone:</strong> {currentUser.phoneNumber}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dashboard Overview
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  This is your job application dashboard. Here you will be able to:
                </Typography>
                <ul>
                  <li>Upload and optimize your resume</li>
                  <li>Match with jobs</li>
                  <li>Connect with recruiters</li>
                  <li>Generate application materials</li>
                </ul>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Your account type: <strong>{currentUser.accountType}</strong>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;