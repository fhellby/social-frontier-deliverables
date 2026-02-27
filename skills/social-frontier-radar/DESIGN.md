# social-frontier-radar — Design Document

> 版本: v0.1 (草稿)
> 设计目标: 对任意指定领域，清晰地初始化、追踪、分析社群热点，并与其他 frontier 层连接。

---

## 与 social-frontier 的区别

| 维度 | social-frontier | social-frontier-radar |
|------|-----------------|----------------------|
| 领域范围 | 硬编码（AI/tech/startup/crypto） | 任意领域（参数化） |
| 初始化方式 | 用户手动写 tensions 喂进去 | 从实际信号涌现，AI 发现候选 T#，用户 confirm |
| Voices 层 | 只有 @handle 列表 | 追踪 KOL 在每个 T# 上的具体立场变化 |
| 跨 frontier 连接 | 无 | 社会信号 → 标注关联的 tech/intellectual frontier 状态 |
| 输出质量 | 可能泛化 | 强制具体（数字/名称/方向/与上周对比） |

---

## One-Sentence Definition

**social-frontier-radar** 追踪指定领域社群内的认知分裂、集体下注、和关键声音的立场变化 —— 不是追踪"发生了什么"，而是追踪"社群对发生的事情形成了什么信念，以及这些信念如何演化"。

---

## 三层知识结构（继承 social-frontier）

### 层 1: `problems.md` — 认知分裂（T#）
> 社群内真实存在的信念对立，不是话题，是**有名字的两个阵营**。

每个 T# 必须包含：
- Camp A / Camp B 的命名（不是"支持者 vs 反对者"，是有具体立场的命名）
- 各自引用的证据（具体帖子/人/事件）
- 当前哪方在赢 discourse（判断，不是"双方都有道理"）
- 信号强度（accelerating / steady / cooling / resolved）
- NEL-2+ 状态（是否跨 ≥2 个不同社区）

**质量标准：**
> ✅ "链上数据派这周凭借 Lookonchain 的某鲸鱼地址提前24小时买入证据赢得一局，但叙事派反击：同一地址的历史胜率只有43%，链上信号的 false positive 太高。"
> ❌ "大家在讨论链上数据还是叙事重要。"

### 层 2: `hypotheses.md` — 可证伪假设（H#）
> 社群正在集体下注的方向预测，必须可证伪。

每个 H# 必须包含：
- 具体时间边界（不是"将来"，是"到 2026 Q2"）
- 明确的否证条件（什么样的证据出现说明假设被推翻）
- 当前支持/反对证据
- 速度（strengthening / holding / weakening / falsified）

### 层 3: `achievements.md` — 信号日志
> 每条信号打标层。格式强制。

```
[来源/热度] "标题"
- T# (T名称): ↑/↓/~ 分析（必须说明为什么这个信号对这个 tension 有这个方向的影响）
- H# 关联（如适用）
- 跨 frontier 连接（如适用）：关联 tech-frontier/H# 的当前状态
```

---

## 初始化协议（核心改进）

> 现有 social-frontier 的初始化：用户手写 tensions → 生成 stub → 等信号填充
> social-frontier-radar 的初始化：先抓信号 → AI 发现候选 T# → 用户 confirm → 有证据的 problems.md

### 步骤

**Step 0: 领域配置**
- 指定领域（slug + label + description）
- 指定社区来源（subreddits、关键词、voices）
- 不需要预先写 tensions

**Step 1: 探索性抓取（Exploration Run）**
- 抓取目标社区最近 14 天（`--days` 可配置，默认 14 天）的高热帖子
- 不做 tension 标注，只做原始信号收集
- 输出：`init/raw_signals.md`

**Step 2: 张力发现（Tension Discovery）**
- AI 从 raw_signals 里识别"重复出现的立场对立模式"
- 提出 3-5 个候选 T#，每个附上：
  - 发现依据（具体帖子，≥2 个）
  - 两个阵营的具体命名和支持者
  - 当前哪方在赢及理由
- 输出：`init/tension_candidates.md`

**T# 准入门槛（不满足则不输出）：**
- 两个阵营必须都有具体支持者（@handle 或来源名称，不能只说"有人"）
- 双方都援引了自认为是证据的东西（链接、数字、具体事件，不只是情绪）
- 分裂在 ≥2 个不同帖子/线程中重复出现

**Step 3: 用户 Confirm**
- 用户 review `tension_candidates.md`
- 填写 `init/confirm.yaml`，字段：

```yaml
# 确认保留的 T#
confirmed:
  - id: T1
    camp_a_name: "派别A的简短名称"
    camp_b_name: "派别B的简短名称"
    note: "可选备注"

# 拒绝的 T#
rejected:
  - id: T2
    reason: "信号不够强"

# 合并（多个合为一个）
merge:
  - ids: [T3, T4]
    into: T3
    note: "两者本质是同一张力"
```

