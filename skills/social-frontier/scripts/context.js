#!/usr/bin/env node
/**
 * social-frontier/scripts/context.js
 * Lightweight context injector — no network calls, runs in <1s.
 * Called automatically when bot receives frontier-related questions.
 * Outputs a compact summary of current frontier state for bot context.
 *
 * Usage:
 *   node skills/social-frontier/scripts/context.js
 *   node skills/social-frontier/scripts/context.js --full    # include deep-dive
 *   node skills/social-frontier/scripts/context.js --json    # structured JSON
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(SKILL_DIR, 'knowledge');

const args = process.argv.slice(2);
const FULL = args.includes('--full');
const JSON_OUT = args.includes('--json');

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8').trim(); } catch { return null; }
}

function latestSnapshotDate() {
  const snapDir = path.join(KNOWLEDGE_DIR, 'snapshots');
  if (!fs.existsSync(snapDir)) return null;
  const dates = fs.readdirSync(snapDir)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function daysAgo(dateStr) {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function main() {
  const latestDate = latestSnapshotDate();
  const age = daysAgo(latestDate);

  const tldr = readFile(path.join(KNOWLEDGE_DIR, 'views', 'tldr.md'));
  const deepDive = readFile(path.join(KNOWLEDGE_DIR, 'views', 'deep-dive.md'));
  const trending = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'trending.md'));
  const voices = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'voices.md'));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      lastUpdated: latestDate,
      ageInDays: age,
      stale: age > 2,
      tldr: tldr || null,
      trending: trending || null,
      paths: {
        index: 'skills/social-frontier/knowledge/index.md',
        tldr: 'skills/social-frontier/knowledge/views/tldr.md',
        deepDive: 'skills/social-frontier/knowledge/views/deep-dive.md',
        trending: 'skills/social-frontier/knowledge/frontier/trending.md',
        voices: 'skills/social-frontier/knowledge/frontier/voices.md',
      }
    }, null, 2));
    return;
  }

  if (!latestDate) {
    console.log(`[Social Frontier] No data yet. Run: node skills/social-frontier/scripts/run.js`);
    return;
  }

  const staleWarning = age > 2
    ? `\n⚠️  Data is ${age} days old. Run \`node skills/social-frontier/scripts/run.js\` to refresh.\n`
    : '';

  // Compact output for bot context injection
  const lines = [
    `## Social Frontier Context (last updated: ${latestDate})`,
    staleWarning,
    '',
    tldr || '(no TLDR yet)',
    '',
  ];

  if (trending) {
    // Only include the table rows, not the full file
    const trendingLines = trending.split('\n').filter(l =>
      l.startsWith('|') && !l.includes('---') && !l.includes('Topic')
    ).slice(0, 8);
    if (trendingLines.length) {
      lines.push('**Tracked topics:**');
      lines.push('| Topic | Domain | Status |');
      lines.push('|-------|--------|--------|');
      trendingLines.forEach(row => {
        // Extract topic, domain, status columns (cols 1, 2, 5)
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 5) {
          lines.push(`| ${cols[0]} | ${cols[1]} | ${cols[4]} |`);
        }
      });
      lines.push('');
    }
  }

  lines.push('**Available detail files:**');
  lines.push('- `skills/social-frontier/knowledge/views/tldr.md` — quick summary');
  lines.push('- `skills/social-frontier/knowledge/views/deep-dive.md` — full domain breakdown');
  lines.push('- `skills/social-frontier/knowledge/frontier/trending.md` — topic history');
  lines.push('- `skills/social-frontier/knowledge/frontier/voices.md` — key voices');
  lines.push(`- \`skills/social-frontier/knowledge/snapshots/${latestDate}/daily.md\` — today's delta`);

  if (FULL && deepDive) {
    lines.push('', '---', '', deepDive);
  }

  console.log(lines.join('\n'));
}

main();
