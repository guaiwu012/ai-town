import { supportDoctrines, supportLevel, supportOpportunities, supportOrderEstimate, supportOrderProgress, supportTasks } from './supportFaction';

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

  test('puts the next chain step first and identifies a vulnerable hunt target', () => {
    const supported = { id: 'p:1', name: '灯塔', position: { x: 1, y: 1 }, battle: { hp: 100, maxHp: 140, areaId: 'A01', weapon: 'Pistol', inventory: [], medkits: 1 } };
    const opportunities = supportOpportunities(supported, [
      supported,
      { id: 'p:2', name: '焰火', position: { x: 2, y: 2 }, battle: { hp: 20, maxHp: 120, areaId: 'A01', weapon: 'Pistol', inventory: [], medkits: 0 } },
      { id: 'p:3', name: '尺规', position: { x: 20, y: 20 }, battle: { hp: 100, maxHp: 120, areaId: 'A03', weapon: 'Rifle', inventory: [], medkits: 1 } },
    ], 2);

    expect(opportunities[0]).toMatchObject({ kind: 'hunt', targetPlayerId: 'p:2', urgency: '高' });
    expect(opportunities[0].title).toContain('焰火');
  });

  test('shows the same acceptance tradeoff used by the server', () => {
    const lowStake = supportOrderEstimate('hunt', 'hunter', 1, { attackBias: 0.7, allianceBias: 0.2 }, 0.8);
    const highStake = supportOrderEstimate('hunt', 'hunter', 5, { attackBias: 0.7, allianceBias: 0.2 }, 0.8);
    expect(highStake.chance).toBeGreaterThan(lowStake.chance);
    expect(highStake).toMatchObject({ risk: '高', reward: 7 });
  });
});
