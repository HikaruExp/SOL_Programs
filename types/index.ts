export interface Program {
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  updated: string;
  topics: string[];
  category?: string;
  subCategory?: string;
  defaultBranch?: string;
}

export interface ProgramsData {
  scrapedAt: string;
  totalRepos: number;
  keywordsSearched: string[];
  repos: Program[];
}

export type Category = 
  | 'All'
  | 'DEX'
  | 'NFT'
  | 'Lending'
  | 'Staking'
  | 'DeFi'
  | 'Governance'
  | 'Trading'
  | 'Infrastructure';

export const CATEGORIES: Category[] = [
  'All',
  'DEX',
  'NFT',
  'Lending',
  'Staking',
  'DeFi',
  'Governance',
  'Trading',
  'Infrastructure'
];

export function getCategoryFromTopics(topics: string[]): Category {
  const topicStr = topics.join(' ').toLowerCase();
  
  if (topicStr.includes('nft') || topicStr.includes('metaplex') || topicStr.includes('digital-assets')) {
    return 'NFT';
  }
  if (topicStr.includes('lending') || topicStr.includes('borrow') || topicStr.includes('loan')) {
    return 'Lending';
  }
  if (topicStr.includes('staking') || topicStr.includes('stake')) {
    return 'Staking';
  }
  if (topicStr.includes('dex') || topicStr.includes('amm') || topicStr.includes('swap') || topicStr.includes('liquidity')) {
    return 'DEX';
  }
  if (topicStr.includes('governance') || topicStr.includes('dao')) {
    return 'Governance';
  }
  if (topicStr.includes('trading') || topicStr.includes('bot') || topicStr.includes('arbitrage') || topicStr.includes('sniper')) {
    return 'Trading';
  }
  if (topicStr.includes('defi') || topicStr.includes('yield') || topicStr.includes('vault')) {
    return 'DeFi';
  }
  if (topicStr.includes('anchor') || topicStr.includes('framework') || topicStr.includes('library')) {
    return 'Infrastructure';
  }
  
  return 'Infrastructure';
}

export function getCategoryFromProgram(program: Program): Category {
  // First check topics
  const fromTopics = getCategoryFromTopics(program.topics || []);
  if (fromTopics !== 'Infrastructure') return fromTopics;
  
  // Then check description
  const desc = program.description?.toLowerCase() || '';
  if (desc.includes('nft') || desc.includes('metaplex')) return 'NFT';
  if (desc.includes('lending') || desc.includes('borrow')) return 'Lending';
  if (desc.includes('staking') || desc.includes('stake')) return 'Staking';
  if (desc.includes('dex') || desc.includes('amm') || desc.includes('swap')) return 'DEX';
  if (desc.includes('trading') || desc.includes('bot')) return 'Trading';
  if (desc.includes('defi')) return 'DeFi';
  if (desc.includes('governance')) return 'Governance';
  
  return 'Infrastructure';
}
