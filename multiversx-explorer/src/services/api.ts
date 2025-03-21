import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import axios from 'axios';
import { Block, Transaction, Account, PaginationParams } from '../types';
import config from '../config';

// Configuração de tratamento de erros
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL erro]: Mensagem: ${message}, Localização: ${locations}, Caminho: ${path}`
      );
    });
  if (networkError) console.error(`[Erro de rede]: ${networkError}`);
});

// Link HTTP com timeout e retry
const httpLink = new HttpLink({
  uri: config.api.url,
  fetchOptions: {
    timeout: 30000,
  }
});

// Inicialização do cliente Apollo
const client = new ApolloClient({
  link: errorLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

// Cache simples para armazenar os dados mais recentes e reduzir chamadas repetidas
type CacheKey = 'blocks' | 'transactions' | 'stats' | 'accounts';
type CacheData = {
  [key in CacheKey]: {
    data: any;
    timestamp: number;
  }
};

const dataCache: CacheData = {
  blocks: {
    data: null as any,
    timestamp: 0
  },
  transactions: {
    data: null as any,
    timestamp: 0
  },
  stats: {
    data: null as any,
    timestamp: 0
  },
  accounts: {
    data: null as any,
    timestamp: 0
  }
};

// Tempo máximo de cache em milissegundos (5 segundos)
const CACHE_TTL = 5000;

/**
 * Função utilitária para formatar a query GraphQL
 */
const formatQuery = (query: string) => {
  return query.replace(/\s+/g, ' ').trim();
};

/**
 * Cliente HTTP simples para requisições à API REST
 */
const httpClient = {
  get: async (endpoint: string, bypassCache = false) => {
    const url = `${config.api.rest}${endpoint}`;
    
    // Identificar o tipo de dados sendo solicitado
    let cacheKey: CacheKey | null = null;
    if (endpoint.startsWith('/blocks')) cacheKey = 'blocks';
    else if (endpoint.startsWith('/transactions')) cacheKey = 'transactions';
    else if (endpoint.startsWith('/stats')) cacheKey = 'stats';
    else if (endpoint.startsWith('/accounts')) cacheKey = 'accounts';
    
    // Verificar se temos dados em cache e se ainda são válidos
    const now = Date.now();
    if (!bypassCache && cacheKey && dataCache[cacheKey].data && 
        (now - dataCache[cacheKey].timestamp) < CACHE_TTL) {
      console.log(`Usando dados em cache para ${cacheKey}`);
      return { data: dataCache[cacheKey].data };
    }
    
    // Fazer a requisição
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Atualizar o cache se for um dos tipos reconhecidos
    if (cacheKey) {
      dataCache[cacheKey].data = data;
      dataCache[cacheKey].timestamp = now;
    }
    
    return { data };
  }
};

/**
 * Cliente para requisições à API Elastic
 */
const elasticClient = {
  get: async (endpoint: string, bypassCache = false) => {
    const url = `${config.api.proxy}${endpoint}`;
    
    // Identificar o tipo de dados sendo solicitado
    let cacheKey: CacheKey | null = null;
    if (endpoint.startsWith('/blocks')) cacheKey = 'blocks';
    else if (endpoint.startsWith('/transactions')) cacheKey = 'transactions';
    else if (endpoint.startsWith('/stats')) cacheKey = 'stats';
    else if (endpoint.startsWith('/accounts')) cacheKey = 'accounts';
    
    // Verificar se temos dados em cache e se ainda são válidos
    const now = Date.now();
    if (!bypassCache && cacheKey && dataCache[cacheKey].data && 
        (now - dataCache[cacheKey].timestamp) < CACHE_TTL) {
      console.log(`Usando dados em cache para ${cacheKey} (elastic)`);
      return { data: dataCache[cacheKey].data };
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Atualizar o cache se for um dos tipos reconhecidos
    if (cacheKey) {
      dataCache[cacheKey].data = data;
      dataCache[cacheKey].timestamp = now;
    }
    
    return { data };
  }
};

// Queries para blocos
const GET_RECENT_BLOCKS = gql`
  query GetRecentBlocks($page: Int!, $itemsPerPage: Int!) {
    blocks(pagination: { page: $page, itemsPerPage: $itemsPerPage }) {
      hash
      nonce
      round
      size
      timestamp
      prevHash
      proposer
      validators
      txCount
      gasConsumed
      gasRefunded
      gasPenalized
    }
  }
