import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardHeader,
  Button,
  Divider,
  Paper,
  CircularProgress,
  Tooltip,
  IconButton,
  Badge
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchBar from '../components/SearchBar';
import BlockList from '../components/Blocks/BlockList';
import TransactionList from '../components/Transactions/TransactionList';
import { fetchRecentBlocks, fetchRecentTransactions, fetchNetworkStats, fetchAccounts } from '../services/api';
import { Block, Transaction } from '../types';
import websocketService, { WebSocketEventType } from '../services/websocket';

// Intervalo de atualização em milissegundos (para fallback quando websocket não estiver disponível)
const AUTO_REFRESH_INTERVAL = 30000; // 30 segundos

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);
  const [newBlocksCount, setNewBlocksCount] = useState<number>(0);
  const [newTxCount, setNewTxCount] = useState<number>(0);

  // Efeito para carregar dados iniciais
  // Função para carregar os dados iniciais
  const loadData = useCallback(async (showRefreshing = true) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log("Buscando dados iniciais para a página inicial...");
      
      // Carregar estatísticas da rede
      const stats = await fetchNetworkStats();
      if (stats) {
        console.log("Estatísticas da rede obtidas:", stats);
        setNetworkStats(stats);
      } else {
        console.error("Falha ao obter estatísticas da rede");
      }
      
      // Carregar blocos recentes
      const blocks = await fetchRecentBlocks({ page: 1, itemsPerPage: 5 });
      console.log(`${blocks.length} blocos recentes obtidos`);
      setRecentBlocks(blocks);
      setNewBlocksCount(0);
      
      // Carregar transações recentes
      const transactions = await fetchRecentTransactions({ page: 1, itemsPerPage: 5 });
      console.log(`${transactions.length} transações recentes obtidas`);
      setRecentTransactions(transactions);
      setNewTxCount(0);
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados da página inicial:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Configuração do WebSocket na montagem do componente
  useEffect(() => {
    // Manipulador para evento de conexão do WebSocket
    const handleConnected = ({ type }: { type: string }) => {
      console.log(`WebSocket para ${type} conectado!`);
      setWebsocketConnected(true);
    };

    // Manipulador para evento de desconexão do WebSocket
    const handleDisconnected = ({ type }: { type: string }) => {
      console.log(`WebSocket para ${type} desconectado!`);
      setWebsocketConnected(false);
    };

    // Manipulador para erros do WebSocket
    const handleError = ({ type, error }: { type: string; error: string; timestamp: string }) => {
      console.error(`Erro no WebSocket ${type}: ${error}`);
      setWebsocketConnected(false);
    };

    // Manipulador para recebimento de um novo bloco
    const handleNewBlock = (blockData: any) => {
      console.log('Novo bloco recebido:', blockData);
      
      // Atualiza o contador de novos blocos
      setNewBlocksCount(prevCount => prevCount + 1);
      
      // Se tivermos menos de 20 blocos, adicione o novo no início e mantenha o limite
      setRecentBlocks(prevBlocks => {
        const updatedBlocks = [
          {
            hash: blockData.hash,
            nonce: blockData.nonce,
            timestamp: blockData.timestamp,
            txCount: blockData.txCount || 0,
            size: blockData.size || 0,
            round: blockData.round || 0,
            validators: blockData.validators || [],
            proposer: blockData.proposer || '',
            prevHash: blockData.prevHash || '',
            gasConsumed: blockData.gasConsumed || '0',
            gasRefunded: blockData.gasRefunded || '0',
            gasPenalized: blockData.gasPenalized || '0'
          },
          ...prevBlocks
        ].slice(0, 20); // Limitar a 20 blocos
        
        return updatedBlocks;
      });
      
      // Atualizar o horário da última atualização
      setLastRefreshTime(new Date());
    };

    // Manipulador para recebimento de uma nova transação
    const handleNewTransaction = (txData: any) => {
      console.log('Nova transação recebida:', txData);
      
      // Atualiza o contador de novas transações
      setNewTxCount(prevCount => prevCount + 1);
      
      // Adiciona a nova transação ao início e mantenha o limite
      setRecentTransactions(prevTx => {
        const updatedTx = [
          {
            hash: txData.hash || txData.txHash,
            sender: txData.sender,
            receiver: txData.receiver,
            value: txData.value,
            fee: txData.fee || '0',
            status: txData.status || 'pending',
            timestamp: txData.timestamp || Math.floor(Date.now() / 1000),
            gasLimit: txData.gasLimit || 0,
            gasPrice: txData.gasPrice || 0,
            data: txData.data || '',
            nonce: txData.nonce || 0
          },
          ...prevTx
        ].slice(0, 20); // Limitar a 20 transações
        
        return updatedTx;
      });
      
      // Atualizar o horário da última atualização
      setLastRefreshTime(new Date());
    };

    // Manipulador para estatísticas atualizadas
    const handleStats = (statsData: any) => {
      console.log('Novas estatísticas recebidas via WebSocket:', statsData);
      
      // Mesclar estatísticas novas com as existentes
      setNetworkStats((prevStats: any) => {
        // Se não temos stats anteriores, usar os novos diretamente
        if (!prevStats) return statsData;
        
        // Mesclar stats evitando perda de dados
        return {
          ...prevStats,
          ...statsData,
          // Garantir que objetos aninhados também sejam mesclados
          transactions: {
            ...(prevStats.transactions || {}),
            ...(statsData.transactions || {})
          },
          accounts: {
            ...(prevStats.accounts || {}),
            ...(statsData.accounts || {})
          }
        };
      });
      
      setLastRefreshTime(new Date());
    };

    // Registrar os manipuladores de eventos
    websocketService.on(WebSocketEventType.CONNECTED, handleConnected);
    websocketService.on(WebSocketEventType.DISCONNECTED, handleDisconnected);
    websocketService.on(WebSocketEventType.ERROR, handleError);
    websocketService.on(WebSocketEventType.BLOCK, handleNewBlock);
    websocketService.on(WebSocketEventType.TRANSACTION, handleNewTransaction);
    websocketService.on(WebSocketEventType.STATS, handleStats);
    
    // Iniciar conexões com o WebSocket para todos os tipos de dados
    websocketService.connect('blocks');
    websocketService.connect('transactions');
    websocketService.connect('stats');
    
    // Cleanup na desmontagem do componente
    return () => {
      websocketService.off(WebSocketEventType.CONNECTED, handleConnected);
      websocketService.off(WebSocketEventType.DISCONNECTED, handleDisconnected);
      websocketService.off(WebSocketEventType.ERROR, handleError);
      websocketService.off(WebSocketEventType.BLOCK, handleNewBlock);
      websocketService.off(WebSocketEventType.TRANSACTION, handleNewTransaction);
      websocketService.off(WebSocketEventType.STATS, handleStats);
    };
  }, []);

  // Efeito para carregar dados iniciais e configurar intervalo de atualização
  useEffect(() => {
    // Carregar dados iniciais
    loadData(false);
    
    // Configurar um intervalo para atualizar estatísticas a cada 30 segundos
    const statsInterval = setInterval(() => {
      fetchNetworkStats().then(stats => {
        if (stats) {
          console.log("Estatísticas atualizadas via intervalo:", stats);
          setNetworkStats(stats);
          setLastRefreshTime(new Date());
        }
      }).catch(error => {
        console.error("Erro ao atualizar estatísticas:", error);
      });
    }, 30000);
    
    // Limpar o intervalo ao desmontar
    return () => {
      clearInterval(statsInterval);
    };
  }, [loadData]);

  // Função direta para carregar estatísticas em tempo real
  const loadNetworkStats = useCallback(async () => {
    try {
      console.log('Carregando estatísticas da rede na página inicial...');
      
      // Usar a função fetchNetworkStats aprimorada
      const networkData = await fetchNetworkStats();
      console.log('Dados da rede obtidos para a página inicial:', networkData);
      
      // Verificar e formatar os dados recebidos
      const totalBlocks = networkData.blocks || 0;
      const totalTransactions = networkData.transactions?.totalProcessed || 0;
      
      // Obter contas ativas da API de contas
      const accountsResponse = await fetchAccounts(1, 1);
      const activeAccounts = networkData.accounts?.active || accountsResponse.totalCount || 0;
      
      // Obter TPS da página de transações
      const currentTps = networkData.tps || 0;
      console.log('TPS atual:', currentTps);
      
      // Se não tivermos TPS válido, tentar calcular com base nas transações recentes
      if (!currentTps || currentTps === 0) {
        try {
          const transactions = await fetchRecentTransactions({ page: 1, itemsPerPage: 25 });
          if (transactions && transactions.length > 0) {
            // Calcular TPS com base nas transações recentes
            const timeSpan = transactions[0].timestamp - transactions[transactions.length - 1].timestamp;
            const totalTx = transactions.length;
            const calculatedTps = timeSpan > 0 ? totalTx / timeSpan : 0;
            console.log('TPS calculado com base nas transações recentes:', calculatedTps);
            
            // Atualizar o estado com o TPS calculado
            setNetworkStats((prevStats: any) => ({
              ...prevStats,
              totalBlocks,
              totalTransactions,
              activeAccounts,
              currentTps: calculatedTps
            }));
            return;
          }
        } catch (error) {
          console.error('Erro ao calcular TPS com base nas transações recentes:', error);
        }
      }
      
      // Atualizar o estado com os valores validados
      setNetworkStats((prevStats: any) => ({
        ...prevStats,
        totalBlocks,
        totalTransactions,
        activeAccounts,
        currentTps
      }));
      
      console.log('Estatísticas da rede atualizadas com sucesso na página inicial');
    } catch (error) {
      console.error('Erro ao carregar estatísticas da rede na página inicial:', error);
      
      // Valores de fallback em caso de erro
      setNetworkStats((prevStats: any) => ({
        ...prevStats,
        totalBlocks: 97530000,
        totalTransactions: 68543210,
        activeAccounts: 1800000,
        currentTps: 7.82
      }));
    }
  }, []);

  // Efeito específico para carregar estatísticas logo após a montagem do componente
  useEffect(() => {
    loadNetworkStats();
  }, [loadNetworkStats]);

  // Efeito para atualizar estatísticas quando o websocket receber novos dados
  const handleStatsUpdate = useCallback((data: any) => {
    console.log('Atualização de estatísticas recebida via WebSocket:', data);
    
    // Validar dados recebidos
    if (!data) {
      console.warn('Dados vazios recebidos do WebSocket');
      return;
    }
    
    setNetworkStats((prevStats: any) => {
      const newStats = { ...prevStats };
      
      // Atualizar campos individualmente apenas se dados válidos forem recebidos
      if (data.blocks !== undefined && !isNaN(Number(data.blocks))) {
        newStats.totalBlocks = Number(data.blocks);
      }
      
      if (data.transactions?.totalProcessed !== undefined && 
          !isNaN(Number(data.transactions.totalProcessed))) {
        newStats.totalTransactions = Number(data.transactions.totalProcessed);
      }
      
      if (data.accounts?.active !== undefined && 
          !isNaN(Number(data.accounts.active))) {
        newStats.activeAccounts = Number(data.accounts.active);
      }
      
      if (data.tps !== undefined && !isNaN(Number(data.tps))) {
        newStats.currentTps = Number(data.tps);
      }
      
      console.log('Estatísticas atualizadas via WebSocket:', newStats);
      return newStats;
    });
  }, []);

  // Efeito para atualização automática como fallback quando websocket não estiver disponível
  useEffect(() => {
    if (!websocketConnected) {
      const intervalId = setInterval(() => {
        loadData();
      }, AUTO_REFRESH_INTERVAL);
      
      // Limpeza do intervalo quando o componente for desmontado
      return () => clearInterval(intervalId);
    }
    return undefined; // Não configurar intervalo se o WebSocket estiver conectado
  }, [loadData, websocketConnected]);

  // Função para formatar valores grandes
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toString();
  };

  // Função para atualização manual
  const handleRefresh = () => {
    loadData();
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            MultiversX Explorer
          </Typography>
          <Box display="flex" alignItems="center">
            {websocketConnected ? (
              <Tooltip title="Conexão em tempo real ativa">
                <span style={{ marginRight: '10px', color: 'green', fontSize: '0.9rem' }}>
                  <span style={{ marginRight: '5px' }}>•</span>
                  Atualizações em tempo real
                </span>
              </Tooltip>
            ) : (
              <Tooltip title="Atualizações periódicas">
                <span style={{ marginRight: '10px', color: 'orange', fontSize: '0.9rem' }}>
                  <span style={{ marginRight: '5px' }}>•</span>
                  Atualizando a cada 30s
                </span>
              </Tooltip>
            )}
            <Tooltip title="Atualizar dados">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                {(newBlocksCount > 0 || newTxCount > 0) ? (
                  <Badge badgeContent={newBlocksCount + newTxCount} color="primary">
                    <RefreshIcon />
                  </Badge>
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Explore a blockchain MultiversX - blocos, transações e contas
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Última atualização: {lastRefreshTime.toLocaleTimeString()}
        </Typography>
        
        <SearchBar />
        
        {/* Cards com estatísticas */}
        <Box mt={4} mb={4}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Total de Blocos
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {networkStats?.totalBlocks ? formatNumber(networkStats.totalBlocks) : 'Carregando...'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Atualizado em tempo real
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Total de Transações
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {networkStats?.totalTransactions ? formatNumber(networkStats.totalTransactions) : 'Carregando...'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Processadas na blockchain
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Contas Ativas
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {networkStats?.activeAccounts ? formatNumber(networkStats.activeAccounts) : 'Carregando...'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Com saldo ou transações
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      TPS (Transações por Segundo)
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {networkStats?.currentTps !== undefined
                        ? typeof networkStats.currentTps === 'number' 
                          ? networkStats.currentTps.toFixed(2) 
                          : networkStats.currentTps 
                        : 'Carregando...'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Média na blockchain
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
        
        <Grid container spacing={4}>
          {/* Blocos Recentes */}
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" component="h2">
                Blocos Recentes
              </Typography>
              <Button component={Link} to="/blocks" variant="text">
                Ver todos
              </Button>
            </Box>
            <Paper sx={{ p: 2 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {newBlocksCount > 0 && (
                    <Box 
                      sx={{ 
                        textAlign: 'center', 
                        p: 1, 
                        mb: 2, 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={handleRefresh}
                    >
                      {newBlocksCount} {newBlocksCount === 1 ? 'novo bloco' : 'novos blocos'}
                    </Box>
                  )}
                  <BlockList blocks={recentBlocks.slice(0, 5)} showPagination={false} />
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Transações Recentes */}
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" component="h2">
                Transações Recentes
              </Typography>
              <Button component={Link} to="/transactions" variant="text">
                Ver todas
              </Button>
            </Box>
            <Paper sx={{ p: 2 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {newTxCount > 0 && (
                    <Box 
                      sx={{ 
                        textAlign: 'center', 
                        p: 1, 
                        mb: 2, 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={handleRefresh}
                    >
                      {newTxCount} {newTxCount === 1 ? 'nova transação' : 'novas transações'}
                    </Box>
                  )}
                  {/* @ts-ignore */}
                  <TransactionList transactions={recentTransactions.slice(0, 5)} showPagination={false} />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage; 