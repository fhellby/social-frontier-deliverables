#!/usr/bin/env node
/**
 * social-frontier/scripts/run.js
 * Full pipeline: fetch → update frontier → generate views
 *
 * Usage:
 *   node skills/social-frontier/scripts/run.js                    # default topic
 *   node skills/social-frontier/scripts/run.js --topic ai-agents  # named topic (own knowledge dir)
 *   node skills/social-frontier/scripts/run.js --all-topics       # run all configured topics in sequence
 *   node skills/social-frontier/scripts/run.js --status           # show current state
 *   node skills/social-frontier/scripts/run.js --views            # regenerate views only
 *   node skills/social-frontier/scripts/run.js --json             # output TLDR as JSON
 *
 * Topics:
 *   Each topic gets its own knowledge directory:
 *     knowledge/           ← default (broad social signals)
 *     knowledge-ai-agents/ ← topic: ai-agents
 *     knowledge-crypto/    ← topic: crypto (if configured)
 *   Topics are defined in knowledge/topics.json
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');

const args = process.argv.slice(2);
const STATUS_ONLY = args.includes('--status');
const VIEWS_ONLY  = args.includes('--views');
const JSON_OUTPUT = args.includes('--json');
const ALL_TOPICS  = args.includes('--all-topics');
const TOPIC_ARG   = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;
const DOMAIN_ARG  = args.includes('--domain') ? ['--domain', args[args.indexOf('--domain') + 1]] : [];

function today() { return new Date().toISOString().slice(0, 10); }

// Detect workspace root (parent of skills/ directory)
function workspaceDir() {
  // Go up from skills/social-frontier to workspace
  return path.join(SKILL_DIR, '..', '..');
}

function knowledgeDir(topic) {
  return topic
    ? path.join(SKILL_DIR, `knowledge-${topic}`)
    : path.join(SKILL_DIR, 'knowledge');
}

// Build problems.md content from topic_config.json tensions
function buildProblemsFromConfig(tensions, label) {
  const lines = [`# ${label} — Problems Map\n`, `*Seeded from topic_config.json. Update as signals accumulate.*\n`];
  for (const [id, t] of Object.entries(tensions)) {
    lines.push(`### ${id} — ${t.label}`);
    lines.push(`**Camp A:** ${t.camp_a}`);
    lines.push(`**Camp B:** ${t.camp_b}`);
    lines.push(`**NEL-2+:** ⏳ not yet reached`);
    lines.push(`**Current state:** Unresolved — insufficient signal accumulation\n`);
  }
  return lines.join('\n');
}

// Check for workspace topic config and set up persistent knowledge dir
function setupTopicKnowledgeDir(topic) {
  if (!topic) return { kdir: knowledgeDir(null), config: null };

  const ws = workspaceDir();
  const topicConfigPath = path.join(ws, 'knowledge', 'social-frontier', topic, 'topic_config.json');

  // Check if topic config exists in workspace
  if (fs.existsSync(topicConfigPath)) {
    console.log(`[run] Found workspace topic config: ${topicConfigPath}`);
    const topicConfig = JSON.parse(fs.readFileSync(topicConfigPath, 'utf8'));

    // Use persistent knowledge dir alongside topic_config.json
    const kdir = path.join(ws, 'knowledge', 'social-frontier', topic, 'knowledge');
    const isFirstInit = !fs.existsSync(path.join(kdir, 'config.json'));

    // Create necessary subdirectories
    fs.mkdirSync(path.join(kdir, 'snapshots'), { recursive: true });
    fs.mkdirSync(path.join(kdir, 'views'), { recursive: true });
    fs.mkdirSync(path.join(kdir, 'frontier'), { recursive: true });

    // Normalize subreddits: strip "r/" prefix if present
    const subreddits = (topicConfig.subreddits || []).map(s => s.replace(/^r\//, ''));

    // Always write config.json (idempotent, reflects latest topic_config)
    const customConfig = {
      schema: 'social-frontier.config.v1',
      domains: [{
        slug: topic,
        label: topicConfig.label || topic,
        enabled: true,
        queries: topicConfig.queries || []
      }],
      voices: topicConfig.voices || [],
      subreddits,
      synthesis: {
        top_items_per_domain: 5,
        total_frontier_items: 10,
        model: 'deepseek-chat',
        temperature: 0.3
      },
      birdKeywords: topicConfig.birdKeywords || topicConfig.queries || [],
      sources: {
        web_search: topicConfig.sources?.web_search ?? false,
        hn: topicConfig.sources?.hn ?? false,
        reddit: subreddits.length > 0,
        bird: topicConfig.sources?.bird ?? false,
      }
    };

    fs.writeFileSync(path.join(kdir, 'config.json'), JSON.stringify(customConfig, null, 2));

    // First-time init: seed frontier files from topic_config
    if (isFirstInit) {
      // Seed problems.md from topic_config tensions
      if (topicConfig.tensions && Object.keys(topicConfig.tensions).length > 0) {
        const problemsPath = path.join(kdir, 'frontier', 'problems.md');
        if (!fs.existsSync(problemsPath)) {
          const content = buildProblemsFromConfig(topicConfig.tensions, topicConfig.label || topic);
          fs.writeFileSync(problemsPath, content);
          console.log(`[run] Seeded problems.md with ${Object.keys(topicConfig.tensions).length} tensions from topic_config`);
        }
      }
      // Seed empty hypotheses.md scaffold
      const hypothesesPath = path.join(kdir, 'frontier', 'hypotheses.md');
      if (!fs.existsSync(hypothesesPath)) {
        const label = topicConfig.label || topic;
        fs.writeFileSync(hypothesesPath,
          `# ${label} — Hypotheses\n\n*Falsifiable community bets. Add H# entries as patterns emerge from signal accumulation.*\n\n` +
          `<!-- Format:\n### H1 — "Hypothesis statement"\n**Time horizon:** YYYY-QN\n**Falsification conditions:**\n- ...\n**Confirming evidence:** (accumulates here)\n**Falsifying evidence:** (accumulates here)\n-->\n`
        );
      }
      // Seed empty achievements.md scaffold
      const achievementsPath = path.join(kdir, 'frontier', 'achievements.md');
      if (!fs.existsSync(achievementsPath)) {
        const label = topicConfig.label || topic;
        fs.writeFileSync(achievementsPath,
          `# ${label} — Signal Log\n\n*Tagged signals mapped to T#/H#. Accumulates across runs.*\n\n## Emerging Tension Candidates\n| Candidate | First seen | Signal count |\n|-----------|------------|-------------|\n`
        );
      }
    }

    if (isFirstInit) {
      console.log(`[run] Initialized persistent knowledge dir: ${kdir}`);
    } else {
      console.log(`[run] Using existing knowledge dir: ${kdir}`);
    }
    console.log(`[run] Topic subreddits: ${subreddits.join(', ') || '(none)'}`);
    console.log(`[run] Sources enabled: HN=${customConfig.sources.hn} Reddit=${customConfig.sources.reddit}`);

    return { kdir, config: topicConfig };
  }

  // Fall back to default skill knowledge dir
  return { kdir: knowledgeDir(topic), config: null };
}

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function latestSnapshotDate(kdir) {
  const snapDir = path.join(kdir, 'snapshots');
  if (!fs.existsSync(snapDir)) return null;
  const dates = fs.readdirSync(snapDir).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function loadTopics() {
  const p = path.join(SKILL_DIR, 'knowledge', 'topics.json');
  try { return JSON.parse(fs.readFileSync(p)); } catch { return []; }
}

function runScript(scriptName, extraArgs = [], extraEnv = {}) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      HTTPS_PROXY: process.env.HTTPS_PROXY || 'http://127.0.0.1:10809',
      HTTP_PROXY:  process.env.HTTP_PROXY  || 'http://127.0.0.1:10809',
      ...extraEnv,
    },
  });
  if (result.status !== 0) throw new Error(`${scriptName} exited with code ${result.status}`);
}

function showStatus(topic) {
  const kdir   = knowledgeDir(topic);
  const latest = latestSnapshotDate(kdir);
  const tldr   = readFile(path.join(kdir, 'views', 'tldr.md'));
  const label  = topic ? `[${topic}]` : '[default]';

  if (!latest) { console.log(`${label} No snapshots yet.`); return; }
  console.log(`\n${label} Social Frontier — Last updated: ${latest}\n`);
  if (tldr) console.log(tldr);
}

async function runTopic(topic) {
  const dateStr = today();
  const { kdir, config: topicConfig } = setupTopicKnowledgeDir(topic);
  const label   = topic ? `[${topic}]` : '[default]';
  const topicEnv = { SF_KNOWLEDGE_DIR: kdir };

  console.log(`\n[run] ${label} Social Frontier pipeline — ${dateStr}`);
  console.log('='.repeat(50));

  if (!VIEWS_ONLY) {
    console.log(`\n[run] Step 1/3: Fetching signals...`);
    runScript('fetch.js', [...DOMAIN_ARG], topicEnv);

    console.log(`\n[run] Step 2/3: Updating frontier...`);
    runScript('update.js', ['--kdir', kdir, '--date', dateStr], topicEnv);
  }

  console.log(`\n[run] Step 3/3: Generating views...`);
  runScript('views.js', ['--kdir', kdir, '--date', dateStr], topicEnv);

  console.log('\n' + '='.repeat(50));
  console.log(`[run] ${label} complete.`);
  console.log(`  Snapshot: ${path.relative(SKILL_DIR, kdir)}/snapshots/${dateStr}/daily.md`);
  console.log(`  TLDR:     ${path.relative(SKILL_DIR, kdir)}/views/tldr.md`);

  if (JSON_OUTPUT) {
    const tldr = readFile(path.join(kdir, 'views', 'tldr.md'));
    console.log('\n' + JSON.stringify({ topic: topic || 'default', date: dateStr, tldr }, null, 2));
  }
}

async function main() {
  if (STATUS_ONLY) {
    if (ALL_TOPICS) {
      showStatus(null);
      loadTopics().forEach(t => showStatus(t.slug));
    } else {
      showStatus(TOPIC_ARG);
    }
    return;
  }

  if (ALL_TOPICS) {
    await runTopic(null);                          // default broad topic
    for (const t of loadTopics().filter(t => t.enabled)) {
      await runTopic(t.slug);
    }
  } else {
    await runTopic(TOPIC_ARG);
  }
}

main().catch(err => {
  console.error('[run] fatal:', err.message);
  process.exit(1);
});
