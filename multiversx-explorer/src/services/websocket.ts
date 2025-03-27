import { WebSocket, ErrorEvent } from 'ws';

// Tipos de eventos que serão emitidos pelo websocket
export enum WebSocketEventType {
  BLOCK = 'block',
  TRANSACTION = 'transaction',
  ACCOUNT = 'account',
  STATS = 'stats',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  STATS_UPDATE = 'stats_update'
}

// Tipos para as URLs do WebSocket
type WebSocketType = 'blocks' | 'transactions' | 'accounts' | 'stats';
type WebSocketEnvironment = 'mainnet' | 'testnet' | 'public';

// URLs de WebSocket para diferentes ambientes
const WEBSOCKET_URLS: Record<WebSocketEnvironment, Record<WebSocketType, string>> = {
  mainnet: {
    blocks: 'wss://gateway.multiversx.com/blocks',
    transactions: 'wss://gateway.multiversx.com/transactions',
    accounts: 'wss://gateway.multiversx.com/accounts',
    stats: 'wss://gateway.multiversx.com/stats',
  },
  testnet: {
    blocks: 'wss://testnet-gateway.multiversx.com/blocks',
    transactions: 'wss://testnet-gateway.multiversx.com/transactions',
    accounts: 'wss://testnet-gateway.multiversx.com/accounts',
    stats: 'wss://testnet-gateway.multiversx.com/stats',
  },
  public: {
    blocks: 'wss://api.multiversx.com/blocks',
    transactions: 'wss://api.multiversx.com/transactions',
    accounts: 'wss://api.multiversx.com/accounts',
    stats: 'wss://api.multiversx.com/stats',
  }
};

// Opção atual do ambiente (pode ser alterada através de configuração)
let currentEnv: WebSocketEnvironment = 'mainnet';

// Rastreadores de tentativas de reconexão para cada tipo
const reconnectAttempts: Record<WebSocketType, number> = {
  blocks: 0,
  transactions: 0,
  accounts: 0,
  stats: 0,
};

// Intervalo máximo de reconexão (5 minutos)
const MAX_RECONNECT_DELAY = 300000;

// Definir tipos para os intervalos de ping
type PingIntervals = Record<WebSocketType, NodeJS.Timeout | undefined>;

// Inicializar o objeto de intervalos de ping
const pingIntervals: PingIntervals = {
  blocks: undefined,
  transactions: undefined,
  accounts: undefined,
  stats: undefined
};

// Definir tipo para as conexões WebSocket
type WebSocketConnections = Record<WebSocketType, any | null>;

// Inicializar o objeto de conexões
const connections: WebSocketConnections = {
  blocks: null,
  transactions: null,
  accounts: null,
  stats: null
};

// Eventos registrados
const eventHandlers: Record<WebSocketEventType, Set<Function>> = {
  [WebSocketEventType.CONNECTED]: new Set(),
  [WebSocketEventType.DISCONNECTED]: new Set(),
  [WebSocketEventType.ERROR]: new Set(),
  [WebSocketEventType.BLOCK]: new Set(),
  [WebSocketEventType.TRANSACTION]: new Set(),
  [WebSocketEventType.ACCOUNT]: new Set(),
  [WebSocketEventType.STATS]: new Set(),
  [WebSocketEventType.STATS_UPDATE]: new Set(),
};

// Função para calcular o delay de reconexão exponencial
const getReconnectDelay = (attempts: number): number => {
  const baseDelay = 1000; // 1 segundo
  const maxDelay = MAX_RECONNECT_DELAY;
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  return delay + Math.random() * 1000; // Adicionar jitter
};

// Função para validar dados recebidos
const validateWebSocketData = (data: any, type: string): boolean => {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    switch (type) {
      case 'blocks':
        return parsed && typeof parsed.nonce === 'number' && typeof parsed.hash === 'string';
      case 'transactions':
        return parsed && typeof parsed.hash === 'string' && typeof parsed.sender === 'string';
      case 'accounts':
        return parsed && typeof parsed.address === 'string' && typeof parsed.balance === 'string';
      case 'stats':
        return parsed && typeof parsed === 'object' && 
               typeof parsed.transactions === 'object' &&
               typeof parsed.accounts === 'object';
      default:
        return true;
    }
  } catch (error) {
    console.error(`Erro ao validar dados do WebSocket ${type}:`, error);
    return false;
  }
};

