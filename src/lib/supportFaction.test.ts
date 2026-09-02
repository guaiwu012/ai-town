import { supportDoctrines, supportLevel, supportOrderProgress, supportTasks } from './supportFaction';

describe('spectator support faction', () => {
  test('derives claimable tasks from the supported contestant match state', () => {
    const tasks = supportTasks(
      { characterId: 'C05', kills: 1, alliance: 'p:1', eliminated: false },
      { aliveCount: 6, storyTriggers: ['C05:废墟里的学生档案'] },
    );
    expect(tasks.every((task) => task.complete)).toBe(true);
    expect(tasks.reduce((sum, task) => sum + task.reward, 0)).toBe(225);
  });

  test('unlocks support intervention after the founding reputation award', () => {
    expect(supportLevel(0)).toMatchObject({ level: 1, next: 30 });
    expect(supportLevel(30)).toMatchObject({ level: 2, next: 120 });
    expect(supportLevel(120)).toMatchObject({ level: 3, next: undefined });
  });

  test('keeps three distinct doctrines and measures scavenging progress', () => {
    expect(supportDoctrines.map((doctrine) => doctrine.specialty)).toEqual(['hunt', 'scavenge', 'ally']);
    expect(supportOrderProgress(
      { kind: 'scavenge', baselineSearches: 1, baselineInventory: 0, baselineCoins: 20 },
      { battle: { areaSearches: 2, inventory: [], coins: 20 } },
    )).toEqual({ value: 0.5, label: '搜索进度 1/2' });
  });
});
