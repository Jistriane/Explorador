import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { fetchTransactionByHash } from '../../services/api';
import { Transaction } from '../../types';

const TransactionDetails: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!hash) return;

      setLoading(true);
      try {
        const data = await fetchTransactionByHash(hash);
        if (data) {
          setTransaction(data);
          setError(null);
        } else {
          setError('Transação não encontrada');
        }
      } catch (err) {
        setError('Erro ao carregar os detalhes da transação');
        console.error(err);
      }
      setLoading(false);
    };

    loadTransaction();
  }, [hash]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatEgldValue = (value: string) => {
    const valueInEgld = parseInt(value) / 1000000000000000000;
    return `${valueInEgld.toFixed(9)} EGLD`;
  };

  const getStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status.toLowerCase()) {
      case 'success':
        color = 'success';
        break;
      case 'failed':
        color = 'error';
        break;
      case 'pending':
        color = 'warning';
        break;
      default:
        color = 'default';
    }
    
    return <Chip label={status} color={color} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !transaction) {
    return (
      <Paper sx={{ p: 3, mt: 3, mb: 3, borderRadius: 2 }}>
        <Typography color="error" variant="h6">
          {error || 'Transação não encontrada'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box mt={3}>
      <Typography variant="h5" component="h1" gutterBottom>
        Detalhes da Transação
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Hash
              </Typography>
              <Typography variant="body1" gutterBottom>
                {transaction.hash}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Status
              </Typography>
              <Box mt={0.5} mb={1.5}>
                {getStatusChip(transaction.status)}
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Timestamp
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatTimestamp(transaction.timestamp)}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Remetente
              </Typography>
              <Typography variant="body1" gutterBottom>
                <Link to={`/accounts/${transaction.sender}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                  {transaction.sender}
                </Link>
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Destinatário
              </Typography>
              <Typography variant="body1" gutterBottom>
                <Link to={`/accounts/${transaction.receiver}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                  {transaction.receiver}
                </Link>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Valor
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatEgldValue(transaction.value)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Taxa
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatEgldValue(transaction.fee)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Limite de Gas
              </Typography>
              <Typography variant="body1" gutterBottom>
                {transaction.gasLimit.toLocaleString()}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Preço de Gas
              </Typography>
              <Typography variant="body1" gutterBottom>
                {transaction.gasPrice.toLocaleString()}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Nonce
              </Typography>
              <Typography variant="body1" gutterBottom>
                {transaction.nonce}
              </Typography>
            </Grid>

            {transaction.data && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="textSecondary">
                  Dados
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mt: 1, 
                    bgcolor: 'rgba(0, 0, 0, 0.04)', 
                    overflowX: 'auto',
                    fontFamily: 'monospace'
                  }}
                >
                  <Typography variant="body2">
                    {transaction.data}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TransactionDetails; 