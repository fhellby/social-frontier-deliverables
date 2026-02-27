# Social Frontier — Deliverables

## Deliverables 路径

```
knowledge/social-frontier/onchain-alpha/
├── init/
│   ├── raw_signals.md        # Step 1 输出：原始信号（150条）
│   ├── tension_candidates.md # Step 2 输出：LLM 识别的 T# 候选
│   └── confirm.yaml          # Step 3 人工确认：confirmed / rejected
├── frontier/
│   ├── problems.md           # 已确认张力（T2 confirmed, T3 candidate）
│   ├── hypotheses.md         # 可证伪假设
│   └── achievements.md       # 信号打标层（每条 → T#/H# + 方向）
└── knowledge/views/
    ├── tldr.md               # 每周摘要（5句话）
    └── community-pulse.md    # 深度分析（争论/证据/pattern）
```

## 运行顺序

```bash
# 环境变量（必须先设置）
export TW6551_TOKEN=<your-6551-jwt>
export DEEPSEEK_KEY=<your-deepseek-key>
export HTTPS_PROXY=http://127.0.0.1:10809  # 中国大陆需要

# Step 1: 抓取原始信号
node skills/social-frontier-radar/scripts/explore.js --topic onchain-alpha --days 14

# Step 2: LLM 识别张力候选
node skills/social-frontier-radar/scripts/discover.js --topic onchain-alpha

# Step 3: 人工审核 init/tension_candidates.md，填写 confirm.yaml

# Step 4: 初始化 frontier（生成 problems.md 等）
node skills/social-frontier-radar/scripts/init.js --topic onchain-alpha

# Daily: 日常监控（cron 每天 08:00 Asia/Shanghai）
node skills/social-frontier/scripts/run.js --topic onchain-alpha
```

## 当前状态（2026-02-27）

| 张力 | 状态 | 说明 |
|------|------|------|
| T2 | confirmed | 智能钱策略派 vs 环境致贫派，Camp A 领先 |
| T3 | candidate | EV+Kelly 系统派 vs 信息不对称派，Camp B 具名证据待补 |
