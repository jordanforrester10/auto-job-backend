// src/components/SettingsPage.js - WITH SUBSCRIPTION INTEGRATION AND NAVIGATION HANDLING
import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CreditCard as CreditCardIcon,
  AccountBox as AccountBoxIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import MainLayout from './layout/MainLayout';
import settingsService from '../utils/settingsService';
import SubscriptionSection from './subscription/settings/SubscriptionSection';

const SettingsPage = () => {
  const theme = useTheme();
  const { currentUser, refreshUser } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Tab state - Initialize based on URL parameters or navigation state
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL parameter first
    const tabParam = searchParams.get('tab');
    if (tabParam === 'subscription') return 2;
    if (tabParam === 'security') return 1;
    if (tabParam === 'profile') return 0;
    
    // Check navigation state
    const navState = location.state;
    if (navState?.openTab === 'subscription') return 2;
    if (navState?.openTab === 'security') return 1;
    if (navState?.openTab === 'profile') return 0;
    
    // Default to profile tab
    return 0;
  });
  
  // Form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // UI state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Loading and error states
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    delete: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab configuration
  const tabs = [
    {
      label: 'Profile',
      icon: <AccountBoxIcon />,
      value: 0
    },
    {
      label: 'Security',
      icon: <SecurityIcon />,
      value: 1
    },
    {
      label: 'Subscription & Billing',
      icon: <CreditCardIcon />,
      value: 2
    }
  ];

  // Handle navigation to subscription tab from external sources
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const navState = location.state;
    
    if (tabParam === 'subscription' || navState?.openTab === 'subscription') {
      setActiveTab(2);
      
      // Optional: Scroll to subscription section if needed
      if (navState?.scrollTo === 'subscription') {
        setTimeout(() => {
          const subscriptionElement = document.getElementById('subscription-section');
          if (subscriptionElement) {
            subscriptionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [searchParams, location.state]);

  // Initialize form data when user data loads
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || ''
      });
    }
  }, [currentUser]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleProfileSave = async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      setError('');
      
      // Validate form data
      const validation = settingsService.validateProfileData(profileData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      // Call API to update profile
      const response = await settingsService.updateProfile(profileData);
      
      setSuccess(response.message || 'Profile updated successfully!');
      setIsEditingProfile(false);
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      
    } catch (error) {
      console.error('Profile update failed:', error);
      setError(settingsService.getErrorMessage(error));
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordChange = async () => {
    try {
      setLoading(prev => ({ ...prev, password: true }));
      setError('');
      
      // Validate form data
      const validation = settingsService.validatePasswordData(passwordData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      // Call API to change password
      const response = await settingsService.changePassword(passwordData);
      
      setSuccess(response.message || 'Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
      
    } catch (error) {
      console.error('Password change failed:', error);
      setError(settingsService.getErrorMessage(error));
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(prev => ({ ...prev, delete: true }));
      setError('');
      
      // Call API to delete account
      const response = await settingsService.deleteAccount({ confirmationText: 'DELETE' });
      
      setSuccess(response.message || 'Account deletion initiated. You will be logged out shortly.');
      
      // Logout user after a delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
      
    } catch (error) {
      console.error('Account deletion failed:', error);
      setError(settingsService.getErrorMessage(error));
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
      setShowDeleteDialog(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    setProfileData({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phoneNumber || ''
    });
    setIsEditingProfile(false);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password) => {
    return settingsService.calculatePasswordStrength(password);
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  // Render Profile Tab Content
  const renderProfileTab = () => (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: theme.palette.primary.main,
              fontSize: '1.5rem',
              fontWeight: 600,
              mr: 3
            }}
          >
            {profileData.firstName?.[0]}{profileData.lastName?.[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 1 }}>
              <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Profile Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your personal information and contact details
            </Typography>
          </Box>
          {!isEditingProfile && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditingProfile(true)}
              sx={{ borderRadius: 2 }}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={profileData.firstName}
              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              disabled={!isEditingProfile}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={profileData.lastName}
              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              disabled={!isEditingProfile}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              disabled={!isEditingProfile}
              variant="outlined"
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: theme.palette.primary.main }} />,
                endAdornment: currentUser?.isEmailVerified ? (
                  <Chip
                    label="Verified"
                    size="small"
                    icon={<VerifiedIcon />}
                    color="success"
                    variant="outlined"
                    sx={{ borderRadius: 1 }}
                  />
                ) : (
                  <Chip
                    label="Unverified"
                    size="small"
                    icon={<WarningIcon />}
                    color="warning"
                    variant="outlined"
                    sx={{ borderRadius: 1 }}
                  />
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              disabled={!isEditingProfile}
              variant="outlined"
              placeholder="+1 (555) 123-4567"
              InputProps={{
                startAdornment: <PhoneIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>

          {isEditingProfile && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  sx={{ borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading.profile ? <LinearProgress sx={{ width: 20 }} /> : <SaveIcon />}
                  onClick={handleProfileSave}
                  disabled={loading.profile}
                  sx={{ 
                    borderRadius: 2,
                    background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                  }}
                >
                  {loading.profile ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );

  // Render Security Tab Content
  const renderSecurityTab = () => (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.error.main, mb: 1 }}>
          <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Privacy & Security
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Manage your account security and privacy preferences
        </Typography>

        {/* Change Password Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Change Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update your password to keep your account secure
              </Typography>
            </Box>
            {!isChangingPassword && (
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setIsChangingPassword(true)}
                sx={{ borderRadius: 2 }}
              >
                Change Password
              </Button>
            )}
          </Box>

          {isChangingPassword && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: `1px solid ${theme.palette.divider}`, 
                borderRadius: 2,
                bgcolor: theme.palette.grey[50]
              }}
            >
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => togglePasswordVisibility('current')}
                          edge="end"
                        >
                          {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => togglePasswordVisibility('new')}
                          edge="end"
                        >
                          {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                     )
                   }}
                   sx={{
                     '& .MuiOutlinedInput-root': {
                       borderRadius: 2
                     }
                   }}
                 />
                 {passwordData.newPassword && (
                   <Box sx={{ mt: 1 }}>
                     <LinearProgress
                       variant="determinate"
                       value={passwordStrength.strength}
                       color={passwordStrength.color}
                       sx={{ height: 6, borderRadius: 3 }}
                     />
                     <Typography variant="caption" color={`${passwordStrength.color}.main`} sx={{ mt: 0.5, display: 'block' }}>
                       Password strength: {passwordStrength.label}
                     </Typography>
                   </Box>
                 )}
               </Grid>

               <Grid item xs={12}>
                 <TextField
                   fullWidth
                   label="Confirm New Password"
                   type={showPasswords.confirm ? 'text' : 'password'}
                   value={passwordData.confirmPassword}
                   onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                   error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                   helperText={
                     passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                       ? 'Passwords do not match'
                       : ''
                   }
                   InputProps={{
                     endAdornment: (
                       <IconButton
                         onClick={() => togglePasswordVisibility('confirm')}
                         edge="end"
                       >
                         {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                       </IconButton>
                     )
                   }}
                   sx={{
                     '& .MuiOutlinedInput-root': {
                       borderRadius: 2
                     }
                   }}
                 />
               </Grid>

               <Grid item xs={12}>
                 <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                   <Button
                     variant="outlined"
                     onClick={() => {
                       setIsChangingPassword(false);
                       setPasswordData({
                         currentPassword: '',
                         newPassword: '',
                         confirmPassword: ''
                       });
                     }}
                     sx={{ borderRadius: 2 }}
                   >
                     Cancel
                   </Button>
                   <Button
                     variant="contained"
                     startIcon={loading.password ? <LinearProgress sx={{ width: 20 }} /> : <LockIcon />}
                     onClick={handlePasswordChange}
                     disabled={
                       loading.password ||
                       !passwordData.currentPassword ||
                       !passwordData.newPassword ||
                       passwordData.newPassword !== passwordData.confirmPassword
                     }
                     sx={{ 
                       borderRadius: 2,
                       background: `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                     }}
                   >
                     {loading.password ? 'Changing...' : 'Change Password'}
                   </Button>
                 </Box>
               </Grid>
             </Grid>
           </Paper>
         )}
       </Box>

       <Divider sx={{ my: 4 }} />

       {/* Delete Account Section */}
       <Box>
         <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.error.main, mb: 1 }}>
           Delete Account
         </Typography>
         <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
           Permanently delete your account and all associated data. This action cannot be undone.
         </Typography>
         
         <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
           <Typography variant="body2" sx={{ fontWeight: 500 }}>
             Before deleting your account, please note:
           </Typography>
           <List dense sx={{ mt: 1 }}>
             <ListItem sx={{ py: 0.5 }}>
               <ListItemText 
                 primary="• All your resumes and job applications will be permanently deleted"
                 primaryTypographyProps={{ variant: 'body2' }}
               />
             </ListItem>
             <ListItem sx={{ py: 0.5 }}>
               <ListItemText 
                 primary="• Your AI search history and preferences will be lost"
                 primaryTypographyProps={{ variant: 'body2' }}
               />
             </ListItem>
             <ListItem sx={{ py: 0.5 }}>
               <ListItemText 
                 primary="• Any active outreach campaigns will be terminated"
                 primaryTypographyProps={{ variant: 'body2' }}
               />
             </ListItem>
           </List>
         </Alert>

         <Button
           variant="outlined"
           color="error"
           startIcon={<DeleteIcon />}
           onClick={() => setShowDeleteDialog(true)}
           sx={{ borderRadius: 2 }}
         >
           Delete My Account
         </Button>
       </Box>
     </CardContent>
   </Card>
 );

 // Get plan-specific info for sidebar
 const getPlanBadgeColor = () => {
   if (subscriptionLoading) return 'default';
   
   switch (subscription?.subscriptionTier) {
     case 'hunter': return 'warning';
     case 'casual': return 'primary';
     case 'free':
     default: return 'default';
   }
 };

 const getPlanDisplayName = () => {
   if (subscriptionLoading) return 'Loading...';
   
   switch (subscription?.subscriptionTier) {
     case 'hunter': return 'Hunter Plan';
     case 'casual': return 'Casual Plan';
     case 'free':
     default: return 'Free Plan';
   }
 };

 return (
   <MainLayout>
     <Box sx={{ p: 3 }}>
       {/* Page Header */}
       <Box sx={{ mb: 4 }}>
         <Typography variant="h4" component="h1" fontWeight={500}>
           Settings
         </Typography>
         <Typography variant="body1" color="text.secondary">
           Manage your account preferences, subscription, and security settings
         </Typography>
       </Box>

       {/* Status Messages */}
       {error && (
         <Alert 
           severity="error" 
           sx={{ mb: 3, borderRadius: 2 }}
           onClose={() => setError('')}
         >
           {error}
         </Alert>
       )}
       
       {success && (
         <Alert 
           severity="success" 
           sx={{ mb: 3, borderRadius: 2 }}
           onClose={() => setSuccess('')}
         >
           {success}
         </Alert>
       )}

       <Grid container spacing={3}>
         {/* Main Content */}
         <Grid item xs={12} lg={8}>
           {/* Tabs */}
           <Card sx={{ borderRadius: 3, mb: 3 }}>
             <Tabs
               value={activeTab}
               onChange={handleTabChange}
               variant="fullWidth"
               sx={{
                 borderBottom: 1,
                 borderColor: 'divider',
                 '& .MuiTab-root': {
                   minHeight: 72,
                   textTransform: 'none',
                   fontSize: '1rem',
                   fontWeight: 500
                 }
               }}
             >
               {tabs.map((tab) => (
                 <Tab
                   key={tab.value}
                   icon={tab.icon}
                   label={tab.label}
                   iconPosition="start"
                   sx={{ gap: 1 }}
                 />
               ))}
             </Tabs>
           </Card>

           {/* Tab Content */}
           {activeTab === 0 && renderProfileTab()}
           {activeTab === 1 && renderSecurityTab()}
           {activeTab === 2 && (
             <div id="subscription-section">
               <SubscriptionSection 
                 onError={setError}
                 onSuccess={setSuccess}
               />
             </div>
           )}
         </Grid>

         {/* Sidebar - Account Summary */}
         <Grid item xs={12} lg={4}>
           <Card sx={{ borderRadius: 3, position: 'sticky', top: 24 }}>
             <CardContent sx={{ p: 3 }}>
               <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                 Account Summary
               </Typography>
               
               <List>
                 <ListItem sx={{ px: 0 }}>
                   <ListItemIcon>
                     <PersonIcon color="primary" />
                   </ListItemIcon>
                   <ListItemText
                     primary="Profile Completion"
                     secondary={`${settingsService.calculateProfileCompletion(currentUser)}% complete`}
                   />
                 </ListItem>

                 <ListItem sx={{ px: 0 }}>
                   <ListItemIcon>
                     <EmailIcon color={currentUser?.isEmailVerified ? 'success' : 'warning'} />
                   </ListItemIcon>
                   <ListItemText
                     primary="Email Status"
                     secondary={currentUser?.isEmailVerified ? 'Verified' : 'Pending verification'}
                   />
                   <ListItemSecondaryAction>
                     <Chip
                       label={currentUser?.isEmailVerified ? 'Verified' : 'Unverified'}
                       size="small"
                       color={currentUser?.isEmailVerified ? 'success' : 'warning'}
                       variant="outlined"
                       sx={{ borderRadius: 1 }}
                     />
                   </ListItemSecondaryAction>
                 </ListItem>

                 <ListItem sx={{ px: 0 }}>
                   <ListItemIcon>
                     <CreditCardIcon color="info" />
                   </ListItemIcon>
                   <ListItemText
                     primary="Current Plan"
                     secondary={getPlanDisplayName()}
                   />
                   <ListItemSecondaryAction>
                     <Chip
                       label={getPlanDisplayName()}
                       size="small"
                       color={getPlanBadgeColor()}
                       variant="outlined"
                       sx={{ borderRadius: 1 }}
                     />
                   </ListItemSecondaryAction>
                 </ListItem>

                 <ListItem sx={{ px: 0 }}>
                   <ListItemIcon>
                     <SecurityIcon color="info" />
                   </ListItemIcon>
                   <ListItemText
                     primary="Account Security"
                     secondary="Password protected"
                   />
                   <ListItemSecondaryAction>
                     <Chip
                       label="Secure"
                       size="small"
                       color="success"
                       variant="outlined"
                       sx={{ borderRadius: 1 }}
                     />
                   </ListItemSecondaryAction>
                 </ListItem>
               </List>

               <Divider sx={{ my: 2 }} />

               <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                 Member since {new Date(currentUser?.createdAt || Date.now()).toLocaleDateString('en-US', {
                   month: 'long',
                   year: 'numeric'
                 })}
               </Typography>
             </CardContent>
           </Card>
         </Grid>
       </Grid>

       {/* Delete Account Confirmation Dialog */}
       <Dialog
         open={showDeleteDialog}
         onClose={() => setShowDeleteDialog(false)}
         maxWidth="sm"
         fullWidth
         PaperProps={{
           sx: { borderRadius: 3 }
         }}
       >
         <DialogTitle sx={{ 
           color: theme.palette.error.main,
           display: 'flex',
           alignItems: 'center',
           gap: 1
         }}>
           <DeleteIcon />
           Confirm Account Deletion
         </DialogTitle>
         <DialogContent>
           <Typography variant="body1" sx={{ mb: 2 }}>
             Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.
           </Typography>
           <Typography variant="body2" color="text.secondary">
             Type <strong>DELETE</strong> below to confirm:
           </Typography>
           <TextField
             fullWidth
             placeholder="Type DELETE to confirm"
             value={deleteConfirmText}
             onChange={(e) => setDeleteConfirmText(e.target.value)}
             sx={{ mt: 2 }}
           />
         </DialogContent>
         <DialogActions sx={{ p: 3 }}>
           <Button 
             onClick={() => setShowDeleteDialog(false)}
             variant="outlined"
             sx={{ borderRadius: 2 }}
           >
             Cancel
           </Button>
           <Button
             onClick={handleDeleteAccount}
             variant="contained"
             color="error"
             startIcon={loading.delete ? <LinearProgress sx={{ width: 20 }} /> : <DeleteIcon />}
             disabled={loading.delete || deleteConfirmText !== 'DELETE'}
             sx={{ borderRadius: 2 }}
           >
             {loading.delete ? 'Deleting...' : 'Delete Account'}
           </Button>
         </DialogActions>
       </Dialog>
     </Box>
   </MainLayout>
 );
};

export default SettingsPage;