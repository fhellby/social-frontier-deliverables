# On-chain Alpha Hunters — Tension Candidates

> **Topic:** onchain-alpha
> **Generated:** 2026-02-27
> **Status:** UNCONFIRMED — review then create confirm.yaml

---

经过对提供的社群信号进行仔细分析，我识别出以下符合严格准入门槛的认知张力（T#）。请注意，许多热门话题（如“环境致贫”、“持仓即叙事”等）因缺乏明确对立的两个阵营及其具体证据，或未在多个独立帖子中形成辩论，不符合输出条件。

**识别出的认知张力（T#）**

T1: 开源AI主导派 vs 闭源/现状派
Camp A: 开源AI是通往AGI和行业胜利的唯一/最佳路径（支持者：@SentientAGI 及其多条推文）
Camp B: 闭源AI或当前主流AI模式仍具优势/可行性（支持者：此立场在信号中未出现具名支持者，但@SentientAGI的推文多次以反驳或挑战该立场为前提进行论述，例如“Be bearish at your own risk.”暗示了反对开源AI前景的群体存在）
当前谁在赢: Camp A — @SentientAGI通过密集发布技术进展、合作伙伴案例（如NVIDIA）、学术会议参与及明确的产品路线图，持续构建开源AI势不可挡的叙事，且获得高互动。
信号强度: accelerating
发现依据:
- Open-source AI developments are accelerating. Be bearish at your own risk. (https://x.com/SentientAGI/status/2026745755185066311)
- Sentient’s sole focus from day one has been making open-source AI win. (https://x.com/SentientAGI/status/2019819427684893126)
- Open-source > closed-source ... Our Head of Product @oleg_golev will explain it. (https://x.com/SentientAGI/status/2027020851967590519)

T2: 智能钱/策略交易派 vs 环境/情绪致贫派
Camp A: 盈利关键在于掌握“智能钱”策略、数学模型和链上数据（支持者：@noisyb0y1, @RebellioMarket, @Realfinancial2, @TheDealTrader_）
Camp B: 亏损主要源于被炫耀性盈利、短期暴富信息污染的社交媒体环境（支持者：@Techriztm）
当前谁在赢: Camp A — 社群内大量高互动内容集中于展示具体交易策略（如Fast-Loop、Kelly Criterion）、数学模型和“智能钱”图表分析，提供了看似可复制的成功案例和具体工具，而Camp B的观点更偏向一次性的心理警示。
信号强度: steady
发现依据:
- Your Environment Is Making You Broke‼️ ... If your timeline is filled with: • Payout screenshots *every hour* (https://x.com/Techriztm/status/2026729503838667142)
- 10,000 -> $240,967 in one month using Claude Bot ... Fast-Loop > Kelly Criterion (https://x.com/noisyb0y1/status/2026704165515198934)
- 1.Accumulation – smart money buys ... Repeat. Always. (https://x.com/RebellioMarket/status/2024984284688515144)
- One 4H Candle + One Fair Value Gap = The Exact Setup Smart Money Uses (https://x.com/Realfinancial2/status/2024817531878322574)

T3: 预测市场数学化交易派 vs 传统认知派（视预测市场为赌博）
Camp A: 预测市场是基于数学公式和策略的严肃交易场所，盈利属于认知变现（支持者：@noisyb0y1）
Camp B: 预测市场本质是赌博，靠运气而非技能（支持者：此立场在信号中未出现具名支持者，但@noisyb0y1的推文明确将其作为需要驳斥的普遍观点进行攻击，例如“Prediction markets aren't gambling, it's just simple math”）
当前谁在赢: Camp A — @noisyb0y1通过连续发布在预测市场（如Polymarket）上使用具体策略、代码和数学模型获得高额回报的详细案例，试图将活动“正名”为高技术门槛的量化交易。
信号强度: accelerating
发现依据:
- Prediction markets aren't gambling, it's just simple math (https://x.com/noisyb0y1/status/2026353203902603276)
- I found the best math formulas for trading on Predict Market ... reviewed more than 530 trading strategies/formulas (https://x.com/noisyb0y1/status/2027051256305365417)
- Built an arbitrage monitor for prediction markets based on pmxtjs (https://x.com/noisyb0y1/status/2027016038471147971)

**不符合准入门槛的说明**
*   **“持仓即叙事” vs “宏观/情绪主导”**：虽然存在“你的持仓就是你对叙事最清晰的表达”与“不要因为任何一个瞬间而退缩”等不同角度的观点，但未形成明确、具名的两个阵营之间的辩论，且缺乏双方援引的具体证据。
*   **“AI代理需要推理” vs “现有AI足够”**：所有相关信号均来自@SentientAGI，是其单方面阐述自身论点，未发现具名反对者或不同技术路线的支持者进行反驳的证据。
*   **关于特定资产（如$KASPA）的喊单**：属于单一观点陈述，未发现针对该资产的具名看空阵营或辩论。

**结论**
在“On-chain Alpha Hunters”社群近期的认知张力中，围绕 **AI发展路径（开源 vs 闭源）**、**交易盈利核心（策略 vs 环境）** 以及 **预测市场性质（数学交易 vs 赌博）** 的辩论最为突出且符合分析标准。其中，**开源AI**、**智能钱策略**和**预测市场数学化**的倡导者目前通过更具体、更技术化、更案例驱动的叙事，在社群讨论中占据上风。

---

## 下一步：创建 confirm.yaml

路径：`knowledge/social-frontier/onchain-alpha/init/confirm.yaml`

```yaml
confirmed:
  - id: T1
    camp_a_name: "派别A的简短名称"
    camp_b_name: "派别B的简短名称"
    note: "可选备注"

rejected:
  - id: T2
    reason: "信号不够强"

merge:
  - ids: [T3, T4]
    into: T3
    note: "两者本质是同一张力"
```

填完后运行：`node scripts/init.js --topic onchain-alpha`