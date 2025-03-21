const config = {
  app: {
    name: 'MultiversX Explorer',
    version: '1.0.0',
  },
  api: {
    // MultiversX Gateway API - Principal
    rest: 'https://api.multiversx.com',
    proxy: 'https://api.multiversx.com',
    gateway: 'https://gateway.multiversx.com',
    
    // URLs alternativas para testnet
    testnet: {
      rest: 'https://testnet-api.multiversx.com',
      proxy: 'https://testnet-api.multiversx.com',
      gateway: 'https://testnet-gateway.multiversx.com',
    },
    
    // API pública MultiversX (API direta)
    public: {
      rest: 'https://api.multiversx.com',
      proxy: 'https://api.multiversx.com',
      gateway: 'https://gateway.multiversx.com',
    },
    
    // URL da API GraphQL
    url: 'https://api.multiversx.com/graphql',
  },
  network: {
    name: 'mainnet',
    id: '1',
    averageBlockTimeSeconds: 6
  },
  explorer: {
    url: 'https://explorer.multiversx.com',
    testnet: 'https://testnet-explorer.multiversx.com',
    version: '0.1.0'
  },
  settings: {
    itemsPerPage: 10,
    maxNotifications: 5
  }
};

export default config; 