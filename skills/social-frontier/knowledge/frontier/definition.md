# Social Frontier — Working Definition

> This file defines the scope and boundaries of what social-frontier tracks.
> It is the anchor that prevents scope creep and keeps the frontier map coherent.

As-of: 2026-02-26

---

## One-Sentence Definition

Social frontier tracks how **developer, researcher, and investor communities argue, split, and form bets** around AI, tech infrastructure, startups, and crypto — not the technologies themselves, but the **cognitive conflicts and collective narratives** those technologies generate.

## Why This Is a Distinct Topic

Most frontier tracking follows the technology: what models can do, what benchmarks say, what papers claim. Social frontier tracks the **human layer on top**: how communities form camps, which narratives are gaining believers, where trust is being built or eroded.

This is a distinct topic because:

1. **Discourse leads adoption.** A technology's trajectory is shaped more by community belief than by technical capability — "open source will catch up" as a narrative drives talent and funding before it becomes true.

2. **Cognitive splits are structurally stable.** "Efficiency believers vs. quality guardians" as a community split persists across tools, languages, and years. Tracking the split reveals more than tracking individual tool debates.

3. **Social signals predict before market signals.** Developer backlash on HN/Reddit (T4: AI Code Quality) preceded mainstream press coverage by 3-4 weeks. The frontier is where belief shifts before outcomes do.

4. **The discourse IS the product in AI.** For AI companies, winning the narrative ("most trustworthy", "most capable", "most open") matters as much as winning benchmarks. Tracking narrative velocity is tracking competitive positioning.

## The Key Distinction

- **ai-frontier** (if it existed): what AI *can* do — capability, benchmarks, research
- **social-frontier**: what people *think* about what AI can do — adoption reactions, backlash, hype cycles, community bets

The same event (e.g., Qwen3.5 release) is tracked differently:
- ai-frontier: "Qwen3.5 achieves X on benchmark Y"
- social-frontier: "Community initially excited → discovered it craters on real coding tasks → T2 (Open Source Parity) weakened"

## Scope Boundaries

**In-scope:**
- Developer attitudes toward AI tools (adoption, backlash, quality concerns)
- Community debates about open-source vs. commercial (pricing, control, lock-in)
- Startup community narratives (what bets they're making, what they're rejecting)
- Crypto community sentiment cycles (FUD vs. euphoria, regulatory reaction)
- Safety/ethics discourse as it affects community behavior (not as policy analysis)
- Geopolitical tech discourse where it surfaces in dev/tech communities (data sovereignty, regulation)

**Out-of-scope:**
- AI capability claims not discussed in community (lab announcements without HN/Reddit traction)
- Financial market analysis (price movements tracked only insofar as community reacts)
- Pure geopolitics without tech community angle
- Individual product reviews (only discourse *patterns* matter, not single reviews)

## Scope Test

> "Is this about what happened, or about how the tech community is reacting to what happened?"
> If the latter → in-scope.

> "Does this signal reveal a shift in community confidence, stance, or behavior?"
> If yes → tag to a tension or narrative.

## Primary Signal Sources

| Source | Why | Coverage |
|--------|-----|----------|
| Hacker News | Core developer/founder discourse | AI, dev-tools, startups |
| Reddit/r/LocalLLaMA | Open-source AI community | AI/ML practitioner sentiment |
| Reddit/r/ChatGPT | Mass consumer AI users | AI mainstream adoption/backlash |
| Reddit/r/programming | Developer professional discourse | Dev tools, quality debates |
| Reddit/r/CryptoCurrency | Crypto community mainstream | Market sentiment, regulation reactions |
| Reddit/r/Bitcoin | Bitcoin-specific community | BTC narrative cycles |
| Reddit/r/Entrepreneur | Startup founder community | Business model bets, niche vs. scale |
| Reddit/r/ycombinator | YC ecosystem | Startup trends, VC narratives |

## Key Structural Documents

- `problems.md`: Cognitive splits (T#) — named camps, which side evidence is accumulating for
- `hypotheses.md`: Falsifiable bets (H#) — time-bound claims with explicit falsification conditions
- `achievements.md`: Signal log — each notable signal tagged to T#/N# with confidence impact
- `views/tldr.md`: Weekly 5-bullet summary for quick consumption
- `views/deep-dive.md`: Structural analysis from tensions + narratives lens

## What "Quality" Means Here

A good entry in the tensions/narratives framework makes the bot able to say:

> "T4 (AI Code Quality Backlash) has 4 strengthening signals this week — RAGS RFC, Vibe Coding Threatens OSS, 'AI has taken fun out of programming' (413 upvotes), and GPT-5 complaints megathread (4019 comments). The backlash has moved from code quality to developer identity. This is different from last week."

Not:
> "People are talking about AI code quality."
