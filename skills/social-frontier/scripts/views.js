#!/usr/bin/env node
/**
 * social-frontier/scripts/views.js
 * Reads current frontier state and generates audience-specific views.
 * Updates knowledge/views/tldr.md and knowledge/views/deep-dive.md
 * Also updates knowledge/index.md (the bot-facing summary).
 *
 * Usage:
 *   node scripts/views.js
 *   node scripts/views.js --date 2026-02-25   # use specific snapshot
 */

'use strict';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:10809';
const DEEPSEEK_KEY = 'sk-b1bce301270d436a81b391e9919b9c7b';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const args = process.argv.slice(2);
const DATE_ARG = args.includes('--date') ? args[args.indexOf('--date') + 1] : null;
const KDIR_ARG  = args.includes('--kdir') ? args[args.indexOf('--kdir') + 1] : null;

const KNOWLEDGE_DIR = KDIR_ARG || process.env.SF_KNOWLEDGE_DIR || path.join(SKILL_DIR, 'knowledge');

const httpsAgent = new HttpsProxyAgent(PROXY);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function latestSnapshotDate() {
  const snapDir = path.join(KNOWLEDGE_DIR, 'snapshots');
  if (!fs.existsSync(snapDir)) return null;
  const dates = fs.readdirSync(snapDir).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

async function llm(systemPrompt, userPrompt) {
  const response = await axios.post(
    DEEPSEEK_URL,
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
        'Content-Type': 'application/json',
      },
      httpsAgent,
      proxy: false,
      timeout: 60000,
    }
  );
  return response.data.choices[0].message.content.trim();
}

async function generateTldr(daily, trending, dateStr) {
  const systemPrompt = `You write ultra-concise briefings for a busy professional who needs to know what's happening in tech/AI/startup/crypto in 60 seconds.`;

  const userPrompt = `Today: ${dateStr}

Daily report:
${daily || '(not available)'}

Trending topics:
${trending ? trending.slice(0, 1500) : '(not available)'}

Write a TLDR view:

# Social Frontier TLDR — ${dateStr}

**5 things everyone's talking about:**
1. ...
2. ...
3. ...
4. ...
5. ...

**Biggest shift this week:** (one sentence)

**Worth watching:** (one emerging thing)

No fluff. Write like a smart friend, not a newsletter.`;

  return llm(systemPrompt, userPrompt);
}

function recentAchievements(achievementsMd, days = 7) {
  if (!achievementsMd) return '';
  // Extract sections by date header, return last `days` sections
  const sections = achievementsMd.split(/\n(?=## \d{4}-\d{2}-\d{2})/);
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return sections
    .filter(s => { const m = s.match(/^## (\d{4}-\d{2}-\d{2})/); return m && m[1] >= cutoff; })
    .join('\n\n');
}

async function generateDeepDive(daily, trending, voices, dateStr) {
  const tensions      = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'problems.md'))      || '';
  const narratives    = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'hypotheses.md'))   || '';
  const achievementsMd = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'achievements.md')) || '';
  const recentSignals = recentAchievements(achievementsMd, 7);

  const systemPrompt = `You are a senior analyst who tracks tech/AI/startup/crypto discourse structurally.
You have access to a living frontier map:
- Problems (T#): cognitive splits between named camps, with evidence for each camp
- Hypotheses (H#): falsifiable community bets with time horizons and falsification conditions
- Signal log: tagged evidence entries with NEL-2+ status
Your deep-dive should reason from cumulative evidence, identify which camps are winning, and check whether hypotheses are tracking toward confirmation or falsification.
Quality bar: someone who knows this space should get 1-2 genuine "aha" moments.`;

  const userPrompt = `Today: ${dateStr}

Signal log (last 7 days — tagged to T#/N#, use this for cumulative tension evidence):
${recentSignals ? recentSignals.slice(0, 3000) : '(not available)'}

Today's daily delta:
${daily ? daily.slice(0, 1000) : '(not available)'}

Problems map (T# = cognitive splits, named camps):
${tensions.slice(0, 2000)}

Hypotheses (H# = falsifiable bets, time-bound):
${narratives.slice(0, 1200)}

Key voices:
${voices ? voices.slice(0, 600) : '(not available)'}

Write the deep-dive:

# Social Frontier Deep Dive — ${dateStr}

## Macro Read
(What is the underlying story this week — not the headlines, but the structural shift they point to?)

## Problem Analysis (Camp Status)
(Pick 2-3 T# that had the most signal this week, using the signal log.
For each:
- Name the camps. Which camp got strengthening signals? Cite specific entries and NEL-2+ status.
- Is the split deepening, resolving, or shifting? What does the cumulative evidence show?
- What single event would most likely resolve this split?)

## Hypothesis Velocity
(For each H#: is confirming or falsifying evidence accumulating? At current velocity, will this hypothesis be confirmed or falsified by its time horizon?)

## Second-Order Effects
(If the dominant signals are real, who wins, who loses, what becomes more/less valuable?
Be specific — name companies, roles, technologies.)

## The Question Nobody Is Asking
(One underappreciated angle in this week's discourse — something the community is missing or avoiding)`;

  return llm(systemPrompt, userPrompt);
}

async function generateIndex(tldr, dateStr) {
  const systemPrompt = `You write a single-page index file that an AI assistant uses to know what frontier knowledge is available and when it was last updated.`;

  const userPrompt = `Last updated: ${dateStr}

TLDR:
${tldr}

Write an index.md for the bot:

# Social Frontier — Knowledge Index

**Last updated**: ${dateStr}

## Available Knowledge
- \`frontier/trending.md\` — living topic tracker
- \`frontier/voices.md\` — key voices log
- \`snapshots/\` — daily deltas (earliest: auto-populated)
- \`views/tldr.md\` — quick 5-bullet summary
- \`views/deep-dive.md\` — detailed domain breakdown

## Current Snapshot (${dateStr})
(paste the tldr bullets here verbatim)

## How to Use
When a user asks "what's trending", "what are people discussing", or questions that touch AI/tech/startup/crypto community discourse, reference these files. Start with \`views/tldr.md\` for quick context, \`views/deep-dive.md\` for domain detail.`;

  return llm(systemPrompt, userPrompt);
}

async function main() {
  const dateStr = DATE_ARG || latestSnapshotDate() || today();
  const snapshotDir = path.join(KNOWLEDGE_DIR, 'snapshots', dateStr);

  const daily = readFile(path.join(snapshotDir, 'daily.md'));
  const trending = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'trending.md'));
  const voices = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'voices.md'));

  if (!daily) {
    console.error(`[views] No daily.md for ${dateStr}. Run update.js first.`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(KNOWLEDGE_DIR, 'views'), { recursive: true });

  process.stderr.write('[views] generating tldr... ');
  const tldr = await generateTldr(daily, trending, dateStr);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'views', 'tldr.md'), tldr);
  process.stderr.write('done\n');

  process.stderr.write('[views] generating deep-dive... ');
  const deepDive = await generateDeepDive(daily, trending, voices, dateStr);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'views', 'deep-dive.md'), deepDive);
  process.stderr.write('done\n');

  process.stderr.write('[views] updating index.md... ');
  const index = await generateIndex(tldr, dateStr);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'index.md'), index);
  process.stderr.write('done\n');

  console.log(`[views] views written for ${dateStr}`);
  console.log('\n' + '='.repeat(60));
  console.log(tldr);
}

main().catch(err => {
  console.error('[views] fatal:', err.message);
  process.exit(1);
});
