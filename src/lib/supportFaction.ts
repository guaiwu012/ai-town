import { SUPPORT_CHAIN_SEQUENCE, supportOrderAcceptChance } from '../../data/battleRoyaleConfig';

export type SupportTask = {
  id: string;
  title: string;
  description: string;
  reward: number;
  complete: boolean;
};

export type SupportTargetSnapshot = {
  characterId?: string;
  kills: number;
  eliminated?: boolean;
  alliance?: string;
};

export type SupportMatchSnapshot = {
  aliveCount: number;
  storyTriggers: string[];
};

export type SupportDoctrine = 'hunter' | 'logistics' | 'intel';
export type SupportOrderKind = 'hunt' | 'scavenge' | 'ally';

export const supportDoctrines: Array<{ id: SupportDoctrine; name: string; specialty: SupportOrderKind; description: string }> = [
  { id: 'hunter', name: '猎手频道', specialty: 'hunt', description: '追猎任务额外返还 1 点，适合激进角色。' },
  { id: 'logistics', name: '后勤频道', specialty: 'scavenge', description: '搜集任务额外返还 1 点，稳定积累资源。' },
  { id: 'intel', name: '情报频道', specialty: 'ally', description: '谈判任务额外返还 1 点，经营关系网络。' },
];

export const supportOrderKinds: Array<{ id: SupportOrderKind; name: string; description: string }> = [
  { id: 'hunt', name: '悬赏追猎', description: '55 秒内追踪并亲手淘汰指定目标。' },
  { id: 'scavenge', name: '物资搜集', description: '55 秒内搜索两次，或找到有价值的资源。' },
  { id: 'ally', name: '接触谈判', description: '55 秒内接近指定角色并建立联盟。' },
];

export const supportChainSteps = [
  { kind: 'ally' as const, title: '谈判侦察', description: '先接触一名角色，建立情报入口。' },
  { kind: 'scavenge' as const, title: '物资准备', description: '带着情报搜集决战资源。' },
  { kind: 'hunt' as const, title: '悬赏决战', description: '锁定目标并制造淘汰高光。' },
];

type OpportunityPlayer = {
  id: string;
  name: string;
  position: { x: number; y: number };
  battle: {
    hp: number;
    maxHp: number;
    areaId?: string;
    weapon: string;
    alliance?: string;
    eliminated?: boolean;
    inventory?: string[];
    medkits: number;
  };
};

export type SupportOpportunity = {
  id: string;
  kind: SupportOrderKind;
  targetPlayerId?: string;
  title: string;
  description: string;
  urgency: '高' | '中' | '低';
  recommendedStake: 1 | 3 | 5;
};

export function supportOpportunities(
  supported: OpportunityPlayer,
  candidates: OpportunityPlayer[],
  chainStage: number,
): SupportOpportunity[] {
  const alive = candidates.filter((candidate) => !candidate.battle.eliminated && candidate.id !== supported.id);
  const weakest = [...alive].sort((a, b) => a.battle.hp / a.battle.maxHp - b.battle.hp / b.battle.maxHp)[0];
  const contact = [...alive].sort((a, b) => {
    const aSame = Number(a.battle.areaId === supported.battle.areaId);
    const bSame = Number(b.battle.areaId === supported.battle.areaId);
    return bSame - aSame || distanceBetween(supported, a) - distanceBetween(supported, b);
  })[0];
  const lowResources = (supported.battle.inventory?.length ?? 0) <= 2 || supported.battle.medkits <= 0;
  const opportunities: SupportOpportunity[] = [
    {
      id: `ally:${contact?.id ?? 'none'}`,
      kind: 'ally',
      targetPlayerId: contact?.id,
      title: contact?.battle.areaId === supported.battle.areaId ? `现场接触 ${contact.name}` : `截住 ${contact?.name ?? '附近角色'}`,
      description: contact?.battle.areaId === supported.battle.areaId ? '双方已经在同一区域，这是成本最低的谈判窗口。' : '先建立关系入口，为后续补给与追猎取得情报。',
      urgency: contact?.battle.areaId === supported.battle.areaId ? '高' : '中',
      recommendedStake: 3,
    },
    {
      id: 'scavenge:local',
      kind: 'scavenge',
      title: lowResources ? '补给告急' : '为决战备货',
      description: lowResources ? '医疗或背包储备偏低，现在搜集能显著提高存活率。' : '补充弹药与交易物，为下一次高风险指令做准备。',
      urgency: lowResources ? '高' : '中',
      recommendedStake: lowResources ? 5 : 3,
    },
    {
      id: `hunt:${weakest?.id ?? 'none'}`,
      kind: 'hunt',
      targetPlayerId: weakest?.id,
      title: `趁虚追击 ${weakest?.name ?? '低血量目标'}`,
      description: weakest ? `目标生命仅剩 ${Math.ceil(weakest.battle.hp / weakest.battle.maxHp * 100)}%，适合制造淘汰高光。` : '等待新的可追猎目标。',
      urgency: weakest && weakest.battle.hp / weakest.battle.maxHp < 0.45 ? '高' : '低',
      recommendedStake: weakest && weakest.battle.areaId === supported.battle.areaId ? 3 : 5,
    },
  ];
  const expected = SUPPORT_CHAIN_SEQUENCE[Math.min(chainStage, SUPPORT_CHAIN_SEQUENCE.length - 1)];
  return opportunities.sort((a, b) => Number(b.kind === expected) - Number(a.kind === expected));
}