- 填完后运行 `init.js` 正式初始化

**Step 4: 正式初始化**
- 从 confirmed tensions 构建 `frontier/problems.md`
  - 每个 T# 已有真实证据（不是 stub）
- 从信号里提炼候选 H#，构建 `frontier/hypotheses.md`
- 构建初始 `frontier/achievements.md`（signal log from exploration run）
- 构建 `frontier/voices.md`（KOL 在各 T# 上的立场）

---

## Voices 层（新增）

> 现有 social-frontier 没有实质的 voices 追踪。

`frontier/voices.md` 格式：

```
## @handle — [领域角色描述]

**T1 立场:** Camp A/B — "具体引用或观点摘要" [来源/日期]
**T2 立场:** 中立 — 未明确表态，但行为倾向 Camp A（因为...）
**H1 关联:** 公开支持 H1 的 "X by Y" 预测
**上次活跃信号:** YYYY-MM-DD [内容摘要]
```

追踪重点：
- 立场变化（原来是 Camp A 的 KOL 开始说 Camp B 的话 → 大事件）
- 行为与言论的背离（说一套做一套 → 信号）
- 沉默（某个一直活跃的 KOL 突然不再讨论某 T# → 信号）

---

## 跨 Frontier 连接（新增）

当 social signal 涉及对某个技术/认知主张的信念时，标注关联：

```
[Reddit/LocalLLaMA 409] "Qwen3.5 craters on hard coding tasks"
- T2 (OSS Parity): ↓ 实测推翻 benchmark 宣称
- [→ tech-frontier] OSS coding 实际能力层当前状态：benchmark 与 production 出现系统性偏差
```

这让 bot 在回答时能说："社区在讨论 X，这与 tech frontier 的实际状态 Y 有出入/一致。"

---

## 输出格式

### `views/tldr.md` — 快速摘要（每次运行更新）
```
# [领域] Frontier Radar — [日期]

## 本周最热张力
1. T# (名称): [哪方在赢，具体证据] [信号强度]

## 新增/升级信号
- [具体信号标题] → T#↑↓~

## Voices 动态
- @handle: [立场变化或重要表态]

## 与上周对比
- T# 从 [状态] 变为 [状态]
- 新增候选张力: T_candidate
```

### `views/deep-dive.md` — 深度分析
- 每个活跃 T# 的完整论证链
- H# 进度更新（证据累积/被推翻）
- Voices 层分析

---

## 质量强制规则

1. **禁止泛化**: 每个分析句子必须能回答"你怎么知道的" → 附具体来源
2. **强制方向判断**: 不允许"双方各有道理"作为结论，必须判断当前哪方证据更强
3. **强制对比**: 每次运行必须产出"本次 vs 上次"的变化描述
4. **数字具体化**: upvotes、comments、时间——不用"很多人"、"普遍认为"

---

## Skill 文件结构

```
skills/social-frontier-radar/
├── SKILL.md          # bot 触发描述 + quick start
├── DESIGN.md         # 本文件
├── _meta.json        # skill 元数据
└── scripts/
    ├── run.js        # 主入口（init / daily / views）
    ├── explore.js    # Step 1: 探索性抓取
    ├── discover.js   # Step 2: 张力发现（输出 tension_candidates.md）
    ├── init.js       # Step 4: 正式初始化（confirm 后运行）
    ├── fetch.js      # 日常抓取（复用 social-frontier 逻辑）
    ├── update.js     # 日常更新 frontier 文件
    └── views.js      # 生成 tldr + deep-dive

知识目录（按领域，存在 workspace/knowledge/social-frontier-radar/<domain>/）:
<domain>/
├── topic_config.json     # 领域配置（不含 tensions，由 discover.js 生成）
├── init/
│   ├── raw_signals.md    # Step 1 输出
│   └── tension_candidates.md  # Step 2 输出（用户 review 这个）
└── knowledge/
    ├── config.json
    ├── frontier/
    │   ├── problems.md
    │   ├── hypotheses.md
    │   ├── achievements.md
    │   ├── voices.md      # 新增
    │   └── definition.md
    ├── snapshots/
    └── views/
        ├── tldr.md
        └── deep-dive.md
```

---

## 开放问题（需要在 build 时决定）

1. **explore.js 的时间窗口**: 默认 14 天，`--days` 可配置 ✅
2. **discover.js 的候选 T# 数量**: 强制 3-7 个，还是让 AI 自己决定？
3. **voices 更新频率**: 每次 daily run 都更新，还是单独的 `voices.js`？
4. **跨 frontier 连接**: 需要其他 frontier skill 存在才能连接，还是允许 stub 连接？
