# Elk Social-Frontier 认知框架 — 部署说明

## 文件放置

```
skills/social-frontier/
├── SKILL.md                      ← 认知框架（核心）
├── knowledge/
│   ├── baseline.md               ← 知识基线（agent 的已知知识）
│   └── delta.md                  ← 增量发现（cron 自动更新）
└── scripts/                      ← 可以保留现有脚本作为 cron 辅助
    └── ...（collect.py 等，cron 用）
```

## AGENTS.md 添加一行

在 elk 的 AGENTS.md 中加入（找个合适的位置）：

```
## GenAI 交易盈利
当被问到 GenAI/AI 交易盈利、AI赚钱、量化+LLM 等话题时：
1. 读 `skills/social-frontier/SKILL.md`，按照认知框架回答
2. **必须做 web_search**（至少 5 次），不要只靠已有文件
3. 读 `skills/social-frontier/knowledge/baseline.md` 作为对比基线
```

## SOUL.md — 不要加任何强制规则

之前的问题就是 SOUL.md 里写了强制读 instances.md 的规则。
这次 SOUL.md 不需要改动。SKILL.md 的触发通过 AGENTS.md 一行规则就够了。

## MEMORY.md — 可以加一行提醒

```
- 我有 GenAI 交易盈利的研究能力，框架在 skills/social-frontier/SKILL.md。
  被问到时按框架走，永远先搜索再回答。
```

## Cron 设置

现有的 cron job 可以保留，但用途变了：

**以前**：cron 跑完整流水线 → 生成 instances.md → 人问时读文件
**现在**：cron 只做"知识基线刷新" → 搜索新案例 → append 到 baseline.md → 人问时照样先搜索

如果你想简化 cron：可以让 cron 任务就是一句话：
"执行 skills/social-frontier/SKILL.md § 7 的知识维护流程"

## 删除/清理

之前的文件可以清理：
- `knowledge/instances.json` → 不再需要（baseline.md 替代）
- `knowledge/instances.md` → 不再需要（每次回答实时生成）
- `knowledge/delta.md` → 保留，cron 更新用
- `fixtures/` → 不再需要（没有脚本流水线了）

## 验证方法

部署后，问 elk："AI 交易能赚钱吗？有什么证据？"

**好的回答应该**：
- 开头不是读 baseline.md 然后复述 → 而是先做 web_search
- 覆盖 7 个类别（至少提到）
- 有具体数字和链接
- 有反面证据
- 有 [NEW] 标记的新发现
- 结尾有 3-5 句核心判断

**坏的回答**：
- 直接复述 baseline.md 的内容
- 没有做搜索
- 缺少反面证据
- 只有一两个类别

