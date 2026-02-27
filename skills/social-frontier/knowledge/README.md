# Social Frontier — Knowledge Base

Tracks trending social discourse in AI/tech/startup/crypto communities.

## Structure

```
knowledge/
  config.json          ← what to monitor (edit this)
  index.md             ← bot-facing summary (auto-updated)
  frontier/
    trending.md        ← living topic tracker (accumulates)
    voices.md          ← key voices log (accumulates)
  snapshots/
    <YYYY-MM-DD>/
      raw.json         ← raw fetched signals
      daily.md         ← synthesized daily delta
  views/
    tldr.md            ← 5-bullet quick summary (refreshed each run)
    deep-dive.md       ← full domain breakdown (refreshed each run)
```

## Conventions

- `frontier/` files **accumulate** — never reset, only grow
- `snapshots/` are **immutable** — one per day, never overwritten
- `views/` are **refreshed** each run with latest synthesis
- `index.md` is the **bot entry point** — always start here

## Update Protocol

Each pipeline run (`node scripts/run.js`):
1. Fetch signals from configured sources
2. Synthesize into daily.md snapshot
3. Incrementally update trending.md + voices.md
4. Refresh views + index

Run daily via cron or on-demand.
