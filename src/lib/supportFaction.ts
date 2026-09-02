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
  { id: 'hunt', name: '悬赏追猎', description: '60 秒内追踪并亲手淘汰指定目标。' },
  { id: 'scavenge', name: '物资搜集', description: '60 秒内搜索两次，或找到有价值的资源。' },
  { id: 'ally', name: '接触谈判', description: '60 秒内接近指定角色并建立联盟。' },
];

export function supportOrderProgress(order: {
  kind: string;
  baselineSearches: number;
  baselineInventory: number;
  baselineCoins: number;
  targetPlayerId?: string;
}, player?: { battle?: { areaSearches?: number; inventory?: string[]; coins: number; alliance?: string } }) {
  const stats = player?.battle;
  if (!stats) return { value: 0, label: '等待角色状态' };
  if (order.kind === 'scavenge') {
    const searches = Math.max(0, (stats.areaSearches ?? 0) - order.baselineSearches);
    const found = (stats.inventory?.length ?? 0) > order.baselineInventory || stats.coins >= order.baselineCoins + 25;
    return { value: found ? 1 : Math.min(1, searches / 2), label: found ? '已找到关键物资' : `搜索进度 ${Math.min(2, searches)}/2` };
  }
  if (order.kind === 'ally') return { value: stats.alliance === order.targetPlayerId ? 1 : 0.35, label: stats.alliance === order.targetPlayerId ? '联盟已经建立' : '正在接近并谈判' };
  return { value: 0.45, label: '正在追踪悬赏目标' };
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
