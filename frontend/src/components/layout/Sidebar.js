// src/components/layout/Sidebar.js
import React, { useContext } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  Collapse,
  Tooltip,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  SmartToy as SmartToyIcon,
  ExpandLess,
  ExpandMore,
  UploadFile as UploadFileIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Add as AddIcon,
  ContentPasteSearch as ContentPasteSearchIcon,
  ManageSearch as ManageSearchIcon,
  Search as SearchIcon,
  Message as MessageIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import AutoJobLogo from '../common/AutoJobLogo';

const drawerWidth = 260;

const navItems = [
  { 
    title: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    color: '#1a73e8' // Primary blue
  },
  { 
    title: 'My Resumes',
    path: '/resumes',
    icon: <DescriptionIcon />,
    color: '#34a853', // Success green
  },
  { 
    title: 'Jobs Portal',
    path: '/jobs',
    icon: <WorkIcon />,
    color: '#4285f4', // Info blue
    subItems: [
      {
        title: 'All Jobs',
        path: '/jobs',
        icon: <FormatListBulletedIcon fontSize="small" />,
        color: '#4285f4'
      },
      {
        title: 'Agent Job Discovery',
        path: '/jobs/ai-searches',
        icon: <SmartToyIcon fontSize="small" />,
        color: '#4285f4'
      }
    ]
  },

  { 
    title: 'Recruiter Outreach',
    path: '/recruiters',
    icon: <PeopleIcon />,
    color: '#00c4b4', // Secondary teal

  },

];