// Função para processar mensagens recebidas
const processWebSocketMessage = (data: any, type: string) => {
  if (!validateWebSocketData(data, type)) {
    console.warn(`Dados inválidos recebidos do WebSocket ${type}:`, data);
    return;
  }

  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  
  switch (type) {
    case 'blocks':
      eventHandlers[WebSocketEventType.BLOCK].forEach(handler => handler(parsed));
      break;
    case 'transactions':
      eventHandlers[WebSocketEventType.TRANSACTION].forEach(handler => handler(parsed));
      break;
    case 'accounts':
      eventHandlers[WebSocketEventType.ACCOUNT].forEach(handler => handler(parsed));
      break;
    case 'stats':
      eventHandlers[WebSocketEventType.STATS].forEach(handler => handler(parsed));
      break;
  }
};

// Função para criar conexão WebSocket
const createWebSocket = (type: WebSocketType): WebSocket => {
  const url = WEBSOCKET_URLS[currentEnv][type];
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    console.log(`WebSocket ${type} conectado`);
    reconnectAttempts[type] = 0;
    eventHandlers[WebSocketEventType.CONNECTED].forEach(handler => 
      handler({ type, timestamp: new Date().toISOString() })
    );
    
    // Iniciar ping
    if (pingIntervals[type]) {
      clearInterval(pingIntervals[type]);
    }
    pingIntervals[type] = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping a cada 30 segundos
  };
  
  ws.onclose = () => {
    console.log(`WebSocket ${type} desconectado`);
    eventHandlers[WebSocketEventType.DISCONNECTED].forEach(handler => 
      handler({ type, timestamp: new Date().toISOString() })
    );
    
    // Limpar intervalo de ping
    if (pingIntervals[type]) {
      clearInterval(pingIntervals[type]);
      pingIntervals[type] = undefined;
    }
    
    // Tentar reconectar
    setTimeout(() => {
      if (!connections[type]) {
        console.log(`Tentando reconectar WebSocket ${type}...`);
        createWebSocket(type);
      }
    }, 5000);
  };
  
  ws.onerror = (event: ErrorEvent) => {
    console.error(`Erro no WebSocket ${type}:`, event);
    eventHandlers[WebSocketEventType.ERROR].forEach(handler => 
      handler({ type, error: 'Erro na conexão WebSocket', timestamp: new Date().toISOString() })
    );
  };
  
  ws.onmessage = (event) => {
    try {
      // Converter os dados recebidos para string antes de fazer o parse
      const dataString = event.data.toString();
      const data = JSON.parse(dataString);
      console.log(`Dados recebidos do WebSocket ${type}:`, data);

      // Processar diferentes tipos de mensagens
      switch (data.type) {
        case 'block':
          if (data.block) {
            console.log('Novo bloco recebido:', data.block);
            // Atualizar estatísticas com o novo bloco
            if (data.block.nonce) {
              const currentStats = {
                blocks: data.block.nonce,
                blocksTotal: data.block.nonce,
                timestamp: new Date().toISOString()
              };
              // Emitir evento de atualização
              eventHandlers[WebSocketEventType.STATS_UPDATE].forEach(handler => handler(currentStats));
            }
          }
          break;
        case 'transaction':
          if (data.transaction) {
            console.log('Nova transação recebida:', data.transaction);
            // Atualizar contador de transações
            const currentStats = {
              transactions: {
                totalProcessed: (data.transaction.nonce || 0) + 1,
                pending: data.transaction.pending || 0
              },
              timestamp: new Date().toISOString()
            };
            // Emitir evento de atualização
            eventHandlers[WebSocketEventType.STATS_UPDATE].forEach(handler => handler(currentStats));
          }
          break;
        case 'account':
          if (data.account) {
            console.log('Nova conta atualizada:', data.account);
            // Atualizar contador de contas ativas
            const currentStats = {
              accounts: {
                active: (data.account.active || 0) + 1,
                active24h: data.account.active24h || 0
              },
              timestamp: new Date().toISOString()
            };
            // Emitir evento de atualização
            eventHandlers[WebSocketEventType.STATS_UPDATE].forEach(handler => handler(currentStats));
          }
          break;
        case 'stats':
          if (data.stats) {
            console.log('Estatísticas atualizadas:', data.stats);
            // Garantir que temos os dados de transações e contas
            if (data.stats.transactions || data.stats.accounts) {
              const currentStats = {
                transactions: data.stats.transactions ? {
                  totalProcessed: Number(data.stats.transactions.totalProcessed) || 0,
                  pending: Number(data.stats.transactions.pending) || 0
                } : undefined,
                accounts: data.stats.accounts ? {
                  active: Number(data.stats.accounts.active) || 0,
                  active24h: Number(data.stats.accounts.active24h) || 0
                } : undefined,
                timestamp: new Date().toISOString()
              };
              // Emitir evento de atualização
              eventHandlers[WebSocketEventType.STATS_UPDATE].forEach(handler => handler(currentStats));
            }
          }
          break;
        case 'pong':
          console.log(`Pong recebido do WebSocket ${type}`);
          break;
      }
    } catch (error) {
      console.error(`Erro ao processar mensagem do WebSocket ${type}:`, error);
    }
  };
  
  return ws;
};

