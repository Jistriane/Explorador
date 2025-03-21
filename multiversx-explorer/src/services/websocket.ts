import config from '../config';
import { EventEmitter } from 'events';

// Tipos de eventos que serão emitidos pelo websocket
export enum WebSocketEventType {
  BLOCK = 'block',
  TRANSACTION = 'transaction',
  ACCOUNT = 'account',
  STATS = 'stats',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// URLs dos websockets do MultiversX
const WS_URLS = {
  blocks: 'wss://gateway.multiversx.com/blocks',
  transactions: 'wss://gateway.multiversx.com/transactions',
  accounts: 'wss://gateway.multiversx.com/accounts',
  stats: 'wss://gateway.multiversx.com/stats'
};

// URLs alternativas (testnet) como fallback
const FALLBACK_URLS = {
  blocks: 'wss://testnet-gateway.multiversx.com/blocks',
  transactions: 'wss://testnet-gateway.multiversx.com/transactions',
  accounts: 'wss://testnet-gateway.multiversx.com/accounts', 
  stats: 'wss://testnet-gateway.multiversx.com/stats'
};

// URLs para API pública alternativa
const PUBLIC_API_URLS = {
  blocks: 'wss://api.multiversx.com/blocks',
  transactions: 'wss://api.multiversx.com/transactions',
  accounts: 'wss://api.multiversx.com/accounts',
  stats: 'wss://api.multiversx.com/stats'  
};

// Flag para controlar se devemos usar os WebSockets ou operar em modo fallback
const USE_WEBSOCKETS = true;

// Flag para usar dados simulados quando WebSockets falham completamente
const USE_MOCK_DATA = true;

// Intervalo para emitir eventos simulados (em milissegundos)
const MOCK_EVENT_INTERVAL = 10000; // 10 segundos entre possíveis atualizações de blocos

// Objeto para rastrear todas as conexões WebSocket ativas
const connections: Record<string, WebSocket | null> = {
  blocks: null,
  transactions: null,
  accounts: null,
  stats: null,
};

// URLs de WebSocket para diferentes ambientes
const WEBSOCKET_URLS = {
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
let currentEnv: 'mainnet' | 'testnet' | 'public' = 'mainnet';

// Rastreadores de tentativas de reconexão para cada tipo
const reconnectAttempts: Record<string, number> = {
  blocks: 0,
  transactions: 0,
  accounts: 0,
  stats: 0,
};

// Intervalo máximo de reconexão (5 minutos)
const MAX_RECONNECT_DELAY = 300000;

// Intervalos de ping para manter as conexões ativas
const pingIntervals: Record<string, NodeJS.Timeout | null> = {
  blocks: null,
  transactions: null,
  accounts: null,
  stats: null,
};

// Classe para gerenciar conexões websocket
class WebSocketService {
  private events: EventEmitter;
  private connections: Record<string, WebSocket | null> = {
    blocks: null,
    transactions: null,
    accounts: null,
    stats: null,
  };
  private reconnectTimeouts: Map<string, NodeJS.Timeout>;
  private isReconnecting: Map<string, boolean>;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private reconnectAttempts: Record<string, number> = {
    blocks: 0,
    transactions: 0,
    accounts: 0,
    stats: 0,
  };
  private mockIntervals: { [key: string]: NodeJS.Timeout } = {};
  private pingIntervals: Record<string, NodeJS.Timeout | null> = {
    blocks: null,
    transactions: null,
    accounts: null,
    stats: null,
  };
  private currentEnv: 'mainnet' | 'testnet' | 'public' = 'mainnet';
  private readonly MAX_RECONNECT_DELAY = 300000; // 5 minutos

  constructor() {
    this.events = new EventEmitter();
    this.reconnectTimeouts = new Map();
    this.isReconnecting = new Map();
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000; // Delay inicial de 3 segundos

    // Aumentar limite de listeners para evitar avisos
    this.events.setMaxListeners(30);
  }

  // Wrapper seguro para emitir eventos, prevenindo erros não tratados
  private safeEmit(event: WebSocketEventType, data: any): void {
    try {
      // Garantir que data é sempre um objeto válido
      const safeData = data === undefined || data === null 
        ? { timestamp: new Date().toISOString() } 
        : typeof data === 'object' 
          ? { ...data, timestamp: data.timestamp || new Date().toISOString() }
          : { value: data, timestamp: new Date().toISOString() };
      
      // Log para depuração
      console.debug(`Emitindo evento ${event}:`, safeData);
      
      // Emitir o evento com dados seguros
      this.events.emit(event, safeData);
    } catch (error) {
      console.error(`Erro ao emitir evento ${event}:`, error);
      // Não propagar o erro
    }
  }

  /**
   * Inicializa e conecta a um WebSocket para receber atualizações em tempo real
   * @param type Tipo de dados (blocks, transactions, accounts, stats)
   */
  public connect(type: string): void {
    if (!USE_WEBSOCKETS) {
      console.log(`WebSockets desativados. Usando simulação para ${type}`);
      this.startMockDataEmission(type);
      return;
    }

    // Obter URL do ambiente atual
    const url = WEBSOCKET_URLS[this.currentEnv][type as keyof typeof WEBSOCKET_URLS.mainnet];
    if (url) {
      this.connectToWebSocket(type, url);
    } else {
      console.error(`URL de WebSocket não encontrada para o tipo: ${type}`);
      this.startMockDataEmission(type);
    }
  }

  /**
   * Conecta a um WebSocket específico
   * @param type Tipo de conexão
   * @param url URL do WebSocket
   */
  private connectToWebSocket(type: string, wsUrl: string): void {
    // Se já existe uma conexão ativa, não faz nada
    if (this.connections[type] && this.connections[type]?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log(`Conectando WebSocket para ${type} em ${wsUrl}...`);
      
      const socket = new WebSocket(wsUrl);
      this.connections[type] = socket;
      this.reconnectAttempts[type] = 0;

      // Configurar timeout para verificar se a conexão foi estabelecida
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.log(`Timeout na conexão WebSocket para ${type}. Tentando URL de fallback...`);
          socket.close();
          
          // Tentar próximo ambiente
          this.switchToNextEnvironment();
          this.reconnectAttempts[type]++;
          
          // Reconectar com atraso
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts[type]), this.MAX_RECONNECT_DELAY);
          setTimeout(() => {
            this.connect(type);
          }, delay);
        }
      }, 5000); // 5 segundos para timeout de conexão

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${type} conectado com sucesso em ${wsUrl}`);
        this.safeEmit(WebSocketEventType.CONNECTED, { type, url: wsUrl });
        this.reconnectAttempts[type] = 0;
        
        // Enviar ping periódico para manter a conexão ativa
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' }));
            console.log(`Ping enviado para WebSocket ${type}`);
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping a cada 30 segundos
        
        // Armazenar o intervalo para limpar quando desconectar
        this.pingIntervals[type] = pingInterval;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Log específico para depuração de estatísticas
          if (type === 'stats') {
            console.log(`Dados de estatísticas recebidos do websocket:`, data);
            
            // Garantir que os dados tenham uma estrutura mínima esperada
            const formattedStats = {
              ...data,
              transactions: {
                ...(data.transactions || {}),
                totalProcessed: data.transactions?.totalProcessed || 0,
                pending: data.transactions?.pending || 0
              },
              tps: data.tps || 0
            };
            
            // Emitir evento com dados estruturados
            this.safeEmit(WebSocketEventType.STATS, formattedStats);
            return;
          }
          
          // Processamento para outros tipos de dados
          switch (type) {
            case 'blocks':
              this.safeEmit(WebSocketEventType.BLOCK, data);
              break;
            case 'transactions':
              this.safeEmit(WebSocketEventType.TRANSACTION, data);
              break;
            case 'accounts':
              this.safeEmit(WebSocketEventType.ACCOUNT, data);
              break;
            default:
              // Caso o tipo não seja reconhecido, tenta inferir pelo conteúdo
              if (data.hash && data.nonce) {
                this.safeEmit(WebSocketEventType.BLOCK, data);
              } else if (data.hash && data.sender && data.receiver) {
                this.safeEmit(WebSocketEventType.TRANSACTION, data);
              } else if (data.address) {
                this.safeEmit(WebSocketEventType.ACCOUNT, data);
              } else if (data.transactions || data.tps) {
                // Se contém informações de transações ou TPS, provavelmente são estatísticas
                this.safeEmit(WebSocketEventType.STATS, data);
              } else {
                console.log(`Dados recebidos para tipo desconhecido (${type}):`, data);
              }
          }
        } catch (error) {
          console.error(`Erro ao processar mensagem do WebSocket ${type}:`, error);
        }
      };

      socket.onerror = (error) => {
        console.error(`Erro no WebSocket ${type}:`, error);
        this.safeEmit(WebSocketEventType.ERROR, { 
          type, 
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        // Tentar com URL de fallback se a conexão principal falhar
        if (this.reconnectAttempts[type] === 0) {
          console.log(`Tentando conectar à URL de fallback para ${type}`);
          this.switchToNextEnvironment();
          this.connect(type);
        }
      };

      socket.onclose = () => {
        console.log(`WebSocket ${type} desconectado`);
        this.safeEmit(WebSocketEventType.DISCONNECTED, { type });
        
        // Limpar o intervalo de ping
        if (this.pingIntervals[type]) {
          clearInterval(this.pingIntervals[type]!);
          this.pingIntervals[type] = null;
        }
        
        // Reconectar automaticamente, com backoff exponencial
        this.handleReconnect(type);
      };
    } catch (error) {
      console.error(`Erro ao inicializar WebSocket ${type}:`, error);
      this.startMockDataEmission(type);
    }
  }

  /**
   * Lida com a reconexão após falha
   * @param type Tipo de WebSocket
   */
  private handleReconnect(type: string): void {
    // Se já está em processo de reconexão, não inicia outro
    if (this.isReconnecting.get(type)) {
      return;
    }

    const attempts = this.reconnectAttempts[type] || 0;
    
    // Verificar se excedeu o número máximo de tentativas
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Número máximo de tentativas de reconexão atingido para WebSocket ${type}`);
      return;
    }

    this.isReconnecting.set(type, true);
    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), this.MAX_RECONNECT_DELAY);
    
    console.log(`Tentando reconectar WebSocket ${type} em ${delay}ms (tentativa ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    // Configurar timeout para reconexão
    const timeout = setTimeout(() => {
      this.reconnectAttempts[type] = attempts + 1;
      this.isReconnecting.set(type, false);
      this.connect(type);
    }, delay);
    
    this.reconnectTimeouts.set(type, timeout);
  }

  /**
   * Troca para o próximo ambiente em caso de falha
   */
  private switchToNextEnvironment(): void {
    const envs: Array<'mainnet' | 'testnet' | 'public'> = ['mainnet', 'testnet', 'public'];
    const currentIndex = envs.indexOf(this.currentEnv);
    const nextIndex = (currentIndex + 1) % envs.length;
    this.currentEnv = envs[nextIndex];
    console.log(`Ambiente trocado para: ${this.currentEnv}`);
  }

  /**
   * Inicia emissão de dados simulados quando WebSockets estão indisponíveis
   * @param type Tipo de dados (blocks, transactions, accounts, stats)
   */
  private startMockDataEmission(type: string): void {
    // Se já existe um intervalo ativo, não cria outro
    if (this.mockIntervals[type]) {
      clearInterval(this.mockIntervals[type]);
    }

    console.log(`Iniciando emissão de dados simulados para ${type}`);

    this.mockIntervals[type] = setInterval(() => {
      // Gerar dados simulados com base no tipo
      const mockData = this.generateMockData(type);
      
      // Emitir evento simulado
      this.safeEmit(WebSocketEventType.BLOCK, mockData);
    }, MOCK_EVENT_INTERVAL);
  }

  /**
   * Gera dados simulados baseados no tipo
   * @param type Tipo de dados
   * @returns Dados simulados
   */
  private generateMockData(type: string): any {
    // ... conteúdo existente ...
  }

  /**
   * Desconecta de um WebSocket específico
   * @param type Tipo de dados
   */
  public disconnect(type: string): void {
    // Cancelar qualquer tentativa de reconexão pendente
    if (this.reconnectTimeouts.has(type)) {
      clearTimeout(this.reconnectTimeouts.get(type)!);
      this.reconnectTimeouts.delete(type);
    }

    // Cancelar a simulação de dados, se estiver ativa
    if (this.mockIntervals[type]) {
      clearInterval(this.mockIntervals[type]);
      delete this.mockIntervals[type];
    }

    // Limpar intervalo de ping
    if (this.pingIntervals[type]) {
      clearInterval(this.pingIntervals[type]!);
      this.pingIntervals[type] = null;
    }

    // Fechar a conexão
    const socket = this.connections[type];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
      this.connections[type] = null;
      console.log(`WebSocket ${type} desconectado manualmente`);
    }
  }

  /**
   * Desconecta de todos os WebSockets
   */
  public disconnectAll(): void {
    console.log('Desconectando todos os WebSockets...');
    
    // Limpar todos os intervalos de mock
    Object.keys(this.mockIntervals).forEach(key => {
      clearInterval(this.mockIntervals[key]);
    });
    this.mockIntervals = {};
    
    // Limpar intervalos de ping
    Object.keys(this.pingIntervals).forEach(type => {
      if (this.pingIntervals[type]) {
        clearInterval(this.pingIntervals[type]!);
        this.pingIntervals[type] = null;
      }
    });
    
    // Cancelar todas as tentativas de reconexão
    this.reconnectTimeouts.forEach((timeout, type) => {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(type);
    });
    
    // Fechar todas as conexões
    Object.keys(this.connections).forEach(type => {
      const socket = this.connections[type];
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
        this.connections[type] = null;
      }
    });
    
    console.log('Todas as conexões foram encerradas');
  }

  /**
   * Adiciona um listener para eventos do WebSocket
   * @param event Tipo de evento
   * @param listener Função callback
   */
  public on(event: WebSocketEventType, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Remove um listener de eventos
   * @param event Tipo de evento
   * @param listener Função callback
   */
  public off(event: WebSocketEventType, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }

  /**
   * Define o ambiente atual para as conexões
   * @param env Ambiente (mainnet, testnet, public)
   */
  public setEnvironment(env: 'mainnet' | 'testnet' | 'public'): void {
    if (this.currentEnv !== env) {
      this.currentEnv = env;
      console.log(`Ambiente WebSocket alterado para: ${env}`);
      
      // Reconectar todas as conexões existentes
      Object.keys(this.connections).forEach(type => {
        if (this.connections[type]) {
          this.disconnect(type);
          this.connect(type);
        }
      });
    }
  }

  /**
   * Retorna o ambiente atual
   */
  public getEnvironment(): string {
    return this.currentEnv;
  }

  /**
   * Verifica se um WebSocket está conectado
   * @param type Tipo de WebSocket
   */
  public isConnected(type: string): boolean {
    const socket = this.connections[type];
    return !!(socket && socket.readyState === WebSocket.OPEN);
  }
}

// Instância singleton
const websocketService = new WebSocketService();

export default websocketService; 