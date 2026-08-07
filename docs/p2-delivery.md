# P2 交付说明

最后更新：2026-08-07

## 运行时与回放

- 每局状态包含 `seed`、`rngState`、`ruleVersion`、`actionLog`、独立递增的 `nextActionId` 和 `replayCheckpoints`。
- 服务端规则随机数统一经持久化 LCG 产生；相同 seed 会得到相同随机序列。
- `actionLog` 记录模型动作、结构化目标角色/区域、校验结果及规则 AI 回退原因；日志不包含提示词、响应原文或 API 密钥。
- `replayRecordedAction()` 复用生产动作执行层重演已记录的结构化行动；它不申请驾驶权、不计入模型额度，也不调用 DeepSeek。
- 前端回放控件仅移动本地历史时间，显示行动、检查点和关键事件；进入回放会停止决策调度并中止未完成的 DeepSeek 请求，绝不触发模型调用。它当前是可检查的直播回放基础，而非恢复任意时刻完整世界状态的成品播放器。
- 关系运行时还包括重逢、危局守护和绝境逆转；这些事件各自使用一次性剧情标记并写入中文播报。
- 物品运行时包括高影响物品的稀有度和交易价值、加权掉落、区域资源枯竭/刷新，以及医院、市场、格斗笼的区域 buff。

## 视觉资产

- `public/assets/battle/arena-live-map.png`：原创 13 区俯视战场视觉层。
- `public/assets/battle/contestant-portraits.png`：12 名原创参赛者识别图集，用于直播焦点、角色档案和场内头顶识别徽记。
- 所有区域 ID、锚点和邻接仍由 `data/battleRoyaleConfig.ts` 与 `data/battleArena.ts` 统一定义。

## P2 验收清单

- 直播模式不被总览覆盖，用户可锁定 AI 或恢复自动导播。
- 新开局仅经 `world.resetBattle` 执行一次，并重置状态为 12 名唯一角色。
- 同 seed 的 RNG 测试稳定通过。
- 最终版本需补齐：完整碰撞/寻路网格、逐条剧情分支、物品稀有度与固定回放夹具。
