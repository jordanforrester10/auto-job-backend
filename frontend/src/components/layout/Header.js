// frontend/src/components/layout/Header.js - Simple Admin Button, No Avatar
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Box,
  Tooltip,
  useTheme,
  alpha,
  ListItemIcon,
  ListItemText,
  Button,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  HelpOutline as HelpOutlineIcon,
  Quiz as QuizIcon,
  Support as SupportIcon,
  Security as AdminIcon,
  PlayArrow as ImpersonateIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AutoJobLogo from '../common/AutoJobLogo';
import GlobalSearch from '../common/GlobalSearch';
import AdminImpersonationPanel from '../admin/AdminImpersonationPanel';

const Header = ({ onToggleSidebar }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [helpAnchorEl, setHelpAnchorEl] = useState(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const isHelpMenuOpen = Boolean(helpAnchorEl);

  // Check if user is admin
  const ADMIN_EMAILS = ['jordforrester@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email);
  const isImpersonating = currentUser?.isImpersonating;

  const handleHelpMenuOpen = (event) => {
    setHelpAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (setState) => () => {
    setState(null);
  };

  const handleMenuItemClick = (path) => () => {
    navigate(path);
    setHelpAnchorEl(null);
  };

  const handleAdminPanel = () => {
    setAdminPanelOpen(true);
  };

  return (
    <>
      <AppBar 
        position="static"
        color="default"
        elevation={1}
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          width: '100%',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '64px !important' }}>
          {/* Mobile Menu Button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onToggleSidebar}
            sx={{ 
              mr: 2, 
              display: { sm: 'block', md: 'none' },
              color: 'text.primary'
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Global Search Component */}
          <GlobalSearch 
            sx={{
              marginRight: 2,
              marginLeft: 0,
              width: '100%',
              maxWidth: { xs: '100%', sm: 300, md: 400, lg: 500 },
            }}
          />

          <Box sx={{ flexGrow: 1 }} />

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            ml: 1
          }}>
            {/* Impersonation Warning */}
            {isImpersonating && (
              <Chip
                icon={<ImpersonateIcon />}
                label="Impersonating"
                color="warning"
                size="small"
                variant="outlined"
              />
            )}

            {/* Admin Button (only for admins) */}
            {isAdmin && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AdminIcon />}
                onClick={handleAdminPanel}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2
                }}
              >
                Admin
              </Button>
            )}

            {/* Help */}
            <Tooltip title="Help & Support" arrow>
              <IconButton
                color="inherit"
                onClick={handleHelpMenuOpen}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>

        {/* Help Menu */}
        <Menu
          anchorEl={helpAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={isHelpMenuOpen}
          onClose={handleMenuClose(setHelpAnchorEl)}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 240,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }
          }}
        >
          <MenuItem onClick={handleMenuItemClick('/getting-started')} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <QuizIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Getting Started Guide"
              secondary="Learn how to use auto-job.ai"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
          <MenuItem onClick={handleMenuItemClick('/contact-support')} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <SupportIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Contact Support"
              secondary="Get help from our team"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        </Menu>
      </AppBar>

      {/* Admin Impersonation Panel */}
      <AdminImpersonationPanel
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </>
  );
};

export default Header;