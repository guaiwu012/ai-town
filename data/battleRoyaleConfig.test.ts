import { BATTLE_ACTIONS, BATTLE_CONFIG, AREA_ANCHORS, AREA_SPECIAL_EVENTS, AREA_STORY_NARRATIVES, GLOBAL_SPECIAL_EVENTS, INTERVENTION_OPERATIONS, ITEM_DEFINITIONS, adjacentAreaIds, availableAreaItemsFor, itemDefinition, storyOptionsFor, validateBattleConfig } from './battleRoyaleConfig';
import { BATTLE_ARENA_ZONES, battleAreaNavigationPoints, battleAreaSpawnPoints, buildBattleArenaGrid, isBattleArenaPositionWalkable, isBattleArenaWalkable, isPointInBattleArea } from './battleArena';

describe('battle royale P0/P1 configuration', () => {
  test('has a valid 13-area graph and an anchor for every area', () => {
    expect(() => validateBattleConfig()).not.toThrow();
    expect(BATTLE_CONFIG.areas).toHaveLength(13);
    for (const area of BATTLE_CONFIG.areas) {
      expect(AREA_ANCHORS[area.id]).toBeDefined();
    }
  });

  test('gives every logical zone a polygon, landmark collision and authoritative spawn points', () => {
    expect(BATTLE_ARENA_ZONES).toHaveLength(13);
    for (const zone of BATTLE_ARENA_ZONES) {
      expect(zone.polygon).toHaveLength(6);
      expect(battleAreaSpawnPoints(zone.id, 80, 60).length).toBeGreaterThanOrEqual(4);
      const navigationPoints = battleAreaNavigationPoints(zone.id, 80, 60);
      expect(navigationPoints.length).toBeGreaterThanOrEqual(8);
      navigationPoints.forEach((point) => expect(isBattleArenaWalkable(zone.id, point, 80, 60)).toBe(true));
      expect(isPointInBattleArea(zone.id, { x: zone.anchor.x * 80, y: zone.anchor.y * 60 }, 80, 60)).toBe(true);
      expect(isBattleArenaWalkable(zone.id, { x: zone.anchor.x * 80, y: zone.anchor.y * 60 }, 80, 60)).toBe(true);
      expect(zone.obstacles).toHaveLength(2);
      for (const obstacle of zone.obstacles) {
        expect(isBattleArenaWalkable(zone.id, {
          x: (obstacle.x + obstacle.width / 2) * 80,
          y: (obstacle.y + obstacle.height / 2) * 60,
        }, 80, 60)).toBe(false);
      }
    }
  });

  test('builds a deterministic navigation raster with connected adjacency corridors', () => {
    const first = buildBattleArenaGrid(80, 60);
    const second = buildBattleArenaGrid(80, 60);
    expect(second).toBe(first);
    expect(first.cells).toHaveLength(80);
    expect(first.cells[0]).toHaveLength(60);
    for (const zone of BATTLE_ARENA_ZONES) {
      for (const spawn of battleAreaSpawnPoints(zone.id, 80, 60)) {
        expect(isBattleArenaPositionWalkable(spawn, 80, 60)).toBe(true);
      }
    }
    for (const [fromId, toId] of BATTLE_CONFIG.adjacency) {
      const start = battleAreaSpawnPoints(fromId, 80, 60)[0];
      const target = battleAreaSpawnPoints(toId, 80, 60)[0];
      expect(gridPathExists(first, start, target)).toBe(true);
    }
  });

  test('keeps movement constrained by the reference adjacency table', () => {
    expect(adjacentAreaIds('A01')).toEqual(expect.arrayContaining(['A06', 'A09', 'A10']));
    expect(adjacentAreaIds('A01')).not.toContain('A02');
    expect(adjacentAreaIds('S01')).toEqual(['A12']);
  });

  test('uses the agreed model-decision budget and action allowlist', () => {
    expect(BATTLE_CONFIG.match.llmDecisionIntervalMs).toBe(12000);
    expect(BATTLE_CONFIG.match.llmDecisionMaxPerMatch).toBe(240);
    expect(BATTLE_ACTIONS).toEqual(['move', 'search', 'buy', 'trade', 'ally', 'attack', 'flee', 'heal', 'investigate']);
  });

  test('retains all four reference seed relationships', () => {
    expect(BATTLE_CONFIG.relationships.map((edge) => edge.id)).toEqual([
      'REL_SEED_01', 'REL_SEED_02', 'REL_SEED_03', 'REL_SEED_04',
    ]);
  });

  test('keeps the complete reference story catalog and its special interventions', () => {
    expect(AREA_SPECIAL_EVENTS).toHaveLength(24);
    expect(GLOBAL_SPECIAL_EVENTS).toHaveLength(3);
    expect(AREA_SPECIAL_EVENTS.map((event) => event.id)).toEqual(expect.arrayContaining(['A02_02', 'A05_02', 'A10_03', 'S01_01']));
    expect(INTERVENTION_OPERATIONS.map((operation) => operation.id)).toEqual(expect.arrayContaining(['STO_01', 'STO_02', 'STO_03', 'STO_04', 'STO_05', 'STO_06']));
  });

  test('gives every regional story a tabletop scene, choice and branched outcome', () => {
    expect(Object.keys(AREA_STORY_NARRATIVES)).toHaveLength(AREA_SPECIAL_EVENTS.length);
    for (const event of AREA_SPECIAL_EVENTS) {
      expect(AREA_STORY_NARRATIVES[event.id]).toEqual(expect.objectContaining({
        scene: expect.any(String), choice: expect.any(String), check: expect.any(String),
        success: expect.any(String), failure: expect.any(String),
      }));
      const options = storyOptionsFor(event.id);
      expect(options.map((option) => option.id)).toEqual(['cautious', 'bold', 'social']);
      options.forEach((option) => {
        expect(option.label).toContain(event.title);
        expect(option.description).toContain(AREA_STORY_NARRATIVES[event.id].choice);
      });
    }
  });

  test('gives high-impact items explicit rarity and trade value', () => {
    expect(ITEM_DEFINITIONS['真相数据核心']).toMatchObject({ rarity: 'legendary', tradeValue: 120 });
    expect(itemDefinition('突击步枪').rarity).toBe('rare');
    expect(itemDefinition('校园广播磁带')).toMatchObject({ rarity: 'rare', tradeValue: 42 });
    expect(itemDefinition('不存在的普通物品')).toMatchObject({ rarity: 'common', tradeValue: 12 });
  });

  test('gives every configured area item an explicit economy definition', () => {
    const allAreaItems = new Set(Object.values(BATTLE_CONFIG.areaItems).flat());
    expect(Object.keys(ITEM_DEFINITIONS)).toEqual(expect.arrayContaining([...allAreaItems]));
  });

  test('only exposes a character story item to its owner', () => {
    expect(availableAreaItemsFor('C05', 'A05')).toContain('学生档案');
    expect(availableAreaItemsFor('C01', 'A05')).not.toContain('学生档案');
    expect(availableAreaItemsFor('C01', 'A05')).toContain('校园广播磁带');
  });
});

function gridPathExists(grid: ReturnType<typeof buildBattleArenaGrid>, start: { x: number; y: number }, target: { x: number; y: number }) {
  const queue = [{ x: Math.floor(start.x), y: Math.floor(start.y) }];
  const targetKey = `${Math.floor(target.x)},${Math.floor(target.y)}`;
  const visited = new Set(queue.map((point) => `${point.x},${point.y}`));
  while (queue.length) {
    const current = queue.shift()!;
    if (`${current.x},${current.y}` === targetKey) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= grid.width || y >= grid.height || visited.has(key) || !grid.cells[x][y].walkable) continue;
      visited.add(key);
      queue.push({ x, y });
    }
  }
  return false;
}
