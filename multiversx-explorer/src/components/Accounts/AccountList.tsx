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
  Tooltip,
  useMediaQuery,
  useTheme,
  Link as MuiLink
} from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchAccounts } from '../../services/api';
import AccountBadge from './AccountBadge';

interface Account {
  address: string;
  balance: string;
  txCount: number;
  nonce: number;
  shard: number;
  username?: string;
}

interface AccountsResponse {
  accounts: Account[];
  totalCount?: number;
  pages?: number;
}

interface AccountListProps {
  showTitle?: boolean;
  limitItems?: number;
  showPagination?: boolean;
  accounts?: Account[];
}

const AccountList: React.FC<AccountListProps> = ({ 
  showTitle = true, 
  limitItems,
  showPagination = true,
  accounts: propAccounts
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(propAccounts ? false : true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const pageSize = limitItems || 10;

  useEffect(() => {
    // Se as contas forem fornecidas via props, use-as diretamente
    if (propAccounts) {
      setAccounts(propAccounts);
      return;
    }

    const loadAccounts = async () => {
      try {
        setLoading(true);
        const response: AccountsResponse = await fetchAccounts(page, pageSize);
        
        if (response && response.accounts) {
          setAccounts(response.accounts);
          
          // Se temos informação sobre o total de páginas do API
          if (response.pages) {
            setTotalPages(response.pages);
          } else if (response.totalCount) {
            // Calcular páginas baseado no total de contas
            setTotalPages(Math.ceil(response.totalCount / pageSize));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [page, pageSize, propAccounts]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const truncateAddress = (address: string) => {
    if (isMobile) {
      return `${address.substring(0, 7)}...${address.substring(address.length - 4)}`;
    }
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };
  
  const formatEgldBalance = (balance: string) => {
    const egldValue = parseInt(balance) / 1000000000000000000;
    return egldValue.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  };

  return (
    <Box>
      {showTitle && (
        <Typography variant="h6" component="h2" gutterBottom>
          Contas Recentes
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Typography align="center" my={4}>
          Nenhuma conta encontrada
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: isMobile ? 300 : 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Endereço</TableCell>
                  {!isMobile && <TableCell>Nome do Usuário</TableCell>}
                  <TableCell>Saldo (EGLD)</TableCell>
                  {!isTablet && <TableCell>Transações</TableCell>}
                  {!isTablet && <TableCell>Nonce</TableCell>}
                  {!isMobile && <TableCell>Shard</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow
                    key={account.address}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    hover
                  >
                    <TableCell component="th" scope="row">
                      <Tooltip title={account.address} arrow>
                        <MuiLink component={Link} to={`/accounts/${account.address}`} underline="hover">
                          <AccountBadge 
                            address={account.address} 
                            displayText={truncateAddress(account.address)} 
                          />
                        </MuiLink>
                      </Tooltip>
                    </TableCell>
                    
                    {!isMobile && (
                      <TableCell>
                        {account.username || '-'}
                      </TableCell>
                    )}
                    
                    <TableCell>
                      {formatEgldBalance(account.balance)}
                    </TableCell>
                    
                    {!isTablet && (
                      <TableCell>
                        {account.txCount.toLocaleString()}
                      </TableCell>
                    )}
                    
                    {!isTablet && (
                      <TableCell>
                        {account.nonce}
                      </TableCell>
                    )}
                    
                    {!isMobile && (
                      <TableCell>
                        {account.shard}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {showPagination && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                showFirstButton 
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AccountList; 