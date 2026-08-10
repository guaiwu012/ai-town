# AI 大逃杀开发进度

最后更新：2026-08-07

## 当前结论

比赛是实时 Convex 模拟。浏览器填写 DeepSeek 配置后，`DecisionDriver` 通过租约成为唯一的决策驾驶器，按 12 秒节奏请求 OpenAI 兼容的 DeepSeek 接口并提交结构化行动。密钥仅在 `localStorage` 和浏览器请求头中出现；Convex 不接收密钥。

`battleRoyale.ts` 会校验模型动作的存活、冷却、区域邻接、开放禁区、同区目标、射程与物资。模型超时、CORS/网络失败、非法 JSON、无效动作和 240 次额度耗尽，都会产生审计事件并回退到规则 AI。

参考仓库每张配表的抽象位置、运行状态与未消费字段见 [参考配表覆盖矩阵](./reference-table-coverage.md)。

## 已完成

| 模块 | 状态 | 实现位置 |
| --- | --- | --- |
| 禁区预警与收缩倒计时 | 完成基础版 | `battle.zoneClosesAt`；中文预警、战略总览倒计时和 DeepSeek 上下文共享同一时间点 |
| 12 名角色、区域、关系、物品池 | 完成 | `data/battleRoyaleConfig.ts` |
| 战斗、搜索、购买、结盟、治疗、禁区 | 完成，模型/规则统一执行 | `convex/aiTown/battleRoyale.ts` |
| DeepSeek BYOK 战术决策 | 完成 | `DecisionDriver.tsx` + `submitAIDecision()` |
| 驾驶权、超时回退与审计 | 完成 | `battleState` / `BattleStats` 决策字段 |
| 逻辑区域图、多边形关卡、地标碰撞、邻接迁移与红区伤害 | 完成基础版 | `data/battleArena.ts` + `moveToBattleArea()`；同区战术移动受多边形与地标可走性约束 |
| 区域资源与物品即时效果 | 完成基础版 | `areaResources` + `ITEM_EFFECTS`；食物/饮料可恢复饱食或压力并影响后续 AI 决策 |
| 热度、连击、主线和隐藏任务 | 完成 | `battleRoyale.ts` |
| 干预点与 17 个干预操作 | 完成 | `INTERVENTION_OPERATIONS` |
| 扫雷结算干预点 | 完成 | `BattleRoyalePanel.tsx` |
| 24 条区域剧情、3 条全局事件与运行时触发 | 完成基础版 | `AREA_SPECIAL_EVENTS` + `GLOBAL_SPECIAL_EVENTS`；中文播报含实际效果摘要和触发次数 |
| 剧情专属主办方干预 | 完成基础版 | `STO_01` 至 `STO_06` + `applyIntervention()` |
| 剧情干预状态测试 | 完成 | `convex/aiTown/battleRoyale.test.ts` |
| C12 身份卡、线索和真相之间 | 完成 | `battleRoyale.ts` |
| 地图干预/剧情落点特效 | 完成 | `BattleRoyalePanel.tsx` + `index.css` |
| 剧情封锁与角色行动审计 | 完成基础版 | 格斗笼封锁会拒绝移动；总览和角色抽屉显示倒计时、区域规则与最近结构化行动 |
| CloudBase 前端、Convex 后端 | 已部署 | 见 README |
| 直播跟随、自动导播、角色详情抽屉 | 完成基础版 | `Game.tsx` + `LiveBattleHud.tsx` + `BattleCharacterDrawer.tsx` |
| 种子 RNG、行动日志和回放检查点 | 已完成状态帧版 | `battleRoyale.ts`；每 30 秒持久化观赛状态帧，回放时中止浏览器模型调度 |
| 原创 13 区战场底图、12 人角色图集 | 完成基础版 | `public/assets/battle/`；角色图集已接入直播档案和场内徽记 |

## 未完成与风险

| 优先级 | 项目 | 说明 |
| --- | --- | --- |
| P1 | 区域剧情精确分支 | 24 条剧情已具备主要前置、次数及天气、热度、伤害、物品互换、结盟、转移等基础后果；逐条的原始文案、分支结果与所有道具消耗仍待补齐。 |
| P1 | 关系网深度效果 | 关系强度、结盟、攻击背叛、交易、挑拨、重逢、守护、逆转和隐藏关系揭露已持久化；更细的人设分支仍待补齐。 |
| P2 | 稳定回放 | 种子 RNG、唯一行动 ID、可逆实时位置历史和持久化检查点状态帧已完成；回放会中止 DeepSeek 请求并在检查点恢复战场。检查点后的完整规则行动还原器仍待补齐。 |
| P2 | 物品与禁区 | 稀有度、交易价值、加权掉落、医院/格斗笼/市场 buff、资源余量和持续红区伤害已完成基础版；权限卡监控剧情已具备前置、消耗和中文审计。 |

## 当前开发里程碑：P2 观赛与内容深度

1. 完成直播跟随、战略总览、角色抽屉、单一重置入口和回放控制的 UI 验收。
2. 为 24 条区域剧情逐条补齐原始文案、道具消耗分支和后果；接入重逢、牺牲和逆转评分。
3. 将当前多边形逻辑关卡升级为完整可碰撞寻路网格，补齐区域地标交互。
4. 使用种子、行动日志和检查点完成固定夹具回放测试。

## 验证清单

- `npm run build` 通过。
- `npm test` 通过：配置、关系公开/挑拨和医院剧情干预均有自动测试。
- Convex 新局创建 12 名唯一角色。
- 扫雷分数写入 `interventionPoints`，上限为 30。
- 主办方干预写入事件流并产生地图效果状态。
- 角色剧情、区域剧情和 C12 真相线均写入 `world.battle.feed`。
- 人工验证：同区/相邻移动会执行，非邻接 LLM 移动会被拒绝并记录中文原因。
