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
  Link,
  useTheme,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLocation } from 'react-router-dom';
import BlockList from '../components/Blocks/BlockList';
import SearchBar from '../components/SearchBar';
import { fetchRecentBlocks, fetchNetworkStats } from '../services/api';
import websocketService, { WebSocketEventType } from '../services/websocket';
import config from '../config';

// Função auxiliar para obter parâmetros da URL
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

// Intervalo de atualização em milissegundos (para fallback quando websocket não estiver disponível)
const AUTO_REFRESH_INTERVAL = 30000; // 30 segundos

const BlocksPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [blockStats, setBlockStats] = useState({
    lastBlock: 0,
    totalBlocks: 0,
    avgBlockTime: 0,
    avgTxPerBlock: 0
  });
  const [recentBlocks, setRecentBlocks] = useState<any[]>([]);
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);
  const [newBlocksCount, setNewBlocksCount] = useState<number>(0);
  const query = useQuery();
  const blockHeight = query.get('height');

  // Função para carregar os dados iniciais
  const loadStats = useCallback(async (showRefreshing = true) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Se temos uma altura de bloco específica, podemos processar isso
      if (blockHeight) {
        console.log(`Buscando informações para o bloco de altura: ${blockHeight}`);
      }
      
      // Carregar estatísticas da rede MultiversX
      const networkStats = await fetchNetworkStats();
      console.log('Estatísticas da rede recebidas:', networkStats);
      
      // Carregar blocos recentes para análise
      const blocks = await fetchRecentBlocks({ page: 1, itemsPerPage: 25 });
      console.log(`${blocks.length} blocos recentes obtidos`);
      setRecentBlocks(blocks);
      setNewBlocksCount(0); // Resetar contador de novos blocos
      
      if (networkStats && blocks.length > 0) {
        // Usar a API para o total de blocos
        const totalBlocks = networkStats.blocks || networkStats.blocksTotal || 0;
        console.log('Total de blocos:', totalBlocks);
        
        // Calcular o tempo médio entre blocos com base nos blocos recentes
        let totalTime = 0;
        for (let i = 1; i < blocks.length; i++) {
          totalTime += blocks[i - 1].timestamp - blocks[i].timestamp;
        }
        const avgBlockTime = blocks.length > 1 ? totalTime / (blocks.length - 1) : 0;
        console.log('Tempo médio entre blocos:', avgBlockTime);
        
        // Calcular a média de transações por bloco
        const totalTx = blocks.reduce((sum, block) => sum + block.txCount, 0);
        const avgTxPerBlock = blocks.length > 0 ? totalTx / blocks.length : 0;
        console.log('Média de transações por bloco:', avgTxPerBlock);
        
        setBlockStats({
          lastBlock: blocks[0]?.nonce || 0,
          totalBlocks,
          avgBlockTime,
          avgTxPerBlock
        });
      } else {
        console.warn('Não foi possível obter estatísticas ou blocos');
        // Usar valores de fallback
        setBlockStats({
          lastBlock: blocks[0]?.nonce || 0,
          totalBlocks: 0,
          avgBlockTime: 0,
          avgTxPerBlock: 0
        });
      }
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Usar valores de fallback em caso de erro
      setBlockStats({
        lastBlock: 0,
        totalBlocks: 0,
        avgBlockTime: 0,
        avgTxPerBlock: 0
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [blockHeight]);

  // Configura o WebSocket na montagem do componente
  useEffect(() => {
    // Manipulador para evento de conexão do WebSocket
    const handleConnected = ({ type }: { type: string }) => {
      if (type === 'blocks') {
        console.log('WebSocket para blocos conectado!');
        setWebsocketConnected(true);
      }
    };

    // Manipulador para evento de desconexão do WebSocket
    const handleDisconnected = ({ type }: { type: string }) => {
      if (type === 'blocks') {
        console.log('WebSocket para blocos desconectado!');
        setWebsocketConnected(false);
      }
    };

    // Manipulador para erros do WebSocket
    const handleError = ({ type, error }: { type: string; error: string; timestamp: string }) => {
      if (type === 'blocks') {
        console.error(`Erro no WebSocket de blocos: ${error}`);
        setWebsocketConnected(false);
      }
    };

    // Manipulador para recebimento de um novo bloco
    const handleNewBlock = (blockData: any) => {
      console.log('Novo bloco recebido via WebSocket:', blockData);
      
      // Atualiza o contador de novos blocos
      setNewBlocksCount(prevCount => prevCount + 1);
      
      // Atualiza as estatísticas apenas com este novo bloco
      setBlockStats(prevStats => ({
        ...prevStats,
        lastBlock: blockData.nonce,
        totalBlocks: prevStats.totalBlocks + 1
      }));
      
      // Atualizar o horário da última atualização
      setLastRefreshTime(new Date());
    };

    // Manipulador para estatísticas atualizadas
    const handleStats = (statsData: any) => {
      console.log('Novas estatísticas recebidas via WebSocket:', statsData);
      
      // Atualize as estatísticas relevantes aos blocos
      if (statsData.blocks !== undefined) {
        console.log('Atualizando total de blocos:', statsData.blocks);
        setBlockStats(prevStats => ({
          ...prevStats,
          totalBlocks: statsData.blocks
        }));
      }
      
      // Atualizar o horário da última atualização
      setLastRefreshTime(new Date());
    };

    // Registrar os manipuladores de eventos
    websocketService.on(WebSocketEventType.CONNECTED, handleConnected);
    websocketService.on(WebSocketEventType.DISCONNECTED, handleDisconnected);
    websocketService.on(WebSocketEventType.ERROR, handleError);
    websocketService.on(WebSocketEventType.BLOCK, handleNewBlock);
    websocketService.on(WebSocketEventType.STATS, handleStats);
    
    // Iniciar conexão com o WebSocket
    websocketService.connect('blocks');

    // Limpeza na desmontagem do componente
    return () => {
      // Remover listeners de eventos
      websocketService.off(WebSocketEventType.BLOCK, handleNewBlock);
      websocketService.off(WebSocketEventType.STATS, handleStats);
      
      // Não desconectar o WebSocket aqui, pois outras páginas podem estar usando
      // Em vez disso, gerenciar a conexão no nível do App
    };
  }, []);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    loadStats(false);
  }, [loadStats]);

  // Efeito para atualização automática como fallback quando websocket não estiver disponível
  useEffect(() => {
    if (!websocketConnected) {
      const intervalId = setInterval(() => {
        // Buscar dados atualizados a cada intervalo
        console.log('Atualizando dados de blocos...');
        
        // Buscar blocos recentes para garantir hashes atualizados
        fetchRecentBlocks({ page: 1, itemsPerPage: 25 })
          .then(blocks => {
            if (blocks && blocks.length > 0) {
              console.log('Blocos atualizados em tempo real:', blocks);
              setRecentBlocks(blocks);
              
              // Atualizar estatísticas com base no bloco mais recente
              setBlockStats(prevStats => ({
                ...prevStats,
                lastBlock: blocks[0]?.nonce || prevStats.lastBlock
              }));
              
              // Resetar contador de novos blocos após atualização
              setNewBlocksCount(0);
              setLastRefreshTime(new Date());
            }
          })
          .catch(err => console.error('Erro ao atualizar blocos recentes:', err));
      }, AUTO_REFRESH_INTERVAL);
      
      // Limpeza do intervalo quando o componente for desmontado
      return () => clearInterval(intervalId);
    }
    return undefined; // Não configurar intervalo se o WebSocket estiver conectado
  }, [loadStats, websocketConnected]);

  // Função para formatar o tempo em segundos
  const formatSeconds = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  // Função para atualização manual
  const handleRefresh = () => {
    loadStats();
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Blocos na MultiversX
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
                  Atualizando a cada 30s
                </span>
              </Tooltip>
            )}
            <Tooltip title="Atualizar dados">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                {newBlocksCount > 0 ? (
                  <Badge badgeContent={newBlocksCount} color="primary">
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
          Explore os blocos da blockchain MultiversX
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
                      Último Bloco
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {blockStats.lastBlock.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      <Link 
                        href={`${config.explorer.url}/blocks/${blockStats.lastBlock}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        Ver no explorer oficial
                      </Link>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Total de Blocos
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {blockStats.totalBlocks.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Tempo Médio de Bloco
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {formatSeconds(blockStats.avgBlockTime)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                      Média de Transações por Bloco
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {blockStats.avgTxPerBlock.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={5} mb={2}>
          <Typography variant="h5" component="h2">
            Blocos Recentes
          </Typography>
          {newBlocksCount > 0 && (
            <Tooltip title="Carregar novos blocos">
              <Box sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={handleRefresh}>
                {newBlocksCount} novos blocos
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
            <BlockList blocks={recentBlocks} showPagination={false} />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BlocksPage;