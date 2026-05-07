import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#10b6ea',
      dark: '#0092bf',
      light: '#6bd9f7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e6008d',
      dark: '#b80071',
      light: '#ff4fb4',
      contrastText: '#ffffff',
    },
    success: {
      main: '#07a44f',
      dark: '#04853f',
      light: '#4fc47f',
    },
    background: {
      default: '#f5f6fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1d1d1f',
      secondary: '#5c5c66',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Poppins, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h4: {
      fontWeight: 900,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 800,
    },
    button: {
      fontWeight: 800,
      textTransform: 'none',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(16, 182, 234, 0.13)',
          boxShadow: '0 12px 24px rgba(92, 27, 119, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 12px 28px rgba(92, 27, 119, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 14,
        },
      },
    },
  },
});