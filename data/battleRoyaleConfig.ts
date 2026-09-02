// Data-driven battle configuration adapted from the reference design tables.
// Keep runtime code dependent on these ids instead of display names.

export type RelationType = 'family' | 'ex' | 'rival' | 'mentor' | 'friend' | 'stranger';

export type CharacterPersona = {
  title: string;
  archetype: string;
  goal: string;
  combatStyle: string;
  speechStyle: string;
  attackBias: number;
  allianceBias: number;
  retreatBias: number;
  attackLines: string[];
  allianceLine: string;
  replyLine: string;
  supportLine: string;
  tradeLine: string;
};

export const CHARACTER_PERSONAS: Record<string, CharacterPersona> = {
  C01: { title: '失守的守望者', archetype: '可靠、克制、保护弱者', goal: '查清旧战友死亡真相，并让值得保护的人活下去', combatStyle: '先警告后反击，优先攻击威胁盟友的人', speechStyle: '短句，沉稳，像下达战术指令', attackBias: 0.58, allianceBias: 0.78, retreatBias: 0.28, attackLines: ['停下。再靠近一步，我就开火。', '威胁确认。你没有第二次机会。'], allianceLine: '跟紧我，交叉掩护。活着出去再谈别的。', replyLine: '我守左侧。你别离开我的视线。', supportLine: '空投确认。谢谢，我会把它用在该用的人身上。', tradeLine: '物资按需求分，别浪费。' },
  C02: { title: '镜头里的纵火者', archetype: '外向、敏锐、渴望被看见', goal: '夺回叙事权，让所有人看到主办方隐藏的画面', combatStyle: '避免正面硬拼，擅长虚张声势和拉拢观众', speechStyle: '有直播感，轻快、带反问和舞台语气', attackBias: 0.32, allianceBias: 0.62, retreatBias: 0.58, attackLines: ['镜头开着呢，你确定要当反派？', '这一枪算节目效果，别眨眼。'], allianceLine: '我们组个临时双人档？你负责活着，我负责让全场记住。', replyLine: '成交，不过镜头前可别拆我的台。', supportLine: '看到空投了吗？这就是我的观众席！', tradeLine: '独家物资换独家情报，这买卖很上镜。' },
  C03: { title: '冷静的尺规', archetype: '理性、寡言、习惯计算', goal: '建立完整因果链，找出比赛规则中的漏洞', combatStyle: '优势不足绝不开战，偏好观察、调查和撤离', speechStyle: '精确、冷淡，常提概率、条件和证据', attackBias: 0.22, allianceBias: 0.34, retreatBias: 0.7, attackLines: ['你的胜率已经低于安全线。', '变量失控，只能排除。'], allianceLine: '短期合作能把双方生存率提高三成，可以执行。', replyLine: '条件成立。我会记录你是否守约。', supportLine: '外部变量已介入，生存率重新计算。', tradeLine: '按等价交换，不接受情绪报价。' },
  C04: { title: '笼中之刺', archetype: '暴烈、直接、不信任怜悯', goal: '击败所有试图控制她的人，证明自己不是表演道具', combatStyle: '主动逼近，偏爱近战和连续压制', speechStyle: '锋利、挑衅，极少解释', attackBias: 0.9, allianceBias: 0.16, retreatBias: 0.12, attackLines: ['别废话，来。', '站着挨打，还是跪着认输？'], allianceLine: '暂时别挡我的路。有人来，你跟我一起打。', replyLine: '可以。背叛我之前先想好怎么死。', supportLine: '东西收到。现在让他们来。', tradeLine: '东西放下。价钱只谈一次。' },
  C05: { title: '废墟里的糖纸', archetype: '善良、敏感、害怕被抛下', goal: '找到可以信任的人，并确认档案中的共同经历', combatStyle: '优先逃跑和求援，被逼到角落才反击', speechStyle: '礼貌、犹豫但真诚，会直呼对方名字', attackBias: 0.12, allianceBias: 0.9, retreatBias: 0.82, attackLines: ['别过来……我真的会还手。', '对不起，我不能倒在这里。'], allianceLine: '我可以把找到的东西分给你，你能别丢下我吗？', replyLine: '嗯，我相信你一次。我们一起走。', supportLine: '是给我的吗？谢谢……我会努力活下去。', tradeLine: '这个给你，希望它真的能帮上忙。' },
  C06: { title: '冷白手术灯', archetype: '克制、专业、背负伦理压力', goal: '弥补未完成手术的错误，尽可能减少无谓死亡', combatStyle: '先救治和谈判，面对持续威胁会精准反击', speechStyle: '专业、冷静，常使用医疗判断', attackBias: 0.4, allianceBias: 0.66, retreatBias: 0.46, attackLines: ['你的攻击行为已经越过治疗边界。', '我知道怎样让你失去行动能力。'], allianceLine: '我负责伤势，你负责警戒。别让我浪费药。', replyLine: '生命体征优先。合作期间听我的医疗判断。', supportLine: '补给状态良好。我能多救一个人。', tradeLine: '药品按伤情分配，这不是讨价还价。' },
  C07: { title: '终点线的回声', archetype: '温和、执着、对过去讳莫如深', goal: '完成那场没能跑完的比赛，并保护旧识', combatStyle: '机动周旋，避免无意义死斗', speechStyle: '简短温和，常用奔跑和节奏作比喻', attackBias: 0.3, allianceBias: 0.6, retreatBias: 0.62, attackLines: ['别逼我改变路线。', '这一段，我不会再退赛。'], allianceLine: '跟上我的节奏，别在弯道掉队。', replyLine: '好，一起跑到下一个安全区。', supportLine: '收到。我会把这份力气留到最后一圈。', tradeLine: '轻装才跑得远，互换需要的东西吧。' },
  C08: { title: '暗巷行情商', archetype: '圆滑、现实、擅长读人', goal: '掌握最多情报，让每一方都欠自己一次', combatStyle: '优先交易和结盟，局势不利时迅速换边', speechStyle: '市侩但亲切，爱谈价码、人情和行情', attackBias: 0.24, allianceBias: 0.82, retreatBias: 0.5, attackLines: ['谈不拢，那就按另一种价码结算。', '你这条命，行情突然跌了。'], allianceLine: '多个朋友多条路，咱们先把这笔生存生意做了。', replyLine: '好说。账我记着，情报不会少你的。', supportLine: '这份人情我收下了，回报不会少。', tradeLine: '东西有价，人情更贵。你想买哪一种？' },
  C09: { title: '沉默的刃口', archetype: '专业、警觉、把生存当任务', goal: '控制武器资源并清除最危险的竞争者', combatStyle: '主动占据射击位，确认目标后迅速击杀', speechStyle: '军事化、极少修饰，只报告判断', attackBias: 0.86, allianceBias: 0.2, retreatBias: 0.24, attackLines: ['目标确认，开火。', '暴露位置是你的最后一个错误。'], allianceLine: '临时编组。服从战术，不要擅自行动。', replyLine: '收到。合作到威胁解除为止。', supportLine: '补给接收。任务继续。', tradeLine: '报型号、数量和状态。其他免谈。' },
  C10: { title: '听林者', archetype: '疏离、直觉敏锐、相信异常征兆', goal: '追随森林低语，阻止下一次灾难发生', combatStyle: '隐藏、观察、避开人群，在预兆强烈时突袭', speechStyle: '安静、诗性，会提到风、树和声音', attackBias: 0.26, allianceBias: 0.38, retreatBias: 0.76, attackLines: ['林子已经说出了你的方向。', '风停了。该你安静了。'], allianceLine: '树影没有排斥你。暂时同行吧。', replyLine: '我听见了同一阵风。走这边。', supportLine: '风把你们的声音带到了这里。', tradeLine: '森林不收货币，只交换真正需要的东西。' },
  C11: { title: '未结案的旧债', archetype: '谨慎、善辩、执着于证词', goal: '找出未结案件的责任人，并让真相公开受审', combatStyle: '先谈判取证，遭到欺骗后会持续追击', speechStyle: '像庭审发言，讲条件、证据和责任', attackBias: 0.42, allianceBias: 0.58, retreatBias: 0.56, attackLines: ['你已经放弃陈述机会。', '证据充分，现在执行判决。'], allianceLine: '我们订一份口头协议：共享证据，互不攻击。', replyLine: '协议成立。我会保留追责权。', supportLine: '援助已登记。之后我会给观众一个交代。', tradeLine: '交换可以，但每一件物资都要有清楚记录。' },
  C12: { title: '编号之外的人', archetype: '冷静、困惑、强烈追寻身份', goal: '确认自己是谁，并找到制造者留下的入口', combatStyle: '避免无关冲突，只为线索和生存反击', speechStyle: '疏离、简短，偶尔出现关于记忆的断句', attackBias: 0.34, allianceBias: 0.28, retreatBias: 0.7, attackLines: ['你不在我的记忆里。让开。', '指令冲突……执行自卫。'], allianceLine: '我不确定自己可信。但我们可以交换看到的真相。', replyLine: '记录完成。暂时将你标记为同伴。', supportLine: '有人记得我。这个事实需要保存。', tradeLine: '这件东西让我想起了不存在的过去。交换吧。' },
};

