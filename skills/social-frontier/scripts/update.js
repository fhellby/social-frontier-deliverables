#!/usr/bin/env node
/**
 * social-frontier/scripts/update.js
 * Reads today's raw.json signal file, uses DeepSeek to synthesize,
 * then updates frontier files and creates daily snapshot.
 *
 * Usage:
 *   node scripts/update.js              # reads today's raw.json
 *   node scripts/update.js --date 2026-02-25   # specific date
 *   cat raw.json | node scripts/update.js --stdin
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
const DATE_ARG   = args.includes('--date')  ? args[args.indexOf('--date')  + 1] : null;
const KDIR_ARG   = args.includes('--kdir')  ? args[args.indexOf('--kdir')  + 1] : null;
const STDIN_MODE = args.includes('--stdin');

const KNOWLEDGE_DIR = KDIR_ARG || process.env.SF_KNOWLEDGE_DIR || path.join(SKILL_DIR, 'knowledge');

const httpsAgent = new HttpsProxyAgent(PROXY);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
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
      temperature: 0.3,
      max_tokens: 3000,
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

// Detect which community each signal came from
function communityOf(source, domain) {
  if (source === 'hn') return 'dev';
  if (!domain) return 'other';
  if (['ChatGPT'].includes(domain)) return 'consumer-ai';
  if (['CryptoCurrency', 'Bitcoin'].includes(domain)) return 'crypto';
  if (['Entrepreneur', 'ycombinator'].includes(domain)) return 'startup';
  if (['programming', 'webdev', 'LocalLLaMA'].includes(domain)) return 'dev';
  return 'other';
}

// NEL-2+ check: returns unique community count for a given signal appearing across rawData
function nel2Status(rawData) {
  const communities = new Set();
  (rawData.hn || []).forEach(s => communities.add('dev'));
  Object.entries(rawData.reddit || {}).forEach(([domain, posts]) => {
    if (posts.length > 0) {
      const community = communityOf('reddit', posts[0].subreddit || domain);
      communities.add(community);
    }
  });
  return communities.size >= 2 ? `✅ NEL-2+ (${[...communities].join(', ')})` : `⏳ NEL-1 (${[...communities].join(', ')})`;
}

async function synthesizeDailyMd(rawData, dateStr) {
  const problems    = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'problems.md'))    || '(none yet)';
  const hypotheses  = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'hypotheses.md'))  || '(none yet)';
  const nel2        = nel2Status(rawData);

  const systemPrompt = `You are a social intelligence analyst with deep context on tech/AI/startup/crypto discourse.
You have a structured frontier map (Problems = cognitive splits between camps + Hypotheses = falsifiable bets).
Your job is NOT to summarize headlines — map signals onto the existing problems and hypotheses,
identify which CAMP each signal supports, and note what moves. Quality bar: 1-2 genuine aha moments.`;

  const hnTop = (rawData.hn || []).slice(0, 15).map(s => `[HN ${s.score}] ${s.title}`).join('\n');
  const redditTop = Object.entries(rawData.reddit || {}).map(([domain, posts]) =>
    posts.slice(0, 5).map(p => `[Reddit/${domain} ${p.score}] ${p.title}`).join('\n')
  ).join('\n');

  const userPrompt = `Today: ${dateStr}
Today's data cross-community status: ${nel2}

=== Raw signals ===
${hnTop}
${redditTop}

=== Problems map (T# = cognitive splits between camps) ===
${problems.slice(0, 3000)}

=== Hypotheses (H# = falsifiable community bets) ===
${hypotheses.slice(0, 2000)}

Write the daily delta:

# Social Frontier — Daily Delta (${dateStr})

## Signal → Problem Mapping
For each notable signal: which T# does it touch? Which CAMP does it support? Be specific.
Format: **[Signal]** → T# Camp A/B strengthened — why

## Problem State Updates
Any T# where today's signals meaningfully shift which camp is winning?

## Hypothesis Check
Any H# that received confirming or falsifying evidence today?

## New Signal / Possible New Problem
Anything that doesn't fit existing T# and suggests a new community split?

## Sentiment Pulse
| Domain | Mood | Key signal |
|--------|------|-----------|

No filler. If a tension is unchanged, don't mention it.`;

  return llm(systemPrompt, userPrompt);
}

async function updateTrendingMd(rawData, dateStr) {
  const existingTrending = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'trending.md'));

  const systemPrompt = `You maintain a living frontier map of social discourse in tech/AI/startup/crypto.
Each topic is tracked with: first seen date, latest date, status (rising/stable/declining/faded), and brief note.
You update incrementally — don't overwrite the whole file, just add new topics and update existing ones.`;

  const hnTop2 = (rawData.hn || []).slice(0, 20).map(s => `[HN ${s.score}] ${s.title}`).join('\n');
  const redditSummary2 = Object.entries(rawData.reddit || {}).map(([domain, posts]) =>
    posts.slice(0, 4).map(p => `[Reddit/${domain} ${p.score}] ${p.title}`).join('\n')
  ).join('\n');

  const nel2Note = nel2Status(rawData);

  const userPrompt = `Today is ${dateStr}. Cross-community status: ${nel2Note}
New signals:
${hnTop2}
${redditSummary2}

Current trending.md:
${existingTrending && !existingTrending.includes('(none yet)') ? existingTrending : '(empty — this is the first run, build fresh)'}

Extract topics from the signals above and write the COMPLETE updated trending.md.

Rules:
- Extract 5-10 distinct topics from the signals
- Each row: | Topic | Domain | First Seen | Latest | Status | Note |
- Status values: rising | stable | declining | fading
- New topics start as "rising"
- Existing topics: update Latest date and Status based on new signals
- Topics not in new signals for 7+ days → "fading"
- Sort by Status (rising first), then Latest date desc
- Header line: "# Social Frontier — Trending Topics"
- Second line: "*Last updated: ${dateStr}*"
- Then the table
- Return ONLY the complete markdown file, no explanation, no code fences`;

  return llm(systemPrompt, userPrompt);
}

async function updateAchievementsMd(rawData, dateStr) {
  const existingAchievements = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'achievements.md'));
  const problems    = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'problems.md'))    || '(none yet)';
  const hypotheses  = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'hypotheses.md'))  || '(none yet)';

  const nel2Label = nel2Status(rawData);
  const nel2Reached = nel2Label.startsWith('✅');

  const systemPrompt = `You maintain a signal log that maps notable community signals to a structured frontier map (Problems T# = cognitive splits between camps + Hypotheses H# = falsifiable bets).
Each entry shows WHICH CAMP the signal supports and WHY. Always note NEL-2+ status (cross-community resonance).
Quality bar: entries should enable a bot to say "T4 (Craft Preservationists camp) has 3 NEL-2+ signals this week" with specific evidence.`;

  // Filter for high-engagement signals only
  const hnNotable = (rawData.hn || [])
    .filter(s => s.score >= 100 || s.comments >= 150)
    .slice(0, 15)
    .map(s => `[HN ${s.score}, ${s.comments} comments] "${s.title}"`);
  const redditNotable = Object.entries(rawData.reddit || {}).flatMap(([domain, posts]) =>
    posts.filter(p => p.score >= 300 || p.comments >= 150)
      .map(p => `[Reddit/${domain} ${p.score}, ${p.comments} comments] "${p.title}"`)
  );

  if (hnNotable.length === 0 && redditNotable.length === 0) return null;

  const userPrompt = `Today: ${dateStr}
Today's data cross-community status: ${nel2Label}
${nel2Reached ? 'These signals have NEL-2+ validation — they crossed community boundaries.' : 'Single-community signals only today.'}

Notable signals (high score or comments):
${[...hnNotable, ...redditNotable].join('\n')}

Problems map (T# = cognitive splits between camps):
${problems.slice(0, 2500)}

Hypotheses (H# = falsifiable bets):
${hypotheses.slice(0, 1500)}

Write a new "## ${dateStr}" section for the signal log.

For each signal RELEVANT to a T# or H#:
- **[source score, comments] "title"** ${nel2Reached ? '[NEL-2+]' : '[NEL-1]'}
- Then bullets: **T#** (Camp name) ↑/↓/~ — one sentence on WHY this camp is strengthened/weakened
- Or: **H#** — confirming/falsifying evidence
- Flag new splits: ⚠️ **T new candidate** (name): one sentence

Skip signals with no T#/H# relevance. Output ONLY the ## ${dateStr} section.`;

  return llm(systemPrompt, userPrompt);
}

async function updateVoicesMd(rawData, dateStr) {
  const existingVoices = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'voices.md'));

  const systemPrompt = `You track key voices in tech/AI/startup/crypto discourse.
You note what positions they're taking and when they were last active on notable topics.`;

  const hnTop3 = (rawData.hn || []).slice(0, 15).map(s => `[HN by:${s.by}] ${s.title}`).join('\n');
  const redditTop3 = Object.entries(rawData.reddit || {}).flatMap(([d, posts]) =>
    posts.slice(0, 3).map(p => `[Reddit/${d}] ${p.title}`)
  ).join('\n');

  const userPrompt = `Today is ${dateStr}. New signals (extract any named voices/orgs):
${hnTop3}
${redditTop3}

Current voices.md:
${existingVoices || '(empty — this is the first run)'}

Update voices.md. Add or update entries for any voices mentioned in signals.
Format:
## @handle / Org Name
- **Last active**: ${dateStr}
- **Position**: what they said / what stance they're taking
- **Domain**: AI|Crypto|Startups|DevTools

Return the COMPLETE updated file content.`;

  return llm(systemPrompt, userPrompt);
}

async function main() {
  const dateStr = DATE_ARG || today();

  let rawData;
  if (STDIN_MODE) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    rawData = JSON.parse(Buffer.concat(chunks).toString());
  } else {
    const rawPath = path.join(KNOWLEDGE_DIR, 'snapshots', dateStr, 'raw.json');
    if (!fs.existsSync(rawPath)) {
      console.error(`[update] No raw.json for ${dateStr}. Run fetch.js first.`);
      process.exit(1);
    }
    rawData = JSON.parse(fs.readFileSync(rawPath));
  }

  const snapshotDir = path.join(KNOWLEDGE_DIR, 'snapshots', dateStr);
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.mkdirSync(path.join(KNOWLEDGE_DIR, 'frontier'), { recursive: true });

  process.stderr.write('[update] synthesizing daily report... ');
  const dailyMd = await synthesizeDailyMd(rawData, dateStr);
  fs.writeFileSync(path.join(snapshotDir, 'daily.md'), dailyMd);
  process.stderr.write('done\n');

  process.stderr.write('[update] updating trending.md... ');
  const trendingMd = await updateTrendingMd(rawData, dateStr);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'frontier', 'trending.md'), trendingMd);
  process.stderr.write('done\n');

  process.stderr.write('[update] updating voices.md... ');
  const voicesMd = await updateVoicesMd(rawData, dateStr);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'frontier', 'voices.md'), voicesMd);
  process.stderr.write('done\n');

  process.stderr.write('[update] tagging signals to achievements.md... ');
  const achievementSection = await updateAchievementsMd(rawData, dateStr);
  if (achievementSection) {
    const achievementsPath = path.join(KNOWLEDGE_DIR, 'frontier', 'achievements.md');
    const existing = readFile(achievementsPath);
    // Avoid duplicate date sections
    if (!existing.includes(`## ${dateStr}`)) {
      const ANCHOR = '## Emerging Tension Candidates';
      const anchorPos = existing.indexOf(ANCHOR);
      const newBlock = '\n---\n\n' + achievementSection + '\n';
      let updated;
      if (anchorPos !== -1) {
        // Insert daily section before the candidates table
        updated = existing.slice(0, anchorPos) + newBlock + '\n' + existing.slice(anchorPos);
      } else {
        updated = existing + newBlock;
      }
      fs.writeFileSync(achievementsPath, updated);
    }
  }
  process.stderr.write('done\n');

  console.log(`[update] snapshot written to ${snapshotDir}/daily.md`);
}

main().catch(err => {
  console.error('[update] fatal:', err.message);
  process.exit(1);
});
