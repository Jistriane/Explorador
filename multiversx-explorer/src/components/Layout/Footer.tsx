import React from 'react';
import { Box, Container, Typography, Link, Chip } from '@mui/material';
import config from '../../config';

const Footer: React.FC = () => {
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 3,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[100]
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Chip
            label={`${config.network.name}`}
            color="primary"
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`v${config.explorer.version}`}
            color="secondary"
            variant="outlined"
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} MultiversX Blockchain Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
          {'Desenvolvido para fins educacionais - '}
          <Link color="inherit" href="https://multiversx.com/" target="_blank" rel="noopener">
            MultiversX
          </Link>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 