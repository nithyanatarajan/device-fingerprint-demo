import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CollectionPage from './pages/CollectionPage';
import TuningConsolePage from './pages/TuningConsolePage';

const theme = createTheme();

function NavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Visual marker for the active route. The default AppBar `color="inherit"`
  // buttons are visually identical, so without this you can't tell which
  // page you're on. We render the active button with a translucent white
  // background and a bottom border to make it clearly the current tab.
  const navButtonSx = (active) => ({
    backgroundColor: active ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
    borderBottom: active ? '2px solid white' : '2px solid transparent',
    borderRadius: 0,
    px: 2,
    fontWeight: active ? 700 : 400,
    '&:hover': {
      backgroundColor: active ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.08)',
    },
  });

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Device Identification Platform
        </Typography>
        <Button
          color="inherit"
          onClick={() => navigate('/')}
          data-active={pathname === '/'}
          sx={navButtonSx(pathname === '/')}
        >
          Collect
        </Button>
        <Button
          color="inherit"
          onClick={() => navigate('/admin')}
          data-active={pathname === '/admin'}
          sx={navButtonSx(pathname === '/admin')}
        >
          Tuning Console
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<CollectionPage />} />
          <Route path="/admin" element={<TuningConsolePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
