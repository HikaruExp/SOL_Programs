# 🤖 Automated Solana Program Discovery System

## Overview
Neverending loop that automatically discovers, categorizes, and adds new Solana programs to your database every 6 hours.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISCOVERY ENGINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  GitHub API  │────▶│  Categorizer │────▶│   Database   │    │
│  │   Search     │     │  + Embedder  │     │  (Neon/JSON) │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                              │        │
│         │              ┌──────────────┐               │        │
│         └─────────────▶│ Vector Store │◀──────────────┘        │
│                        │  (LanceDB)   │                        │
│                        └──────────────┘                        │
│                                                                  │
│  Every 6 hours ──▶ 50 new programs ──▶ Auto-categorized         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Discovery Script (`scripts/auto-discovery.js`)
**What it does:**
- Searches GitHub using rotating queries
- Filters by: min 5 stars, Rust/TS/JS only, not forks
- Auto-categorizes (DEX, NFT, Lending, etc.)
- Auto-subcategorizes (Raydium, Orca, Anchor, etc.)
- Saves to `data/github-solana-programs.json`

**Search queries rotate:**
- solana program anchor rust
- solana smart contract
- solana defi protocol
- solana nft contract
- solana staking program
- solana dex raydium orca
- solana lending protocol
- solana governance
- solana wallet adapter
- solana token program

### 2. Cron Job
**Schedule:** Every 6 hours (4x per day)  
**Job ID:** `solana-program-discovery`  
**Actions:**
1. Run discovery script
2. Auto-commit new programs to GitHub
3. Report findings via Telegram

### 3. Auto-Deploy
**On new commits:**
- GitHub Action triggers Vercel redeploy
- Website updates with new programs
- Vector DB syncs embeddings

## Database Schema

### Programs Table (Neon PostgreSQL)
```sql
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) UNIQUE NOT NULL,
  owner VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  stars INTEGER DEFAULT 0,
  language VARCHAR(50),
  category VARCHAR(50),
  sub_category VARCHAR(50),
  topics TEXT[],
  updated_at TIMESTAMP,
  discovered_at TIMESTAMP DEFAULT NOW(),
  embedding VECTOR(769)  -- for semantic search
);
```

### Vector Embeddings (LanceDB)
- 769-dimensional vectors
- Semantic similarity search
- Enables "find programs like X"

## Categorization System

### Categories
| Category | Keywords |
|----------|----------|
| DEX | dex, swap, amm |
| NFT | nft, metaplex, token |
| Lending | lend, borrow, yield |
| Staking | stake, validator |
| Governance | governance, dao, vote |
| Trading | trading, bot, sniper |
| DeFi | bridge, cross-chain, defi |
| Infrastructure | wallet, adapter, anchor, sdk |

### Subcategories (Examples)
- DEX: Raydium, Orca, Jupiter, AMM, Orderbook
- NFT: Marketplace, Minting, Metaplex
- Trading: Sniper, Trading Bot, Arbitrage
- Infrastructure: Anchor, SDK, Client

## Monitoring

### Logs
- `data/discovery-log.json` - Discovery run history
- `data/github-solana-programs.json` - Master database

### Alerts
Cron job reports via Telegram:
- How many new programs found
- Any errors encountered
- Total program count

## Value for AI Coding Agents

Your database provides:

1. **Ground Truth**: 1,000+ real, working Solana programs
2. **Semantic Search**: Find similar code via vector similarity
3. **Patterns**: "Most DEX programs use this structure"
4. **Trust Scores**: Stars, last updated, owner reputation
5. **Categories**: Pre-organized by function
6. **Embeddings**: 769-dim vectors for neural models

### Use Cases

**AI Code Completion:**
```
User: "Write a staking contract"
AI: Queries vector DB → Finds top 5 staking programs → 
     Generates code based on patterns → Cites sources
```

**Code Review:**
```
User: "Review my DEX contract"
AI: Compares to similar DEX programs → 
     Identifies missing checks → Suggests improvements
```

**Smart Recommendations:**
```
User: "Building an NFT marketplace"
AI: Finds Metaplex programs → Shows integration patterns →
     Suggests best practices
```

## Monetization via API

### API Endpoints (Future)

```
POST /api/v1/search
{
  "query": "staking with anchor",
  "limit": 5
}

Response:
{
  "programs": [
    {
      "name": "spl-stake-pool",
      "similarity": 0.94,
      "code_snippet": "...",
      "stars": 2500
    }
  ]
}
```

### Pricing Tiers
- **Free**: 100 requests/day
- **Pro ($29/mo)**: 10,000 requests
- **Enterprise ($199/mo)**: Unlimited + custom embeddings

### Target Customers
- Cursor/Windsurf AI tools
- GitHub Copilot extensions
- Solana developer platforms
- Web3 coding bootcamps

## Setup Instructions

### 1. Install Dependencies
```bash
cd /tmp/sol-programs-clean
npm install
```

### 2. Configure GitHub Token
```bash
gh auth login
```

### 3. Set up Neon DB
```bash
# Add to .env
DATABASE_URL="postgresql://..."
```

### 4. Run Discovery Manually
```bash
node scripts/auto-discovery.js
```

### 5. Verify Cron Job
```bash
openclaw cron list
```

## Troubleshooting

### Discovery not finding programs
- Check GitHub API rate limit: `gh api rate_limit`
- Verify queries return results on GitHub.com
- Increase `minStars` threshold if needed

### Database connection fails
- Fallback to JSON mode (already implemented)
- Check `DATABASE_URL` env var
- Verify Neon DB is running

### Vercel not deploying
- Check GitHub Actions tab for errors
- Verify Vercel token is set in secrets
- Manually redeploy from Vercel dashboard

## Stats & Growth

| Metric | Current | Target |
|--------|---------|--------|
| Programs | 1,389 | 5,000+ |
| Categories | 8 | 15+ |
| Update freq | 6 hours | Real-time |
| API requests | 0 | 10k/day |

---

**The system runs 24/7. You wake up to new programs every day.** 🚀
