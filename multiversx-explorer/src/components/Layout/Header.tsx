import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAppContext } from '../../context/AppContext';
import navLinks from './navLinks';

interface NavLink {
  title: string;
  path: string;
}

const Header: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isDarkMode, toggleDarkMode } = useAppContext();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="lg">
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            MultiversX Explorer
          </Typography>

          <Tooltip title={isDarkMode ? "Modo claro" : "Modo escuro"}>
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode} 
              sx={{ mr: 1 }}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {isMobile ? (
            <>
              <IconButton
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={handleMenu}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                {navLinks.map((link: NavLink) => (
                  <MenuItem 
                    key={link.path}
                    component={RouterLink} 
                    to={link.path} 
                    onClick={handleClose}
                  >
                    {link.title}
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <Box>
              {navLinks.map((link: NavLink) => (
                <Button 
                  key={link.path}
                  color="inherit" 
                  component={RouterLink} 
                  to={link.path}
                >
                  {link.title}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header; 