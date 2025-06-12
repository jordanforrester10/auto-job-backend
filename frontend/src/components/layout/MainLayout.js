// src/components/layout/MainLayout.js
import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', // Fixed viewport height
      overflow: 'hidden' // Prevent any overflow on the main container
    }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Full viewport height
          overflow: 'hidden', // Prevent overflow on main wrapper
        }}
      >
        {/* Sticky Header */}
        <Box sx={{ 
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          flexShrink: 0 // Prevent header from shrinking
        }}>
          <Header onToggleSidebar={toggleSidebar} />
        </Box>
        
        {/* Scrollable Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto', // Enable scrolling for content
            backgroundColor: 'background.default',
            p: 3,
            // Ensure proper scrollbar styling
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;