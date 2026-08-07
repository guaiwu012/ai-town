import { BATTLE_ACTIONS, BATTLE_CONFIG, AREA_ANCHORS, adjacentAreaIds, validateBattleConfig } from './battleRoyaleConfig';

describe('battle royale P0/P1 configuration', () => {
  test('has a valid 13-area graph and an anchor for every area', () => {
    expect(() => validateBattleConfig()).not.toThrow();
    expect(BATTLE_CONFIG.areas).toHaveLength(13);
    for (const area of BATTLE_CONFIG.areas) {
      expect(AREA_ANCHORS[area.id]).toBeDefined();
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
});
