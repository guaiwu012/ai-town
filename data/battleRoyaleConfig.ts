// Data-driven battle configuration adapted from the reference design tables.
// Keep runtime code dependent on these ids instead of display names.

export type RelationType = 'family' | 'ex' | 'rival' | 'mentor' | 'friend' | 'stranger';

export const BATTLE_CONFIG = {
  match: {
    agentCount: 12,
    maxInventorySlots: 6,
    initialInterventionPoints: 15,
    maxInterventionPoints: 30,
    heatRewardStep: 50,
    searchCooldownMs: 12000,
    dayMs: 900000,
    nightMs: 600000,
    battleTickMs: 2500,
    actionCooldownMs: 6500,
    llmDecisionIntervalMs: 12000,
    llmDecisionTimeoutMs: 10000,
    llmDecisionMaxPerMatch: 240,
    decisionDriverLeaseMs: 20000,
    attackRange: 3.2,
    dangerRange: 4.8,
    maxFeed: 24,
  },
  characters: [
    { id: 'C01', codename: '灯塔', name: '陆敬山', strength: 5, mind: 3, psyche: 4, social: 3, aggro: '中', coop: '高', risk: '中', heat: 85, stressThreshold: 75, areaId: 'A01' },
    { id: 'C02', codename: '焰火', name: '夏语甜', strength: 2, mind: 4, psyche: 2, social: 5, aggro: '低', coop: '中', risk: '高', heat: 110, stressThreshold: 45, areaId: 'A02' },
    { id: 'C03', codename: '尺规', name: '沈酌', strength: 2, mind: 5, psyche: 4, social: 2, aggro: '低', coop: '低', risk: '低', heat: 65, stressThreshold: 80, areaId: 'A03' },
    { id: 'C04', codename: '刺', name: '姜夏野', strength: 5, mind: 2, psyche: 2, social: 2, aggro: '高', coop: '低', risk: '高', heat: 95, stressThreshold: 40, areaId: 'A04' },
    { id: 'C05', codename: '糖纸', name: '阮清', strength: 2, mind: 3, psyche: 2, social: 4, aggro: '低', coop: '高', risk: '低', heat: 75, stressThreshold: 35, areaId: 'A05' },
    { id: 'C06', codename: '霜', name: '白映雪', strength: 2, mind: 5, psyche: 5, social: 2, aggro: '中', coop: '中', risk: '中', heat: 70, stressThreshold: 85, areaId: 'A06' },
    { id: 'C07', codename: '回声', name: '何屿', strength: 3, mind: 3, psyche: 3, social: 3, aggro: '低', coop: '中', risk: '中', heat: 80, stressThreshold: 55, areaId: 'A07' },
    { id: 'C08', codename: '行情', name: '老周', strength: 3, mind: 4, psyche: 3, social: 5, aggro: '低', coop: '高', risk: '中', heat: 72, stressThreshold: 60, areaId: 'A08' },
    { id: 'C09', codename: '刃口', name: '阿隼', strength: 4, mind: 3, psyche: 4, social: 1, aggro: '高', coop: '低', risk: '中', heat: 88, stressThreshold: 70, areaId: 'A09' },
    { id: 'C10', codename: '灵枭', name: '林飞飞', strength: 3, mind: 5, psyche: 5, social: 2, aggro: '低', coop: '低', risk: '低', heat: 60, stressThreshold: 95, areaId: 'A10' },
    { id: 'C11', codename: '旧债', name: '谢迟', strength: 2, mind: 5, psyche: 3, social: 3, aggro: '中', coop: '中', risk: '低', heat: 68, stressThreshold: 65, areaId: 'A11' },
    { id: 'C12', codename: '无名', name: 'N-00', strength: 4, mind: 4, psyche: 5, social: 1, aggro: '中', coop: '低', risk: '低', heat: 50, stressThreshold: 90, areaId: 'A12' },
  ],
  areas: [
    { id: 'A01', key: 'bastion_ruins', name: '堡垒废墟', danger: 3, owner: 'C01', buff: '防具搜索率+20%', mechanic: '残存哨戒炮台' },
    { id: 'A02', key: 'broadcast_tower', name: '演播塔', danger: 2, owner: 'C02', buff: '信息搜索率+20%', mechanic: '监控相邻区域' },
    { id: 'A03', key: 'archive_library', name: '智库书库', danger: 2, owner: 'C03', buff: '信息搜索率+30%', mechanic: '查看区域资源余量' },
    { id: 'A04', key: 'fighting_pit', name: '格斗笼', danger: 4, owner: 'C04', buff: '近战伤害+15%', mechanic: '陷阱地板' },
    { id: 'A05', key: 'academy_ruins', name: '学园废墟', danger: 2, owner: 'C05', buff: '社交搜索率+20%', mechanic: '校园广播' },
    { id: 'A06', key: 'field_hospital', name: '战地医院', danger: 2, owner: 'C06', buff: '药品搜索数量翻倍', mechanic: '紧急手术室' },
    { id: 'A07', key: 'training_ground', name: '训练场', danger: 2, owner: 'C07', buff: '移动速度+10%', mechanic: '无隐蔽点' },
    { id: 'A08', key: 'shadow_market', name: '暗巷市场', danger: 3, owner: 'C08', buff: '交易成功率+30%', mechanic: 'NPC/角色交易' },
    { id: 'A09', key: 'armory', name: '武器库', danger: 5, owner: 'C09', buff: '武器搜索率+40%', mechanic: '入场位置警报' },
    { id: 'A10', key: 'deep_forest', name: '密林深处', danger: 3, owner: 'C10', buff: '隐蔽率+30%', mechanic: '迷路至随机邻区' },
    { id: 'A11', key: 'court_ruins', name: '法庭遗址', danger: 1, owner: 'C11', buff: '谈判成功率+20%', mechanic: '档案室揭示隐藏关系' },
    { id: 'A12', key: 'observatory_ruins', name: '观测站废墟', danger: 2, owner: 'C12', buff: '全图位置侦察', mechanic: '数据终端线索' },
    { id: 'S01', key: 'truth_chamber', name: '真相之间', danger: 5, owner: 'C12', buff: '真相剧情', mechanic: 'C12 专属一次性入口', special: true },
  ],
  adjacency: [
    ['A01', 'A06'], ['A01', 'A09'], ['A01', 'A10'],
    ['A02', 'A03'], ['A02', 'A05'], ['A02', 'A12'],
    ['A03', 'A05'], ['A03', 'A08'], ['A04', 'A07'],
    ['A04', 'A08'], ['A05', 'A11'], ['A06', 'A07'],
    ['A06', 'A10'], ['A07', 'A11'], ['A08', 'A09'],
    ['A08', 'A11'], ['A12', 'S01'],
  ],
  relationships: [
    { id: 'REL_SEED_01', a: 'C01', b: 'C05', type: 'family' as RelationType, strength: 85, hidden: false, mutable: true, triggerWeight: 90 },
    { id: 'REL_SEED_02', a: 'C02', b: 'C07', type: 'ex' as RelationType, strength: 55, hidden: false, mutable: true, triggerWeight: 80 },
    { id: 'REL_SEED_03', a: 'C04', b: 'C09', type: 'rival' as RelationType, strength: 75, hidden: false, mutable: true, triggerWeight: 95 },
    { id: 'REL_SEED_04', a: 'C03', b: 'C12', type: 'mentor' as RelationType, strength: 70, hidden: true, mutable: true, triggerWeight: 85 },
  ],
  runtime: {
    satietyStart: 80,
    zoneTimeStart: 30,
    zoneTimeMax: 40,
    staminaBase: 60,
    staminaPerStrength: 10,
    hpBase: 100,
    hpPerStrength: 20,
    searchStaminaCost: 12,
    attackStaminaCost: 6,
    moveStaminaCost: 8,
  },
  weapons: {
    Fists: { power: 8, range: 1.4, cost: 0 },
    Pistol: { power: 20, range: 3.2, cost: 80 },
    Shotgun: { power: 28, range: 2.6, cost: 140 },
    Rifle: { power: 35, range: 4.2, cost: 200 },
    Sniper: { power: 48, range: 5.4, cost: 300 },
  },
  areaItems: {
    A01: ['军用口粮', '保暖服', '防弹插板', '战术匕首', '军籍牌'],
    A02: ['罐装咖啡', '隐蔽录音笔', '信号干扰器', '隐藏频道接收器', '演播档案带'],
    A03: ['营养补充剂', '电子破解器', '情报地图', '加密档案', '策略手稿'],
    A04: ['肾上腺素', '指虎', '铁链', '格斗绷带', '血染刺套'],
    A05: ['午餐盒', '对讲机', '烟雾弹', '学生档案'],
    A06: ['急救包', '止痛药', '手术刀', '防护服', '医疗记录终端', '未署名病历'],
    A07: ['运动饮料', '蛋白棒', '铅球', '跑鞋', '奖牌'],
    A08: ['走私食品', '万能钥匙', '伪造身份卡', '账本残页', '欠条'],
    A09: ['军用净水片', '突击步枪', '手枪', '破片手雷', '武器清单'],
    A10: ['野果', '药草', '木矛', '伪装斗篷', '古老树皮刻痕', '鸟羽护符'],
    A11: ['茶水间补给', '证物袋', '法槌', '判决书副本', '案件卷宗'],
    A12: ['备用电源包', '监控终端权限卡', '便携雷达', '监控日志碎片', '空白身份卡'],
    S01: ['真相数据核心', '制造者日志'],
  } as Record<string, string[]>,
  zone: {
    warningMs: 30000,
    redZoneDamagePerSecond: 1,
    earlyIntervalMs: 180000,
    midIntervalMs: 120000,
    lateIntervalMs: 90000,
  },
} as const;

