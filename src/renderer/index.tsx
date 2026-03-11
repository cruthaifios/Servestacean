import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { App } from './components/App';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e85d3a',
      light: '#ff7f5c',
    },
    background: {
      default: '#1a1a1a',
      paper: '#242424',
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #333',
        },
      },
    },
  },
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