`;

const GET_BLOCK_BY_HASH = gql`
  query GetBlockByHash($hash: String!) {
    block(hash: $hash) {
      hash
      nonce
      round
      size
      timestamp
      prevHash
      proposer
      validators
      txCount
      gasConsumed
      gasRefunded
      gasPenalized
    }
  }
`;

// Queries para transações
const GET_RECENT_TRANSACTIONS = gql`
  query GetRecentTransactions($page: Int!, $itemsPerPage: Int!) {
    transactions(pagination: { page: $page, itemsPerPage: $itemsPerPage }) {
      hash
      sender
      receiver
      value
      fee
      status
      timestamp
      gasLimit
      gasPrice
      data
      nonce
    }
  }
`;

const GET_TRANSACTION_BY_HASH = gql`
  query GetTransactionByHash($hash: String!) {
    transaction(hash: $hash) {
      hash
      sender
      receiver
      value
      fee
      status
      timestamp
      gasLimit
      gasPrice
      data
      nonce
    }
  }
`;

// Queries para contas
const GET_ACCOUNT_BY_ADDRESS = gql`
  query GetAccountByAddress($address: String!) {
    account(address: $address) {
      address
      balance
      txCount
      nonce
      shard
      username
    }
  }
`;

interface AccountsResponse {
  accounts: {
    address: string;
    balance: string;
    txCount: number;
    nonce: number;
    shard: number;
    username?: string;
  }[];
  totalCount?: number;
  pages?: number;
}

/**
 * Busca uma lista de contas com suporte a paginação
 * 
 * @param page Número da página a buscar
 * @param size Quantidade de itens por página
 * @returns Lista de contas
 */
export const fetchAccounts = async (page: number = 1, size: number = 25): Promise<AccountsResponse> => {
  try {
    // Usar API elástica que é mais confiável para contas
    const endpoint = `/accounts?from=${(page - 1) * size}&size=${size}`;
    const response = await fetch(`${config.api.proxy}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Obtidas ${data.length} contas com sucesso`);
    
    return {
      accounts: data.map((account: any) => ({
        address: account.address,
        balance: account.balance || '0',
        txCount: account.txCount || 0,
        nonce: account.nonce || 0,
        shard: account.shard || 0,
        username: account.username || null
      })),
      totalCount: parseInt(response.headers.get('x-total-count') || '0'),
      pages: parseInt(response.headers.get('x-total-pages') || '0')
    };
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    
    // Tentar endpoint alternativo
    try {
      console.log('⚠️ Tentando endpoint alternativo para contas...');
      const alternativeEndpoint = `/accounts?from=${(page - 1) * size}&size=${size}`;
      const alternativeResponse = await fetch(`${config.api.gateway}${alternativeEndpoint}`);
      
      if (!alternativeResponse.ok) {
        throw new Error(`Endpoint alternativo falhou: ${alternativeResponse.status}`);
      }
      
      const data = await alternativeResponse.json();
      console.log(`✅ Obtidas ${data.length} contas do endpoint alternativo`);
      
      return {
        accounts: data.map((account: any) => ({
          address: account.address,
          balance: account.balance || '0',
          txCount: account.txCount || 0,
          nonce: account.nonce || 0,
          shard: account.shard || 0,
          username: account.username || null
        })),
        totalCount: parseInt(alternativeResponse.headers.get('x-total-count') || '0'),
        pages: parseInt(alternativeResponse.headers.get('x-total-pages') || '0')
      };
    } catch (alternativeError) {
      console.error('Erro no endpoint alternativo de contas:', alternativeError);
      
      // Fallback para dados simulados apenas quando ambos os endpoints falharem
      console.log('⚠️ Usando dados simulados para contas como última opção');
      return {
        accounts: Array(size).fill(0).map((_, i) => ({
          address: `erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ss${i}`,
          balance: (Math.random() * 1000000000000000000 * 100).toString(),
          txCount: Math.floor(Math.random() * 1000),
          nonce: Math.floor(Math.random() * 100),
          shard: Math.floor(Math.random() * 3),
          username: i % 3 === 0 ? `user${i}.elrond` : undefined
        })),
        totalCount: 100,
        pages: Math.ceil(100 / size)
      };
    }
  }
};

/**
 * Busca detalhes de uma conta específica pelo endereço
 * 
 * @param address Endereço da conta a buscar
 * @returns Detalhes da conta
 */
export const fetchAccountByAddress = async (address: string) => {
  try {
    const response = await fetch(`${config.api.url}/accounts/${address}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      address: data.address,
      balance: data.balance || '0',
      txCount: data.txCount || 0,
      nonce: data.nonce || 0,
      shard: data.shard || 0,
      username: data.username || null,
      developerReward: data.developerReward || '0',
      ownerAddress: data.ownerAddress || null,
      deployedAt: data.deployedAt || null,
      scamInfo: data.scamInfo || null,
      isUpgradeable: data.isUpgradeable || false,
      isReadable: data.isReadable || false,
      isPayable: data.isPayable || false,
      isPayableBySmartContract: data.isPayableBySmartContract || false
    };
  } catch (error) {
    console.error('Error fetching account details:', error);
    // Dados simulados em caso de falha
    return {
      address: address,
      balance: (Math.random() * 1000000000000000000 * 100).toString(),
      txCount: Math.floor(Math.random() * 1000),
      nonce: Math.floor(Math.random() * 100),
      shard: Math.floor(Math.random() * 3),
      username: null,
      developerReward: '0',
      ownerAddress: null,
      deployedAt: null,
      scamInfo: null,
      isUpgradeable: false,
      isReadable: true,
      isPayable: false,
      isPayableBySmartContract: false
    };
  }
};