export function personaForCharacter(characterId?: string) {
  return CHARACTER_PERSONAS[characterId ?? 'C01'] ?? CHARACTER_PERSONAS.C01;
}

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
    closeEncounterRange: 2.2,
    closeEncounterCooldownMs: 18000,
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
    A05: ['午餐盒', '对讲机', '烟雾弹', '校园广播磁带', '学生档案'],
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
  A01: { x: 0.30, y: 0.16 }, A02: { x: 0.20, y: 0.77 }, A03: { x: 0.40, y: 0.72 },
  A04: { x: 0.86, y: 0.65 }, A05: { x: 0.72, y: 0.75 }, A06: { x: 0.74, y: 0.23 },
  A07: { x: 0.83, y: 0.42 }, A08: { x: 0.51, y: 0.44 }, A09: { x: 0.22, y: 0.48 },
  A10: { x: 0.54, y: 0.14 }, A11: { x: 0.57, y: 0.78 }, A12: { x: 0.11, y: 0.24 },
  S01: { x: 0.08, y: 0.59 },
};

export const BATTLE_ACTIONS = ['move', 'search', 'buy', 'trade', 'ally', 'attack', 'flee', 'heal', 'investigate'] as const;
export type BattleAction = (typeof BATTLE_ACTIONS)[number];