// Normalized anchors preserve the existing Pixi tile map while making the
// reference area's graph authoritative for battle movement and encounters.
export const AREA_ANCHORS: Record<string, { x: number; y: number }> = {
  A01: { x: 0.17, y: 0.19 }, A02: { x: 0.08, y: 0.49 }, A03: { x: 0.36, y: 0.86 },
  A04: { x: 0.70, y: 0.45 }, A05: { x: 0.79, y: 0.79 }, A06: { x: 0.79, y: 0.16 },
  A07: { x: 0.77, y: 0.39 }, A08: { x: 0.47, y: 0.45 }, A09: { x: 0.26, y: 0.58 },
  A10: { x: 0.52, y: 0.18 }, A11: { x: 0.60, y: 0.77 }, A12: { x: 0.21, y: 0.08 },
  S01: { x: 0.05, y: 0.58 },
};

export const BATTLE_ACTIONS = ['move', 'search', 'buy', 'trade', 'ally', 'attack', 'flee', 'heal', 'investigate'] as const;
export type BattleAction = (typeof BATTLE_ACTIONS)[number];

export function adjacentAreaIds(areaId: string) {
  return BATTLE_CONFIG.adjacency
    .flatMap(([a, b]) => a === areaId ? [b] : b === areaId ? [a] : []);
}

