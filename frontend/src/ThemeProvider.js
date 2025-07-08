// src/ThemeProvider.js
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Define the auto-job.ai theme with 80% scaling
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a73e8', // Deep blue
      light: '#4285f4',
      dark: '#0d47a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00c4b4', // Teal accent
      light: '#33d1c1',
      dark: '#00897b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#34a853',
      light: '#5cb85c',
      dark: '#2e7d32',
    },
    warning: {
      main: '#fbbc04',
      light: '#ffcd38',
      dark: '#f57c00',
    },
    error: {
      main: '#ea4335',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#4285f4',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    background: {
      default: '#f5f7fa', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
      disabled: '#9aa0a6',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    // Apply 80% scaling to the base font size
    fontSize: 14 * 0.85,
    fontFamily: [
      'Inter',
      'Roboto',
      '"Segoe UI"',
      '-apple-system',
      'BlinkMacSystemFont',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: '85%', // Set root font size to 80%
          WebkitTextSizeAdjust: '85%',
          MsTextSizeAdjust: '85%',
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        body: {
          margin: 0,
          padding: 0,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        // Custom Scrollbar Styles - Minimal Design
        '*::-webkit-scrollbar': {
          width: '4px',
          height: '4px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
          '&:active': {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          },
        },
        '*::-webkit-scrollbar-corner': {
          backgroundColor: 'transparent',
        },
        // Firefox scrollbar styling
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
        },
        // Dialog scrollbars - even thinner
        '.MuiDialog-paper::-webkit-scrollbar': {
          width: '3px',
        },
        '.MuiDialog-paper::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '1.5px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          },
        },
        '.MuiDialog-paper::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        // Menu and dropdown scrollbars - ultra thin
        '.MuiMenu-paper::-webkit-scrollbar, .MuiSelect-paper::-webkit-scrollbar': {
          width: '2px',
        },
        '.MuiMenu-paper::-webkit-scrollbar-thumb, .MuiSelect-paper::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '1px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          },
        },
        '.MuiMenu-paper::-webkit-scrollbar-track, .MuiSelect-paper::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        // Textarea scrollbars
        'textarea::-webkit-scrollbar': {
          width: '4px',
        },
        'textarea::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        'textarea::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          padding: '8px 16px',
          borderRadius: 8,
        },
        contained: {
          boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.08), 0px 6px 10px 0px rgba(0,0,0,0.05), 0px 1px 18px 0px rgba(0,0,0,0.04)',
          '&:hover': {
            boxShadow: '0px 6px 10px -1px rgba(0,0,0,0.1), 0px 10px 14px 0px rgba(0,0,0,0.07), 0px 1px 18px 0px rgba(0,0,0,0.06)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(26, 115, 232, 0.1)',
            color: '#1a73e8',
            '&:hover': {
              backgroundColor: 'rgba(26, 115, 232, 0.15)',
            },
            '& .MuiListItemIcon-root': {
              color: '#1a73e8',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a73e8',
        },
      },
    },
    // Adjust container widths to compensate for 80% scaling
    MuiContainer: {
      styleOverrides: {
        root: {
          // Counter the 80% scaling by making containers slightly larger
          '@media (min-width:600px)': {
            maxWidth: 'calc(600px * 1.25)',
          },
          '@media (min-width:900px)': {
            maxWidth: 'calc(900px * 1.25)',
          },
          '@media (min-width:1200px)': {
            maxWidth: 'calc(1200px * 1.25)',
          },
          '@media (min-width:1536px)': {
            maxWidth: 'calc(1536px * 1.25)',
          },
        },
      },
    },
  },
});

export default function ThemeProvider({ children }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
