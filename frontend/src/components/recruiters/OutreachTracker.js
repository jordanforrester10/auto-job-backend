// src/components/recruiters/OutreachTracker.js - UPDATED WITH BETTER ERROR HANDLING
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Grid,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Drafts as DraftIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import recruiterService from '../../utils/recruiterService';

const OutreachCard = ({ campaign, onViewRecruiter, onEditCampaign, onDeleteCampaign }) => {
  const theme = useTheme();
  const formatted = recruiterService.formatOutreachForDisplay(campaign);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'drafted':
        return <DraftIcon color="action" />;
      case 'sent':
        return <SendIcon color="warning" />;
      case 'replied':
        return <ReplyIcon color="success" />;
      case 'delivered':
        return <CheckCircleIcon color="info" />;
      default:
        return <EmailIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'drafted':
        return 'default';
      case 'sent':
        return 'warning';
      case 'replied':
        return 'success';
      case 'delivered':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSentViaIcon = (sentVia) => {
    switch (sentVia) {
      case 'linkedin':
        return <LinkedInIcon fontSize="small" />;
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'phone':
        return <PhoneIcon fontSize="small" />;
      default:
        return <BusinessIcon fontSize="small" />;
    }
  };

  const handleViewRecruiter = () => {
    console.log('🔍 OutreachCard: handleViewRecruiter called');
    console.log('📋 Campaign data:', campaign);
    
    if (!onViewRecruiter) {
      console.error('❌ onViewRecruiter function not provided');
      return;
    }

    // Try different ways to get the recruiterId
    let recruiterId = campaign.recruiterId || campaign.recruiter_id || campaign.recruiter?.id;
    
    if (!recruiterId) {
      console.error('❌ No recruiterId found in campaign data:', {
        recruiterId: campaign.recruiterId,
        recruiter_id: campaign.recruiter_id,
        recruiterObject: campaign.recruiter
      });
      return;
    }

    console.log('✅ Found recruiterId:', recruiterId);
    
    // Create a recruiter object with the ID and any available recruiter data
    const recruiterData = {
      id: recruiterId,
      ...campaign.recruiter // Spread any additional recruiter data if available
    };
    
    console.log('📤 Calling onViewRecruiter with:', recruiterData);
    onViewRecruiter(recruiterData);
  };

  const handleEditCampaign = () => {
    console.log('✏️ OutreachCard: handleEditCampaign called for campaign:', campaign.id);
    if (onEditCampaign) {
      onEditCampaign(campaign);
    }
  };

  const handleDeleteCampaign = () => {
    console.log('🗑️ OutreachCard: handleDeleteCampaign called for campaign:', campaign.id);
    if (onDeleteCampaign) {
      onDeleteCampaign(campaign.id);
    } else {
      console.error('❌ onDeleteCampaign function not provided');
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 2, borderLeft: `4px solid ${theme.palette[getStatusColor(campaign.status)]?.main || theme.palette.grey[400]}` }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          {/* Recruiter Info */}
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  width: 40,
                  height: 40
                }}
              >
                {formatted?.recruiterDisplay ? 
                  formatted.recruiterDisplay.split(' ').map(n => n[0]).join('').substring(0, 2) :
                  'UK'
                }
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {formatted?.recruiterDisplay || campaign.recruiter?.name || 'Unknown Recruiter'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon fontSize="small" />
                  {formatted?.companyDisplay || campaign.recruiter?.company?.name || 'Unknown Company'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Status and Message Info */}
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  icon={getStatusIcon(campaign.status)}
                  label={formatted?.statusDisplay || campaign.status}
                  size="small"
                  color={getStatusColor(campaign.status)}
                  variant="filled"
                />
                <Chip
                  icon={getSentViaIcon(campaign.sentVia)}
                  label={campaign.sentVia || 'unknown'}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {formatted?.messagePreview || campaign.messageContent?.substring(0, 100) + '...' || 'No message preview'}
              </Typography>
            </Box>
          </Grid>

          {/* Dates and Actions */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon fontSize="small" />
                  Created: {formatted?.createdDisplay || new Date(campaign.createdAt).toLocaleDateString()}
                </Typography>
                {(formatted?.sentDisplay || campaign.sentAt) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <SendIcon fontSize="small" />
                    Sent: {formatted?.sentDisplay || new Date(campaign.sentAt).toLocaleDateString()}
                  </Typography>
                )}
                {(formatted?.hasReplies || campaign.repliesCount > 0) && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <ReplyIcon fontSize="small" />
                    {campaign.repliesCount || 0} replies
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="View Recruiter">
                  <IconButton size="small" onClick={handleViewRecruiter}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                {(formatted?.canEdit || campaign.status === 'drafted') && (
                  <Tooltip title="Edit Campaign">
                    <IconButton size="small" onClick={handleEditCampaign}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title="Delete Campaign">
                  <IconButton 
                    size="small" 
                    onClick={handleDeleteCampaign} 
                    color="error"
                    sx={{ '&:hover': { backgroundColor: 'error.main', color: 'white' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Expandable Message Content */}
        <Accordion elevation={0} sx={{ mt: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">View Full Message</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {campaign.messageContent || 'No message content available'}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

const OutreachTracker = ({ 
  campaigns = [], 
  loading = false, 
  onRefresh, 
  onViewRecruiter, 
  onEditCampaign 
}) => {
  const theme = useTheme();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = React.useMemo(() => {
    let filtered = campaigns;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'sentAt':
          aValue = a.sentAt ? new Date(a.sentAt) : new Date(0);
          bValue = b.sentAt ? new Date(b.sentAt) : new Date(0);
          break;
        case 'recruiterName':
          aValue = (a.recruiter?.name || '').toLowerCase();
          bValue = (b.recruiter?.name || '').toLowerCase();
          break;
        case 'company':
          aValue = (a.recruiter?.company?.name || '').toLowerCase();
          bValue = (b.recruiter?.company?.name || '').toLowerCase();
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [campaigns, statusFilter, sortBy, sortOrder]);

  const handleDeleteCampaign = async (campaignId) => {
    console.log('🗑️ OutreachTracker: Delete requested for campaign:', campaignId);
    
    if (!campaignId) {
      console.error('❌ No campaign ID provided for deletion');
      showNotification('Error: No campaign ID provided', 'error');
      return;
    }

    setCampaignToDelete(campaignId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) {
      console.error('❌ No campaign selected for deletion');
      return;
    }

    try {
      setIsDeleting(true);
      console.log(`🗑️ Attempting to delete campaign: ${campaignToDelete}`);
      
      const result = await recruiterService.deleteOutreach(campaignToDelete);
      console.log('✅ Delete successful:', result);
      
      showNotification('Campaign deleted successfully!', 'success');
      
      // Close dialog
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      
      // Refresh the list
      if (onRefresh) {
        console.log('🔄 Calling onRefresh to update the list');
        onRefresh();
      } else {
        console.warn('⚠️ onRefresh function not provided - list may not update');
      }
      
    } catch (error) {
      console.error('❌ Delete failed:', error);
      
      let errorMessage = 'Failed to delete campaign';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    console.log('❌ Delete cancelled by user');
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const getStatusCounts = () => {
    const counts = {
      all: campaigns.length,
      drafted: 0,
      sent: 0,
      replied: 0,
      delivered: 0
    };

    campaigns.forEach(campaign => {
      if (counts.hasOwnProperty(campaign.status)) {
        counts[campaign.status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading outreach campaigns...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card elevation={1} sx={{ textAlign: 'center', py: 8 }}>
        <CardContent>
          <EmailIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No outreach campaigns yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by searching for recruiters and sending your first outreach message.
          </Typography>
          <Button variant="outlined" onClick={onRefresh}>
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header with Filters */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon color="primary" />
              Outreach Campaigns ({campaigns.length})
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {/* Filters and Sorting */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All ({statusCounts.all})</MenuItem>
                  <MenuItem value="drafted">Drafted ({statusCounts.drafted})</MenuItem>
                  <MenuItem value="sent">Sent ({statusCounts.sent})</MenuItem>
                  <MenuItem value="delivered">Delivered ({statusCounts.delivered})</MenuItem>
                  <MenuItem value="replied">Replied ({statusCounts.replied})</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="createdAt">Date Created</MenuItem>
                  <MenuItem value="sentAt">Date Sent</MenuItem>
                  <MenuItem value="recruiterName">Recruiter Name</MenuItem>
                  <MenuItem value="company">Company</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="desc">Newest First</MenuItem>
                  <MenuItem value="asc">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Showing {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
              </Typography>
            </Grid>
          </Grid>

          {/* Status Summary */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${statusCounts.drafted} Drafts`} 
              size="small" 
              color="default" 
              variant={statusFilter === 'drafted' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter('drafted')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip 
              label={`${statusCounts.sent} Sent`} 
              size="small" 
              color="warning" 
              variant={statusFilter === 'sent' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter('sent')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip 
              label={`${statusCounts.delivered} Delivered`} 
              size="small" 
              color="info" 
              variant={statusFilter === 'delivered' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter('delivered')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip 
              label={`${statusCounts.replied} Replied`} 
              size="small" 
              color="success" 
              variant={statusFilter === 'replied' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter('replied')}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      {filteredAndSortedCampaigns.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No campaigns match the current filter criteria.
        </Alert>
      ) : (
        <Box>
          {filteredAndSortedCampaigns.map((campaign, index) => (
            <OutreachCard
              key={campaign.id || index}
              campaign={campaign}
              onViewRecruiter={onViewRecruiter}
              onEditCampaign={onEditCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this outreach campaign? This action cannot be undone.
          </Typography>
          {campaignToDelete && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Campaign ID: {campaignToDelete}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OutreachTracker;