export const ITEM_EFFECTS: Record<string, { kind: 'heal' | 'armor' | 'stamina' | 'clue' | 'weapon'; value: number }> = {
  '急救包': { kind: 'heal', value: 20 }, '止痛药': { kind: 'heal', value: 10 }, '防弹插板': { kind: 'armor', value: 5 },
  '运动饮料': { kind: 'stamina', value: 20 }, '蛋白棒': { kind: 'stamina', value: 15 }, '营养补充剂': { kind: 'stamina', value: 18 },
  '加密档案': { kind: 'clue', value: 1 }, '医疗记录终端': { kind: 'clue', value: 1 }, '监控日志碎片': { kind: 'clue', value: 1 },
  '手枪': { kind: 'weapon', value: 20 }, '突击步枪': { kind: 'weapon', value: 35 }, '木矛': { kind: 'weapon', value: 14 },
};

export type BattleCharacterProfile = (typeof BATTLE_CONFIG.characters)[number];

export const INTERVENTION_OPERATIONS = [
  { id: 'ENV_01', name: '制造障碍', category: '环境', cost: 3, cooldownMs: 60000, target: 'area', description: '在区域内制造障碍，区域内角色受到 8 点伤害。' },
  { id: 'ENV_02', name: '极端天气', category: '环境', cost: 5, cooldownMs: 180000, target: 'area', description: '区域暴雨，区域内角色失去 16 点体力。' },
  { id: 'ENV_03', name: '提前关闭', category: '环境', cost: 5, cooldownMs: 0, target: 'area', description: '立即关闭一个仍开放的区域。' },
  { id: 'ENV_04', name: '激活陷阱', category: '环境', cost: 2, cooldownMs: 30000, target: 'area', description: '触发区域机关，对区域内角色造成 12 点伤害。' },
  { id: 'SUP_01', name: '投放补给', category: '补给', cost: 2, cooldownMs: 60000, target: 'area', description: '区域内存活角色各获得医疗包与 20 物资。' },
  { id: 'SUP_02', name: '盛宴补给', category: '补给', cost: 3, cooldownMs: 120000, target: 'area', description: '区域内角色恢复生命和体力。' },
  { id: 'SUP_03', name: '陷阱补给', category: '补给', cost: 1, cooldownMs: 30000, target: 'area', description: '伪装补给造成 10 点伤害。' },
  { id: 'SUP_05', name: '赞助角色', category: '补给', cost: 3, cooldownMs: 90000, target: 'player', description: '指定角色获得 35 物资与护甲。' },
  { id: 'RUL_01', name: '临时联盟', category: '规则', cost: 4, cooldownMs: 0, target: 'pair', description: '强制两名角色结盟 45 秒。' },
  { id: 'RUL_02', name: '禁用武器', category: '规则', cost: 5, cooldownMs: 0, target: 'global', description: '全场 30 秒内只能使用拳头。' },
  { id: 'RUL_04', name: '悬赏追杀', category: '规则', cost: 4, cooldownMs: 60000, target: 'player', description: '指定角色成为悬赏目标，击倒者额外获得物资。' },
  { id: 'INF_01', name: '真实情报', category: '信息', cost: 1, cooldownMs: 20000, target: 'player', description: '指定角色获得一条真相线索。' },
  { id: 'INF_02', name: '虚假情报', category: '信息', cost: 1, cooldownMs: 20000, target: 'player', description: '指定角色压力升高。' },
  { id: 'INF_03', name: '匿名挑拨', category: '信息', cost: 2, cooldownMs: 45000, target: 'pair', description: '两名角色关系紧张，打破联盟。' },
  { id: 'INF_04', name: '标记位置', category: '信息', cost: 1, cooldownMs: 30000, target: 'player', description: '公开指定角色的位置。' },
  { id: 'REC_01', name: '关系侦察', category: '侦察', cost: 1, cooldownMs: 15000, target: 'player', description: '公布指定角色的一条关系。' },
  { id: 'REC_02', name: '任务侦察', category: '侦察', cost: 3, cooldownMs: 0, target: 'global', description: '揭示一条隐藏任务。' },
  { id: 'TRU_01', name: '开启真相之间', category: '剧情', cost: 5, cooldownMs: 0, target: 'player', description: 'C12 集齐线索后开启真相结局。' },
] as const;