export function adjacentAreaIds(areaId: string) {
  return BATTLE_CONFIG.adjacency
    .flatMap(([a, b]) => a === areaId ? [b] : b === areaId ? [a] : []);
}

export const ITEM_EFFECTS: Record<string, { kind: 'heal' | 'armor' | 'stamina' | 'satiety' | 'stress' | 'clue' | 'weapon'; value: number }> = {
  '急救包': { kind: 'heal', value: 20 }, '止痛药': { kind: 'heal', value: 10 }, '防弹插板': { kind: 'armor', value: 5 },
  '运动饮料': { kind: 'stamina', value: 20 }, '蛋白棒': { kind: 'stamina', value: 15 }, '营养补充剂': { kind: 'stamina', value: 18 },
  '军用口粮': { kind: 'satiety', value: 28 }, '午餐盒': { kind: 'satiety', value: 24 }, '走私食品': { kind: 'satiety', value: 22 }, '野果': { kind: 'satiety', value: 16 }, '茶水间补给': { kind: 'satiety', value: 18 },
  '罐装咖啡': { kind: 'stress', value: -10 }, '药草': { kind: 'stress', value: -8 },
  '加密档案': { kind: 'clue', value: 1 }, '医疗记录终端': { kind: 'clue', value: 1 }, '监控日志碎片': { kind: 'clue', value: 1 },
  '手枪': { kind: 'weapon', value: 20 }, '突击步枪': { kind: 'weapon', value: 35 }, '木矛': { kind: 'weapon', value: 14 },
};

