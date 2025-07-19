// frontend/src/components/layout/Sidebar.js - UPDATED TO ALLOW FREE USER ACCESS TO RECRUITER OUTREACH
import React, { useContext, useState } from 'react';
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
  Chip,
  Badge,
  alpha,
  Button,
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
  Person as PersonIcon,
  Lock as LockIcon,
  TrendingUp as TrendingUpIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import AutoJobLogo from '../common/AutoJobLogo';
import PlanBadge from '../subscription/navigation/PlanBadge';
import UpgradePrompt from '../subscription/shared/UpgradePrompt';

const drawerWidth = 260;

const Sidebar = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { currentUser, logout } = useContext(AuthContext);
  const { 
    usage, 
    planLimits, 
    hasFeatureAccess, 
    getUsagePercentage, 
    planInfo,
    isFreePlan,
    isCasualPlan,
    isHunterPlan 
  } = useSubscription();
  const [openSubMenu, setOpenSubMenu] = React.useState('');
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Navigation items with subscription awareness - UPDATED: FREE USERS CAN ACCESS RECRUITER OUTREACH
  const getNavItems = () => {
    const baseItems = [
      { 
        title: 'Dashboard',
        path: '/dashboard',
        icon: <DashboardIcon />,
        color: '#1a73e8',
        available: true
      },
      { 
        title: 'My Resumes',
        path: '/resumes',
        icon: <DescriptionIcon />,
        color: '#34a853',
        available: true
        // ✅ FEATURE GATING REMOVED: Resume uploads are now unlimited - no usage display needed
      },
      { 
        title: 'Find Jobs',
        path: '/jobs',
        icon: <WorkIcon />,
        color: '#4285f4',
        available: true,
        usageFeature: 'jobImports',
        subItems: [
          {
            title: 'My Jobs List',
            path: '/jobs',
            icon: <FormatListBulletedIcon fontSize="small" />,
            color: '#4285f4',
            available: true
          },
          {
            title: 'AI Job Search',
            path: '/jobs/ai-searches',
            icon: <SmartToyIcon fontSize="small" />,
            color: '#4285f4',
            available: hasFeatureAccess('aiJobDiscovery'),
            requiresPlan: 'casual',
            featureName: 'AI Job Discovery'
          }
        ]
      },
      { 
        title: 'Find Recruiters',
        path: '/recruiters',
        icon: <PeopleIcon />,
        color: '#00c4b4',
        available: true, // CHANGED: Now available for all users including Free
        usageFeature: isFreePlan ? null : 'recruiterUnlocks', // Only show usage for paid plans
        showLimitedBadge: isFreePlan // Show "Limited" badge for free users
      }
    ];

    return baseItems;
  };

  const navItems = getNavItems();

  // Auto-expand the submenu for the current path
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && (
        location.pathname === item.path || 
        item.subItems.some(subItem => location.pathname.startsWith(subItem.path)) ||
        (item.path === '/recruiters' && location.pathname.startsWith('/recruiters'))
      )) {
        setOpenSubMenu(item.title);
      }
    });
  }, [location.pathname, navItems]);

  const handleSubMenuClick = (title) => {
    setOpenSubMenu(openSubMenu === title ? '' : title);
  };

  const isPathActive = (path) => {
    if (path === '/recruiters' && location.pathname === '/recruiters') {
      return true;
    }
    if (path.includes('/recruiters/')) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isSubItemActive = (subItemPath) => {
    return location.pathname === subItemPath;
  };

  // Get usage display for a feature
  const getUsageDisplay = (feature) => {
    if (!feature || !usage || !planLimits) return null;
    
    const limit = planLimits[feature];
    const used = usage[feature]?.used || 0;
    
    if (limit === -1) return '∞';
    if (limit === 0) return null;
    
    return `${used}/${limit}`;
  };

  // Get usage color for a feature
  const getUsageColor = (feature) => {
    if (!feature) return 'default';
    
    const percentage = getUsagePercentage(feature);
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
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

  // Handle upgrade button click
  const handleUpgradeClick = () => {
    setUpgradeDialogOpen(true);
  };

  // Handle upgrade dialog close
  const handleUpgradeDialogClose = () => {
    setUpgradeDialogOpen(false);
  };

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Logo Section */}
      <Box sx={{ 
        px: 2.5, 
        py: 2, 
        display: 'flex', 
        alignItems: 'center',
        cursor: 'pointer',
        flexShrink: 0
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
                    disabled={!item.available}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      position: 'relative',
                      ...(!item.available && {
                        opacity: 0.6,
                        '&:hover': {
                          backgroundColor: 'transparent',
                        }
                      }),
                      ...(item.available && {
                        '&.Mui-selected': {
                          backgroundColor: `${item.color}15`,
                          color: item.color,
                          '&:hover': {
                            backgroundColor: `${item.color}20`,
                          },
                          '& .MuiListItemIcon-root': {
                            color: item.color,
                          },
                        },
                        '&:hover': {
                          backgroundColor: `${item.color}08`,
                        }
                      })
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 40,
                        color: item.available ? item.color : 'text.disabled',
                        '& .MuiSvgIcon-root': {
                          fontSize: '1.3rem'
                        }
                      }}
                    >
                      {item.available ? (
                        React.cloneElement(item.icon, { 
                          style: { color: item.color }
                        })
                      ) : (
                        <LockIcon style={{ color: theme.palette.text.disabled }} />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: location.pathname.startsWith(item.path) ? 600 : 500,
                              fontSize: '0.9rem',
                              color: location.pathname.startsWith(item.path) ? item.color : 'text.primary'
                            }}
                          >
                            {item.title}
                          </Typography>
                          {!item.available && item.requiresPlan && (
                            <Chip
                              label={item.requiresPlan === 'casual' ? 'Casual+' : 'Hunter'}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: item.requiresPlan === 'casual' ? '#2196f320' : '#ff980020',
                                color: item.requiresPlan === 'casual' ? '#2196f3' : '#ff9800',
                                border: `1px solid ${item.requiresPlan === 'casual' ? '#2196f340' : '#ff980040'}`
                              }}
                            />
                          )}
                          {/* NEW: Show "Limited" badge for free users on recruiter outreach */}
                          {item.showLimitedBadge && (
                            <Chip
                              label="Limited"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: '#ff980020',
                                color: '#ff9800',
                                border: `1px solid #ff980040`
                              }}
                            />
                          )}
                          {item.usageFeature && item.available && !item.showLimitedBadge && (
                            <Chip
                              label={getUsageDisplay(item.usageFeature)}
                              size="small"
                              color={getUsageColor(item.usageFeature)}
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                minWidth: 'auto'
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                    {openSubMenu === item.title ? 
                      <ExpandLess sx={{ color: 'text.secondary' }} /> : 
                      <ExpandMore sx={{ color: 'text.secondary' }} />
                    }
                  </ListItemButton>
                ) : (
                  <ListItemButton
                    component={item.available ? Link : 'div'}
                    to={item.available ? item.path : undefined}
                    selected={item.available && isPathActive(item.path)}
                    disabled={!item.available}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      position: 'relative',
                      ...(!item.available && {
                        opacity: 0.6,
                        cursor: 'not-allowed',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        }
                      }),
                      ...(item.available && {
                        '&.Mui-selected': {
                          backgroundColor: `${item.color}15`,
                          color: item.color,
                          '&:hover': {
                            backgroundColor: `${item.color}20`,
                          },
                          '& .MuiListItemIcon-root': {
                            color: item.color,
                          },
                        },
                        '&:hover': {
                          backgroundColor: `${item.color}08`,
                        }
                      })
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 40,
                        color: item.available ? item.color : 'text.disabled',
                        '& .MuiSvgIcon-root': {
                          fontSize: '1.3rem'
                        }
                      }}
                    >
                      {item.available ? (
                        React.cloneElement(item.icon, { 
                          style: { color: item.color }
                        })
                      ) : (
                        <LockIcon style={{ color: theme.palette.text.disabled }} />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: item.available && isPathActive(item.path) ? 600 : 500,
                              fontSize: '0.9rem',
                              color: item.available && isPathActive(item.path) ? item.color : 'text.primary'
                            }}
                          >
                            {item.title}
                          </Typography>
                          {!item.available && item.requiresPlan && (
                            <Chip
                              label={item.requiresPlan === 'casual' ? 'Casual+' : 'Hunter'}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: item.requiresPlan === 'casual' ? '#2196f320' : '#ff980020',
                                color: item.requiresPlan === 'casual' ? '#2196f3' : '#ff9800',
                                border: `1px solid ${item.requiresPlan === 'casual' ? '#2196f340' : '#ff980040'}`
                              }}
                            />
                          )}
                          {/* NEW: Show "Limited" badge for free users on recruiter outreach */}
                          {item.showLimitedBadge && (
                            <Chip
                              label="Limited"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: '#ff980020',
                                color: '#ff9800',
                                border: `1px solid #ff980040`
                              }}
                            />
                          )}
                          {item.usageFeature && item.available && !item.showLimitedBadge && (
                            <Chip
                              label={getUsageDisplay(item.usageFeature)}
                              size="small"
                              color={getUsageColor(item.usageFeature)}
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                minWidth: 'auto'
                              }}
                            />
                          )}
                        </Box>
                      }
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
                        component={subItem.available ? Link : 'div'}
                        to={subItem.available ? subItem.path : undefined}
                        selected={subItem.available && isSubItemActive(subItem.path)}
                        disabled={!subItem.available}
                        sx={{
                          pl: 4,
                          py: 0.75,
                          borderRadius: 1.5,
                          mb: 0.5,
                          ...(!subItem.available && {
                            opacity: 0.6,
                            cursor: 'not-allowed',
                            '&:hover': {
                              backgroundColor: 'transparent',
                            }
                          }),
                          ...(subItem.available && {
                            '&.Mui-selected': {
                              backgroundColor: `${subItem.color}15`,
                              color: subItem.color,
                              '&:hover': {
                                backgroundColor: `${subItem.color}20`,
                              },
                              '& .MuiListItemIcon-root': {
                                color: subItem.color,
                              },
                            },
                            '&:hover': {
                              backgroundColor: `${subItem.color}08`,
                            }
                          })
                        }}
                      >
                        <ListItemIcon 
                          sx={{ 
                            minWidth: 32,
                            color: subItem.available ? subItem.color : 'text.disabled',
                            '& .MuiSvgIcon-root': {
                              fontSize: '1.1rem'
                            }
                          }}
                        >
                          {subItem.available ? (
                            React.cloneElement(subItem.icon, { 
                              style: { color: subItem.color }
                            })
                          ) : (
                            <LockIcon style={{ color: theme.palette.text.disabled, fontSize: '1.1rem' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                sx={{
                                  variant: 'body2',
                                  fontWeight: subItem.available && isSubItemActive(subItem.path) ? 600 : 500,
                                  fontSize: '0.85rem',
                                  color: subItem.available && isSubItemActive(subItem.path) ? subItem.color : 'text.primary'
                                }}
                              >
                                {subItem.title}
                              </Typography>
                              {!subItem.available && subItem.requiresPlan && (
                                <Chip
                                  label={subItem.requiresPlan === 'casual' ? 'Casual+' : 'Hunter'}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                    backgroundColor: subItem.requiresPlan === 'casual' ? '#2196f320' : '#ff980020',
                                    color: subItem.requiresPlan === 'casual' ? '#2196f3' : '#ff9800',
                                    border: `1px solid ${subItem.requiresPlan === 'casual' ? '#2196f340' : '#ff980040'}`
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>

        {/* Upgrade Prompt for Limited Plans */}
        {(isFreePlan || isCasualPlan) && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box sx={{
              p: 2,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
              border: `1px solid ${theme.palette.primary.main}30`,
              textAlign: 'center'
            }}>
              <TrendingUpIcon sx={{ 
                color: 'primary.main', 
                fontSize: '2rem', 
                mb: 1 
              }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isFreePlan ? 'Unlock Premium Features' : 'Go Pro with Hunter'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {isFreePlan 
                  ? 'Access full recruiter database and AI job discovery'
                  : 'Get unlimited access and AI assistant'
                }
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={<UpgradeIcon />}
                onClick={handleUpgradeClick}
                sx={{
                  py: 1,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.8rem'
                }}
              >
                Upgrade
              </Button>
            </Box>
          </Box>
        )}
      </Box>
      
      <Divider sx={{ mt: 2, flexShrink: 0 }} />
      
      {/* User Section - Fixed at bottom */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          backgroundColor: planInfo?.backgroundColor || 'rgba(26, 115, 232, 0.04)',
          border: `1px solid ${planInfo?.color || '#1a73e8'}20`,
          minWidth: 0,
        }}>
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40,
              mr: 2,
              bgcolor: 'primary.main',
              fontSize: '1rem',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {currentUser?.firstName?.[0] || 'U'}
          </Avatar>
          <Box sx={{ 
            flex: 1, 
            minWidth: 0,
            overflow: 'hidden'
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <PlanBadge 
                size="small"
                showIcon={false}
                showTooltip={false}
                variant="outlined"
              />
            </Box>
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

      {/* Upgrade Prompt Dialog */}
      <UpgradePrompt
        open={upgradeDialogOpen}
        onClose={handleUpgradeDialogClose}
        currentPlan={planInfo?.name?.toLowerCase() || 'free'}
        title="Upgrade Your Plan"
        description="Unlock premium features and accelerate your job search"
      />
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
          height: '100vh',
          overflow: 'hidden'
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
