// frontend/src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Description as ResumeIcon,
  Work as JobIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../layout/MainLayout';
import PageHeader from '../common/PageHeader';
import api from '../../utils/axios';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser?.email === 'jordforrester@gmail.com';

  useEffect(() => {
    if (!isAdmin) {
      setError('Admin access required');
      setLoading(false);
      return;
    }
    
    fetchDashboardData();
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/admin/dashboard');
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUserDetail = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      
      if (response.data.success) {
        setSelectedUser(response.data.data);
        setUserDetailOpen(true);
      } else {
        setError(response.data.error || 'Failed to load user details');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate ? 
        new Date(user.subscriptionEndDate).toISOString().split('T')[0] : ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveUserEdit = async () => {
    try {
      const response = await api.put(`/admin/users/${editingUser.id}/subscription`, {
        subscriptionTier: editingUser.subscriptionTier,
        subscriptionStatus: editingUser.subscriptionStatus,
        subscriptionEndDate: editingUser.subscriptionEndDate || null
      });

      if (response.data.success) {
        setEditDialogOpen(false);
        setEditingUser(null);
        fetchDashboardData(); // Refresh data
      } else {
        setError(response.data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSubscriptionColor = (tier) => {
    switch (tier) {
      case 'free': return 'default';
      case 'casual': return 'primary';
      case 'hunter': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'canceled': return 'error';
      case 'past_due': return 'warning';
      default: return 'default';
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Admin access required. You must be signed in as an administrator to view this page.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Admin Dashboard"
          subtitle="Manage users, subscriptions, and system analytics"
          action={
            <Button
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={fetchDashboardData}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          }
        />

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Users
                    </Typography>
                    <Typography variant="h4">
                      {dashboardData?.summary?.totalUsers || 0}
                    </Typography>
                  </Box>
                  <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Active Subscriptions
                    </Typography>
                    <Typography variant="h4">
                      {dashboardData?.summary?.activeSubscriptions || 0}
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Revenue
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(dashboardData?.summary?.totalRevenue || 0)}
                    </Typography>
                  </Box>
                  <MoneyIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Resumes
                    </Typography>
                    <Typography variant="h4">
                      {dashboardData?.summary?.totalResumes || 0}
                    </Typography>
                  </Box>
                  <ResumeIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Plan Distribution */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscription Plan Distribution
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="textSecondary">
                    {dashboardData?.summary?.freeUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Free Users
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {dashboardData?.summary?.casualUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Casual Users
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {dashboardData?.summary?.hunterUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Hunter Users
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Users
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Resumes</TableCell>
                    <TableCell>Jobs</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Join Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.users?.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {user.fullName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.subscriptionTier.toUpperCase()}
                          color={getSubscriptionColor(user.subscriptionTier)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.subscriptionStatus || 'active'}
                          color={getStatusColor(user.subscriptionStatus)}
                          size="small"
                        />
                        {user.cancelAtPeriodEnd && (
                          <Chip
                            label="Canceling"
                            color="warning"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.resumeCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.jobCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatCurrency(user.totalRevenue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(user.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleUserDetail(user.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Subscription">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* User Detail Dialog */}
        <Dialog
          open={userDetailOpen}
          onClose={() => setUserDetailOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            User Details: {selectedUser?.user?.fullName}
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Grid container spacing={3}>
                {/* User Info */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Email:</strong> {selectedUser.user.email}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Plan:</strong> {selectedUser.user.subscriptionTier}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Status:</strong> {selectedUser.user.subscriptionStatus}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Join Date:</strong> {formatDate(selectedUser.user.createdAt)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Subscription End:</strong> {formatDate(selectedUser.user.subscriptionEndDate)}
                  </Typography>
                </Grid>

                {/* Usage Stats */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Usage Statistics
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Resumes:</strong> {selectedUser.user.resumeCount}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Jobs:</strong> {selectedUser.user.jobCount}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Payments:</strong> {selectedUser.paymentHistory?.length || 0}
                  </Typography>
                </Grid>

                {/* Resumes */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Recent Resumes
                  </Typography>
                  {selectedUser.resumes?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>File Name</TableCell>
                            <TableCell>Upload Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>ATS Score</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedUser.resumes.slice(0, 5).map((resume) => (
                            <TableRow key={resume._id}>
                              <TableCell>{resume.fileName}</TableCell>
                              <TableCell>{formatDate(resume.uploadDate)}</TableCell>
                              <TableCell>
                                <Chip label={resume.status} size="small" />
                              </TableCell>
                              <TableCell>{resume.atsScore || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No resumes uploaded
                    </Typography>
                  )}
                </Grid>

                {/* Jobs */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Recent Jobs
                  </Typography>
                  {selectedUser.jobs?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Company</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Date Added</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedUser.jobs.slice(0, 5).map((job) => (
                            <TableRow key={job._id}>
                              <TableCell>{job.title}</TableCell>
                              <TableCell>{job.company}</TableCell>
                              <TableCell>{job.location}</TableCell>
                              <TableCell>{formatDate(job.dateAdded)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No jobs added
                    </Typography>
                  )}
                </Grid>

                {/* Payment History */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Payment History
                  </Typography>
                  {selectedUser.paymentHistory?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Reason</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedUser.paymentHistory.map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={payment.status} 
                                  color={payment.status === 'succeeded' ? 'success' : 'error'}
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{formatDate(payment.created_at)}</TableCell>
                              <TableCell>{payment.billing_reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No payment history
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDetailOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit User Subscription</DialogTitle>
          <DialogContent>
            {editingUser && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  select
                  fullWidth
                  label="Subscription Tier"
                  value={editingUser.subscriptionTier}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    subscriptionTier: e.target.value
                  })}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                  <MenuItem value="hunter">Hunter</MenuItem>
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Subscription Status"
                  value={editingUser.subscriptionStatus}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    subscriptionStatus: e.target.value
                  })}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="canceled">Canceled</MenuItem>
                  <MenuItem value="past_due">Past Due</MenuItem>
                </TextField>

                <TextField
                  type="date"
                  fullWidth
                  label="Subscription End Date"
                  value={editingUser.subscriptionEndDate}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    subscriptionEndDate: e.target.value
                  })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUserEdit}
              variant="contained"
              color="primary"
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default AdminDashboard;