export type BattleItemDefinition = { rarity: 'common' | 'uncommon' | 'rare' | 'legendary'; tradeValue: number };
const DEFAULT_ITEM_DEFINITIONS: Record<string, BattleItemDefinition> = Object.fromEntries(
  [...new Set(Object.values(BATTLE_CONFIG.areaItems).flat())].map((item) => [item, { rarity: 'common', tradeValue: 12 }]),
);
export const ITEM_DEFINITIONS: Record<string, BattleItemDefinition> = {
  ...DEFAULT_ITEM_DEFINITIONS,
  '军用口粮': { rarity: 'common', tradeValue: 8 }, '保暖服': { rarity: 'uncommon', tradeValue: 22 }, '防弹插板': { rarity: 'rare', tradeValue: 40 }, '战术匕首': { rarity: 'uncommon', tradeValue: 28 }, '军籍牌': { rarity: 'rare', tradeValue: 55 },
  '演播档案带': { rarity: 'rare', tradeValue: 55 }, '加密档案': { rarity: 'rare', tradeValue: 48 }, '策略手稿': { rarity: 'uncommon', tradeValue: 24 }, '急救包': { rarity: 'uncommon', tradeValue: 28 }, '医疗记录终端': { rarity: 'rare', tradeValue: 48 },
  '烟雾弹': { rarity: 'uncommon', tradeValue: 24 }, '突击步枪': { rarity: 'rare', tradeValue: 70 }, '手枪': { rarity: 'uncommon', tradeValue: 35 }, '破片手雷': { rarity: 'rare', tradeValue: 58 }, '伪装斗篷': { rarity: 'rare', tradeValue: 52 },
  '鸟羽护符': { rarity: 'rare', tradeValue: 50 }, '案件卷宗': { rarity: 'rare', tradeValue: 46 }, '监控终端权限卡': { rarity: 'legendary', tradeValue: 85 }, '空白身份卡': { rarity: 'legendary', tradeValue: 90 }, '真相数据核心': { rarity: 'legendary', tradeValue: 120 }, '制造者日志': { rarity: 'legendary', tradeValue: 120 },
  '罐装咖啡': { rarity: 'common', tradeValue: 10 }, '隐蔽录音笔': { rarity: 'uncommon', tradeValue: 26 }, '信号干扰器': { rarity: 'rare', tradeValue: 42 }, '隐藏频道接收器': { rarity: 'rare', tradeValue: 50 },
  '营养补充剂': { rarity: 'common', tradeValue: 14 }, '电子破解器': { rarity: 'uncommon', tradeValue: 30 }, '情报地图': { rarity: 'rare', tradeValue: 45 },
  '肾上腺素': { rarity: 'rare', tradeValue: 42 }, '指虎': { rarity: 'common', tradeValue: 16 }, '铁链': { rarity: 'uncommon', tradeValue: 24 }, '格斗绷带': { rarity: 'uncommon', tradeValue: 22 }, '血染刺套': { rarity: 'rare', tradeValue: 58 },
  '午餐盒': { rarity: 'common', tradeValue: 10 }, '对讲机': { rarity: 'uncommon', tradeValue: 25 }, '校园广播磁带': { rarity: 'rare', tradeValue: 42 }, '学生档案': { rarity: 'rare', tradeValue: 44 },
  '止痛药': { rarity: 'common', tradeValue: 15 }, '手术刀': { rarity: 'uncommon', tradeValue: 32 }, '防护服': { rarity: 'uncommon', tradeValue: 30 }, '未署名病历': { rarity: 'rare', tradeValue: 52 },
  '运动饮料': { rarity: 'common', tradeValue: 12 }, '蛋白棒': { rarity: 'common', tradeValue: 12 }, '铅球': { rarity: 'uncommon', tradeValue: 20 }, '跑鞋': { rarity: 'uncommon', tradeValue: 26 }, '奖牌': { rarity: 'rare', tradeValue: 40 },
  '走私食品': { rarity: 'common', tradeValue: 14 }, '万能钥匙': { rarity: 'rare', tradeValue: 46 }, '伪造身份卡': { rarity: 'rare', tradeValue: 48 }, '账本残页': { rarity: 'uncommon', tradeValue: 32 }, '欠条': { rarity: 'rare', tradeValue: 55 },
  '军用净水片': { rarity: 'common', tradeValue: 12 }, '武器清单': { rarity: 'rare', tradeValue: 54 },
  '药草': { rarity: 'common', tradeValue: 14 }, '古老树皮刻痕': { rarity: 'rare', tradeValue: 46 },
  '茶水间补给': { rarity: 'common', tradeValue: 12 }, '证物袋': { rarity: 'uncommon', tradeValue: 25 }, '法槌': { rarity: 'uncommon', tradeValue: 28 }, '判决书副本': { rarity: 'rare', tradeValue: 42 },
  '备用电源包': { rarity: 'uncommon', tradeValue: 30 }, '便携雷达': { rarity: 'rare', tradeValue: 52 },
};

