---
name: social-frontier-context
description: "ALWAYS run this skill first when user asks anything related to: what people are discussing, trending topics, community discourse, social signals, what's hot, AI/tech/startup/crypto community opinions, 大家在讨论什么, 最近热点, 社区动向, 今天有什么新东西, what researchers/founders/devs are saying, 根据最近很火的XXX. Instantly injects social frontier knowledge into context so answers are grounded in real signals, not guesses. Zero network calls — runs in under 1 second."
---

# Social Frontier Context Injector

Lightweight context injection. No pipeline, no network. Just reads accumulated frontier files and surfaces them.

## Usage

```bash
node skills/social-frontier-context/inject.js           # standard context dump
node skills/social-frontier-context/inject.js --full    # include deep-dive
node skills/social-frontier-context/inject.js --json    # structured JSON
```

## What It Outputs

- Latest TLDR (5 bullets)
- Tracked topics table (topic / domain / status)
- Paths to all detail files for bot to read further

## Source Data

All data is written by `social-frontier` skill pipeline.
Run `node skills/social-frontier/scripts/run.js` to refresh.
