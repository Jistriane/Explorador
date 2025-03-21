import React, { useState } from 'react';
import { Paper, InputBase, IconButton, Box, Typography, useTheme, CircularProgress, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { searchByQuery } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import config from '../config';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Usar try/catch para evitar erros caso o NotificationContext não esteja disponível
  let showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  try {
    const notificationContext = useNotification();
    showNotification = notificationContext.showNotification;
  } catch (error) {
    // Fallback caso o contexto não esteja disponível
    showNotification = (message: string) => {
      console.log('Notification (fallback):', message);
    };
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Por favor, insira um termo de busca');
      return;
    }

    setError('');
    setLoading(true);
    setExternalUrl(null);

    try {
      const result = await searchByQuery(searchTerm.trim());
      
      if (result) {
        // Verificar se é um redirecionamento interno ou externo
        if (result.type.startsWith('external_')) {
          // Para resultados externos, mostrar botão para o explorer oficial
          setExternalUrl(`${config.explorer.url}${result.redirectUrl.replace(/^\/+/, '/')}`);
          showNotification('Encontrado no Explorer oficial da MultiversX', 'info');
        } else {
          // Para resultados internos, redirecionar
          navigate(result.redirectUrl);
        }
      } else {
        // Nenhum resultado encontrado
        setError('Nenhum resultado encontrado para esta busca');
        
        // Como alternativa, oferecer busca no explorer oficial
        const term = searchTerm.trim();
        let externalSearchUrl = '';
        
        if (term.startsWith('erd')) {
          externalSearchUrl = `${config.explorer.url}/accounts/${term}`;
        } else if (/^[0-9a-fA-F]{64}$/.test(term)) {
          externalSearchUrl = `${config.explorer.url}/transactions/${term}`;
        } else if (/^\d+$/.test(term)) {
          externalSearchUrl = `${config.explorer.url}/blocks?nonce=${term}`;
        }
        
        if (externalSearchUrl) {
          setExternalUrl(externalSearchUrl);
          showNotification('Tentando buscar no explorer oficial', 'warning');
        } else {
          showNotification('Nenhum resultado encontrado', 'error');
        }
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setError('Erro ao realizar a busca');
      showNotification('Erro ao realizar a busca', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1, py: 1 }}
          placeholder="Buscar por endereço de carteira, transação ou bloco..."
          inputProps={{ 'aria-label': 'buscar na blockchain' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        {loading ? (
          <CircularProgress size={24} sx={{ mx: 1 }} />
        ) : (
          <IconButton 
            type="button" 
            sx={{ p: '10px' }} 
            aria-label="search" 
            onClick={handleSearch}
            disabled={loading}
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