export function itemDefinition(item: string): BattleItemDefinition {
  return ITEM_DEFINITIONS[item] ?? { rarity: 'common', tradeValue: 12 };
}

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
  { id: 'FAN_01', name: '阵营应援空投', category: '应援', cost: 2, cooldownMs: 60000, target: 'player', description: '为应援角色恢复体力、增加护甲并投放物资。' },
  { id: 'RUL_01', name: '临时联盟', category: '规则', cost: 4, cooldownMs: 0, target: 'pair', description: '强制两名角色结盟 45 秒。' },
  { id: 'RUL_02', name: '禁用武器', category: '规则', cost: 5, cooldownMs: 0, target: 'global', description: '全场 30 秒内只能使用拳头。' },
  { id: 'RUL_04', name: '悬赏追杀', category: '规则', cost: 4, cooldownMs: 60000, target: 'player', description: '指定角色成为悬赏目标，击倒者额外获得物资。' },
  { id: 'INF_01', name: '真实情报', category: '信息', cost: 1, cooldownMs: 20000, target: 'player', description: '指定角色获得一条真相线索。' },
  { id: 'INF_02', name: '虚假情报', category: '信息', cost: 1, cooldownMs: 20000, target: 'player', description: '指定角色压力升高。' },
  { id: 'INF_03', name: '匿名挑拨', category: '信息', cost: 2, cooldownMs: 45000, target: 'pair', description: '两名角色关系紧张，打破联盟。' },
  { id: 'INF_04', name: '标记位置', category: '信息', cost: 1, cooldownMs: 30000, target: 'player', description: '公开指定角色的位置。' },
  { id: 'REC_01', name: '关系侦察', category: '侦察', cost: 1, cooldownMs: 15000, target: 'player', description: '公布指定角色的一条关系。' },
  { id: 'REC_02', name: '任务侦察', category: '侦察', cost: 3, cooldownMs: 0, target: 'global', description: '揭示一条隐藏任务。' },
  { id: 'STO_01', name: '拆除笼门', category: '剧情', cost: 2, cooldownMs: 30000, target: 'area', description: '解除格斗笼的剧情封锁，参赛者可撤离。' },
  { id: 'STO_02', name: '替换有效药品', category: '剧情', cost: 1, cooldownMs: 30000, target: 'area', description: '战地医院的角色获得有效药品。' },
  { id: 'STO_03', name: '激怒野兽', category: '剧情', cost: 3, cooldownMs: 120000, target: 'area', description: '密林野兽袭击伤害翻倍。' },
  { id: 'STO_04', name: '驱赶野兽', category: '剧情', cost: 2, cooldownMs: 60000, target: 'area', description: '驱赶密林野兽，恢复区域内角色状态。' },
  { id: 'STO_05', name: '强制开庭', category: '剧情', cost: 4, cooldownMs: 0, target: 'area', description: '无视人数条件，在法庭遗址强制开启谈判。' },
  { id: 'STO_06', name: '延长停电', category: '剧情', cost: 3, cooldownMs: 60000, target: 'global', description: '将全图停电延长 60 秒。' },
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

export function availableAreaItemsFor(characterId: string | undefined, areaId: string) {
  const characterStoryItems = new Set(Object.values(CHARACTER_STORIES).map((story) => story.item));
  const ownStoryItem = characterId ? CHARACTER_STORIES[characterId]?.item : undefined;
  return (BATTLE_CONFIG.areaItems[areaId] ?? []).filter((item) => !characterStoryItems.has(item) || item === ownStoryItem);
}

export const HIDDEN_MISSIONS = [
  { id: 'HID_01', title: '守护者', description: '确保阮清进入最后三人。', targetA: 'C05' },
  { id: 'HID_02', title: '猎人', description: '让阿隼被淘汰。', targetA: 'C09' },
  { id: 'HID_03', title: '丘比特', description: '让夏语甜与何屿维持联盟。', targetA: 'C02', targetB: 'C07' },
  { id: 'HID_04', title: '破坏者', description: '让亲属或旧友发生冲突。' },
  { id: 'HID_06', title: '无名真相', description: '帮助 N-00 开启真相之间。', targetA: 'C12' },
] as const;

