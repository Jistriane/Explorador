import React from 'react';
import { Container, Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorPageProps {
  message?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ message = 'Ocorreu um erro inesperado.' }) => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box mt={10} mb={5} display="flex" flexDirection="column" alignItems="center">
        <Paper
          elevation={3}
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
          
          <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
            Ops! Algo deu errado.
          </Typography>
          
          <Typography variant="body1" align="center" sx={{ mb: 4 }}>
            {message}
          </Typography>
          
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/')}
            >
              Voltar para a página inicial
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ErrorPage; 