const Sidebar = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { currentUser, logout } = useContext(AuthContext);
  const [openSubMenu, setOpenSubMenu] = React.useState('');

  // Auto-expand the submenu for the current path
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && (
        location.pathname === item.path || 
        item.subItems.some(subItem => location.pathname.startsWith(subItem.path)) ||
        // Special handling for recruiter routes
        (item.path === '/recruiters' && location.pathname.startsWith('/recruiters'))
      )) {
        setOpenSubMenu(item.title);
      }
    });
  }, [location.pathname]);

  const handleSubMenuClick = (title) => {
    setOpenSubMenu(openSubMenu === title ? '' : title);
  };

  const isPathActive = (path) => {
    // Special handling for exact path matching on main routes
    if (path === '/recruiters' && location.pathname === '/recruiters') {
      return true;
    }
    // For sub-items, check exact path
    if (path.includes('/recruiters/')) {
      return location.pathname === path;
    }
    // Default behavior for other routes
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isSubItemActive = (subItemPath) => {
    return location.pathname === subItemPath;
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return currentUser?.firstName || 'User';
  };

  // Helper function to get user email with proper truncation
  const getUserEmail = () => {
    return currentUser?.email || 'user@example.com';
  };

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent overflow on sidebar container
    }}>
      {/* Logo Section */}
      <Box sx={{ 
        px: 2.5, 
        py: 2, 
        display: 'flex', 
        alignItems: 'center',
        cursor: 'pointer',
        flexShrink: 0 // Prevent logo from shrinking
      }}>
        <AutoJobLogo 
          variant="horizontal"
          size="small"
          color="primary"
          showTagline={false}
        />
      </Box>
      
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
          Main Menu
        </Typography>
      </Box>
      
      {/* Scrollable Navigation Area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        // Custom scrollbar for sidebar
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '2px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          },
        },
      }}>
        <List sx={{ px: 1 }}>
          {navItems.map((item) => (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                {item.subItems ? (
                  <ListItemButton
                    onClick={() => handleSubMenuClick(item.title)}
                    selected={location.pathname.startsWith(item.path)}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: `${item.color}15`, // Use item color with 15% opacity
                        color: item.color,
                        '&:hover': {
                          backgroundColor: `${item.color}20`, // Slightly darker on hover
                        },
                        '& .MuiListItemIcon-root': {
                          color: item.color,
                        },
                      },
                      '&:hover': {
                        backgroundColor: `${item.color}08`, // Light hover state with item color
                      }
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 40,
                        color: item.color,
                        '& .MuiSvgIcon-root': {
                          fontSize: '1.3rem'
                        }
                      }}
                    >
                      {React.cloneElement(item.icon, { 
                        style: { color: item.color }
                      })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.title}
                      primaryTypographyProps={{
                        fontWeight: location.pathname.startsWith(item.path) ? 600 : 500,
                        fontSize: '0.9rem',
                        color: location.pathname.startsWith(item.path) ? item.color : 'text.primary'
                      }}
                    />
                    {openSubMenu === item.title ? 
                      <ExpandLess sx={{ color: 'text.secondary' }} /> : 
                      <ExpandMore sx={{ color: 'text.secondary' }} />
                    }
                  </ListItemButton>
                ) : (
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={isPathActive(item.path)}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: `${item.color}15`, // Use item color with 15% opacity
                        color: item.color,
                        '&:hover': {
                          backgroundColor: `${item.color}20`, // Slightly darker on hover
                        },
                        '& .MuiListItemIcon-root': {
                          color: item.color,
                        },
                      },
                      '&:hover': {
                        backgroundColor: `${item.color}08`, // Light hover state with item color
                      }
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 40,
                        color: item.color,
                        '& .MuiSvgIcon-root': {
                          fontSize: '1.3rem'
                        }
                      }}
                    >
                      {React.cloneElement(item.icon, { 
                        style: { color: item.color }
                      })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.title}
                      primaryTypographyProps={{
                        fontWeight: isPathActive(item.path) ? 600 : 500,
                        fontSize: '0.9rem',
                        color: isPathActive(item.path) ? item.color : 'text.primary'
                      }}
                    />
                  </ListItemButton>
                )}
              </ListItem>
              {item.subItems && (
                <Collapse in={openSubMenu === item.title} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItemButton
                        key={subItem.path}
                        component={Link}
                        to={subItem.path}
                        selected={isSubItemActive(subItem.path)}
                        sx={{
                          pl: 4,
                          py: 0.75,
                          borderRadius: 1.5,
                          mb: 0.5,
                          '&.Mui-selected': {
                            backgroundColor: `${subItem.color}15`, // Use subItem color with 15% opacity
                            color: subItem.color,
                            '&:hover': {
                              backgroundColor: `${subItem.color}20`, // Slightly darker on hover
                            },
                            '& .MuiListItemIcon-root': {
                              color: subItem.color,
                            },
                          },
                          '&:hover': {
                            backgroundColor: `${subItem.color}08`, // Light hover state with subItem color
                          }
                        }}
                      >
                        <ListItemIcon 
                          sx={{ 
                            minWidth: 32,
                            color: subItem.color,
                            '& .MuiSvgIcon-root': {
                              fontSize: '1.1rem'
                            }
                          }}
                        >
                          {React.cloneElement(subItem.icon, { 
                            style: { color: subItem.color }
                          })}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.title}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: isSubItemActive(subItem.path) ? 600 : 500,
                            fontSize: '0.85rem',
                            color: isSubItemActive(subItem.path) ? subItem.color : 'text.primary'
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      
      <Divider sx={{ mt: 2, flexShrink: 0 }} />
      
      {/* User Section - Fixed at bottom with improved email handling */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 'rgba(26, 115, 232, 0.04)',
          border: '1px solid rgba(26, 115, 232, 0.1)',
          minWidth: 0, // Allow shrinking
        }}>
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40,
              mr: 2,
              bgcolor: 'primary.main',
              fontSize: '1rem',
              fontWeight: 600,
              flexShrink: 0, // Prevent avatar from shrinking
            }}
          >
            {currentUser?.firstName?.[0] || 'U'}
          </Avatar>
          <Box sx={{ 
            flex: 1, 
            minWidth: 0, // Allow this box to shrink
            overflow: 'hidden' // Prevent overflow
          }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2
              }}
            >
              {getUserDisplayName()}
            </Typography>
            <Tooltip title={getUserEmail()} arrow placement="top">
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  cursor: 'help', // Show that it's interactive
                  '&:hover': {
                    color: 'text.primary', // Slightly darker on hover
                  }
                }}
              >
                {getUserEmail()}
              </Typography>
            </Tooltip>
          </Box>
        </Box>
        
        <List sx={{ p: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/settings"
              sx={{
                borderRadius: 1.5,
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsIcon 
                  fontSize="small" 
                  sx={{ color: '#666' }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={logout}
              sx={{
                borderRadius: 1.5,
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(234, 67, 53, 0.04)',
                  '& .MuiListItemIcon-root': {
                    color: 'error.main'
                  },
                  '& .MuiListItemText-primary': {
                    color: 'error.main'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LogoutIcon 
                  fontSize="small" 
                  sx={{ color: '#666' }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="Logout" 
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          height: '100vh', // Full viewport height
          overflow: 'hidden' // Prevent overflow on drawer paper
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;