// 24 regional rows from the reference story table. Runtime dispatches these by effect,
// so narrative rows stay data-driven instead of being hard-coded in the loop.
export const AREA_SPECIAL_EVENTS = [
  { id: 'A01_01', areaId: 'A01', title: '炮台激活', effect: 'turret', maxTriggers: 3 },
  { id: 'A01_02', areaId: 'A01', title: '暴风雪', effect: 'blizzard', maxTriggers: 1 },
  { id: 'A02_01', areaId: 'A02', title: '广播失控', effect: 'broadcast', maxTriggers: 1 },
  { id: 'A02_02', areaId: 'A02', title: '监控回放', effect: 'replay', maxTriggers: 1, requiredItem: '监控终端权限卡', consumeItem: true },
  { id: 'A03_01', areaId: 'A03', title: '数据泄露', effect: 'revealRelation', maxTriggers: 1 },
  { id: 'A03_02', areaId: 'A03', title: '电力中断', effect: 'blackout', maxTriggers: 1 },
  { id: 'A04_01', areaId: 'A04', title: '地板塌陷', effect: 'collapse', maxTriggers: 1 },
  { id: 'A04_02', areaId: 'A04', title: '笼门关闭', effect: 'lockdown', maxTriggers: 2 },
  { id: 'A05_01', areaId: 'A05', title: '校园广播', effect: 'broadcast', maxTriggers: 1, requiredItem: '校园广播磁带', consumeItem: true },
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
  { id: 'A12_02', areaId: 'A12', title: '监控回响', effect: 'replay', maxTriggers: 2, requiredItem: '监控终端权限卡', consumeItem: true },
  { id: 'S01_01', areaId: 'S01', title: '制造者日志', effect: 'truth', maxTriggers: 1 },
] as const;

export const STORY_APPROACHES = [
  { id: 'cautious', label: '谨慎勘察', ability: 'event', difficultyModifier: -1, description: '沿用事件原本的能力检定，先确认退路与证据；成功率更高，直播收益较低。' },
  { id: 'bold', label: '强行突破', ability: 'strength', difficultyModifier: 2, description: '抢在局势恶化前正面推进；难度更高，成功会获得额外热度。' },
  { id: 'social', label: '交涉取证', ability: 'social', difficultyModifier: 0, description: '借助同伴、广播或谈判换取信息；成功会改善同区关系。' },
] as const;
export type StoryApproachId = (typeof STORY_APPROACHES)[number]['id'];

export function storyApproachFor(id?: string) {
  return STORY_APPROACHES.find((approach) => approach.id === id) ?? STORY_APPROACHES[0];
}