export const CHARACTER_STORIES: Record<string, { areaId: string; item: string; title: string; score: number; effect: string }> = {
  C01: { areaId: 'A01', item: '军籍牌', title: '故地', score: 15, effect: 'armor' },
  C02: { areaId: 'A02', item: '演播档案带', title: '镜头背后', score: 15, effect: 'clue' },
  C03: { areaId: 'A03', item: '策略手稿', title: '棋局', score: 10, effect: 'coins' },
  C04: { areaId: 'A04', item: '血染刺套', title: '笼中兽', score: 20, effect: 'weapon' },
  C05: { areaId: 'A05', item: '学生档案', title: '档案里的名字', score: 15, effect: 'clue' },
  C06: { areaId: 'A06', item: '未署名病历', title: '未完成的手术', score: 15, effect: 'medkit' },
  C07: { areaId: 'A07', item: '奖牌', title: '未竟的终点线', score: 10, effect: 'stamina' },
  C08: { areaId: 'A08', item: '欠条', title: '债', score: 20, effect: 'coins' },
  C09: { areaId: 'A09', item: '武器清单', title: '武器清单', score: 10, effect: 'weapon' },
  C10: { areaId: 'A10', item: '鸟羽护符', title: '森林的低语', score: 15, effect: 'clue' },
  C11: { areaId: 'A11', item: '案件卷宗', title: '未结的案子', score: 20, effect: 'clue' },
  C12: { areaId: 'A12', item: '空白身份卡', title: '空', score: 10, effect: 'truthPath' },
};

export const HIDDEN_MISSIONS = [
  { id: 'HID_01', title: '守护者', description: '确保阮清进入最后三人。', targetA: 'C05' },
  { id: 'HID_02', title: '猎人', description: '让阿隼被淘汰。', targetA: 'C09' },
  { id: 'HID_03', title: '丘比特', description: '让夏语甜与何屿维持联盟。', targetA: 'C02', targetB: 'C07' },
  { id: 'HID_04', title: '破坏者', description: '让亲属或旧友发生冲突。' },
  { id: 'HID_06', title: '无名真相', description: '帮助 N-00 开启真相之间。', targetA: 'C12' },
] as const;

