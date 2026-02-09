# Solana Programs Sub-Categorization Analysis

## Overview
Successfully analyzed and categorized **1,389** Solana programs from GitHub into a hierarchical category system.

## Main Categories & Subcategories

### 1. DEX (453 programs)
Decentralized Exchange related programs
- **AMM** (376) - Automated Market Makers (Raydium, Orca, Meteora, PumpSwap)
- **Options** (29) - Options trading protocols
- **Aggregator** (25) - DEX aggregators (Jupiter, Autobahn)
- **Perpetuals** (15) - Perpetual futures DEXs
- **Orderbook** (8) - Orderbook-based DEXs (Openbook, Manifest, Bonfida)

### 2. NFT (314 programs)
Non-Fungible Token related programs
- **Staking** (153) - NFT staking platforms
- **Lending** (82) - NFT lending/borrowing protocols
- **Marketplace** (41) - NFT marketplaces (Metaplex, Tensor, Magic Eden)
- **Minting** (34) - NFT minting & launchpad tools
- **Infrastructure** (4) - NFT metadata & standards

### 3. Infrastructure (446 programs)
Developer tools and infrastructure
- **Development Framework** (371) - Anchor, Pinocchio, frameworks
- **Account Management** (40) - Wallets, SDKs, key management
- **Testing** (15) - Fuzzing, testing frameworks (Trident)
- **Oracles** (10) - Price feeds (Pyth, Chainlink)
- **Indexing** (10) - Data indexing (Yellowstone, gRPC parsers)

### 4. Trading (78 programs)
Trading bots and strategies
- **Arbitrage** (46) - Cross-DEX arbitrage bots
- **MEV** (16) - MEV extraction, sandwich bots
- **Sniper** (11) - Token launch snipers
- **Copy Trading** (5) - Copy trading bots

### 5. DeFi (37 programs)
General DeFi protocols
- **Vaults** (22) - Yield vaults, auto-compounders
- **Prediction Markets** (10) - Betting & prediction platforms
- **Yield Farming** (3) - Yield farming protocols
- **RWA** (2) - Real World Asset tokenization

### 6. Governance (27 programs)
DAO and governance tools
- **DAO** (19) - DAO frameworks (Realms, SPL Governance)
- **Voting** (6) - Voting systems
- **Treasury** (2) - Treasury management, multisigs

### 7. Lending (22 programs)
Lending and borrowing protocols
- **Yield Bearing** (15) - Interest-bearing protocols
- **Flash Loans** (3) - Flash loan protocols
- **Undercollateralized** (2) - Credit-based lending
- **Money Market** (2) - Compound-style money markets

### 8. Staking (12 programs)
Staking and liquid staking
- **Liquid Staking** (8) - LSTs (Marinade, Jito, Lido)
- **Validator Staking** (3) - Native validator delegation
- **LP Staking** (1) - Liquidity provider staking

## Statistics
- **Total Programs Analyzed**: 1,389
- **Programs Categorized**: 1,389 (100%)
- **Subcategories Created**: 33 out of 40 possible
- **Output File**: `/Users/openclaw/.openclaw/workspace/onchain-directory/data/programs-with-subcategories.json`

## Categorization Methodology

Programs were categorized based on:
1. **Name analysis** - Repository name keywords (highest weight)
2. **Topics/tags** - GitHub topic labels (high weight)
3. **Description** - Repository description text (medium weight)

Each program received confidence scores across all subcategories, with the highest-scoring match determining its placement.

## Key Insights

1. **AMM dominates DEX** - 83% of DEX programs are AMM-based
2. **Trading bots are popular** - Significant activity in arbitrage (46) and MEV (16)
3. **Infrastructure is crucial** - 32% of all programs are infrastructure/tools
4. **NFT staking leads** - Nearly half of NFT programs involve staking
5. **Liquid staking growth** - 8 programs focused on liquid staking derivatives

## Data Structure

Each program entry includes:
```json
{
  "id": "owner/repo-name",
  "name": "repo-name",
  "owner": "owner",
  "fullName": "owner/repo-name",
  "url": "https://github.com/...",
  "description": "...",
  "stars": 123,
  "language": "Rust",
  "topics": ["solana", "defi"],
  "updated": "2026-01-01T00:00:00Z",
  "category": "DEX",
  "subcategory": "AMM",
  "confidence": 25
}
```
