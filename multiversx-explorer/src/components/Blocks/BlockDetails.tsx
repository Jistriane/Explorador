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
import { fetchBlockByHash } from '../../services/api';
import { Block } from '../../types';

const BlockDetails: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlock = async () => {
      if (!hash) return;

      setLoading(true);
      try {
        const data = await fetchBlockByHash(hash);
        if (data) {
          setBlock(data);
          setError(null);
        } else {
          setError('Bloco não encontrado');
        }
      } catch (err) {
        setError('Erro ao carregar os detalhes do bloco');
        console.error(err);
      }
      setLoading(false);
    };

    loadBlock();
  }, [hash]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !block) {
    return (
      <Paper sx={{ p: 3, mt: 3, mb: 3, borderRadius: 2 }}>
        <Typography color="error" variant="h6">
          {error || 'Bloco não encontrado'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box mt={3}>
      <Typography variant="h5" component="h1" gutterBottom>
        Detalhes do Bloco
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Hash
              </Typography>
              <Typography variant="body1" gutterBottom>
                {block.hash}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Nonce
              </Typography>
              <Typography variant="body1" gutterBottom>
                {block.nonce}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Round
              </Typography>
              <Typography variant="body1" gutterBottom>
                {block.round}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Timestamp
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatTimestamp(block.timestamp)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="textSecondary">
                Tamanho
              </Typography>
              <Typography variant="body1" gutterBottom>
                {block.size} bytes
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Hash do Bloco Anterior
              </Typography>
              <Typography variant="body1" gutterBottom>
                <Link to={`/blocks/${block.prevHash}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                  {block.prevHash}
                </Link>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Proposer
              </Typography>
              <Typography variant="body1" gutterBottom>
                <Link to={`/accounts/${block.proposer}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                  {block.proposer}
                </Link>
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Transações
              </Typography>
              <Typography variant="body1" gutterBottom>
                {block.txCount}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Gas
              </Typography>
              <Box mt={1}>
                <Chip 
                  label={`Consumido: ${block.gasConsumed}`} 
                  sx={{ mr: 1, mb: 1 }} 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Reembolsado: ${block.gasRefunded}`} 
                  sx={{ mr: 1, mb: 1 }} 
                  color="secondary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Penalizado: ${block.gasPenalized}`} 
                  sx={{ mb: 1 }} 
                  color="error" 
                  variant="outlined" 
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary">
                Validadores
              </Typography>
              <Box sx={{ mt: 1 }}>
                {Array.isArray(block.validators) 
                  ? block.validators.map((validator, index) => (
                      <Chip
                        key={index}
                        label={`${validator.substring(0, 8)}...`}
                        component={Link}
                        to={`/accounts/${validator}`}
                        clickable
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))
                  : typeof block.validators === 'number' 
                    ? Array.from({ length: block.validators }).map((_, index) => (
                        <Chip
                          key={index}
                          label={`Validator ${index + 1}`}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))
                    : (
                        <Typography variant="body2" color="textSecondary">
                          Informação de validadores não disponível
                        </Typography>
                      )
                }
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BlockDetails; 