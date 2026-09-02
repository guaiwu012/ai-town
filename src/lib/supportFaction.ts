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
