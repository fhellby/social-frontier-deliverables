#!/usr/bin/env node
/**
 * social-frontier-radar/scripts/explore.js
 * Step 1: Exploration Run — fetch time-windowed signals from configured sources
 *
 * Usage:
 *   node scripts/explore.js --topic onchain-alpha
 *   node scripts/explore.js --topic onchain-alpha --days 14
 *   node scripts/explore.js --topic onchain-alpha --days 7 --stdout
 */

'use strict';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:10809';
const httpsAgent = new HttpsProxyAgent(PROXY);
const http = axios.create({ httpsAgent, proxy: false, timeout: 20000 });

// workspace/knowledge/social-frontier/<slug>/
const WORKSPACE = path.join(__dirname, '..', '..', '..', 'knowledge', 'social-frontier');

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const hasFlag = flag => args.includes(flag);

const topicSlug = getArg('--topic', null);
const days = parseInt(getArg('--days', '14'));
const stdoutOnly = hasFlag('--stdout');

if (!topicSlug) {
  console.error('Usage: node explore.js --topic <slug> [--days 14] [--stdout]');
  process.exit(1);
}

const TOPIC_DIR = path.join(WORKSPACE, topicSlug);
const CONFIG_PATH = path.join(TOPIC_DIR, 'topic_config.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`topic_config.json not found: ${CONFIG_PATH}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const cutoffTs = Math.floor(Date.now() / 1000) - days * 86400;
const cutoffDate = new Date(cutoffTs * 1000).toISOString().slice(0, 10);
const todayDate = new Date().toISOString().slice(0, 10);

console.error(`[explore] Topic: ${config.label} (${topicSlug})`);
console.error(`[explore] Time window: last ${days} days (since ${cutoffDate})`);

function fmtDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

// ── Reddit ────────────────────────────────────────────────────────────────
async function fetchReddit(subreddits) {
  const signals = [];
  for (const rawSub of subreddits) {
    const sub = rawSub.replace(/^r\//, '');
    console.error(`[explore] Reddit r/${sub}...`);
    try {
      const { data } = await http.get(
        `https://www.reddit.com/r/${sub}/top.json?t=month&limit=50`,
        { headers: { 'User-Agent': 'social-frontier-radar/1.0' } }
      );
      const posts = data.data.children.map(c => c.data)
        .filter(p => p.created_utc >= cutoffTs && p.score >= 3);
      console.error(`  → ${posts.length} posts in window`);
      for (const p of posts) {
        signals.push({
          source: 'reddit',
          subreddit: sub,
          title: p.title,
          url: `https://reddit.com${p.permalink}`,
          score: p.score,
          comments: p.num_comments,
          date: fmtDate(p.created_utc),
          ts: p.created_utc,
        });
      }
    } catch (err) {
      console.error(`  [warn] r/${sub}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return signals;
}

// ── HN Algolia (time-filtered) ────────────────────────────────────────────
async function fetchHN(queries) {
  if (!queries || queries.length === 0) return [];
  const signals = [];
  const seen = new Set();
  for (const q of queries.slice(0, 3)) {
    console.error(`[explore] HN: "${q.slice(0, 50)}"`);
    try {
      const { data } = await http.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query: q,
          numericFilters: `created_at_i>${cutoffTs}`,
          tags: 'story',
          hitsPerPage: 20,
        },
      });
      for (const hit of data.hits || []) {
        if (seen.has(hit.objectID) || (hit.points || 0) < 10) continue;
        seen.add(hit.objectID);
        signals.push({
          source: 'hn',
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          score: hit.points || 0,
          comments: hit.num_comments || 0,
          date: (hit.created_at || '').slice(0, 10),
          ts: hit.created_at_i || 0,
        });
      }
    } catch (err) {
      console.error(`  [warn] HN: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return signals;
}

// ── Bird (Twitter/X via bird skill) ──────────────────────────────────────
async function fetchBird(keywords) {
  const birdPath = path.join(__dirname, '../../bird/scripts/search.js');
  if (!fs.existsSync(birdPath)) {
    console.error('[explore] bird skill not found, skipping');
    return [];
  }
  console.error('[explore] bird (Twitter/X)...');
  try {
    const kw = (keywords || []).slice(0, 3).join(',');
    const res = spawnSync(process.execPath, [birdPath, '--keywords', kw, '--json'], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
    });
    if (res.status === 0) {
      const tweets = JSON.parse(res.stdout);
      console.error(`  → ${tweets.length} tweets`);
      return tweets.map(t => ({
        source: 'bird',
        title: (t.text || t.full_text || '').slice(0, 200),
        url: t.url || '',
        score: (t.favorite_count || 0) + (t.retweet_count || 0) * 2,
        date: (t.created_at || '').slice(0, 10),
        ts: 0,
      }));
    }
    console.error(`  [warn] bird exit ${res.status}: ${res.stderr?.slice(0, 80)}`);
  } catch (err) {
    console.error(`  [warn] bird: ${err.message}`);
  }
  return [];
}

// ── 6551 API (Twitter/X via 6551) ───────────────────────────────────────
const TOKEN_6551 = process.env.TW6551_TOKEN;
if (!TOKEN_6551) {
  console.error('Missing env: TW6551_TOKEN');
  process.exit(1);
}

function fetch6551(keywords, handles) {
  return new Promise((resolve) => {
    const https = require('https');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const agent = new HttpsProxyAgent(PROXY);
    
    const signals = [];
    let pending = 0;
    
    // Search by keywords
    for (const kw of (keywords || []).slice(0, 3)) {
      pending++;
      const postData = JSON.stringify({ keywords: kw, maxResults: 20 });
      const opts = {
        hostname: 'ai.6551.io',
        path: '/open/twitter_search',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN_6551}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        agent,
        timeout: 15000,
      };
      
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const tweets = data.data || [];
            console.error(`  → 6551 search "${kw.slice(0,20)}": ${tweets.length} tweets`);
            for (const t of tweets) {
              signals.push({
                source: '6551',
                title: (t.text || '').slice(0, 200),
                url: `https://x.com/${t.userScreenName}/status/${t.id}`,
                score: (t.favoriteCount || 0) + (t.retweetCount || 0) * 2,
                date: t.createdAt ? t.createdAt.slice(0, 10) : '',
                ts: 0,
              });
            }
          } catch (e) {
            console.error(`  [warn] 6551 search error: ${e.message}`);
          }
          pending--;
          if (pending === 0) resolve(signals);
        });
      });
      req.on('error', (e) => { console.error(`  [warn] 6551: ${e.message}`); pending--; if (pending === 0) resolve(signals); });
      req.write(postData);
      req.end();
    }
    
    // Fetch user tweets
    for (const handle of (handles || []).slice(0, 5)) {
      pending++;
      const postData = JSON.stringify({ username: handle, maxResults: 20 });
      const opts = {
        hostname: 'ai.6551.io',
        path: '/open/twitter_user_tweets',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN_6551}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        agent,
        timeout: 15000,
      };
      
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const tweets = data.data || [];
            console.error(`  → 6551 @${handle}: ${tweets.length} tweets`);
            for (const t of tweets) {
              signals.push({
                source: '6551',
                title: (t.text || '').slice(0, 200),
                url: `https://x.com/${t.userScreenName}/status/${t.id}`,
                score: (t.favoriteCount || 0) + (t.retweetCount || 0) * 2,
                date: t.createdAt ? t.createdAt.slice(0, 10) : '',
                ts: 0,
              });
            }
          } catch (e) {
            console.error(`  [warn] 6551 user error: ${e.message}`);
          }
          pending--;
          if (pending === 0) resolve(signals);
        });
      });
      req.on('error', (e) => { console.error(`  [warn] 6551: ${e.message}`); pending--; if (pending === 0) resolve(signals); });
      req.write(postData);
      req.end();
    }
    
    if (pending === 0) resolve(signals);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const subreddits = config.subreddits || [];
  const hnEnabled = config.sources?.hn === true;
  const birdEnabled = config.sources?.bird === true;
  const bird6551Enabled = config.sources?.bird?.enabled === true;

  const allSignals = [];

  if (subreddits.length > 0) {
    allSignals.push(...(await fetchReddit(subreddits)));
  }
  if (hnEnabled) {
    allSignals.push(...(await fetchHN(config.queries || [])));
  }
  if (birdEnabled) {
    allSignals.push(...(await fetchBird(config.birdKeywords || config.queries || [])));
  }
  if (bird6551Enabled) {
    const keywords = config.sources?.bird?.keywords || config.queries || [];
    const handles = config.sources?.bird?.allowlist_handles || [];
    console.error('[explore] 6551 API (Twitter)...');
    allSignals.push(...(await fetch6551(keywords, handles)));
  }

  // Deduplicate by URL, sort by score
  const seen = new Set();
  const deduped = allSignals
    .filter(s => { if (!s.url || seen.has(s.url)) return false; seen.add(s.url); return true; })
    .sort((a, b) => b.score - a.score);

  console.error(`[explore] Total: ${deduped.length} signals (${allSignals.length} raw)`);

  const lines = [
    `# ${config.label} — Raw Signals`,
    ``,
    `> **Topic:** ${topicSlug}`,
    `> **Window:** last ${days} days (${cutoffDate} → ${todayDate})`,
    `> **Total:** ${deduped.length} signals`,
    `> **Generated:** ${new Date().toISOString()}`,
    ``,
    `---`,
    ``,
  ];

  for (const s of deduped) {
    const src = s.source === 'reddit' ? `r/${s.subreddit}` : s.source.toUpperCase();
    const heat = s.comments > 0 ? `↑${s.score} 💬${s.comments}` : `↑${s.score}`;
    lines.push(`[${src} / ${s.date} / ${heat}] ${s.title}`);
    lines.push(`→ ${s.url}`);
    lines.push('');
  }

  if (deduped.length === 0) {
    lines.push('*No signals found in this time window.*');
  }

  const content = lines.join('\n');

  if (stdoutOnly) {
    console.log(content);
    return;
  }

  const outDir = path.join(TOPIC_DIR, 'init');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'raw_signals.md');
  fs.writeFileSync(outPath, content);
  console.error(`[explore] Written: ${outPath}`);
  console.log(`Fetched ${deduped.length} signals → ${outPath}`);
}

main().catch(err => {
  console.error('[explore] fatal:', err.message);
  process.exit(1);
});
