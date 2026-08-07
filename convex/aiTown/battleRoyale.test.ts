import { applyIntervention, battleRandom, defaultBattleState, defaultBattleStats, replayRecordedAction, replayRecordedActions } from './battleRoyale';
import { profileForCharacterId } from '../../data/battleRoyaleConfig';

type TestPlayer = ReturnType<typeof createPlayer>;

function createPlayer(id: string, characterId: string, areaId: string): any {
  return {
    id,
    position: { x: 10, y: 10 },
    speed: 0,
    battle: {
      ...defaultBattleStats(profileForCharacterId(characterId)),
      characterId,
      areaId,
      areaEnteredAt: 1_000,
    },
  };
}

function createGame(players: TestPlayer[]) {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const width = 80;
  const height = 60;
  return {
    world: {
      battle: defaultBattleState(1_000),
      players: playerMap,
      conversations: new Map(),
    },
    playerDescriptions: new Map(players.map((player) => [player.id, { name: player.battle.characterId }])),
    worldMap: {
      width,
      height,
      objectTiles: [Array.from({ length: width }, () => Array.from({ length: height }, () => -1))],
    },
  } as any;
}

describe('battle royale host intervention rules', () => {
  it('replays the same random sequence from the same match seed', () => {
    const first = { world: { battle: defaultBattleState(1_000, 20260807) } } as any;
    const second = { world: { battle: defaultBattleState(1_000, 20260807) } } as any;

    const firstSequence = Array.from({ length: 6 }, () => battleRandom(first));
    const secondSequence = Array.from({ length: 6 }, () => battleRandom(second));

    expect(firstSequence).toEqual(secondSequence);
    expect(first.world.battle.rngState).toBe(second.world.battle.rngState);
  });

  it('reveals the selected character hidden relationship and leaves an audit event', () => {
    const game = createGame([createPlayer('p:4', 'C03', 'A05')]);

    applyIntervention(game, 2_000, { opId: 'REC_01', targetPlayerId: 'p:4' });

    const mentorLink = game.world.battle.relationshipEdges.find((edge: any) => edge.id === 'REL_SEED_04');
    expect(mentorLink.hidden).toBe(false);
    expect(mentorLink.lastReason).toBe('主办方关系侦察');
    expect(game.world.battle.feed.some((event: any) => event.text.includes('隐藏师徒关系已被公开侦察'))).toBe(true);
  });

  it('turns anonymous provocation into a durable negative relationship change', () => {
    const first = createPlayer('p:0', 'C01', 'A01');
    const second = createPlayer('p:2', 'C02', 'A01');
    first.battle.alliance = second.id;
    second.battle.alliance = first.id;
    const game = createGame([first, second]);

    applyIntervention(game, 2_000, { opId: 'INF_03', targetPlayerId: first.id, secondPlayerId: second.id });

    const link = game.world.battle.relationshipEdges.find((edge: any) => edge.id === 'REL_C01_C02');
    expect(first.battle.alliance).toBeUndefined();
    expect(second.battle.alliance).toBeUndefined();
    expect(link).toMatchObject({ strength: -25, lastReason: '匿名挑拨' });
  });

  it('applies the hospital story intervention only to the hospital area', () => {
    const patient = createPlayer('p:10', 'C06', 'A06');
    patient.battle.hp = 50;
    patient.battle.medkits = 0;
    const game = createGame([patient]);

    applyIntervention(game, 2_000, { opId: 'STO_02', targetAreaId: 'A06' });

    expect(patient.battle.medkits).toBe(1);
    expect(patient.battle.hp).toBe(62);
    expect(patient.battle.interventionKind).toBe('STO_02');
  });

  it('enforces the fighting-pit story lock until the host removes it', () => {
    const fighter = createPlayer('p:4', 'C04', 'A04');
    const game = createGame([fighter]);
    game.world.battle.areaLocks = [{ areaId: 'A04', until: 10_000 }];

    expect(replayRecordedAction(game, 2_000, { playerId: fighter.id, action: 'move', targetAreaId: 'A07' }))
      .toMatchObject({ accepted: false, reason: '当前区域被剧情封锁' });

    applyIntervention(game, 2_000, { opId: 'STO_01', targetAreaId: 'A04' });
    expect(game.world.battle.areaLocks).toEqual([]);
  });

  it('replays a recorded structured action through the production executor', () => {
    const player = createPlayer('p:12', 'C12', 'A12');
    player.battle.hp = 40;
    player.battle.medkits = 1;
    const game = createGame([player]);

    const result = replayRecordedAction(game, 2_000, { playerId: player.id, action: 'heal' });

    expect(result).toMatchObject({ accepted: true });
    expect(player.battle.hp).toBe(62);
    expect(player.battle.medkits).toBe(0);
    expect(game.world.battle.decisionCount).toBe(0);
  });

  it('replays accepted model actions deterministically in timestamp and action-id order', () => {
    const buildFixture = () => {
      const player = createPlayer('p:12', 'C12', 'A12');
      player.battle.hp = 40;
      player.battle.medkits = 1;
      const game = createGame([player]);
      game.world.battle = defaultBattleState(1_000, 20260807);
      return { game, player };
    };
    const log = [
      // Intentionally out of order: the replay executor is the authority for ordering.
      { id: 2, ts: 2_100, playerId: 'p:12', action: 'investigate', source: 'model', accepted: true },
      { id: 1, ts: 2_000, playerId: 'p:12', action: 'heal', source: 'model', accepted: true },
      { id: 3, ts: 2_200, playerId: 'p:12', action: 'fallback', source: 'rule', accepted: true },
      { id: 4, ts: 2_300, playerId: 'p:12', action: 'attack', source: 'model', accepted: false },
    ];
    const first = buildFixture();
    const second = buildFixture();

    const firstReplay = replayRecordedActions(first.game, log);
    const secondReplay = replayRecordedActions(second.game, log);

    expect(firstReplay).toMatchObject({ applied: 2, rejected: 0 });
    expect(firstReplay.results.map((entry) => entry.id)).toEqual([1, 2]);
    expect(first.player.battle.hp).toBe(62);
    expect(first.player.battle.medkits).toBe(0);
    expect(first.game.world.battle.truthClues).toEqual(['调查-A12']);
    expect(second.player.battle).toEqual(first.player.battle);
    expect(second.game.world.battle.rngState).toBe(first.game.world.battle.rngState);
    expect(second.game.world.battle.feed).toEqual(first.game.world.battle.feed);
  });

  it('reproduces seeded search loot and local movement from the same accepted log', () => {
    const buildFixture = () => {
      const player = createPlayer('p:12', 'C12', 'A12');
      player.position = { x: 17, y: 5 };
      const game = createGame([player]);
      game.world.battle = defaultBattleState(1_000, 20260807);
      return { game, player };
    };
    const log = [{ id: 1, ts: 2_000, playerId: 'p:12', action: 'search', source: 'model', accepted: true }];
    const first = buildFixture();
    const second = buildFixture();

    expect(replayRecordedActions(first.game, log)).toMatchObject({ applied: 1, rejected: 0 });
    expect(replayRecordedActions(second.game, log)).toMatchObject({ applied: 1, rejected: 0 });
    expect(first.player.battle.inventory).toEqual(second.player.battle.inventory);
    expect(first.player.battle.coins).toBe(second.player.battle.coins);
    expect(first.game.world.battle.areaResources).toEqual(second.game.world.battle.areaResources);
    expect(first.game.world.battle.rngState).toBe(second.game.world.battle.rngState);
    expect(first.player.pathfinding).toEqual(second.player.pathfinding);
  });
});
