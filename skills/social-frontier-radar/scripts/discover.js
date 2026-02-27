#!/usr/bin/env node
/**
 * social-frontier-radar/scripts/discover.js
 * Step 2: Tension Discovery — LLM identifies T# candidates from raw signals
 *
 * Usage:
 *   node scripts/discover.js --topic onchain-alpha
 */

'use strict';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:10809';
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
if (!DEEPSEEK_KEY) {
  console.error('Missing env: DEEPSEEK_KEY');
  process.exit(1);
}
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const httpsAgent = new HttpsProxyAgent(PROXY);

const WORKSPACE = path.join(__dirname, '..', '..', '..', 'knowledge', 'social-frontier');

const args = process.argv.slice(2);
const topicSlug = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;

if (!topicSlug) {
  console.error('Usage: node discover.js --topic <slug>');
  process.exit(1);
}

const TOPIC_DIR = path.join(WORKSPACE, topicSlug);
const CONFIG_PATH = path.join(TOPIC_DIR, 'topic_config.json');
const SIGNALS_PATH = path.join(TOPIC_DIR, 'init', 'raw_signals.md');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`topic_config.json not found: ${CONFIG_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(SIGNALS_PATH)) {
  console.error(`raw_signals.md not found. Run first:\n  node scripts/explore.js --topic ${topicSlug}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const rawSignals = fs.readFileSync(SIGNALS_PATH, 'utf8');

async function llm(prompt) {
  const response = await axios.post(
    DEEPSEEK_URL,
    {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    },
    {
      headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
      httpsAgent,
      proxy: false,
      timeout: 90000,
    }
  );
  return response.data.choices[0].message.content.trim();
}

async function main() {
  console.error(`[discover] Topic: ${config.label} (${topicSlug})`);
  console.error(`[discover] raw_signals.md: ${rawSignals.length} chars`);
  console.error('[discover] Calling DeepSeek...');

  const prompt = `你是社群认知分析专家。以下是「${config.label}」社群过去一段时间的高热内容：

<raw_signals>
${rawSignals.slice(0, 12000)}
</raw_signals>

识别 3-5 个"认知张力"（T#）。

**准入门槛（严格执行，不满足则不输出该 T#）：**
1. 两个阵营都有具体支持者（@handle 或来源名称，不能只说"有人认为"）
2. 双方都援引了自认为是证据的东西（链接、数字、具体事件，不只是情绪或观点）
3. 这个分裂在 ≥2 个不同帖子/线程中重复出现

**每个 T# 严格按此格式输出（不省略任何字段）：**

T1: [名称，格式：X派 vs Y派，命名具体立场]
Camp A: [立场名称]（支持者：@handle 或 r/subreddit 具体帖子）
Camp B: [立场名称]（支持者：@handle 或 r/subreddit 具体帖子）
当前谁在赢: Camp A/B — [理由一句话，引用具体证据，数字或事件]
信号强度: accelerating/steady/cooling
发现依据:
- [帖子标题或URL #1]
- [帖子标题或URL #2]

---

**注意：**
- T# 名称必须是"X派 vs Y派"形式，命名的是具体立场，不是话题
- "当前谁在赢"不允许回答"双方势均力敌"，必须判断
- 如果信号不足以满足准入门槛，如实说明原因，不要捏造 T#`;

  const result = await llm(prompt);
  console.error('[discover] Done.');

  const date = new Date().toISOString().slice(0, 10);
  const output = [
    `# ${config.label} — Tension Candidates`,
    ``,
    `> **Topic:** ${topicSlug}`,
    `> **Generated:** ${date}`,
    `> **Status:** UNCONFIRMED — review then create confirm.yaml`,
    ``,
    `---`,
    ``,
    result,
    ``,
    `---`,
    ``,
    `## 下一步：创建 confirm.yaml`,
    ``,
    `路径：\`knowledge/social-frontier/${topicSlug}/init/confirm.yaml\``,
    ``,
    '```yaml',
    `confirmed:`,
    `  - id: T1`,
    `    camp_a_name: "派别A的简短名称"`,
    `    camp_b_name: "派别B的简短名称"`,
    `    note: "可选备注"`,
    ``,
    `rejected:`,
    `  - id: T2`,
    `    reason: "信号不够强"`,
    ``,
    `merge:`,
    `  - ids: [T3, T4]`,
    `    into: T3`,
    `    note: "两者本质是同一张力"`,
    '```',
    ``,
    `填完后运行：\`node scripts/init.js --topic ${topicSlug}\``,
  ].join('\n');

  const outDir = path.join(TOPIC_DIR, 'init');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'tension_candidates.md');
  fs.writeFileSync(outPath, output);
  console.error(`[discover] Written: ${outPath}`);

  // also print raw LLM result to stdout for quick review
  console.log(result);
}

main().catch(err => {
  console.error('[discover] fatal:', err.message);
  process.exit(1);
});
