import { BATTLE_ACTIONS, BATTLE_CONFIG, AREA_ANCHORS, AREA_SPECIAL_EVENTS, GLOBAL_SPECIAL_EVENTS, INTERVENTION_OPERATIONS, ITEM_DEFINITIONS, adjacentAreaIds, itemDefinition, validateBattleConfig } from './battleRoyaleConfig';
import { BATTLE_ARENA_ZONES, battleAreaSpawnPoints } from './battleArena';

describe('battle royale P0/P1 configuration', () => {
  test('has a valid 13-area graph and an anchor for every area', () => {
    expect(() => validateBattleConfig()).not.toThrow();
    expect(BATTLE_CONFIG.areas).toHaveLength(13);
    for (const area of BATTLE_CONFIG.areas) {
      expect(AREA_ANCHORS[area.id]).toBeDefined();
    }
  });

  test('gives every logical zone a polygon and authoritative spawn points', () => {
    expect(BATTLE_ARENA_ZONES).toHaveLength(13);
    for (const zone of BATTLE_ARENA_ZONES) {
      expect(zone.polygon).toHaveLength(6);
      expect(battleAreaSpawnPoints(zone.id, 80, 60).length).toBeGreaterThanOrEqual(4);
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

  test('gives high-impact items explicit rarity and trade value', () => {
    expect(ITEM_DEFINITIONS['真相数据核心']).toMatchObject({ rarity: 'legendary', tradeValue: 120 });
    expect(itemDefinition('突击步枪').rarity).toBe('rare');
    expect(itemDefinition('不存在的普通物品')).toMatchObject({ rarity: 'common', tradeValue: 12 });
  });
});
