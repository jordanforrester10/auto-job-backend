// frontend/src/components/admin/AdminImpersonationPanel.js - FIXED ICONS
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  PlayArrow as ImpersonateIcon,
  Search as SearchIcon,
  ExitToApp as ExitIcon,
  Settings as AdminIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';

const AdminImpersonationPanel = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if current user is admin
  const ADMIN_EMAILS = ['jordforrester@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email);
  const isImpersonating = currentUser?.isImpersonating;

  // Load users
  const loadUsers = async (searchTerm = '', pageNum = 1) => {
    try {
      setSearching(true);
      setError('');

      const response = await api.get('/auth/admin/users', {
        params: {
          search: searchTerm,
          page: pageNum,
          limit: 15
        }
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setSearching(false);
    }
  };

  // Load users on mount and when search/page changes
  useEffect(() => {
    if (open && isAdmin) {
      loadUsers(search, page);
    }
  }, [open, search, page, isAdmin]);

  // Handle impersonation
  const handleImpersonate = async (userId, userEmail) => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post(`/auth/admin/impersonate/${userId}`);

      if (response.data.success) {
        // Update localStorage and axios headers
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        setSuccess(`Successfully impersonating ${userEmail}`);
        
        // Close dialog and reload page to show impersonated user's data
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error('Impersonation error:', err);
      setError(err.response?.data?.error || 'Failed to impersonate user');
    } finally {
      setLoading(false);
    }
  };

  // Handle end impersonation
  const handleEndImpersonation = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post('/auth/admin/end-impersonation');

      if (response.data.success) {
        // Update localStorage and axios headers
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        setSuccess('Impersonation ended successfully');
        
        // Close dialog and reload page to show admin user's data
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error('End impersonation error:', err);
      setError(err.response?.data?.error || 'Failed to end impersonation');
    } finally {
      setLoading(false);
    }
  };

  // Search with debounce
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);
    setPage(1);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      loadUsers(value, 1);
    }, 300);
  };

  // Get plan color
  const getPlanColor = (plan) => {
    switch (plan) {
      case 'hunter': return 'success';
      case 'casual': return 'primary';
      case 'free':
      default: return 'default';
    }
  };

  // Get user initials for avatar
  const getUserInitials = (firstName, lastName, email) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  if (!isAdmin) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon color="error" />
            <Typography variant="h6">Access Denied</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            You don't have admin privileges to access this feature.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon color="primary" />
            <Typography variant="h6">Admin User Impersonation</Typography>
            {isImpersonating && (
              <Chip 
                label={`Impersonating: ${currentUser.email}`}
                color="warning"
                size="small"
                icon={<PlayArrow />}
              />
            )}
          </Box>
          {isImpersonating && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<ExitIcon />}
              onClick={handleEndImpersonation}
              disabled={loading}
              size="small"
            >
              End Impersonation
            </Button>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {isImpersonating && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.contrastText">
              <strong>⚠️ Warning:</strong> You are currently impersonating {currentUser.email}. 
              All actions will be performed as this user. You can see their exact dashboard, 
              resumes, jobs, settings, and usage data.
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          placeholder="Search users by email, first name, or last name..."
          value={search}
          onChange={handleSearchChange}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searching && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            )
          }}
        />

        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                      >
                        {getUserInitials(user.firstName, user.lastName, user.email)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {user.firstName} {user.lastName}
                        </Typography>
                        {user.email === 'jordforrester@gmail.com' && (
                          <Chip label="Admin" size="small" color="secondary" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.subscriptionTier || 'free'} 
                      size="small"
                      color={getPlanColor(user.subscriptionTier)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleImpersonate(user._id, user.email)}
                      disabled={loading || user.email === currentUser.email}
                      title={user.email === currentUser.email ? "Can't impersonate yourself" : "Impersonate user"}
                      size="small"
                    >
                      <ImpersonateIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={pagination.totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {users.length === 0 && !searching && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {search ? 'No users found matching your search.' : 'No users found.'}
            </Typography>
          </Box>
        )}

        {searching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          Total users: {pagination.totalUsers || 0}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminImpersonationPanel;