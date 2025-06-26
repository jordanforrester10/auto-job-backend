// src/components/recruiters/RecruiterPage.js - UPDATED WITH ANALYTICS TAB REMOVED
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Message as MessageIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import MainLayout from '../layout/MainLayout';
import PageHeader from '../common/PageHeader';
import RecruiterSearch from './RecruiterSearch';
import RecruiterList from './RecruiterList';
import RecruiterDetails from './RecruiterDetails';
import OutreachComposer from './OutreachComposer';
import OutreachTracker from './OutreachTracker';
import recruiterService from '../../utils/recruiterService';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`recruiter-tabpanel-${index}`}
    aria-labelledby={`recruiter-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const RecruiterPage = () => {
  const theme = useTheme();
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearchParams, setCurrentSearchParams] = useState(null);
  
  // Dialog state
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [showRecruiterDetails, setShowRecruiterDetails] = useState(false);
  const [showOutreachComposer, setShowOutreachComposer] = useState(false);
  
  // Outreach state - Load immediately for badge count
  const [outreachCampaigns, setOutreachCampaigns] = useState([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Refs for component communication
  const searchRef = useRef(null);

  // Load initial data immediately when component mounts
  useEffect(() => {
    // Always load outreach campaigns for badge count
    loadOutreachCampaigns();
  }, []);

  // Search handlers
  const handleSearchResults = (results, searchParams = null) => {
    console.log('🔍 RecruiterPage: Search results received:', results);
    console.log('🔍 RecruiterPage: Search params received:', searchParams);
    
    setSearchResults(results);
    setSearchError('');
    setHasSearched(true);
    setCurrentPage(1); // Reset to page 1 for new search
    
    // Store search params for pagination (FIXED)
    if (searchParams) {
      setCurrentSearchParams(searchParams);
      console.log('✅ RecruiterPage: Stored search params:', searchParams);
    }
  };

  const handleSearchLoading = (loading) => {
    setSearchLoading(loading);
  };

  const handleSearchError = (error) => {
    setSearchError(error);
    setHasSearched(true);
    showNotification(error, 'error');
  };

  // Pagination handler - this is the key fix
  const handlePageChange = async (page, offset) => {
    console.log(`📄 RecruiterPage: Page change - Page: ${page}, Offset: ${offset}`);
    console.log(`🔍 RecruiterPage: Using stored search params:`, currentSearchParams);
    
    try {
      setSearchLoading(true);
      setCurrentPage(page);
      
      // Use the stored search parameters with pagination (FIXED)
      const searchFilters = {
        ...currentSearchParams, // This now contains the proper search filters
        limit: 20,
        offset: offset
      };
      
      console.log('🔍 RecruiterPage: Performing paginated search:', searchFilters);
      
      const response = await recruiterService.searchRecruiters(searchFilters);
      
      console.log('✅ RecruiterPage: Paginated results received:', response);
      setSearchResults(response);
      
    } catch (error) {
      console.error('❌ RecruiterPage: Pagination failed:', error);
      showNotification('Failed to load more recruiters', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // Enhanced search results handler that stores search params
  const handleSearchResultsWithParams = (results, searchParams = null) => {
    console.log('🔍 RecruiterPage: Search results with params:', { results, searchParams });
    
    setSearchResults(results);
    setSearchError('');
    setHasSearched(true);
    setCurrentPage(1);
    
    // Store search parameters for pagination
    if (searchParams) {
      setCurrentSearchParams(searchParams);
    }
  };

  // Load more handler (alternative to pagination)
  const handleLoadMore = async (page, offset) => {
    console.log(`📄 RecruiterPage: Load more - Page: ${page}, Offset: ${offset}`);
    await handlePageChange(page, offset);
  };

  // Recruiter handlers
  const handleViewRecruiterDetails = (recruiter) => {
    setSelectedRecruiter(recruiter);
    setShowRecruiterDetails(true);
  };

  const handleStartOutreach = (recruiter) => {
    setSelectedRecruiter(recruiter);
    setShowOutreachComposer(true);
  };

  // Outreach handlers
  const handleSendOutreach = async (outreachData) => {
    try {
      const response = await recruiterService.createOutreach(outreachData);
      
      // Immediately send the outreach
      await recruiterService.sendOutreach(response.outreach.id);
      
      showNotification('Message sent successfully!', 'success');
      
      // Reload outreach campaigns to update count
      loadOutreachCampaigns();
      
    } catch (error) {
      console.error('Failed to send outreach:', error);
      showNotification('Failed to send message. Please try again.', 'error');
      throw error;
    }
  };

  const handleSaveOutreach = async (outreachData) => {
    try {
      await recruiterService.createOutreach(outreachData);
      showNotification('Draft saved successfully!', 'success');
      
      // Reload outreach campaigns to update count
      loadOutreachCampaigns();
      
    } catch (error) {
      console.error('Failed to save outreach:', error);
      showNotification('Failed to save draft. Please try again.', 'error');
      throw error;
    }
  };

  // Load outreach campaigns
  const loadOutreachCampaigns = async () => {
    try {
      setOutreachLoading(true);
      console.log('📋 Loading outreach campaigns for badge count...');
      
      const response = await recruiterService.getUserOutreach({ limit: 50 });
      const campaigns = response.outreaches || [];
      
      setOutreachCampaigns(campaigns);
      console.log(`✅ Loaded ${campaigns.length} outreach campaigns`);
      
    } catch (error) {
      console.error('Failed to load outreach campaigns:', error);
      // Don't show error notification for initial load, just log it
      if (activeTab === 1) {
        showNotification('Failed to load outreach campaigns', 'error');
      }
    } finally {
      setOutreachLoading(false);
    }
  };

  // Notification helper
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Calculate notification badges
  const getDraftCount = () => {
    return outreachCampaigns.filter(campaign => campaign.status === 'drafted').length;
  };

  const getTotalOutreachCount = () => {
    return outreachCampaigns.length;
  };

  const getUnrepliedCount = () => {
    return outreachCampaigns.filter(campaign => 
      campaign.status === 'sent' && 
      campaign.repliesCount === 0 &&
      Date.now() - new Date(campaign.sentAt).getTime() > 7 * 24 * 60 * 60 * 1000 // 7 days old
    ).length;
  };

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Page Header */}
        <PageHeader
          title="Recruiter Outreach"
          subtitle="Find and connect with recruiters to accelerate your job search"
          icon={<PeopleIcon />}
        />

        {/* Main Tabs - Analytics Tab Removed */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                color: theme.palette.text.secondary,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                height: 2,
                backgroundColor: theme.palette.primary.main
              }
            }}
          >
            <Tab
              label="Find Recruiters"
              icon={<SearchIcon />}
              iconPosition="start"
              sx={{ 
                display: 'flex',
                flexDirection: 'row',
                gap: 1
              }}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageIcon />
                  Outreach Campaigns
                  {getTotalOutreachCount() > 0 && (
                    <Badge 
                      badgeContent={getTotalOutreachCount()} 
                      color="warning" 
                      max={99}
                      sx={{ 
                        ml: 0.5,
                        '& .MuiBadge-badge': {
                          fontSize: '0.75rem',
                          height: 18,
                          minWidth: 18,
                          borderRadius: '9px'
                        }
                      }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          {/* Search Tab */}
          <Box>
            <RecruiterSearch
              ref={searchRef}
              onSearchResults={handleSearchResults}
              onLoading={handleSearchLoading}
              onError={handleSearchError}
              onSearchStateChange={setHasSearched}
            />
            
            <RecruiterList
              searchResults={searchResults}
              loading={searchLoading}
              error={searchError}
              hasSearched={hasSearched}
              onViewDetails={handleViewRecruiterDetails}
              onStartOutreach={handleStartOutreach}
              onLoadMore={handleLoadMore}
              onPageChange={handlePageChange}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Outreach Tab */}
          <OutreachTracker
            campaigns={outreachCampaigns}
            loading={outreachLoading}
            onRefresh={loadOutreachCampaigns}
            onViewRecruiter={handleViewRecruiterDetails}
            onEditCampaign={(campaign) => {
              // Handle editing existing campaign
              setSelectedRecruiter(campaign.recruiter);
              setShowOutreachComposer(true);
            }}
          />
        </TabPanel>

        {/* Dialogs */}
        <RecruiterDetails
          open={showRecruiterDetails}
          onClose={() => {
            setShowRecruiterDetails(false);
            setSelectedRecruiter(null);
          }}
          recruiterId={selectedRecruiter?.id}
          onStartOutreach={handleStartOutreach}
        />

        <OutreachComposer
          open={showOutreachComposer}
          onClose={() => {
            setShowOutreachComposer(false);
            setSelectedRecruiter(null);
          }}
          recruiter={selectedRecruiter}
          onSend={handleSendOutreach}
          onSave={handleSaveOutreach}
        />

        {/* Notifications */}
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

        {/* Removed Floating Action Button - conflicts with AI Assistant widget */}
      </Container>
    </MainLayout>
  );
};

export default RecruiterPage;