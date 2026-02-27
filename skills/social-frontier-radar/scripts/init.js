#!/usr/bin/env node
/**
 * social-frontier-radar/scripts/init.js
 *
 * Reads init/confirm.yaml + init/tension_candidates.md for a topic,
 * then writes canonical frontier files into:
 *   knowledge/social-frontier/{topic}/knowledge/frontier/
 *
 * Usage:
 *   node skills/social-frontier-radar/scripts/init.js --topic onchain-alpha
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const args  = process.argv.slice(2);
const TOPIC = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;

if (!TOPIC) {
  console.error('[init] --topic required');
  process.exit(1);
}

const WS              = path.join(__dirname, '..', '..', '..');
const KNOWLEDGE_ROOT  = path.join(WS, 'knowledge', 'social-frontier', TOPIC);
const INIT_DIR        = path.join(KNOWLEDGE_ROOT, 'init');
const KDIR            = path.join(KNOWLEDGE_ROOT, 'knowledge');

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function today() { return new Date().toISOString().slice(0, 10); }

// ── Parse confirm.yaml (no yaml dependency needed) ──────────────────────────
function parseConfirmYaml(content) {
  const confirmed = [];
  const rejected  = [];
  let section = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'confirmed:') { section = 'confirmed'; continue; }
    if (trimmed === 'rejected:')  { section = 'rejected';  continue; }
    if (trimmed === 'merge:')     { section = 'merge';     continue; }

    const m = trimmed.match(/^-\s+id:\s*"?([^"]+)"?/);
    if (m) {
      if (section === 'confirmed') confirmed.push(m[1]);
      else if (section === 'rejected') rejected.push(m[1]);
    }
  }
  return { confirmed, rejected };
}

// ── Extract **T1: label** blocks from tension_candidates.md ─────────────────
function extractTensionBlocks(content) {
  const blocks = {};
  // Match bold T# headers like **T1: …**  followed by body until next **T# or end
  const re = /\*\*(T\d+): ([^\n*]+)\*\*\n([\s\S]*?)(?=\*\*T\d+:|$)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const id    = m[1];
    const label = m[2].trim();
    const body  = m[3].trim();

    const campA    = (body.match(/Camp A: ([^\n]+)/)    || [])[1]?.trim() || '';
    const campB    = (body.match(/Camp B: ([^\n]+)/)    || [])[1]?.trim() || '';
    const winning  = (body.match(/当前谁在赢: ([^\n]+)/) || [])[1]?.trim() || '';
    const strength = (body.match(/信号强度: ([^\n]+)/)   || [])[1]?.trim() || '';

    blocks[id] = { id, label, camp_a: campA, camp_b: campB, winning, strength };
  }
  return blocks;
}

// ── problems.md entry for one tension ───────────────────────────────────────
function problemsEntry(t) {
  return [
    `### ${t.id} — ${t.label}`,
    `**Camp A:** ${t.camp_a}`,
    `**Camp B:** ${t.camp_b}`,
    `**NEL-2+:** ⏳ not yet reached`,
    `**当前谁在赢:** ${t.winning}`,
    `**信号强度:** ${t.strength}`,
    `**Current state:** Active — confirmed ${today()}`,
    '',
  ].join('\n');
}

function main() {
  // 1. confirm.yaml
  const confirmRaw = readFile(path.join(INIT_DIR, 'confirm.yaml'));
  if (!confirmRaw) {
    console.error('[init] confirm.yaml not found — run discover.js first and fill in confirm.yaml');
    process.exit(1);
  }
  const { confirmed, rejected } = parseConfirmYaml(confirmRaw);
  console.log(`[init] Confirmed: ${confirmed.join(', ') || '(none)'}`);
  console.log(`[init] Rejected:  ${rejected.join(', ') || '(none)'}`);

  // 2. tension_candidates.md
  const tcRaw = readFile(path.join(INIT_DIR, 'tension_candidates.md'));
  if (!tcRaw) {
    console.error('[init] tension_candidates.md not found');
    process.exit(1);
  }
  const tensions = extractTensionBlocks(tcRaw);
  console.log(`[init] Parsed T# blocks: ${Object.keys(tensions).join(', ') || '(none)'}`);

  // 3. topic label
  const topicConfig = JSON.parse(readFile(path.join(KNOWLEDGE_ROOT, 'topic_config.json')) || '{}');
  const label = topicConfig.label || TOPIC;

  // 4. create dirs
  const frontierDir = path.join(KDIR, 'frontier');
  fs.mkdirSync(frontierDir, { recursive: true });
  fs.mkdirSync(path.join(KDIR, 'snapshots'), { recursive: true });
  fs.mkdirSync(path.join(KDIR, 'views'), { recursive: true });

  // 5. problems.md
  const problemsLines = [
    `# ${label} — Problems Map`,
    '',
    `*Confirmed tensions from radar discovery. Last updated: ${today()}*`,
    '',
  ];
  for (const id of confirmed) {
    const t = tensions[id];
    if (t) {
      problemsLines.push(problemsEntry(t));
    } else {
      console.warn(`[init] Warning: ${id} confirmed but not found in tension_candidates.md`);
    }
  }
  const problemsPath = path.join(frontierDir, 'problems.md');
  fs.writeFileSync(problemsPath, problemsLines.join('\n'));
  console.log(`[init] Written: frontier/problems.md  (${confirmed.length} tensions)`);

  // 6. hypotheses.md (scaffold, skip if exists)
  const hypothesesPath = path.join(frontierDir, 'hypotheses.md');
  if (!fs.existsSync(hypothesesPath)) {
    fs.writeFileSync(hypothesesPath,
      `# ${label} — Hypotheses\n\n` +
      `*Falsifiable community bets. Add H# entries as patterns emerge.*\n\n` +
      `<!-- Format:\n` +
      `### H1 — "Hypothesis statement"\n` +
      `**Time horizon:** YYYY-QN\n` +
      `**Falsification conditions:**\n- ...\n` +
      `**Confirming evidence:** (accumulates here)\n` +
      `**Falsifying evidence:** (accumulates here)\n-->\n`
    );
    console.log('[init] Written: frontier/hypotheses.md  (scaffold)');
  } else {
    console.log('[init] Skipped: frontier/hypotheses.md  (already exists)');
  }

  // 7. achievements.md (scaffold, skip if exists)
  const achievementsPath = path.join(frontierDir, 'achievements.md');
  if (!fs.existsSync(achievementsPath)) {
    fs.writeFileSync(achievementsPath,
      `# ${label} — Signal Log\n\n` +
      `*Tagged signals mapped to T#/H#. Accumulates across runs.*\n\n` +
      `## Emerging Tension Candidates\n` +
      `| Candidate | First seen | Signal count |\n` +
      `|-----------|------------|-------------|\n`
    );
    console.log('[init] Written: frontier/achievements.md  (scaffold)');
  } else {
    console.log('[init] Skipped: frontier/achievements.md  (already exists)');
  }

  console.log(`\n[init] Done. Frontier ready at:`);
  console.log(`  ${frontierDir}`);
  console.log(`\n[init] Next: run social-frontier skill to start daily monitoring:`);
  console.log(`  node skills/social-frontier/scripts/run.js --topic onchain-alpha`);
}

main();
