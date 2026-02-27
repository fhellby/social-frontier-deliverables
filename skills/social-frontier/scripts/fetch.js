#!/usr/bin/env node
/**
 * social-frontier/scripts/fetch.js
 * Fetch social signals from multiple sources:
 *   - Hacker News (Firebase API, no auth)
 *   - Reddit (public JSON endpoints, no auth)
 *   - [STUB] bird skill — Twitter/X signals (activate when bird skill is installed)
 *   - [STUB] clawbrowser skill — web browsing for blogs/news (activate when clawbrowser is installed)
 *
 * Usage:
 *   node scripts/fetch.js              # fetch all enabled sources
 *   node scripts/fetch.js --stdout     # stdout only, no write
 *   node scripts/fetch.js --source hn  # single source (hn | reddit | bird | browser)
 *
 * To activate bird (Twitter/X):
 *   Set BIRD_ENABLED=1 and ensure `skills/bird` is installed.
 *   bird skill is called via: node skills/bird/scripts/search.js --query "..." --json
 *
 * To activate clawbrowser:
 *   Set BROWSER_ENABLED=1 and ensure `skills/clawbrowser` is installed.
 *   clawbrowser is called via: node skills/clawbrowser/scripts/fetch.js --url "..." --json
 */

'use strict';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:10809';
const KNOWLEDGE_DIR = process.env.SF_KNOWLEDGE_DIR || path.join(SKILL_DIR, 'knowledge');

const args = process.argv.slice(2);
const STDOUT_ONLY = args.includes('--stdout');
const SOURCE_FILTER = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;

