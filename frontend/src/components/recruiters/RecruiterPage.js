// src/components/recruiters/RecruiterPage.js - COMPLETE FILE WITH H1B FILTERING ADDED
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
import { useSubscription } from '../../context/SubscriptionContext';

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
 const { isFreePlan, isCasualPlan, isHunterPlan } = useSubscription();
 
 // Tab state
 const [activeTab, setActiveTab] = useState(0);
 
 // Search state - UPDATED WITH H1B FILTER
 const [searchResults, setSearchResults] = useState(null);
 const [searchLoading, setSearchLoading] = useState(false);
 const [searchError, setSearchError] = useState('');
 const [hasSearched, setHasSearched] = useState(false);
 
 // Filter state
 const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
 const [h1bOnly, setH1BOnly] = useState(false); // NEW: H1B filter state
 
 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [currentSearchParams, setCurrentSearchParams] = useState(null);
 
 // Dialog state
 const [selectedRecruiter, setSelectedRecruiter] = useState(null);
 const [showRecruiterDetails, setShowRecruiterDetails] = useState(false);
 const [showOutreachComposer, setShowOutreachComposer] = useState(false);
 
 // Outreach state - Load immediately for badge count (only for paid users)
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
   // Only load outreach campaigns for paid users
   if (!isFreePlan) {
     loadOutreachCampaigns();
   }
 }, [isFreePlan]);

 // Search handlers - UPDATED TO INCLUDE H1B FILTER
 const handleSearchResults = (results, searchParams = null) => {
   console.log('🔍 RecruiterPage: Search results received:', results);
   console.log('🔍 RecruiterPage: Search params received:', searchParams);
   
   setSearchResults(results);
   setSearchError('');
   setHasSearched(true);
   setCurrentPage(1); // Reset to page 1 for new search
   
   // Store search params for pagination - UPDATED TO INCLUDE H1B FILTER
   if (searchParams) {
     const enhancedParams = {
       ...searchParams,
       show_unlocked_only: showUnlockedOnly,
       h1b_only: h1bOnly // NEW: Include H1B filter in stored params
     };
     setCurrentSearchParams(enhancedParams);
     console.log('✅ RecruiterPage: Stored search params with H1B filter:', enhancedParams);
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

 // Handle show unlocked only filter change
 const handleShowUnlockedOnlyChange = (enabled) => {
   console.log('🔍 RecruiterPage: Show unlocked only filter changed:', enabled);
   setShowUnlockedOnly(enabled);
   
   // If we have current search params, trigger a new search with the updated filter
   if (currentSearchParams) {
     const updatedParams = {
       ...currentSearchParams,
       show_unlocked_only: enabled
     };
     
     // Trigger search with updated parameters
     performSearchWithParams(updatedParams, 1, 0);
   }
 };

 // NEW: Handle H1B only filter change
 const handleH1BOnlyChange = (enabled) => {
   console.log('🏢 RecruiterPage: H1B only filter changed:', enabled);
   setH1BOnly(enabled);
   
   // If we have current search params, trigger a new search with the updated filter
   if (currentSearchParams) {
     const updatedParams = {
       ...currentSearchParams,
       h1b_only: enabled
     };
     
     // Trigger search with updated parameters
     performSearchWithParams(updatedParams, 1, 0);
   }
 };

 // Perform search with specific parameters - UPDATED TO INCLUDE H1B FILTER
 const performSearchWithParams = async (searchParams, page = 1, offset = 0) => {
   try {
     setSearchLoading(true);
     setCurrentPage(page);
     
     const searchFilters = {
       ...searchParams,
       limit: 20,
       offset: offset
     };
     
     console.log('🔍 RecruiterPage: Performing search with updated params:', searchFilters);
     
     const response = await recruiterService.searchRecruiters(searchFilters);
     
     console.log('✅ RecruiterPage: Updated search results received:', response);
     setSearchResults(response);
     setCurrentSearchParams(searchParams); // Update stored params
     
   } catch (error) {
     console.error('❌ RecruiterPage: Search with updated params failed:', error);
     showNotification('Failed to update search results', 'error');
   } finally {
     setSearchLoading(false);
   }
 };

 // Pagination handler - UPDATED TO INCLUDE H1B FILTER
 const handlePageChange = async (page, offset) => {
   console.log(`📄 RecruiterPage: Page change - Page: ${page}, Offset: ${offset}`);
   console.log(`🔍 RecruiterPage: Using stored search params:`, currentSearchParams);
   
   try {
     setSearchLoading(true);
     setCurrentPage(page);
     
     // Use the stored search parameters with pagination - NOW INCLUDES h1b_only
     const searchFilters = {
       ...currentSearchParams, // This now includes h1b_only
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

 // Enhanced search results handler that stores search params - UPDATED
 const handleSearchResultsWithParams = (results, searchParams = null) => {
   console.log('🔍 RecruiterPage: Search results with params:', { results, searchParams });
   
   setSearchResults(results);
   setSearchError('');
   setHasSearched(true);
   setCurrentPage(1);
   
   // Store search parameters for pagination - INCLUDE H1B FILTER
   if (searchParams) {
     const enhancedParams = {
       ...searchParams,
       show_unlocked_only: showUnlockedOnly,
       h1b_only: h1bOnly // Always include current H1B filter state
     };
     setCurrentSearchParams(enhancedParams);
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
   // For free users, show upgrade prompt instead of opening composer
   if (isFreePlan) {
     showNotification('Upgrade to Casual plan to contact recruiters', 'warning');
     return;
   }
   
   setSelectedRecruiter(recruiter);
   setShowOutreachComposer(true);
 };

 // Outreach handlers - UPDATED FOR FREE USER RESTRICTIONS
 const handleSendOutreach = async (outreachData) => {
   // Block free users from sending outreach
   if (isFreePlan) {
     showNotification('Upgrade to Casual plan to send messages', 'error');
     return;
   }

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

 // Handle recruiter unlocked callback
 const handleRecruiterUnlocked = (updatedSearchResults) => {
   console.log('📱 RecruiterPage: Updating search results after unlock');
   setSearchResults(updatedSearchResults);
 };

 const handleSaveOutreach = async (outreachData) => {
   // Block free users from saving outreach
   if (isFreePlan) {
     showNotification('Upgrade to Casual plan to save drafts', 'error');
     return;
   }

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

 // Load outreach campaigns - UPDATED FOR FREE USER RESTRICTIONS
 const loadOutreachCampaigns = async () => {
   // Don't load outreach for free users
   if (isFreePlan) {
     setOutreachCampaigns([]);
     return;
   }

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
         title="Find and Connect With Recruiters"
         subtitle={
           isFreePlan 
             ? "Browse recruiters and upgrade to unlock contact features"
             : "Find and connect with recruiters to accelerate your job search"
         }
         icon={<PeopleIcon />}
       />

       {/* Free User Notice */}
       {isFreePlan && (
         <Alert 
           severity="info" 
           sx={{ 
             mb: 3, 
             borderRadius: 2,
             '& .MuiAlert-icon': {
               color: theme.palette.info.main
             }
           }}
         >
           <Typography variant="body2">
             <strong>Free Plan Access:</strong> You can browse and search recruiters, but need to upgrade to Casual plan to view full details and send messages.
           </Typography>
         </Alert>
       )}

       {/* NEW: H1B Filter Information Alert */}
       {h1bOnly && (
         <Alert 
           severity="success" 
           sx={{ 
             mb: 3, 
             borderRadius: 2,
             '& .MuiAlert-icon': {
               color: theme.palette.success.main
             }
           }}
         >
           <Typography variant="body2">
             <strong>H1B Filter Active:</strong> Showing only recruiters from companies that sponsor H1B visas. 
             {searchResults?.h1bData?.h1bCompaniesCount && (
               <span> Found {searchResults.h1bData.h1bCompaniesCount.toLocaleString()} H1B sponsor companies in our database.</span>
             )}
           </Typography>
         </Alert>
       )}

       {/* Main Tabs - UPDATED TO HIDE OUTREACH TAB FOR FREE USERS */}
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
           {/* Only show Outreach tab for paid users */}
           {!isFreePlan && (
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
           )}
         </Tabs>
       </Box>

       {/* Tab Content */}
       <TabPanel value={activeTab} index={0}>
         {/* Search Tab - UPDATED WITH H1B FILTER PROPS */}
         <Box>
           <RecruiterSearch
             ref={searchRef}
             onSearchResults={handleSearchResults}
             onLoading={handleSearchLoading}
             onError={handleSearchError}
             onSearchStateChange={setHasSearched}
             showUnlockedOnly={showUnlockedOnly}
             onShowUnlockedOnlyChange={handleShowUnlockedOnlyChange}
             h1bOnly={h1bOnly} // NEW: Pass H1B filter state
             onH1BOnlyChange={handleH1BOnlyChange} // NEW: Pass H1B filter handler
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
             onRecruiterUnlocked={handleRecruiterUnlocked}
           />
         </Box>
       </TabPanel>

       {/* Only render Outreach tab for paid users */}
       {!isFreePlan && (
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
       )}

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

       {/* Only show outreach composer for paid users */}
       {!isFreePlan && (
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
       )}

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
     </Container>
   </MainLayout>
 );
};

export default RecruiterPage;