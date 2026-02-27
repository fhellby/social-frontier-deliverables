#!/usr/bin/env node
/**
 * social-frontier-context/inject.js
 * Standalone context injector — reads social-frontier knowledge files, outputs
 * a compact summary for bot context. No network calls, runs in <1 second.
 *
 * Usage:
 *   node skills/social-frontier-context/inject.js
 *   node skills/social-frontier-context/inject.js --full
 *   node skills/social-frontier-context/inject.js --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Points at sibling social-frontier skill's knowledge folder
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'social-frontier', 'knowledge');

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
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function tensionSignalSummary(achievementsMd, days = 7) {
  if (!achievementsMd) return null;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const counts = {};
  const lines = achievementsMd.split('\n').map(l => l.replace(/\r$/, ''));
  let inRange = false;
  for (const line of lines) {
    const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) { inRange = dateMatch[1] >= cutoff; continue; }
    if (!inRange) continue;
    // Match lines like: - **T4** ... ↑  or  - **T4**: ↑
    const tMatch = line.match(/\*\*(T\d+)\*\*.*?(↑|↓|~)/);
    if (tMatch) {
      const [, id, dir] = tMatch;
      if (!counts[id]) counts[id] = { up: 0, down: 0, mixed: 0 };
      if (dir === '↑') counts[id].up++;
      else if (dir === '↓') counts[id].down++;
      else counts[id].mixed++;
    }
  }
  if (Object.keys(counts).length === 0) return null;
  const parts = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, c]) => {
      const parts = [];
      if (c.up) parts.push(`${c.up}↑`);
      if (c.down) parts.push(`${c.down}↓`);
      if (c.mixed) parts.push(`${c.mixed}~`);
      return `${id}:${parts.join('')}`;
    });
  return parts.join(' · ');
}

function main() {
  const latestDate = latestSnapshotDate();
  const age = daysAgo(latestDate);

  const tldr         = readFile(path.join(KNOWLEDGE_DIR, 'views', 'tldr.md'));
  const deepDive     = readFile(path.join(KNOWLEDGE_DIR, 'views', 'deep-dive.md'));
  const trending     = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'trending.md'));
  const achievements = readFile(path.join(KNOWLEDGE_DIR, 'frontier', 'achievements.md'));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      lastUpdated: latestDate, ageInDays: age, stale: age > 2,
      tldr: tldr || null, trending: trending || null,
      paths: {
        tldr:     'skills/social-frontier/knowledge/views/tldr.md',
        deepDive: 'skills/social-frontier/knowledge/views/deep-dive.md',
        trending: 'skills/social-frontier/knowledge/frontier/trending.md',
        voices:   'skills/social-frontier/knowledge/frontier/voices.md',
      }
    }, null, 2));
    return;
  }

  if (!latestDate) {
    console.log('[Social Frontier] No data yet. Run: node skills/social-frontier/scripts/run.js');
    return;
  }

  const stale = age > 2
    ? `\n⚠️  Data is ${age} days old — run \`node skills/social-frontier/scripts/run.js\` to refresh.\n`
    : '';

  const signalSummary = tensionSignalSummary(achievements, 7);

  const lines = [
    `## Social Frontier Context`,
    `> 数据截止：**${latestDate}**（${age === 0 ? '今日' : `${age}天前`}）· 来源：HN + Reddit · 引用时请注明截止日期`,
    stale, '',
    tldr || '(no TLDR yet)',
    '',
  ];

  if (signalSummary) {
    lines.push(`**7天 Tension 信号计数:** ${signalSummary}`);
    lines.push('');
  }

  // Compact trending table
  if (trending) {
    const rows = trending.split('\n')
      .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Topic') && !l.includes('none yet'))
      .slice(0, 8);
    if (rows.length) {
      lines.push('**Tracked topics:**');
      lines.push('| Topic | Domain | Status |');
      lines.push('|-------|--------|--------|');
      rows.forEach(row => {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 5) lines.push(`| ${cols[0]} | ${cols[1]} | ${cols[4]} |`);
      });
      lines.push('');
    }
  }

  lines.push('**Detail files:**');
  lines.push('- `skills/social-frontier/knowledge/views/tldr.md`');
  lines.push('- `skills/social-frontier/knowledge/views/deep-dive.md`');
  lines.push('- `skills/social-frontier/knowledge/frontier/trending.md`');
  lines.push('- `skills/social-frontier/knowledge/frontier/voices.md`');
  lines.push(`- \`skills/social-frontier/knowledge/snapshots/${latestDate}/daily.md\``);

  if (FULL && deepDive) lines.push('', '---', '', deepDive);

  console.log(lines.join('\n'));
}

main();
