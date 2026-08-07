# AI 大逃杀开发进度

最后更新：2026-08-07

## 当前结论

比赛已经是一个实时 Convex 模拟，但不是 LLM 战术模拟。`Game.tick()` 会同时运行原始 AI Town 的 Agent 对话循环和大逃杀循环：前者可以生成 LLM 对话；后者由 `runAgentBattleAction()` 根据规则、距离、血量和随机数执行战斗动作。

浏览器中的 DeepSeek 配置仅保存在 `localStorage`。它没有被传到 Convex，也没有被 `battleRoyale.ts` 读取。因此，填写 DS API 后不会让角色的战斗行为变成 DeepSeek 决策。

## 已完成

| 模块 | 状态 | 实现位置 |
| --- | --- | --- |
| 角色与初始属性 | 完成 | `data/battleRoyaleConfig.ts` |
| 12 名角色、区域、关系、物品池 | 完成 | `data/battleRoyaleConfig.ts` |
| 战斗、搜索、购买、结盟、治疗、禁区 | 完成，规则驱动 | `convex/aiTown/battleRoyale.ts` |
| 热度、连击、主线和隐藏任务 | 完成 | `battleRoyale.ts` |
| 干预点与 17 个干预操作 | 完成 | `INTERVENTION_OPERATIONS` |
| 扫雷结算干预点 | 完成 | `BattleRoyalePanel.tsx` |
| 22 条区域剧情数据与运行时触发 | 完成 | `AREA_SPECIAL_EVENTS` |
| C12 身份卡、线索和真相之间 | 完成 | `battleRoyale.ts` |
| 地图干预/剧情落点特效 | 完成 | `BattleRoyalePanel.tsx` + `index.css` |
| CloudBase 前端、Convex 后端 | 已部署 | 见 README |

## 未完成与风险

| 优先级 | 项目 | 说明 |
| --- | --- | --- |
| P0 | DeepSeek 战术决策 | 需要把感知、目标选择、行动提案和结构化校验接入 Convex action；不能把用户 API 密钥放进公开前端。 |
| P0 | 每局独立 LLM 凭证策略 | 需要选择 BYOK 代理服务、一次性会话令牌或平台托管密钥；当前 localStorage 配置只是未接线 UI。 |
| P1 | 决策可观测性 | 记录每次 AI 感知摘要、候选动作、模型输出、规则拒绝原因和最终动作。 |
| P1 | 区域剧情精确条件 | 22 条效果已可触发；仍需逐条补齐参考配表的前置角色、关系和次数条件。 |
| P1 | 关系网演化 | 当前只有初始种子关系和联盟状态，尚未持久化所有关系强度变化。 |
| P2 | 稳定回放 | 需要种子随机数和比赛回放测试夹具。 |

## 下一开发里程碑：LLM 战术代理

1. 在 Convex 中增加受控的 `battleDecision` action，服务端读取 LLM 凭证。
2. 每 8-12 秒为一个角色构建结构化感知：自身、邻近敌人、区域、物资、关系、任务和可用动作。
3. 让模型只返回受限 JSON 动作，例如 `attack`、`search`、`move`、`trade`、`ally`、`flee`、`heal`。
4. 在服务器校验距离、冷却、物资、禁区和目标，拒绝无效动作并回退到规则 AI。
5. 在公屏和角色详情中展示“决策理由摘要”，但不泄露系统提示词或 API 密钥。

## 验证清单

- `npm run build` 通过。
- Convex 新局创建 12 名唯一角色。
- 扫雷分数写入 `interventionPoints`，上限为 30。
- 主办方干预写入事件流并产生地图效果状态。
- 角色剧情、区域剧情和 C12 真相线均写入 `world.battle.feed`。
