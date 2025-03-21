import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Chip,
  Divider,
  Button,
  Tab,
  Tabs,
  CircularProgress,
  Card,
  CardContent,
  Link,
  Avatar
} from '@mui/material';
import { 
  ContentCopy as ContentCopyIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';
import { fetchAccountByAddress, fetchAccountTransactions } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import TransactionList from '../components/Transactions/TransactionList';

// Gera uma cor baseada no endereço para identificação visual
const generateColorFromAddress = (address: string): string => {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
};

// Componente AccountBadge diretamente incorporado
const AccountBadge = ({ address, size = 'medium' }: { address: string, size?: 'small' | 'medium' | 'large' }) => {
  const initials = address.substring(0, 2);
  const bgColor = generateColorFromAddress(address);
  
  // Tamanhos baseados no parâmetro
  const sizes = {
    small: { width: 24, height: 24, fontSize: '0.75rem' },
    medium: { width: 32, height: 32, fontSize: '0.9rem' },
    large: { width: 40, height: 40, fontSize: '1.1rem' }
  };
  
  const sizeProps = sizes[size];
  
  return (
    <Box display="flex" alignItems="center">
      <Avatar 
        sx={{ 
          width: sizeProps.width, 
          height: sizeProps.height, 
          bgcolor: bgColor, 
          fontSize: sizeProps.fontSize, 
          fontWeight: 'bold',
          mr: 1 
        }}
      >
        {initials}
      </Avatar>
      <Typography variant="body1" component="span">
        {address}
      </Typography>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Definindo a interface para o tipo Transaction conforme está no projeto
interface Transaction {
  hash: string;
  sender: string;
  receiver: string;
  value: string;
  fee: string;
  timestamp: number;
  status: string;
  data?: string;
}

// Interface para o tipo de transação esperado pelo TransactionList
interface TransactionListItem {
  txHash: string;
  sender: string;
  receiver: string;
  value: string;
  fee?: string;
  timestamp: number;
  status: string;
  method?: string;
}

const AccountDetailsPage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState(0);
  const { showNotification } = useNotification();
  
  useEffect(() => {
    const loadAccountDetails = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        const accountData = await fetchAccountByAddress(address);
        setAccount(accountData);
      } catch (error) {
        console.error('Error loading account details:', error);
        showNotification('Erro ao carregar detalhes da conta', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadAccountDetails();
  }, [address, showNotification]);
  
  useEffect(() => {
    const loadTransactions = async () => {
      if (!address) return;
      
      try {
        setTransactionsLoading(true);
        const result = await fetchAccountTransactions(address);
        
        // Transformar as transações para o formato esperado pelo TransactionList
        const transformedTransactions: TransactionListItem[] = (result.transactions || []).map((tx: any) => ({
          txHash: tx.hash,
          sender: tx.sender,
          receiver: tx.receiver,
          value: tx.value,
          fee: tx.fee || '0',
          timestamp: tx.timestamp,
          status: tx.status || 'pending',
          method: tx.data ? (tx.data.split('@')[0] || 'transfer') : 'transfer'
        }));
        
        setTransactions(transformedTransactions);
      } catch (error) {
        console.error('Error loading account transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };
    
    if (tabValue === 1) {
      loadTransactions();
    }
  }, [address, tabValue]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showNotification('Copiado para a área de transferência', 'success');
      })
      .catch(err => {
        console.error('Erro ao copiar:', err);
        showNotification('Erro ao copiar para a área de transferência', 'error');
      });
  };

  const formatEgldBalance = (balance: string) => {
    const balanceNum = parseInt(balance) / 1000000000000000000;
    return balanceNum.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={5}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={5}>
            <CircularProgress />
          </Box>
        ) : !account ? (
          <Typography variant="h5" align="center" color="error">
            Conta não encontrada
          </Typography>
        ) : (
          <>
            <Box mb={4}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Detalhes da Conta
              </Typography>
              
              <Paper sx={{ p: 3, mb: 4 }} elevation={1}>
                <Box display="flex" flexDirection="column" gap={2}>
                  {/* Cabeçalho com informações básicas */}
                  <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
                    <AccountBadge address={account.address} size="large" />
                    
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(account.address)}
                      sx={{ ml: 2 }}
                    >
                      Copiar Endereço
                    </Button>
                    
                    {account.username && (
                      <Chip 
                        icon={<VerifiedUserIcon />} 
                        label={account.username} 
                        color="primary" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  
                  <Divider />
                  
                  {/* Informações principais */}
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom variant="subtitle2">
                            Saldo
                          </Typography>
                          <Box display="flex" alignItems="baseline">
                            <AccountBalanceWalletIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h5" component="div" fontWeight="bold">
                              {formatEgldBalance(account.balance)} EGLD
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom variant="subtitle2">
                            Nonce
                          </Typography>
                          <Typography variant="h5" component="div" fontWeight="bold">
                            {account.nonce}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom variant="subtitle2">
                            Shard
                          </Typography>
                          <Typography variant="h5" component="div" fontWeight="bold">
                            {account.shard}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom variant="subtitle2">
                            Total de Transações
                          </Typography>
                          <Typography variant="h5" component="div" fontWeight="bold">
                            {account.txCount.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {/* Mais detalhes */}
                  {account.ownerAddress && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Proprietário do Contrato:
                        </Typography>
                        <Link component={RouterLink} to={`/accounts/${account.ownerAddress}`}>
                          {account.ownerAddress}
                        </Link>
                      </Box>
                    </>
                  )}
                  
                  {account.deployedAt && (
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" component="span">
                        Implantado em:
                      </Typography>
                      <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                        {new Date(account.deployedAt * 1000).toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Se for um contrato inteligente */}
                  {(account.isUpgradeable || account.isReadable || account.isPayable) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Propriedades do Contrato:
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {account.isUpgradeable && (
                          <Chip label="Atualizável" color="info" variant="outlined" />
                        )}
                        {account.isReadable && (
                          <Chip label="Legível" color="success" variant="outlined" />
                        )}
                        {account.isPayable && (
                          <Chip label="Pagável" color="warning" variant="outlined" />
                        )}
                        {account.isPayableBySmartContract && (
                          <Chip label="Pagável por Contrato" color="secondary" variant="outlined" />
                        )}
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
              
              {/* Tabs para transações e outras informações */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="account tabs">
                  <Tab label="Resumo" />
                  <Tab label="Transações" />
                  {/* Adicionar mais tabs conforme necessário */}
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                <Paper sx={{ p: 3 }} elevation={1}>
                  <Typography variant="h6" gutterBottom>
                    Resumo da Conta
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Tipo de Conta:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {account.ownerAddress ? 'Contrato Inteligente' : 'Carteira'}
                      </Typography>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Shard:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {account.shard}
                      </Typography>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total de Transações:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {account.txCount.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Nonce:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {account.nonce}
                      </Typography>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Saldo:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {formatEgldBalance(account.balance)} EGLD
                      </Typography>
                      
                      {account.username && (
                        <>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Nome de Usuário:
                          </Typography>
                          <Typography variant="body1" paragraph>
                            {account.username}
                          </Typography>
                        </>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Paper sx={{ p: 3 }} elevation={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Transações
                    </Typography>
                    
                    <Box>
                      <Chip 
                        icon={<CallMadeIcon />} 
                        label="Enviadas" 
                        color="primary" 
                        variant="outlined" 
                        sx={{ mr: 1 }} 
                      />
                      <Chip 
                        icon={<CallReceivedIcon />} 
                        label="Recebidas" 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {transactionsLoading ? (
                    <Box display="flex" justifyContent="center" my={4}>
                      <CircularProgress />
                    </Box>
                  ) : transactions.length === 0 ? (
                    <Typography align="center" my={4}>
                      Não há transações associadas a esta conta
                    </Typography>
                  ) : (
                    <TransactionList 
                      transactions={transactions}
                      highlightAddress={address}
                      showPagination
                    />
                  )}
                </Paper>
              </TabPanel>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
};

export default AccountDetailsPage; 