const httpsAgent = new HttpsProxyAgent(PROXY);
const http = axios.create({ httpsAgent, proxy: false, timeout: 20000 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Hacker News ────────────────────────────────────────────────────────────
const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

async function fetchHNStory(id) {
  const { data } = await http.get(`${HN_BASE}/item/${id}.json`);
  return data;
}

async function fetchHN(limit = 30) {
  process.stderr.write('[fetch] HN top stories... ');
  const { data: topIds } = await http.get(`${HN_BASE}/topstories.json`);
  const ids = topIds.slice(0, limit);
  const stories = await Promise.all(ids.map(id => fetchHNStory(id).catch(() => null)));
  const valid = stories.filter(s => s && s.title && s.score >= 50);
  process.stderr.write(`${valid.length} stories\n`);
  return valid.map(s => ({
    id: s.id,
    title: s.title,
    url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
    score: s.score,
    comments: s.descendants || 0,
    by: s.by,
    source: 'hn',
  }));
}

// ── Reddit ─────────────────────────────────────────────────────────────────
const REDDIT_SUBS_DEFAULT = {
  'ai-ml': ['MachineLearning', 'artificial', 'LocalLLaMA', 'ChatGPT'],
  'crypto-web3': ['CryptoCurrency', 'ethereum', 'Bitcoin', 'defi'],
  'startups-vc': ['startups', 'Entrepreneur', 'ycombinator'],
  'dev-tools': ['programming', 'webdev', 'opensource'],
};

async function fetchSubreddit(sub, limit = 10) {
  const { data } = await http.get(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`, {
    headers: { 'User-Agent': 'social-frontier-bot/1.0' },
  });
  return data.data.children.map(c => c.data).filter(p => p.score >= 50);
}

// Fetch a custom flat list of subreddits, returning results under a single domain key
// Uses a lower score threshold (5) since niche communities naturally have lower engagement
async function fetchSubredditLowThreshold(sub, limit = 15) {
  const { data } = await http.get(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`, {
    headers: { 'User-Agent': 'social-frontier-bot/1.0' },
  });
  return data.data.children.map(c => c.data).filter(p => p.score >= 5);
}

async function fetchRedditCustom(subreddits, domainSlug) {
  process.stderr.write(`[fetch] Reddit (topic: ${domainSlug}) — ${subreddits.join(', ')}... `);
  const posts = [];
  for (const sub of subreddits) {
    try {
      const results = await fetchSubredditLowThreshold(sub, 15);
      posts.push(...results.map(p => ({
        title: p.title,
        url: p.url,
        score: p.score,
        comments: p.num_comments,
        subreddit: p.subreddit,
        source: 'reddit',
      })));
    } catch (err) {
      process.stderr.write(`\n  [warn] r/${sub}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  const sorted = posts.sort((a, b) => b.score - a.score).slice(0, 15);
  process.stderr.write(`${sorted.length} posts\n`);
  return { [domainSlug]: sorted };
}

async function fetchReddit(subredditsOverride, domainSlug) {
  // Topic-specific subreddit list takes precedence over defaults
  if (subredditsOverride && subredditsOverride.length > 0) {
    return fetchRedditCustom(subredditsOverride, domainSlug || 'topic');
  }

  process.stderr.write('[fetch] Reddit hot posts (default topics)... ');
  const results = {};
  for (const [domain, subs] of Object.entries(REDDIT_SUBS_DEFAULT)) {
    results[domain] = [];
    for (const sub of subs) {
      try {
        const posts = await fetchSubreddit(sub, 8);
        results[domain].push(...posts.map(p => ({
          title: p.title,
          url: p.url,
          score: p.score,
          comments: p.num_comments,
          subreddit: p.subreddit,
          source: 'reddit',
        })));
      } catch (err) {
        process.stderr.write(`\n  [warn] r/${sub}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    results[domain] = results[domain].sort((a, b) => b.score - a.score).slice(0, 8);
  }
  const total = Object.values(results).reduce((n, arr) => n + arr.length, 0);
  process.stderr.write(`${total} posts\n`);
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, 'config.json')));
  const dateStr = today();

  const signals = { date: dateStr, fetchedAt: new Date().toISOString() };

  // Resolve topic subreddits (strip "r/" prefix if present)
  const topicSubreddits = (config.subreddits || []).map(s => s.replace(/^r\//, ''));
  const topicSlug = config.domains?.[0]?.slug || 'topic';
  const hnEnabled = config.sources?.hn !== false;
  const redditEnabled = config.sources?.reddit !== false || topicSubreddits.length > 0;

  // Hacker News
  if (hnEnabled && (!SOURCE_FILTER || SOURCE_FILTER === 'hn')) {
    try {
      signals.hn = await fetchHN(40);
    } catch (err) {
      process.stderr.write(`[fetch] HN failed: ${err.message}\n`);
      signals.hn = [];
    }
  } else if (!hnEnabled) {
    process.stderr.write('[fetch] HN skipped (disabled in config)\n');
  }

  // Reddit
  if (redditEnabled && (!SOURCE_FILTER || SOURCE_FILTER === 'reddit')) {
    try {
      signals.reddit = await fetchReddit(topicSubreddits, topicSlug);
    } catch (err) {
      process.stderr.write(`[fetch] Reddit failed: ${err.message}\n`);
      signals.reddit = {};
    }
  } else if (!redditEnabled) {
    process.stderr.write('[fetch] Reddit skipped (disabled in config)\n');
  }

  // ── [STUB] bird skill (Twitter/X) ────────────────────────────────────────
  // Activate: install skills/bird, then set BIRD_ENABLED=1 in env or config.json
  if (process.env.BIRD_ENABLED === '1' || config.sources?.bird) {
    if (!SOURCE_FILTER || SOURCE_FILTER === 'bird') {
      process.stderr.write('[fetch] bird (Twitter/X)... ');
      try {
        const { spawnSync } = require('child_process');
        const birdSkill = path.join(__dirname, '../../bird/scripts/search.js');
        const keywords = (config.birdKeywords || ['AI agent', 'LLM', 'crypto', 'startup']).join(',');
        const res = spawnSync(process.execPath, [birdSkill, '--keywords', keywords, '--json'], {
          encoding: 'utf8', timeout: 30000,
          env: { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
        });
        if (res.status === 0) {
          signals.bird = JSON.parse(res.stdout);
          process.stderr.write(`${(signals.bird || []).length} tweets\n`);
        } else {
          process.stderr.write(`failed (${res.stderr?.slice(0, 80)})\n`);
        }
      } catch (err) {
        process.stderr.write(`error: ${err.message}\n`);
      }
    }
  }

  // ── [STUB] clawbrowser skill ──────────────────────────────────────────────
  // Activate: install skills/clawbrowser, then set BROWSER_ENABLED=1
  if (process.env.BROWSER_ENABLED === '1' || config.sources?.browser) {
    if (!SOURCE_FILTER || SOURCE_FILTER === 'browser') {
      process.stderr.write('[fetch] clawbrowser... ');
      try {
        const { spawnSync } = require('child_process');
        const browserSkill = path.join(__dirname, '../../clawbrowser/scripts/fetch.js');
        const urls = config.browserUrls || [];
        const res = spawnSync(process.execPath, [browserSkill, '--urls', urls.join(','), '--json'], {
          encoding: 'utf8', timeout: 60000,
          env: { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
        });
        if (res.status === 0) {
          signals.browser = JSON.parse(res.stdout);
          process.stderr.write(`${(signals.browser || []).length} pages\n`);
        } else {
          process.stderr.write(`failed (${res.stderr?.slice(0, 80)})\n`);
        }
      } catch (err) {
        process.stderr.write(`error: ${err.message}\n`);
      }
    }
  }

  const json = JSON.stringify(signals, null, 2);

  if (STDOUT_ONLY) {
    console.log(json);
    return;
  }

  const snapshotDir = path.join(KNOWLEDGE_DIR, 'snapshots', dateStr);
  fs.mkdirSync(snapshotDir, { recursive: true });
  const outPath = path.join(snapshotDir, 'raw.json');
  fs.writeFileSync(outPath, json);

  const hnCount = (signals.hn || []).length;
  const redditCount = Object.values(signals.reddit || {}).reduce((n, a) => n + a.length, 0);
  process.stderr.write(`[fetch] saved: ${hnCount} HN + ${redditCount} Reddit posts → ${outPath}\n`);
  console.log(json);
}

main().catch(err => {
  console.error('[fetch] fatal:', err.message);
  process.exit(1);
});
