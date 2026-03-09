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

# GenAI 盈利实例发现子系统（本次新增）
# 使用现有 observation/social-frontier/genai-trading-profits 数据，
# 每日自动归档到 knowledge/instances.json & instances.md
bash skills/social-frontier/scripts/cron_daily.sh
```

## What It Tracks

Configured in `knowledge/config.json`:
- **Domains**: AI/ML, startups, crypto, developer tools
- **Voices**: key X/Twitter accounts and communities
- **Sources**: web search (Perplexity), HN, Reddit signals

另外，`references/topic_config.json` 定义了 GenAI 盈利实例发现的搜索范围
（X/HN/Reddit/泛 web），并通过 Python 脚本串到 observation 管线的输出。

## Output Files

| File | Updated | Purpose |
|------|---------|---------|
| `knowledge/index.md` | Each run | Current state summary for bot context |
| `knowledge/views/tldr.md` | Each run | 5-bullet quick summary |
| `knowledge/views/deep-dive.md` | Each run | Detailed analysis |
| `knowledge/frontier/trending.md` | Accumulates | Living list of tracked topics |
| `knowledge/frontier/voices.md` | Accumulates | Key voices and recent positions |
| `knowledge/snapshots/<date>/daily.md` | Daily | What's new today |
| `knowledge/instances.json` | Daily via cron | GenAI 盈利/亏损实例的结构化集合（source of truth） |
| `knowledge/instances.md` | Daily via cron | 人类可读版（含质量仪表盘 + 七大分类） |
| `knowledge/delta.md` | Daily via cron | 最近一次扫描的增量（只含 [NEW] 实例） |

## Iterative Protocol

Each run:
1. **Fetch** — search social signals for configured domains
2. **Triage** — identify top 5-8 items worth tracking
3. **Update frontier** — append to `trending.md`, note voices
4. **Snapshot** — save dated daily delta
5. **Views** — refresh `tldr.md` and `deep-dive.md`

GenAI 盈利实例子系统的 daily cron 则遵循：
1. `collect.py` 读取 observation/social-frontier/genai-trading-profits 的最新实例
2. `classify.py` 用 LLM/启发式为每条打上 7 类标签 + 🟢🟡🔴 可信度
3. `merge_instances.py` 写入/合并到 `knowledge/instances.json`，并记录本次新增 ID
4. `generate_report.py` 生成 `instances.md` + `delta.md`，并在头部写 Quality Dashboard

## Config

Edit `knowledge/config.json` to customize:
- `domains`: what areas to monitor
- `voices`: specific accounts to track
- `focus`: narrow to specific sub-topics

Edit `references/topic_config.json` to extend/调整 GenAI 盈利实例的搜索范围。
