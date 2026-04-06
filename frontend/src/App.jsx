import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CollectionPage from './pages/CollectionPage';

const theme = createTheme();

function NavBar() {
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Device Identification Platform
        </Typography>
        <Button color="inherit" onClick={() => navigate('/')}>
          Collect
        </Button>
        <Button color="inherit" onClick={() => navigate('/admin')}>
          Tuning Console
        </Button>
      </Toolbar>
    </AppBar>
  );
}

function PlaceholderAdmin() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">Tuning Console</Typography>
      <Typography>Coming soon.</Typography>
    </Box>
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
          <Route path="/admin" element={<PlaceholderAdmin />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
