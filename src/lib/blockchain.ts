// Blockchain utilities and types

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  gasUsed: number;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  miner: string;
  reward: number;
}

// Simple hash function for demo
export async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate random address
export function generateAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

// Generate random transaction
export function generateTransaction(): Transaction {
  return {
    id: generateAddress().slice(0, 16),
    from: generateAddress(),
    to: generateAddress(),
    amount: Math.random() * 10,
    timestamp: Date.now(),
    gasUsed: Math.floor(Math.random() * 50000) + 21000,
  };
}

// Create block
export async function createBlock(
  index: number,
  transactions: Transaction[],
  previousHash: string,
  difficulty: number
): Promise<Block> {
  const miner = generateAddress();
  const timestamp = Date.now();
  let nonce = 0;
  
  // Simple proof of work
  const target = '0'.repeat(difficulty);
  let hash = '';
  
  while (!hash.startsWith(target)) {
    const data = `${index}${timestamp}${JSON.stringify(transactions)}${previousHash}${nonce}${miner}`;
    hash = await calculateHash(data);
    nonce++;
  }
  
  return {
    index,
    timestamp,
    transactions,
    previousHash,
    hash,
    nonce,
    difficulty,
    miner,
    reward: 6.25 + Math.random() * 2,
  };
}

// Format address for display
export function formatAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// Format hash
export function formatHash(hash: string, chars = 10): string {
  return `${hash.slice(0, chars)}...${hash.slice(-6)}`;
}

// Gas fee estimator (Gwei)
export function estimateGasFee(priority: 'slow' | 'standard' | 'fast'): number {
  const baseGas = 20;
  const multipliers = { slow: 1, standard: 1.5, fast: 2.5 };
  return baseGas * multipliers[priority];
}

// Mempool simulation
export function generateMempool(count: number): Transaction[] {
  const pool: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(generateTransaction());
  }
  return pool.sort((a, b) => b.gasUsed - a.gasUsed);
}