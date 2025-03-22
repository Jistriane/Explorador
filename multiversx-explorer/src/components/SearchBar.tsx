import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchByQuery } from '../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import config from '../config';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Função para mostrar notificações
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Você pode implementar notificações visuais aqui se desejar
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExternalUrl(null);
    
    if (!searchTerm.trim()) {
      setError('Por favor, insira um termo para pesquisar');
      return;
    }
    
    setIsLoading(true);
    console.log('Iniciando busca por termo:', searchTerm.trim());
    
    try {
      // Forçar a busca em tempo real
      const result = await searchByQuery(searchTerm.trim());
      console.log('Resultado da busca:', result);
      
      if (result) {
        if (result.redirectUrl) {
          if (result.redirectUrl.startsWith('http')) {
            // URL externa
            window.open(result.redirectUrl, '_blank');
            showNotification('Redirecionando para site externo...', 'info');
          } else {
            // URL interna
            console.log('Redirecionando para:', result.redirectUrl);
            navigate(result.redirectUrl);
            showNotification(`${result.type} encontrado!`, 'success');
          }
          setSearchTerm('');
        }
      } else {
        setError('Nenhum resultado encontrado');
        showNotification('Nenhum resultado encontrado para este termo', 'error');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setError('Erro ao buscar. Por favor, tente novamente.');
      showNotification('Erro ao realizar busca', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleExternalRedirect = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank');
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper
        component="form"
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
        elevation={1}
        onSubmit={handleSearch}
      >
        <InputBase
          sx={{ ml: 1, flex: 1, py: 1 }}
          placeholder="Buscar por endereço, transação, bloco ou token..."
          inputProps={{ 'aria-label': 'buscar na blockchain' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`search-input ${error ? 'error' : ''}`}
          disabled={isLoading}
        />
        {isLoading ? (
          <CircularProgress size={24} sx={{ mx: 1 }} />
        ) : (
          <IconButton 
            type="submit" 
            sx={{ p: '10px' }} 
            aria-label="search" 
            disabled={isLoading}
          >
            <SearchIcon />
          </IconButton>
        )}
      </Paper>
      
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
      
      {externalUrl && (
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<OpenInNewIcon />}
          onClick={handleExternalRedirect}
          sx={{ mt: 1, display: 'flex', alignItems: 'center' }}
        >
          Ver no Explorer Oficial MultiversX
        </Button>
      )}
      
      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
        Digite um endereço (erd...), hash de transação, hash de bloco ou altura de bloco para buscar
      </Typography>
    </Box>
  );
};

export default SearchBar; 