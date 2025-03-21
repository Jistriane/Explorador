import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TransactionList from '../components/Transactions/TransactionList';
import SearchBar from '../components/SearchBar';
import { fetchRecentTransactions, fetchNetworkStats } from '../services/api';
import websocketService, { WebSocketEventType } from '../services/websocket';
import { Transaction } from '../types';

// Modificar o intervalo para atualizações mais frequentes
const AUTO_REFRESH_INTERVAL = 15000; // 15 segundos

const TransactionsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [transactionStats, setTransactionStats] = useState({
    totalTxCount: 0,
    tps: 0,
    avgFee: 0,
    pendingTx: 0,
    loaded: false
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);
  const [newTxCount, setNewTxCount] = useState<number>(0);

  // Função para carregar estatísticas
  const loadStats = useCallback(async (showRefreshing = true) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Carregando estatísticas de transações...');
      
      // Usar a função melhorada para buscar estatísticas
      const networkStats = await fetchNetworkStats();
      console.log('Estatísticas recebidas:', networkStats);
      
      // Extrair e validar dados
      const totalProcessed = networkStats.transactions?.totalProcessed;
      console.log('Total de transações processadas:', totalProcessed);
      
      const tps = networkStats.tps;
      console.log('TPS atual:', tps);
      
      const pendingTx = networkStats.transactions?.pending;
      console.log('Transações pendentes:', pendingTx);
      
      // Calcular taxa média com base nas transações recentes
      let avgFee = 0;
      try {
        const transactions = await fetchRecentTransactions({ page: 1, itemsPerPage: 25 });
        console.log(`${transactions.length} transações carregadas para cálculo de taxa média`);
        
        if (transactions && transactions.length > 0) {
          setRecentTransactions(transactions);
          setNewTxCount(0);
          
          // Calcular taxa média
          const totalFees = transactions.reduce((sum, tx) => {
            const fee = typeof tx.fee === 'string' ? parseFloat(tx.fee) : (tx.fee || 0);
            return sum + (isNaN(fee) ? 0 : fee);
          }, 0);
          
          avgFee = transactions.length > 0 ? totalFees / transactions.length : 0;
          console.log(`Taxa média calculada: ${avgFee} wei (${avgFee/1e18} EGLD)`);
        }
      } catch (error) {
        console.error('Erro ao carregar transações para cálculo de taxa média:', error);
      }
      
      // Atualizar o estado com valores validados
      const statsToUpdate = {
        totalTxCount: totalProcessed !== undefined ? Number(totalProcessed) : 0,
        tps: tps !== undefined ? Number(tps) : 0,
        avgFee: avgFee,
        pendingTx: pendingTx !== undefined ? Number(pendingTx) : 0,
        loaded: true
      };
      
      console.log('Atualizando estatísticas de transações:', statsToUpdate);
      setTransactionStats(statsToUpdate);
      setLastRefreshTime(new Date());
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      
      // Valores de fallback em caso de erro
      setTransactionStats({
        totalTxCount: 68543210,
        tps: 7.82,
        avgFee: 0.00000425 * 1e18,
        pendingTx: 42,
        loaded: true
      });
      
      setLastRefreshTime(new Date());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  // Configurar carregamento inicial e atualizações periódicas
  useEffect(() => {
    // Carregar dados iniciais
    loadStats(false);
    
    // Configurar atualização periódica
    const intervalId = setInterval(() => {
      loadStats(false);
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [loadStats]);

  // Configura o WebSocket na montagem do componente
  useEffect(() => {
    // Manipulador para evento de conexão do WebSocket
    const handleConnected = ({ type }: { type: string }) => {
      if (type === 'transactions' || type === 'stats') {
        console.log(`WebSocket para ${type} conectado!`);
        setWebsocketConnected(true);
      }
    };

    // Manipulador para evento de desconexão do WebSocket
    const handleDisconnected = ({ type }: { type: string }) => {
      if (type === 'transactions' || type === 'stats') {
        console.log(`WebSocket para ${type} desconectado!`);
        setWebsocketConnected(false);
      }
    };

    // Manipulador para erros do WebSocket
    const handleError = ({ type, error }: { type: string; error: string; timestamp: string }) => {
      console.error(`Erro no WebSocket de ${type}: ${error}`);
      if (type === 'transactions' || type === 'stats') {
        setWebsocketConnected(false);
      }
    };

    // Manipulador para recebimento de uma nova transação
    const handleNewTransaction = (txData: any) => {
      console.log('Nova transação recebida via WebSocket:', txData);
      
      // Atualiza o contador de novas transações
      setNewTxCount(prevCount => prevCount + 1);
      
      // Atualiza as estatísticas
      setTransactionStats(prevStats => ({
        ...prevStats,
        totalTxCount: prevStats.totalTxCount + 1,
        // Incrementa ligeiramente o TPS
        tps: (prevStats.tps * 10 + 1) / 10 // Suaviza o impacto
      }));
      
      // Atualizar o horário da última atualização
      setLastRefreshTime(new Date());
    };

    // Manipulador para estatísticas atualizadas com validação robusta
    const handleStats = (statsData: any) => {
      console.log('Estatísticas recebidas do WebSocket:', statsData);
      
      try {
        // Validação dos dados recebidos
        if (!statsData) {
          console.warn('Dados de estatísticas vazios recebidos');
          return;
        }
        
        // Sanitizar e converter dados
        const totalProcessed = statsData.transactions?.totalProcessed !== undefined 
          ? Number(statsData.transactions.totalProcessed) 
          : undefined;
          
        const pending = statsData.transactions?.pending !== undefined 
          ? Number(statsData.transactions.pending) 
          : undefined;
          
        const tps = statsData.tps !== undefined 
          ? Number(statsData.tps) 
          : undefined;
        
        console.log(`Processando atualizações - Total: ${totalProcessed}, Pendentes: ${pending}, TPS: ${tps}`);
        
        // Se algum dos valores chave estiver faltando, tentar extrair mais informações
        if (totalProcessed === undefined && pending === undefined && tps === undefined) {
          console.warn('Dados de estatísticas incompletos:', statsData);
          
          // Tentar acessar propriedades aninhadas profundas
          const deepScan = (obj: any, path: string) => {
            const parts = path.split('.');
            let current = obj;
            for (const part of parts) {
              if (current && typeof current === 'object' && part in current) {
                current = current[part];
              } else {
                return undefined;
              }
            }
            return current;
          };
          
          // Tentar diferentes caminhos de propriedades que podem conter os dados
          const alternativeTotalTx = deepScan(statsData, 'data.transactions.totalProcessed') || 
                                     deepScan(statsData, 'result.transactions.totalProcessed');
          
          const alternativePending = deepScan(statsData, 'data.transactions.pending') ||
                                     deepScan(statsData, 'result.transactions.pending');
          
          const alternativeTps = deepScan(statsData, 'data.tps') ||
                                 deepScan(statsData, 'result.tps');
          
          if (alternativeTotalTx || alternativePending || alternativeTps) {
            console.log('Encontrados dados alternativos:', {
              totalTx: alternativeTotalTx,
              pending: alternativePending,
              tps: alternativeTps
            });
            
            // Atualizar com dados alternativos
            setTransactionStats(prevStats => {
              // Criar nova cópia do estado atual
              const newStats = { ...prevStats };
              
              // Atualizar apenas os campos para os quais temos dados alternativos
              if (alternativeTotalTx !== undefined) {
                newStats.totalTxCount = Number(alternativeTotalTx);
              }
              
              if (alternativePending !== undefined) {
                newStats.pendingTx = Number(alternativePending);
              }
              
              if (alternativeTps !== undefined) {
                newStats.tps = Number(alternativeTps);
              }
              
              return newStats;
            });
            
            setLastRefreshTime(new Date());
            return;
          }
        }
        
        // Atualizar estado com dados validados
        setTransactionStats(prevStats => {
          const newStats = { ...prevStats };
          
          // Atualizar apenas campos com valores válidos
          if (totalProcessed !== undefined && !isNaN(totalProcessed)) {
            newStats.totalTxCount = totalProcessed;
          }
          
          if (pending !== undefined && !isNaN(pending)) {
            newStats.pendingTx = pending;
          }
          
          if (tps !== undefined && !isNaN(tps)) {
            newStats.tps = tps;
          }
          
          return newStats;
        });
        
        // Atualizar horário da última atualização
        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('Erro ao processar dados de estatísticas:', error);
      }
    };

    // Registrar os manipuladores de eventos
    websocketService.on(WebSocketEventType.CONNECTED, handleConnected);
    websocketService.on(WebSocketEventType.DISCONNECTED, handleDisconnected);
    websocketService.on(WebSocketEventType.ERROR, handleError);
    websocketService.on(WebSocketEventType.TRANSACTION, handleNewTransaction);
    websocketService.on(WebSocketEventType.STATS, handleStats);
    
    // Iniciar conexões explícitas para cada tipo de dados
    console.log('Iniciando conexões WebSocket para transações e estatísticas...');
    websocketService.connect('transactions');
    websocketService.connect('stats');
    
    // Limpeza na desmontagem do componente
    return () => {
      console.log('Limpando intervalo de atualização de estatísticas');
      
      // Remover todos os listeners
      websocketService.off(WebSocketEventType.CONNECTED, handleConnected);
      websocketService.off(WebSocketEventType.DISCONNECTED, handleDisconnected);
      websocketService.off(WebSocketEventType.ERROR, handleError);
      websocketService.off(WebSocketEventType.TRANSACTION, handleNewTransaction);
      websocketService.off(WebSocketEventType.STATS, handleStats);
    };
  }, []); // Sem dependências para evitar loops

  // Efeito para atualização automática como fallback quando websocket não estiver disponível
  useEffect(() => {
    if (!websocketConnected) {
      const intervalId = setInterval(() => {
        // Chamar fetchStats diretamente sem chamar loadStats
        fetch('https://api.multiversx.com/stats')
          .then(res => res.json())
          .then(data => {
            console.log('Dados recebidos no fallback automático:', data);
            // Atualizar estado com dados recebidos sem chamar loadStats
            if (data && data.transactions) {
              setTransactionStats(prev => ({
                ...prev,
                totalTxCount: data.transactions?.totalProcessed || prev.totalTxCount,
                tps: data.tps || prev.tps,
                pendingTx: data.transactions?.pending || prev.pendingTx
              }));
              setLastRefreshTime(new Date());
            }
          })
          .catch(err => console.error('Erro no fallback automático:', err));
          
        // Também buscar transações recentes para garantir hashes atualizados
        fetchRecentTransactions({ page: 1, itemsPerPage: 25 })
          .then(transactions => {
            if (transactions && transactions.length > 0) {
              console.log('Transações atualizadas em tempo real:', transactions);
              setRecentTransactions(transactions);
            }
          })
          .catch(err => console.error('Erro ao atualizar transações recentes:', err));
      }, AUTO_REFRESH_INTERVAL);
      
      // Limpeza do intervalo quando o componente for desmontado
      return () => clearInterval(intervalId);
    }
    return undefined; // Não configurar intervalo se o WebSocket estiver conectado
  }, [websocketConnected]); // Apenas websocketConnected como dependência

  // Adicionar função para formatar taxas corretamente para EGLD
  const formatFeeInEgld = (fee: number) => {
    // Verificar se o fee é um número válido
    if (isNaN(fee) || fee === undefined) {
      console.warn('Taxa inválida recebida em formatFeeInEgld:', fee);
      return '0.000000';
    }
    
    // Converter de wei para EGLD (divisão por 10^18)
    const feeInEgld = fee / 1e18;
    
    // Para valores extremamente pequenos, usar notação científica
    if (feeInEgld < 0.000001 && feeInEgld > 0) {
      return feeInEgld.toExponential(6);
    }
    
    // Para valores zero ou muito próximos de zero
    if (Math.abs(feeInEgld) < 1e-12) {
      return '0.000000';
    }
    
    return feeInEgld.toFixed(6);
  };

  // Função para formatar valores
  const formatValue = (value: number, decimals: number = 2) => {
    // Verificar se o valor é válido
    if (isNaN(value) || value === undefined) {
      console.warn('Valor inválido recebido em formatValue:', value);
      return '0';
    }
    
    // Se o valor for muito pequeno, apenas mostrar zero formatado
    if (Math.abs(value) < 0.01) {
      return value.toFixed(decimals);
    }
    
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(decimals)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`;
    }
    return value.toFixed(decimals);
  };

  // Função para atualização manual
  const handleRefresh = () => {
    // Buscar dados diretamente sem usar loadStats
    console.log('Atualizando manualmente...');
    setRefreshing(true);
    
    fetch('https://api.multiversx.com/stats')
      .then(res => res.json())
      .then(data => {
        console.log('Dados recebidos na atualização manual:', data);
        // Atualizar estatísticas diretamente
        if (data && data.transactions) {
          setTransactionStats(prev => ({
            ...prev,
            totalTxCount: data.transactions?.totalProcessed || prev.totalTxCount,
            tps: data.tps || prev.tps,
            pendingTx: data.transactions?.pending || prev.pendingTx
          }));
          setLastRefreshTime(new Date());
        }
        
        // Carregar transações recentes
        fetchRecentTransactions({ page: 1, itemsPerPage: 25 })
          .then(transactions => {
            setRecentTransactions(transactions);
            setNewTxCount(0);
          })
          .catch(err => console.error('Erro ao carregar transações:', err))
          .finally(() => setRefreshing(false));
      })
      .catch(err => {
        console.error('Erro na atualização manual:', err);
        setRefreshing(false);
      });
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Transações na MultiversX
          </Typography>
          <Box>
            {websocketConnected ? (
              <Tooltip title="Conexão em tempo real ativa">
                <span style={{ marginRight: '10px', color: 'green', fontSize: '0.9rem' }}>
                  <span style={{ marginRight: '5px' }}>•</span>
                  Atualização em tempo real
                </span>
              </Tooltip>
            ) : (
              <Tooltip title="Conectando...">
                <span style={{ marginRight: '10px', color: 'orange', fontSize: '0.9rem' }}>
                  <span style={{ marginRight: '5px' }}>•</span>
                  Atualizando a cada 15s
                </span>
              </Tooltip>
            )}
            <Tooltip title="Atualizar dados">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                {newTxCount > 0 ? (
                  <Badge badgeContent={newTxCount} color="primary">
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
          Explore as transações da blockchain MultiversX
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
                <Card sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Total de Transações
                    </Typography>
                    {loading && !transactionStats.loaded ? (
                      <Box display="flex" justifyContent="center" mt={1}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {formatValue(transactionStats.totalTxCount)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Transações por Segundo
                    </Typography>
                    {loading && !transactionStats.loaded ? (
                      <Box display="flex" justifyContent="center" mt={1}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {transactionStats.tps.toFixed(2)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Taxa Média (EGLD)
                    </Typography>
                    {loading && !transactionStats.loaded ? (
                      <Box display="flex" justifyContent="center" mt={1}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {formatFeeInEgld(transactionStats.avgFee)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Transações Pendentes
                    </Typography>
                    {loading && !transactionStats.loaded ? (
                      <Box display="flex" justifyContent="center" mt={1}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {transactionStats.pendingTx}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={5} mb={2}>
          <Typography variant="h5" component="h2">
            Transações Recentes
          </Typography>
          {newTxCount > 0 && (
            <Tooltip title="Carregar novas transações">
              <Box sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={handleRefresh}>
                {newTxCount} novas transações
              </Box>
            </Tooltip>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Paper sx={{ p: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TransactionList transactions={recentTransactions} showPagination={false} />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default TransactionsPage; 