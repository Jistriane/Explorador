import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  CircularProgress, 
  Divider,
  Chip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { fetchAccountByAddress } from '../../services/api';
import { Account } from '../../types';

const AccountDetails: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const loadAccount = async () => {
      if (!address) return;

      setLoading(true);
      try {
        const data = await fetchAccountByAddress(address);
        if (data) {
          setAccount(data);
          setError(null);
        } else {
          setError('Conta não encontrada');
        }
      } catch (err) {
        setError('Erro ao carregar os detalhes da conta');
        console.error(err);
      }
      setLoading(false);
    };

    loadAccount();
  }, [address]);

  const formatEgldBalance = (balance: string) => {
    const balanceInEgld = parseInt(balance) / 1000000000000000000;
    return `${balanceInEgld.toFixed(4)} EGLD`;
  };

  const copyToClipboard = () => {
    if (!address) return;
    
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar para o clipboard:', err);
      });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !account) {
    return (
      <Paper sx={{ p: 3, mt: 3, mb: 3, borderRadius: 2 }}>
        <Typography color="error" variant="h6">
          {error || 'Conta não encontrada'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box mt={3}>
      <Typography variant="h5" component="h1" gutterBottom>
        Detalhes da Conta
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Endereço
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="body1" sx={{ wordBreak: 'break-all', mr: 1 }}>
                  {account.address}
                </Typography>
                <Box 
                  component="span" 
                  onClick={copyToClipboard}
                  sx={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ContentCopyIcon fontSize="small" color="action" />
                  {copied && (
                    <Chip 
                      label="Copiado!" 
                      size="small" 
                      color="success" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </Box>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            {account.username && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="textSecondary">
                  Nome de Usuário
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {account.username}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Saldo
              </Typography>
              <Typography variant="body1" gutterBottom fontWeight="bold">
                {formatEgldBalance(account.balance)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Nonce
              </Typography>
              <Typography variant="body1" gutterBottom>
                {account.nonce}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Transações
              </Typography>
              <Typography variant="body1" gutterBottom>
                {account.txCount.toLocaleString()}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Shard
              </Typography>
              <Typography variant="body1" gutterBottom>
                {account.shard}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountDetails; 