export const AREA_STORY_NARRATIVES: Record<string, {
  scene: string; choice: string; check: string; ability: 'strength' | 'mind' | 'psyche' | 'social'; success: string; failure: string;
}> = {
  A01_01: { scene: '碎石下传来伺服电机的低鸣，锈死的哨戒炮忽然转向活物。', choice: '贴着断墙寻找射击死角，并尝试切断炮台电源。', check: '废墟求生', ability: 'mind', success: '在炮口锁定前钻入盲区，只被飞溅碎石擦伤。', failure: '误判了炮台的扫描节奏，正面吃下一轮点射。' },
  A01_02: { scene: '没有云的夜空开始落雪，温度在数十秒内跌到呼吸结霜。', choice: '辨认背风结构，决定原地避寒还是冒险转移。', check: '极寒耐受', ability: 'psyche', success: '找到残存锅炉间，保住了大部分体力。', failure: '暴露在风口太久，四肢逐渐麻木，判断也开始迟缓。' },
  A02_01: { scene: '演播塔的公共频道突然串入一段被剪碎的求救录音。', choice: '判断信号真伪，并决定是否借直播频道公开回应。', check: '信号辨识', ability: 'mind', success: '识破诱导剪辑，反用频道向观众揭露异常。', failure: '错误回应暴露了自己的位置和情绪。' },
  A02_02: { scene: '权限卡点亮终端，屏幕回放出比赛开始前不该存在的影像。', choice: '在系统清除缓存前锁定关键帧。', check: '终端破解', ability: 'mind', success: '截获一段完整监控，真相链出现新的时间锚点。', failure: '只保住残缺画面，终端随即烧毁。' },
  A03_01: { scene: '书库索引自行刷新，一组被隐藏的人物档案跳到最上层。', choice: '交叉核对档案中的时间、地点与关系记录。', check: '档案推理', ability: 'mind', success: '一条秘密关系被证据链完整揭开。', failure: '线索互相矛盾，反而加深了猜疑。' },
  A03_02: { scene: '照明逐排熄灭，服务器风扇也在黑暗中停止。', choice: '凭记忆穿过书架，寻找独立电源。', check: '黑暗定向', ability: 'psyche', success: '在彻底失明前恢复了应急灯。', failure: '黑暗放大了每一声脚步，压力迅速累积。' },
  A04_01: { scene: '格斗笼中央的地砖突然下沉，钢筋裂缝向脚下蔓延。', choice: '借笼壁支撑越过塌陷带。', check: '爆发跃迁', ability: 'strength', success: '抓住铁网荡到安全地面，只受轻伤。', failure: '落脚点整个崩落，被碎石和钢筋重击。' },
  A04_02: { scene: '四周笼门同时落下，广播要求场内人员留下一个胜者。', choice: '寻找液压锁弱点，争取在系统锁死前破门。', check: '破门检定', ability: 'strength', success: '卡住一侧笼门，封锁时间被大幅缩短。', failure: '液压锁彻底咬合，所有出口进入红色封闭状态。' },
  A05_01: { scene: '废弃校园的广播响起点名声，名单里夹着仍在场上的名字。', choice: '抢占播音室，决定回应、误导或保持沉默。', check: '临场表达', ability: 'social', success: '一段冷静回应扭转了直播舆论。', failure: '迟疑被无限放大，观众开始质疑角色的判断。' },
  A05_02: { scene: '黑板上浮出新鲜粉笔字，准确写着进入者最不愿面对的往事。', choice: '辨认这是心理诱导还是来自熟人的留言。', check: '意志稳定', ability: 'psyche', success: '擦掉字迹，拒绝让它定义下一步行动。', failure: '旧记忆反复回响，压力突破了原有防线。' },
  A06_01: { scene: '手术灯自动亮起，机械臂要求在倒计时内确认治疗方案。', choice: '阅读残缺病历，选择风险最低的急救流程。', check: '紧急医疗', ability: 'mind', success: '完成止血与修复，生命状态显著稳定。', failure: '操作只能勉强维持生命，恢复效果有限。' },
  A06_02: { scene: '药柜弹出一支标签褪色的注射剂，生产日期已无法辨认。', choice: '通过沉淀物与封口状态判断药物是否还能使用。', check: '药品鉴别', ability: 'mind', success: '及时识别过期药物，避免损失医疗资源。', failure: '药效失常，医疗包被浪费并引发强烈不适。' },
  A07_01: { scene: '起跑器无故鸣枪，远处同时亮起数个疑似敌人的热源。', choice: '压住本能反应，先判断枪声方向与回声。', check: '战场判断', ability: 'psyche', success: '识破诱饵，保持原有路线。', failure: '被假枪声带离安全位置，闯入相邻区域。' },
  A08_01: { scene: '两份物资被摆上暗巷摊位，摊主要求双方同时交出筹码。', choice: '判断对方底线，提出一笔彼此都无法轻易背叛的交易。', check: '利益谈判', ability: 'social', success: '交易完成，双方关系出现短暂但真实的缓和。', failure: '报价暴露了弱点，谈判在互相提防中破裂。' },
  A08_02: { scene: '蒙面信息贩子报出一个只有参赛者本人知道的细节。', choice: '压价并验证情报来源，决定是否支付物资。', check: '情报博弈', ability: 'social', success: '用较低代价换到一条可验证的真相线索。', failure: '付出更多物资，却只拿到一段令人不安的残缺消息。' },
  A09_01: { scene: '武器架后的温度骤升，成箱弹药开始接连爆燃。', choice: '沿承重墙冲向防爆门，避开二次殉爆。', check: '爆炸规避', ability: 'strength', success: '及时扑入掩体，只承受冲击波余震。', failure: '被爆炸掀翻，弹片穿过了来不及闭合的护甲。' },
  A10_01: { scene: '灌木被成片压倒，一双反光眼睛从低处快速逼近。', choice: '利用地形制造声源，把袭击者引向错误方向。', check: '荒野应对', ability: 'mind', success: '野兽扑向诱饵，角色趁机脱离。', failure: '诱饵失效，近距离遭到凶猛扑击。' },
  A10_02: { scene: '树木排列悄然改变，指南针在同一条路上反复转圈。', choice: '用痕迹重建来路，确认哪条路径并非幻象。', check: '密林寻路', ability: 'mind', success: '识破循环路线，留在原区域继续探索。', failure: '越走越深，最终从陌生的相邻区域跌出迷雾。' },
  A10_03: { scene: '风穿过树洞，低语准确说出了下一次禁区收缩的方向。', choice: '过滤重复声纹，寻找藏在噪声里的坐标。', check: '异常聆听', ability: 'psyche', success: '提前掌握禁区变化，并截获一段真相低语。', failure: '只听见自己的恐惧被森林复述。' },
  A11_01: { scene: '法庭灯光逐一亮起，无人席位上出现双方过去的证词。', choice: '在公开记录前陈述立场，争取对方暂时停火。', check: '庭审交涉', ability: 'social', success: '证词形成最低共识，双方达成临时合作。', failure: '陈述漏洞被放大，谈判破裂并留下更深戒心。' },
  A11_02: { scene: '证物柜吐出一份封存记录，签名与现有身份并不一致。', choice: '核验证物编号，判断记录是否被主办方篡改。', check: '证据审查', ability: 'mind', success: '隐藏关系得到证物与证词的双重印证。', failure: '关键页被替换，只留下无法证实的怀疑。' },
  A12_01: { scene: '观测数据中多出第十三个生命信号，它与 C12 的心跳完全同步。', choice: '追踪异常信号的源头，而不是立即切断连接。', check: '异常解析', ability: 'mind', success: '从重叠数据中分离出一段制造者协议。', failure: '信号反向读取意识，留下剧烈精神压力。' },
  A12_02: { scene: '监控屏幕播放同一场景的多个版本，每个版本都有不同幸存者。', choice: '用权限卡固定真实时间线，保存未被改写的画面。', check: '时间线校验', ability: 'mind', success: '确认了一段真实回放，真相拼图更加完整。', failure: '权限卡耗尽，只留下无法判断真假的回响。' },
  S01_01: { scene: '制造者日志在黑暗中逐页解密，最后一页要求 C12 回答自己是谁。', choice: '接受记忆冲突，读取被删除的身份字段。', check: '自我锚定', ability: 'psyche', success: '身份与比赛真相同时解锁，隐藏终局开始显现。', failure: '日志拒绝继续展开，但一段加密坐标仍被保留下来。' },
};