// Adicionar método disconnectAll
const disconnectAll = () => {
  console.log('Desconectando todas as conexões WebSocket...');
  
  // Desconectar cada tipo de conexão
  (Object.keys(connections) as WebSocketType[]).forEach((type) => {
    const connection = connections[type];
    if (connection && typeof connection.close === 'function') {
      console.log(`Desconectando WebSocket ${type}`);
      connection.close();
      connections[type] = null;
    }
    
    // Limpar intervalo de ping
    if (pingIntervals[type]) {
      clearInterval(pingIntervals[type]);
      pingIntervals[type] = undefined;
    }
  });
};

// Serviço WebSocket
const websocketService = {
  connect: (type: WebSocketType) => {
    try {
      // Verificar se já existe uma conexão
      if (connections[type]) {
        console.log(`WebSocket ${type} já está conectado`);
        return;
      }

      // Limpar conexão anterior se existir
      if (connections[type]) {
        connections[type]?.close();
        connections[type] = null;
      }

      // Limpar intervalo de ping anterior
      if (pingIntervals[type]) {
        clearInterval(pingIntervals[type]);
        pingIntervals[type] = undefined;
      }

      // Criar nova conexão
      const ws = createWebSocket(type);
      connections[type] = ws;

      ws.onopen = () => {
        console.log(`WebSocket ${type} conectado`);
        // Iniciar ping para manter a conexão ativa
        pingIntervals[type] = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping a cada 30 segundos
      };

      ws.onerror = (error) => {
        console.error(`Erro no WebSocket ${type}:`, error);
        // Tentar reconectar após um erro
        setTimeout(() => {
          if (connections[type]) {
            console.log(`Tentando reconectar WebSocket ${type}...`);
            websocketService.disconnect(type);
            websocketService.connect(type);
          }
        }, 5000);
      };

      ws.onclose = () => {
        console.log(`WebSocket ${type} desconectado`);
        // Limpar intervalo de ping
        if (pingIntervals[type]) {
          clearInterval(pingIntervals[type]);
          pingIntervals[type] = undefined;
        }
        // Tentar reconectar
        setTimeout(() => {
          if (!connections[type]) {
            console.log(`Tentando reconectar WebSocket ${type}...`);
            websocketService.connect(type);
          }
        }, 5000);
      };
    } catch (error) {
      console.error(`Erro ao conectar WebSocket ${type}:`, error);
    }
  },
  
  disconnect: (type: WebSocketType) => {
    try {
      if (connections[type]) {
        console.log(`Desconectando WebSocket ${type}`);
        connections[type]?.close();
        connections[type] = null;
      }
      
      // Limpar intervalo de ping
      if (pingIntervals[type]) {
        clearInterval(pingIntervals[type]);
        pingIntervals[type] = undefined;
      }
    } catch (error) {
      console.error(`Erro ao desconectar WebSocket ${type}:`, error);
    }
  },
  
  on: (event: WebSocketEventType, handler: Function) => {
    eventHandlers[event].add(handler);
  },
  
  off: (event: WebSocketEventType, handler: Function) => {
    eventHandlers[event].delete(handler);
  },
  
  setEnvironment: (env: WebSocketEnvironment) => {
    currentEnv = env;
    // Reconectar todas as conexões com o novo ambiente
    Object.keys(connections).forEach(type => {
      websocketService.disconnect(type as WebSocketType);
      websocketService.connect(type as WebSocketType);
    });
  },
  
  disconnectAll
};

export default websocketService; 