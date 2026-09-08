import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/referenceTables.generated.json'), 'utf8'));

const routes = {
  characters: ['REFERENCE_CHARACTERS / BATTLE_CONFIG.characters', 'profileForCharacterId / defaultBattleStats', 'data/referenceTraceability.test.ts', 'BattleCharacterDrawer · Excel 人设档案'],
  relationships: ['BATTLE_CONFIG.relationships / RELATION_GENERATION', 'defaultRelationshipEdges / updateRelationship', 'data/referenceTraceability.test.ts', 'BattleRoyalePanel 关系网络'],
  characterRuntime: ['REFERENCE_RUNTIME_CHARACTERS / BATTLE_CONFIG.runtime', 'defaultBattleStats / applyBattleVitals', 'data/referenceTraceability.test.ts', 'BattleCharacterDrawer 状态电池'],
  areas: ['REFERENCE_AREAS / BATTLE_CONFIG.areas', 'moveToBattleArea / triggerAreaSpecialEvent', 'data/referenceTraceability.test.ts', 'BattleCharacterDrawer 区域规则'],
  areaResources: ['REFERENCE_ITEMS / BATTLE_CONFIG.areaItems', 'performSearch / applyBattleItemEffect', 'data/referenceTraceability.test.ts', 'BattleCharacterDrawer 背包'],
  items: ['REFERENCE_ITEMS / ITEM_DEFINITIONS', 'loot / applyBattleItemEffect / refreshItemIntel / attack', 'convex/aiTown/referenceExecution.test.ts', 'BattleCharacterDrawer 物品状态与情报 / PixiBattleEffects'],
  zoneRules: ['BATTLE_CONFIG.zone', 'tickMatchRules / performIntervention', 'data/referenceTraceability.test.ts', 'LiveBattleHud 禁区状态'],
  characterAreas: ['REFERENCE_CHARACTER_STORIES / CHARACTER_STORIES', 'triggerCharacterStory / moveToBattleArea', 'convex/aiTown/referenceExecution.test.ts', 'BattleCharacterDrawer 区域剧情与私人情报'],
  adjacency: ['BATTLE_CONFIG.adjacency', 'adjacentAreaIds / moveToBattleArea', 'data/referenceTraceability.test.ts', 'BattleMapOverlay 路径'],
  stories: ['AREA_SPECIAL_EVENTS / GLOBAL_SPECIAL_EVENTS', 'triggerAreaSpecialEvent / triggerGlobalSpecialEvent', 'data/referenceTraceability.test.ts', '直播事件流 / 区域剧情'],
  interventions: ['REFERENCE_INTERVENTIONS / INTERVENTION_OPERATIONS', 'applyIntervention', 'convex/aiTown/referenceExecution.test.ts', 'BattleRoyalePanel 导演台与私人情报'],
  logs: ['REFERENCE_LOG_* / referenceLog', 'pushEvent / referenceLog', 'data/referenceExecution.test.ts', 'BattleRoyalePanel 全局流 / Pixi 地图流 / BattleCharacterDrawer 角色流'],
  globalConfig: ['REFERENCE_GLOBAL_CONFIG / BATTLE_CONFIG', '全部规则执行入口', 'data/referenceTraceability.test.ts', 'HUD / 角色抽屉'],
  playerState: ['battleStats / battleState', 'ensureBattleState / tickMatchRules', 'data/referenceTraceability.test.ts', 'BattleCharacterDrawer'],
  scores: ['REFERENCE_SCORE_EVENTS / SCORE_EVENTS / COMBO_RULES / HIDDEN_MISSIONS', 'awardReferenceScore / scoreAward / completeMission', 'data/referenceExecution.test.ts + convex/aiTown/referenceExecution.test.ts', 'LiveBattleHud 热度、倍率与任务'],
  art: ['REFERENCE_ART_ASSETS / public/assets/reference', 'CSS 与 React 资产引用；合成参考图仅审计', 'data/referenceTraceability.test.ts', '地图、头像、事件图标；不可拆合成图标注为参考'],
};

function headerIndex(values) {
  let best = 0; let count = -1;
  values.slice(0, 8).forEach((row, index) => { const next = row.filter((value) => value !== null && value !== '').length; if (next > count) { best = index; count = next; } });
  return best;
}

const entries = [];
for (const [workbook, book] of Object.entries(snapshot.workbooks)) for (const [sheet, data] of Object.entries(book.sheets)) {
  const h = headerIndex(data.values);
  const width = Math.max(0, ...data.values.map((row) => row.length));
  for (let column = 0; column < width; column++) {
    if (!data.values.some((row) => row[column] !== null && row[column] !== '')) continue;
    const label = String(data.values[h]?.[column] ?? `列${column + 1}`).replaceAll('|', '/');
    const route = routes[workbook];
    entries.push({ workbook, sheet, column: column + 1, label, headerRow: h + 1, dataRows: `${h + 2}-${data.values.length}`, config: route[0], executor: route[1], test: route[2], ui: route[3] });
  }
}

const lines = [
  '# Excel 行列—配置—执行—测试—UI 逐列追踪', '',
  `来源：\`${snapshot.sourceRepository}@${snapshot.sourceCommit}\`。生成快照覆盖 ${Object.keys(snapshot.workbooks).length} 个工作簿、${Object.values(snapshot.workbooks).reduce((sum, book) => sum + Object.keys(book.sheets).length, 0)} 张工作表；本表共 ${entries.length} 个非空列。`, '',
  '说明：说明页、字典页和合成美术参考图也逐列保留；它们通过审计/展示路径落地，不伪装成可执行规则。行号为原 Excel 的 1 基索引。', '',
  '| 工作簿 / 工作表 | Excel 列（表头行；数据行） | 配置字段 | 执行函数 | 自动测试 | UI 表现 |',
  '|---|---|---|---|---|---|',
  ...entries.map((entry) => `| ${entry.workbook} / ${entry.sheet} | ${entry.column}. ${entry.label}（H${entry.headerRow}；R${entry.dataRows}） | ${entry.config} | ${entry.executor} | ${entry.test} | ${entry.ui} |`),
  '', '## 机器可验收标准', '',
  '- 每个非空 Excel 列必须出现在本表；新增或删除列会让测试失败。',
  '- 物品主表 68 行逐字段进入 `ITEM_DEFINITIONS`，剧情表额外物品以 `EXT_` 显式登记。',
  '- 执行层按 `effect_key` 分派；关系生成、区域资源、禁区批次与稀有刷新读取参考参数。',
  '- UI 展示公开人设、区域规则、物品效果；隐藏真相仅在解锁后展示。',
];
fs.writeFileSync(path.join(root, 'docs/reference-column-traceability.md'), `${lines.join('\n')}\n`);
fs.writeFileSync(path.join(root, 'data/referenceTraceability.generated.json'), `${JSON.stringify({ sourceCommit: snapshot.sourceCommit, columnCount: entries.length, entries }, null, 2)}\n`);
console.log(`Generated ${entries.length} traced columns.`);
