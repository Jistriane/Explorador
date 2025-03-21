export interface Block {
  hash: string;
  nonce: number;
  round: number;
  size: number;
  timestamp: number;
  prevHash: string;
  proposer: string;
  validators: string[];
  txCount: number;
  gasConsumed: string;
  gasRefunded: string;
  gasPenalized: string;
}

export interface Transaction {
  hash: string;
  sender: string;
  receiver: string;
  value: string;
  fee: string;
  status: string;
  timestamp: number;
  gasLimit: number;
  gasPrice: number;
  data?: string;
  nonce: number;
}

export interface Account {
  address: string;
  balance: string;
  txCount: number;
  nonce: number;
  shard: number;
  username?: string;
}

export interface PaginationParams {
  page: number;
  itemsPerPage: number;
}

export interface SearchResult {
  type: 'block' | 'transaction' | 'account';
  data: Block | Transaction | Account;
} 