// 22 rows from the regional-story table. Runtime dispatches these by effect,
// so narrative rows stay data-driven instead of being hard-coded in the loop.
export const AREA_SPECIAL_EVENTS = [
  { id: 'A01_01', areaId: 'A01', title: '炮台激活', effect: 'turret', maxTriggers: 3 },
  { id: 'A01_02', areaId: 'A01', title: '暴风雪', effect: 'blizzard', maxTriggers: 1 },
  { id: 'A02_01', areaId: 'A02', title: '广播失控', effect: 'broadcast', maxTriggers: 1 },
  { id: 'A02_02', areaId: 'A02', title: '监控回放', effect: 'replay', maxTriggers: 1 },
  { id: 'A03_01', areaId: 'A03', title: '数据泄露', effect: 'revealRelation', maxTriggers: 1 },
  { id: 'A03_02', areaId: 'A03', title: '电力中断', effect: 'blackout', maxTriggers: 1 },
  { id: 'A04_01', areaId: 'A04', title: '地板塌陷', effect: 'collapse', maxTriggers: 1 },
  { id: 'A04_02', areaId: 'A04', title: '笼门关闭', effect: 'lockdown', maxTriggers: 2 },
  { id: 'A05_01', areaId: 'A05', title: '校园广播', effect: 'broadcast', maxTriggers: 1 },
  { id: 'A05_02', areaId: 'A05', title: '黑板字迹', effect: 'stress', maxTriggers: 1 },
  { id: 'A06_01', areaId: 'A06', title: '紧急手术', effect: 'surgery', maxTriggers: 1 },
  { id: 'A06_02', areaId: 'A06', title: '药品过期', effect: 'expiredMedicine', maxTriggers: 3 },
  { id: 'A07_01', areaId: 'A07', title: '起跑枪声', effect: 'falseGunshot', maxTriggers: 1 },
  { id: 'A08_01', areaId: 'A08', title: '暗中交易', effect: 'autoTrade', maxTriggers: 1 },
  { id: 'A08_02', areaId: 'A08', title: '信息贩子', effect: 'broker', maxTriggers: 3 },
  { id: 'A09_01', areaId: 'A09', title: '弹药殉爆', effect: 'explosion', maxTriggers: 2 },
  { id: 'A10_01', areaId: 'A10', title: '野兽袭击', effect: 'beast', maxTriggers: 1 },
  { id: 'A10_02', areaId: 'A10', title: '迷路', effect: 'lost', maxTriggers: 3 },
  { id: 'A10_03', areaId: 'A10', title: '林中低语', effect: 'zoneWarning', maxTriggers: 1 },
  { id: 'A11_01', areaId: 'A11', title: '开庭', effect: 'trial', maxTriggers: 1 },
  { id: 'A11_02', areaId: 'A11', title: '证词记录', effect: 'revealRelation', maxTriggers: 2 },
  { id: 'A12_01', areaId: 'A12', title: '数据异常', effect: 'c12Anomaly', maxTriggers: 1 },
  { id: 'A12_02', areaId: 'A12', title: '监控回响', effect: 'replay', maxTriggers: 2 },
  { id: 'S01_01', areaId: 'S01', title: '制造者日志', effect: 'truth', maxTriggers: 1 },
] as const;

export const GLOBAL_SPECIAL_EVENTS = [
  { id: 'GLB_01', title: '野怪暴走', effect: 'beastRage', maxTriggers: 1 },
  { id: 'GLB_02', title: '全图停电', effect: 'blackout', maxTriggers: 1 },
  { id: 'GLB_03', title: '信号入侵', effect: 'signalIntrusion', maxTriggers: 1 },
] as const;

export function profileForIndex(index: number) {
  return BATTLE_CONFIG.characters[index % BATTLE_CONFIG.characters.length];
}

export function profileForCharacterId(characterId: string) {
  return BATTLE_CONFIG.characters.find((profile) => profile.id === characterId) ?? BATTLE_CONFIG.characters[0];
}

export function validateBattleConfig() {
  const characterIds = new Set(BATTLE_CONFIG.characters.map((profile) => profile.id));
  const areaIds = new Set(BATTLE_CONFIG.areas.map((area) => area.id));
  if (characterIds.size !== BATTLE_CONFIG.match.agentCount) {
    throw new Error(`Battle config expects ${BATTLE_CONFIG.match.agentCount} unique characters.`);
  }
  if (areaIds.size !== 13 || !areaIds.has('S01')) {
    throw new Error('Battle config must contain 12 normal areas and S01.');
  }
  for (const [a, b] of BATTLE_CONFIG.adjacency) {
    if (!areaIds.has(a) || !areaIds.has(b) || a >= b) {
      throw new Error(`Invalid adjacency edge: ${a}-${b}`);
    }
  }
  for (const relation of BATTLE_CONFIG.relationships) {
    if (!characterIds.has(relation.a) || !characterIds.has(relation.b) || relation.a >= relation.b) {
      throw new Error(`Invalid relationship edge: ${relation.a}-${relation.b}`);
    }
  }
  for (const area of BATTLE_CONFIG.areas) {
    if (!BATTLE_CONFIG.areaItems[area.id]) {
      throw new Error(`Missing item pool for ${area.id}`);
    }
  }
}

validateBattleConfig();
