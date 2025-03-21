import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Box, 
  Pagination,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  Box as MuiBox
} from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchRecentTransactions } from '../../services/api';
import { Transaction } from '../../types';
import config from '../../config';
import AccountBadge from '../Accounts/AccountBadge';

interface TransactionListProps {
  showTitle?: boolean;
  limitItems?: number;
  showPagination?: boolean;
  transactions?: Transaction[];
  highlightAddress?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  showTitle = true, 
  limitItems, 
  showPagination = true,
  transactions: propTransactions,
  highlightAddress
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(propTransactions ? false : true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const itemsPerPage = limitItems || config.settings.itemsPerPage;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Se as transações forem fornecidas via props, use-as diretamente
    if (propTransactions) {
      setTransactions(propTransactions);
      return;
    }

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const data = await fetchRecentTransactions({ page, itemsPerPage });
        setTransactions(data);
        // Na API real, você obteria o total de páginas a partir da resposta
        setTotalPages(10);
      } catch (error) {
        console.error('Erro ao carregar transações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [page, itemsPerPage, propTransactions]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateHash = (hash: string) => {
    if (!hash) return '--';
    if (isMobile) {
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }
    return hash;
  };

  const formatValue = (value: string) => {
    if (!value) return '0';
    const valueInEgld = parseFloat(value) / 1e18;
    return valueInEgld.toFixed(6);
  };

  const getRelativeTime = (timestamp: number) => {
    if (!timestamp) return '--';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return `${diff} seg atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    return `${Math.floor(diff / 86400)} d atrás`;
  };

  // Se não tiver transações, exiba uma mensagem
  if (!loading && transactions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <Typography variant="body1" color="textSecondary">
          Nenhuma transação encontrada
        </Typography>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    if (statusLower === 'success') return 'success';
    if (statusLower === 'pending') return 'warning';
    if (statusLower === 'invalid' || statusLower === 'failed') return 'error';
    return 'default';
  };

  const truncateAddress = (address: string) => {
    if (!address) return '--';
    if (isMobile) {
      return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
    }
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  return (
    <Box>
      {showTitle && (
        <Typography variant="h5" component="h2" gutterBottom>
          Transações Recentes
        </Typography>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Hash</TableCell>
                  {!isMobile && <TableCell>Timestamp</TableCell>}
                  <TableCell>De</TableCell>
                  <TableCell>Para</TableCell>
                  {!isTablet && <TableCell>Valor (EGLD)</TableCell>}
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow 
                    key={tx.hash} 
                    hover
                    sx={highlightAddress && (tx.sender === highlightAddress || tx.receiver === highlightAddress) ? {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(63, 81, 181, 0.08)' : 'rgba(63, 81, 181, 0.04)'
                    } : undefined}
                  >
                    <TableCell>
                      <Link to={`/transactions/${tx.hash}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                        {truncateHash(tx.hash)}
                      </Link>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Tooltip title={formatTimestamp(tx.timestamp)}>
                          <span>{getRelativeTime(tx.timestamp)}</span>
                        </Tooltip>
                      </TableCell>
                    )}
                    <TableCell>
                      <Link 
                        to={`/accounts/${tx.sender}`}
                        style={{ 
                          textDecoration: 'none', 
                          color: highlightAddress && tx.sender === highlightAddress ? '#3f51b5' : 'inherit'
                        }}
                      >
                        <AccountBadge 
                          address={tx.sender} 
                          displayText={truncateAddress(tx.sender)} 
                        />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link 
                        to={`/accounts/${tx.receiver}`}
                        style={{ 
                          textDecoration: 'none', 
                          color: highlightAddress && tx.receiver === highlightAddress ? '#3f51b5' : 'inherit'
                        }}
                      >
                        <AccountBadge 
                          address={tx.receiver} 
                          displayText={truncateAddress(tx.receiver)} 
                        />
                      </Link>
                    </TableCell>
                    {!isTablet && <TableCell>{formatValue(tx.value)}</TableCell>}
                    <TableCell>
                      <Chip 
                        label={tx.status || 'pending'} 
                        size="small" 
                        color={getStatusColor(tx.status) as any} 
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {showPagination && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                size="small"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TransactionList; 