export function supportOrderEstimate(
  kind: SupportOrderKind,
  doctrine: SupportDoctrine,
  stake: number,
  persona: { attackBias: number; allianceBias: number },
  hpRatio: number,
) {
  const chance = supportOrderAcceptChance(kind, doctrine, stake, persona, hpRatio);
  const risk = kind === 'hunt' && hpRatio < 0.45 ? '极高' : kind === 'hunt' ? '高' : kind === 'ally' ? '中' : '低';
  const doctrineMatch = supportDoctrines.find((entry) => entry.id === doctrine)?.specialty === kind;
  return {
    chance,
    risk,
    reward: 1 + stake + Number(doctrineMatch),
  };
}

export function supportOrderProgress(order: {
  kind: string;
  baselineSearches: number;
  baselineInventory: number;
  baselineCoins: number;
  targetPlayerId?: string;
}, player?: { position?: { x: number; y: number }; battle?: { areaId?: string; weapon?: string; areaSearches?: number; inventory?: string[]; coins: number; alliance?: string } }, target?: { position?: { x: number; y: number }; battle?: { areaId?: string; eliminated?: boolean } }) {
  const stats = player?.battle;
  if (!stats) return { value: 0, label: '等待角色状态' };
  if (order.kind === 'scavenge') {
    const searches = Math.max(0, (stats.areaSearches ?? 0) - order.baselineSearches);
    const found = (stats.inventory?.length ?? 0) > order.baselineInventory || stats.coins >= order.baselineCoins + 25;
    return { value: found ? 1 : Math.min(1, searches / 2), label: found ? '已找到关键物资' : `搜索进度 ${Math.min(2, searches)}/2` };
  }
  if (order.kind === 'ally') {
    if (stats.alliance === order.targetPlayerId) return { value: 1, label: '联盟已经建立' };
    if (target?.battle?.areaId === stats.areaId) return { value: 0.72, label: '目标已接触 · 正在谈判' };
    return { value: 0.28, label: '谈判对象已锁定 · 正在跨区接近' };
  }
  if (target?.battle?.eliminated) return { value: 1, label: '目标已经淘汰' };
  if (target?.battle?.areaId !== stats.areaId) return { value: 0.24, label: '目标已锁定 · 正在跨区追踪' };
  const range = stats.weapon === 'Sniper' ? 5.4 : stats.weapon === 'Rifle' ? 4.2 : stats.weapon === 'Shotgun' ? 2.6 : 3.2;
  const distance = player?.position && target?.position ? Math.hypot(player.position.x - target.position.x, player.position.y - target.position.y) : Infinity;
  if (distance <= range) return { value: 0.82, label: '目标进入射程 · 正在交火' };
  return { value: 0.58, label: '已进入目标区域 · 正在抢占射击位' };
}

function distanceBetween(a: OpportunityPlayer, b: OpportunityPlayer) {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
}

export function supportTasks(target: SupportTargetSnapshot, match: SupportMatchSnapshot): SupportTask[] {
  const characterId = target.characterId ?? '';
  return [
    {
      id: 'first-blood',
      title: '制造高光',
      description: '应援角色完成至少一次淘汰',
      reward: 50,
      complete: target.kills >= 1,
    },
    {
      id: 'alliance',
      title: '找到同行者',
      description: '应援角色在局内建立联盟',
      reward: 45,
      complete: Boolean(target.alliance),
    },
    {
      id: 'story',
      title: '追进故事线',
      description: '应援角色触发一次个人剧情',
      reward: 60,
      complete: match.storyTriggers.some((trigger) => trigger.startsWith(`${characterId}:`)),
    },
    {
      id: 'final-six',
      title: '挺进终局',
      description: '应援角色存活至最后六人',
      reward: 70,
      complete: !target.eliminated && match.aliveCount <= 6,
    },
  ];
}

export function supportLevel(reputation: number) {
  if (reputation >= 120) return { level: 3, name: '阵营指挥', next: undefined };
  if (reputation >= 30) return { level: 2, name: '核心应援', next: 120 };
  return { level: 1, name: '见习观众', next: 30 };
}