/**
 * Busca transações associadas a uma conta específica
 * 
 * @param address Endereço da conta
 * @param page Número da página a buscar
 * @param size Quantidade de itens por página
 * @returns Lista de transações da conta
 */
export const fetchAccountTransactions = async (address: string, page: number = 1, size: number = 25) => {
  try {
    const response = await fetch(`${config.api.url}/accounts/${address}/transactions?from=${(page - 1) * size}&size=${size}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      transactions: data,
      totalCount: parseInt(response.headers.get('x-total-count') || '0'),
      pages: parseInt(response.headers.get('x-total-pages') || '0')
    };
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    // Retornar transações simuladas em caso de falha
    return {
      transactions: Array(size).fill(0).map((_, i) => ({
        txHash: `hash${i}`,
        sender: i % 2 === 0 ? address : `erd1random${i}`,
        receiver: i % 2 === 0 ? `erd1random${i}` : address,
        value: (Math.random() * 100000000000000000).toString(),
        fee: (Math.random() * 50000000000000).toString(),
        timestamp: Date.now() - i * 60000,
        status: 'success',
        method: ['transfer', 'stake', 'claim', 'unstake'][Math.floor(Math.random() * 4)]
      })),
      totalCount: 100,
      pages: Math.ceil(100 / size)
    };
  }
};

/**
 * Busca blocos recentes da blockchain MultiversX
 * @param options Opções de paginação e filtros
 * @returns Array de blocos
 */
export const fetchRecentBlocks = async (options: { 
  page?: number; 
  itemsPerPage?: number; 
  fields?: string[];
} = {}) => {
  try {
    console.log('Buscando blocos recentes...');
    const page = options.page || 1;
    const itemsPerPage = options.itemsPerPage || 25;
    const fields = options.fields || ['hash', 'nonce', 'timestamp', 'txCount', 'size', 'validators', 'proposer'];
    
    // Construir a URL com parâmetros
    const queryParams = new URLSearchParams({
      from: ((page - 1) * itemsPerPage).toString(),
      size: itemsPerPage.toString(),
      withProposerIdentity: 'true'
    });
    
    const response = await httpClient.get(`/blocks?${queryParams.toString()}`, true); // Bypass cache
    console.log('Resposta da API de blocos:', response.data);
    
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(block => ({
        hash: block.hash || '',
        nonce: block.nonce || 0,
        timestamp: block.timestamp || 0,
        txCount: block.txCount || 0,
        size: block.size || 0,
        round: block.round || 0,
        validators: block.validators || [],
        proposer: block.proposer || '',
        prevHash: block.prevHash || '',
        gasConsumed: block.gasConsumed || '0',
        gasRefunded: block.gasRefunded || '0',
        gasPenalized: block.gasPenalized || '0'
      }));
    }
    
    // Tentar com API alternativa se a primeira falhar
    console.log('Tentando API alternativa para blocos...');
    const altResponse = await elasticClient.get('/blocks', true); // Bypass cache
    
    if (altResponse.data && Array.isArray(altResponse.data)) {
      return altResponse.data.map(block => ({
        hash: block.hash || '',
        nonce: block.nonce || 0,
        timestamp: block.timestamp || 0,
        txCount: block.txCount || 0,
        size: block.size || 0,
        round: block.round || 0,
        validators: block.validators || [],
        proposer: block.proposer || '',
        prevHash: block.prevHash || '',
        gasConsumed: block.gasConsumed || '0',
        gasRefunded: block.gasRefunded || '0',
        gasPenalized: block.gasPenalized || '0'
      }));
    }
    
    // Caso nenhuma API retorne dados válidos
    console.error('Ambas as APIs falharam ao buscar blocos');
    
    // Retornar exemplos de blocos se estiver em modo de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Gerando blocos de exemplo para desenvolvimento');
      return Array.from({ length: itemsPerPage }, (_, i) => ({
        hash: `mock_hash_${i}`,
        nonce: 1000000 + i,
        timestamp: Math.floor(Date.now() / 1000) - i * 30,
        txCount: Math.floor(Math.random() * 50),
        size: 1000 + Math.floor(Math.random() * 5000),
        round: 10000 + i,
        validators: [],
        proposer: 'mock_proposer',
        prevHash: `mock_prev_hash_${i}`,
        gasConsumed: '1000',
        gasRefunded: '100',
        gasPenalized: '0'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar blocos recentes:', error);
    
    // Retornar exemplos de blocos se estiver em modo de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Gerando blocos de exemplo após erro');
      return Array.from({ length: options.itemsPerPage || 25 }, (_, i) => ({
        hash: `error_fallback_hash_${i}`,
        nonce: 1000000 + i,
        timestamp: Math.floor(Date.now() / 1000) - i * 30,
        txCount: Math.floor(Math.random() * 50),
        size: 1000 + Math.floor(Math.random() * 5000),
        round: 10000 + i,
        validators: [],
        proposer: 'fallback_proposer',
        prevHash: `fallback_prev_hash_${i}`,
        gasConsumed: '1000',
        gasRefunded: '100',
        gasPenalized: '0'
      }));
    }
    
    return [];
  }
};

export const fetchBlockByHash = async (hash: string) => {
  try {
    // Utilizando a API Gateway do MultiversX
    const response = await fetch(`${config.api.gateway}/blocks/${hash}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching block data:', error);
    // Fallback para dados simulados
    return {
      hash: hash,
      nonce: Math.floor(Math.random() * 1000000),
      round: Math.floor(Math.random() * 1000000),
      shard: Math.floor(Math.random() * 3),
      size: Math.floor(Math.random() * 1000),
      txCount: Math.floor(Math.random() * 100),
      timestamp: Date.now() / 1000 - Math.floor(Math.random() * 86400),
      validators: Math.floor(Math.random() * 20),
      proposer: 'erd...',
      // Outros campos simulados
    };
  }
};

/**
 * Busca transações recentes da blockchain MultiversX
 * @param options Opções de paginação e filtros
 * @returns Array de transações
 */
export const fetchRecentTransactions = async (options: { 
  page?: number; 
  itemsPerPage?: number; 
  status?: string;
  sender?: string;
  receiver?: string;
  fields?: string[];
} = {}) => {
  try {
    console.log('Buscando transações recentes...');
    const page = options.page || 1;
    const itemsPerPage = options.itemsPerPage || 25;
    
    // Construir a URL com parâmetros
    const queryParams = new URLSearchParams({
      from: ((page - 1) * itemsPerPage).toString(),
      size: itemsPerPage.toString()
    });
    
    if (options.status) {
      queryParams.append('status', options.status);
    }
    
    if (options.sender) {
      queryParams.append('sender', options.sender);
    }
    
    if (options.receiver) {
      queryParams.append('receiver', options.receiver);
    }
    
    const response = await httpClient.get(`/transactions?${queryParams.toString()}`, true); // Bypass cache
    console.log('Resposta da API de transações:', response.data);
    
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(tx => ({
        hash: tx.hash || tx.txHash || '',
        sender: tx.sender || '',
        receiver: tx.receiver || '',
        value: tx.value || '0',
        fee: tx.fee || tx.gasUsed || '0',
        status: tx.status || 'pending',
        timestamp: tx.timestamp || 0,
        gasLimit: tx.gasLimit || 0,
        gasPrice: tx.gasPrice || 0,
        data: tx.data || '',
        nonce: tx.nonce || 0
      }));
    }
    
    // Tentar com API alternativa se a primeira falhar
    console.log('Tentando API alternativa para transações...');
    const altResponse = await elasticClient.get('/transactions', true); // Bypass cache
    
    if (altResponse.data && Array.isArray(altResponse.data)) {
      return altResponse.data.map(tx => ({
        hash: tx.hash || tx.txHash || '',
        sender: tx.sender || '',
        receiver: tx.receiver || '',
        value: tx.value || '0',
        fee: tx.fee || tx.gasUsed || '0',
        status: tx.status || 'pending',
        timestamp: tx.timestamp || 0,
        gasLimit: tx.gasLimit || 0,
        gasPrice: tx.gasPrice || 0,
        data: tx.data || '',
        nonce: tx.nonce || 0
      }));
    }
    
    // Caso nenhuma API retorne dados válidos
    console.error('Ambas as APIs falharam ao buscar transações');
    
    // Retornar exemplos de transações se estiver em modo de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Gerando transações de exemplo para desenvolvimento');
      return Array.from({ length: itemsPerPage }, (_, i) => ({
        hash: `mock_tx_hash_${i}`,
        sender: `erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq${i}`,
        receiver: `erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz${i}`,
        value: (Math.random() * 100).toString(),
        fee: (Math.random() * 0.1).toString(),
        status: ['success', 'pending', 'invalid'][Math.floor(Math.random() * 3)],
        timestamp: Math.floor(Date.now() / 1000) - i * 60,
        gasLimit: 50000 + Math.floor(Math.random() * 50000),
        gasPrice: 1000000000,
        data: 'mock_data',
        nonce: 100 + i
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar transações recentes:', error);
    
    // Retornar exemplos de transações se estiver em modo de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Gerando transações de exemplo após erro');
      return Array.from({ length: options.itemsPerPage || 25 }, (_, i) => ({
        hash: `error_fallback_tx_hash_${i}`,
        sender: `erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq${i}`,
        receiver: `erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz${i}`,
        value: (Math.random() * 100).toString(),
        fee: (Math.random() * 0.1).toString(),
        status: ['success', 'pending', 'invalid'][Math.floor(Math.random() * 3)],
        timestamp: Math.floor(Date.now() / 1000) - i * 60,
        gasLimit: 50000 + Math.floor(Math.random() * 50000),
        gasPrice: 1000000000,
        data: 'fallback_data',
        nonce: 100 + i
      }));
    }
    
    return [];
  }
};

export const fetchTransactionByHash = async (hash: string) => {
  try {
    // Utilizando a API Proxy do MultiversX
    const response = await fetch(`${config.api.proxy}/transactions/${hash}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    // Fallback para dados simulados
    return {
      hash: hash,
      sender: 'erd...',
      receiver: 'erd...',
      value: (Math.random() * 1000000000000000000).toString(),
      fee: (Math.random() * 50000000000000).toString(),
      timestamp: Date.now() / 1000 - Math.floor(Math.random() * 86400),
      status: 'success',
      data: '',
      // Outros campos simulados
    };
  }
};

export const searchByHashOrAddress = async (query: string): Promise<any> => {
  // Tenta buscar como bloco
  const block = await fetchBlockByHash(query).catch(() => null);
  if (block) return { type: 'block', data: block };

  // Tenta buscar como transação
  const transaction = await fetchTransactionByHash(query).catch(() => null);
  if (transaction) return { type: 'transaction', data: transaction };

  // Tenta buscar como conta
  const account = await fetchAccountByAddress(query).catch(() => null);
  if (account) return { type: 'account', data: account };

  return null;
};

// Função para limpar o cache forçando atualizações
export const clearCache = () => {
  Object.keys(dataCache).forEach(key => {
    dataCache[key as CacheKey].timestamp = 0;
  });
  console.log('Cache de dados limpo. Próximas requisições obterão dados atualizados.');
};

// Melhorar a função fetchNetworkStats para garantir todos os dados necessários
export const fetchNetworkStats = async () => {
  // Dados de demonstração completos para usar em caso de falha
  const fallbackStats = {
    transactions: {
      totalProcessed: 68543210,
      pending: 42
    },
    tps: 7.82,
    accounts: {
      total: 2500000,
      active: 1800000
    },
    blocks: 97530000,
    epoch: 1028,
    refreshRate: 15,
    roundsPerEpoch: 14400,
    roundsPassed: 14818000,
    // Adicionar dados de staking para fallback
    staking: {
      totalStaked: 7543210000000000000000000, // Valor em wei
      providers: 3200
    },
    economics: {
      staked: 7543210000000000000000000, // Valor em wei como alternativa
      totalSupply: 24300000000000000000000000
    }
  };
  
  console.log('Iniciando busca de estatísticas em múltiplos endpoints...');
  
  // Adicionar URL específica para dados econômicos
  const urls = [
    'https://api.multiversx.com/stats',
    'https://gateway.multiversx.com/stats',
    'https://api.multiversx.com/economics',
    'https://testnet-api.multiversx.com/stats'
  ];
  
  // Tentar cada URL sequencialmente
  for (const url of urls) {
    try {
      console.log(`Tentando buscar estatísticas de: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Erro ${response.status} ao buscar de ${url}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Dados obtidos com sucesso de ${url}:`, JSON.stringify(data, null, 2));
      
      // Verificar campos específicos com logs detalhados
      console.log('Transações processadas:', data.transactions?.totalProcessed);
      console.log('TPS:', data.tps);
      console.log('Contas ativas:', data.accounts?.active);
      console.log('Total de blocos:', data.blocks);
      console.log('Total em staking:', data.staking?.totalStaked || data.economics?.staked);
      
      // Tratar o caso especial do endpoint de economia
      if (url.includes('/economics') && data) {
        // Criar um objeto compatível com o formato esperado, mas com dados de economics
        const economicsData = {
          economics: { ...data },
          // Se tivermos dados de staking, adicionar explicitamente
          staking: {
            totalStaked: data.staked || data.totalStaked
          }
        };
        
        console.log('Dados econômicos processados:', economicsData);
        
        // Mesclar com os dados existentes (dados de economics têm precedência)
        const combinedData = {
          ...fallbackStats,
          ...economicsData
        };
        
        console.log('Dados combinados com economics:', combinedData);
        return combinedData;
      }
      
      // Verificar se os dados são válidos e completos
      if (!data || typeof data !== 'object') {
        console.warn(`Resposta de ${url} não contém um objeto válido`);
        continue;
      }
      
      // Validar campos individuais e preencher com dados de fallback se necessário
      const validatedData = {
        ...fallbackStats,
        ...data,
        transactions: {
          ...fallbackStats.transactions,
          ...(data.transactions || {})
        },
        accounts: {
          ...fallbackStats.accounts,
          ...(data.accounts || {})
        },
        // Garantir que dados de staking sejam preservados mesmo se virem em formato diferente
        staking: {
          ...fallbackStats.staking,
          ...(data.staking || {}),
          // Usar dados de economics.staked como fallback para staking.totalStaked se necessário
          totalStaked: data.staking?.totalStaked || data.economics?.staked || fallbackStats.staking.totalStaked
        },
        economics: {
          ...fallbackStats.economics,
          ...(data.economics || {})
        }
      };
      
      console.log('Dados validados e preenchidos:', validatedData);
      return validatedData;
    } catch (error) {
      console.error(`Erro ao buscar estatísticas de ${url}:`, error);
    }
  }
  
  console.warn('Todos os endpoints falharam, usando dados de demonstração');
  return fallbackStats;
};

/**
 * Realiza uma busca por endereço, hash de transação ou bloco utilizando as APIs oficiais MultiversX
 * 
 * @param query Termo de busca (endereço, hash ou número de bloco)
 * @returns Resultado da busca com tipo e dados encontrados
 */
export const searchByQuery = async (query: string) => {
  try {
    // Remover espaços extras
    const term = query.trim();

    // 1. VERIFICAR SE É UM ENDEREÇO VÁLIDO
    if (term.startsWith('erd')) {
      try {
        const response = await fetch(`${config.api.proxy}/accounts/${term}`);
        
        if (response.ok) {
          const accountData = await response.json();
          return {
            type: 'account',
            data: accountData,
            redirectUrl: `/accounts/${term}`
          };
        }
      } catch (error) {
        console.error('Erro ao buscar conta:', error);
      }
    }

    // 2. VERIFICAR SE É UM HASH DE TRANSAÇÃO (64 caracteres hexadecimais)
    if (/^[0-9a-fA-F]{64}$/.test(term)) {
      try {
        // Buscar como transação na API oficial
        const response = await fetch(`${config.api.proxy}/transactions/${term}`);
        
        if (response.ok) {
          const transactionData = await response.json();
          return {
            type: 'transaction',
            data: transactionData,
            redirectUrl: `/transactions/${term}`
          };
        }
      } catch (error) {
        console.error('Erro ao buscar transação:', error);
      }

      // Se não for transação, tentar como hash de bloco
      try {
        const response = await fetch(`${config.api.gateway}/blocks/${term}`);
        
        if (response.ok) {
          const blockData = await response.json();
          return {
            type: 'block',
            data: blockData,
            redirectUrl: `/blocks/${term}`
          };
        }
      } catch (error) {
        console.error('Erro ao buscar bloco por hash:', error);
      }
    }

    // 3. VERIFICAR SE É UMA ALTURA DE BLOCO (NÚMERO)
    if (/^\d+$/.test(term)) {
      try {
        // Buscar por shard 0 (principal) e nonce específico
        const response = await fetch(`${config.api.gateway}/blocks?nonce=${term}&shard=0`);
        
        if (response.ok) {
          const blocksData = await response.json();
          
          if (blocksData && blocksData.length > 0) {
            return {
              type: 'block',
              data: blocksData[0],
              redirectUrl: `/blocks/${blocksData[0].hash}`
            };
          }
        }
      } catch (error) {
        console.error('Erro ao buscar bloco por altura:', error);
      }
    }

    // 4. BUSCA DIRETA NO EXPLORER OFICIAL (FALLBACK)
    // Criar links diretos para o explorer oficial como último recurso
    if (term.startsWith('erd')) {
      return {
        type: 'external_account',
        data: { address: term },
        redirectUrl: `${config.explorer.url}/accounts/${term}`
      };
    } else if (/^[0-9a-fA-F]{64}$/.test(term)) {
      // Tentar primeiro como transação
      return {
        type: 'external_transaction',
        data: { hash: term },
        redirectUrl: `${config.explorer.url}/transactions/${term}`
      };
    } else if (/^\d+$/.test(term)) {
      return {
        type: 'external_block',
        data: { nonce: term },
        redirectUrl: `${config.explorer.url}/blocks/${term}`
      };
    }

    // Nenhum resultado encontrado
    return null;
  } catch (error) {
    console.error('Erro na busca:', error);
    return null;
  }
}; 