export function storyOptionsFor(eventId: string) {
  const event = AREA_SPECIAL_EVENTS.find((candidate) => candidate.id === eventId);
  const narrative = AREA_STORY_NARRATIVES[eventId];
  const title = event?.title ?? '区域异常';
  const baseChoice = narrative?.choice ?? '观察环境并选择应对方式。';
  return [
    {
      id: 'cautious' as StoryApproachId,
      label: `${title}·稳妥处置`,
      description: `先确认退路与风险，再执行：${baseChoice}`,
      ability: narrative?.ability ?? 'mind',
      difficultyModifier: -1,
    },
    {
      id: 'bold' as StoryApproachId,
      label: `${title}·抢先突破`,
      description: `抢在局势恶化前正面推进：${baseChoice}`,
      ability: 'strength' as const,
      difficultyModifier: 2,
    },
    {
      id: 'social' as StoryApproachId,
      label: `${title}·协同应对`,
      description: `寻找同伴、广播或谈判渠道共同完成：${baseChoice}`,
      ability: 'social' as const,
      difficultyModifier: 0,
    },
  ];
}

export function storyOptionFor(eventId: string, approachId?: string) {
  return storyOptionsFor(eventId).find((option) => option.id === approachId) ?? storyOptionsFor(eventId)[0];
}

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
