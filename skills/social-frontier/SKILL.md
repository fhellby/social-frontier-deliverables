---
name: social-frontier
description: "PROACTIVE: Run scripts/context.js first whenever user asks about: what people are discussing, trending topics, community opinions, social discourse, what's hot, AI/tech/startup/crypto community signals, what researchers/founders/devs are saying, 大家在讨论什么, 最近的热点, 社区动向, 有什么新东西. This skill has accumulated social frontier knowledge — inject it into context before answering so you can give grounded, evidence-based replies instead of guessing. For full pipeline (fetch fresh data): run scripts/run.js. For context injection only (instant, no network): run scripts/context.js."
---

# Social Frontier Tracker

Track what's hot in AI/tech/startup/crypto social discourse. Accumulates daily snapshots and a living frontier map.

## Quick Start

```bash
# Full pipeline: fetch → synthesize → update frontier → generate views
node skills/social-frontier/scripts/run.js

# Fetch signals only (no write)
node skills/social-frontier/scripts/fetch.js

# Regenerate views from existing frontier
node skills/social-frontier/scripts/views.js

# Show current frontier summary
node skills/social-frontier/scripts/run.js --status
```

## What It Tracks

Configured in `knowledge/config.json`:
- **Domains**: AI/ML, startups, crypto, developer tools
- **Voices**: key X/Twitter accounts and communities
- **Sources**: web search (Perplexity), HN, Reddit signals

## Output Files

| File | Updated | Purpose |
|------|---------|---------|
| `knowledge/index.md` | Each run | Current state summary for bot context |
| `knowledge/views/tldr.md` | Each run | 5-bullet quick summary |
| `knowledge/views/deep-dive.md` | Each run | Detailed analysis |
| `knowledge/frontier/trending.md` | Accumulates | Living list of tracked topics |
| `knowledge/frontier/voices.md` | Accumulates | Key voices and recent positions |
| `knowledge/snapshots/<date>/daily.md` | Daily | What's new today |

## Iterative Protocol

Each run:
1. **Fetch** — search social signals for configured domains
2. **Triage** — identify top 5-8 items worth tracking
3. **Update frontier** — append to `trending.md`, note voices
4. **Snapshot** — save dated daily delta
5. **Views** — refresh `tldr.md` and `deep-dive.md`

## Config

Edit `knowledge/config.json` to customize:
- `domains`: what areas to monitor
- `voices`: specific accounts to track
- `focus`: narrow to specific sub-topics
