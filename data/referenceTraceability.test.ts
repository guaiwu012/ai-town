import trace from './referenceTraceability.generated.json';
import artifacts from './referenceArtifacts.generated.json';
import snapshot from './referenceTables.generated.json';
import { BATTLE_CONFIG, GLOBAL_RARE_ITEMS, HIDDEN_MISSIONS, ITEM_DEFINITIONS, RELATION_GENERATION } from './battleRoyaleConfig';
import { REFERENCE_ITEMS, REFERENCE_SOURCE, REFERENCE_TABLE_COUNTS } from './referenceRuntime';
import { defaultBattleState, defaultRelationshipEdges, EXECUTABLE_ITEM_EFFECT_KEYS } from '../convex/aiTown/battleRoyale';

describe('reference Excel column traceability', () => {
  test('pins and covers the complete reference snapshot', () => {
    expect(REFERENCE_SOURCE.commit).toBe('2a1d9956aee30951abd24c5e8b59b3aa9637dda5');
    expect(REFERENCE_TABLE_COUNTS).toMatchObject({ workbooks: 16, sheets: 80, characters: 12, items: 68, interventions: 21, areaStories: 24, artAssets: 34 });
    const nonemptyColumns = Object.values(snapshot.workbooks).flatMap((book) => Object.values(book.sheets)).reduce((sum, sheet) => {
      const width = Math.max(0, ...sheet.values.map((row) => row.length));
      return sum + Array.from({ length: width }, (_, column) => sheet.values.some((row) => row[column] !== null && row[column] !== '')).filter(Boolean).length;
    }, 0);
    expect(trace.sourceCommit).toBe(REFERENCE_SOURCE.commit);
    expect(trace.entries).toHaveLength(nonemptyColumns);
    for (const entry of trace.entries) expect(entry).toMatchObject({ config: expect.any(String), executor: expect.any(String), test: 'data/referenceTraceability.test.ts', ui: expect.any(String) });
  });

  test('accounts for every non-Git artifact in the reference repository', () => {
    expect(artifacts).toMatchObject({ sourceCommit: REFERENCE_SOURCE.commit, total: 108 });
    expect(artifacts.rows).toHaveLength(108);
    expect(new Set(artifacts.rows.map((row) => row.source)).size).toBe(108);
    for (const row of artifacts.rows) expect(row).toMatchObject({ bytes: expect.any(Number), sha256: expect.stringMatching(/^[a-f0-9]{64}$/), status: expect.any(String) });
  });

  test('maps all item-master columns and all area items to explicit definitions', () => {
    expect(Object.values(ITEM_DEFINITIONS).filter((item) => !item.id.startsWith('EXT_'))).toHaveLength(68);
    for (const source of REFERENCE_ITEMS) {
      const { rarity: _excelRarity, ...exactFields } = source;
      expect(ITEM_DEFINITIONS[source.name]).toMatchObject(exactFields);
      expect(ITEM_DEFINITIONS[source.name].rarity).toBe(({ C: 'common', B: 'uncommon', A: 'rare', S: 'legendary' } as const)[source.rarity as 'C' | 'B' | 'A' | 'S']);
    }
    for (const item of Object.values(BATTLE_CONFIG.areaItems).flat()) expect(ITEM_DEFINITIONS[item]).toBeDefined();
    expect([...EXECUTABLE_ITEM_EFFECT_KEYS].sort()).toEqual([...new Set(REFERENCE_ITEMS.map((item) => item.effectKey))].sort());
  });

  test('materializes player-state defaults from the workbook', () => {
    expect(defaultBattleState(1_000, 7)).toMatchObject({
      sessionId: 'battle-1000-7', platform: 'PC', phase: 'opening', elapsedSec: 0, day: 1, timeOfDay: 'day',
      popularity: 0, popularityRating: 'C', interventionPoints: 15, interventionPointsMax: 30,
      mainMission: 'REACH_S_RATING', mainMissionDone: false, yellowAreaIds: [], redAreaIds: [], relationSeedId: 'seed-7',
    });
  });

  test('uses reference relationship cardinality, strength ranges and hidden limits', () => {
    expect(RELATION_GENERATION.params.total_undirected_pairs).toBe(66);
    for (const seed of [1, 2, 77, 999]) {
      const edges = defaultRelationshipEdges(seed);
      expect(edges).toHaveLength(66);
      expect(edges.filter((edge) => edge.source === 'random').length).toBeGreaterThanOrEqual(4);
      expect(edges.filter((edge) => edge.source === 'random').length).toBeLessThanOrEqual(6);
      expect(edges.filter((edge) => edge.hidden).length).toBeGreaterThanOrEqual(1);
      expect(edges.filter((edge) => edge.hidden).length).toBeLessThanOrEqual(2);
    }
  });

  test('keeps global rare quantities and mission-specific scores exact', () => {
    expect(Object.fromEntries(GLOBAL_RARE_ITEMS.map((item) => [item.name, item.quantity]))).toEqual({ '生命树枝': 4, '陨石碎片': 4, '秘银盾': 1, '能源核心': 1, 'VF原液': 1 });
    expect(Object.fromEntries(HIDDEN_MISSIONS.map((mission) => [mission.id, mission.score]))).toEqual({ HID_01: 50, HID_02: 40, HID_03: 45, HID_04: 45, HID_05: 60, HID_06: 100 });
  });
});
