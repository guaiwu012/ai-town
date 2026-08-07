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

export type BattleCharacterProfile = (typeof BATTLE_CONFIG.characters)[number];

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
