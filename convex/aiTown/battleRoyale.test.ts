import { applyBattleItemEffect, applyBattleVitals, applyIntervention, areaEventEligible, battleRandom, battleReplayStateDigest, claimDecisionDriver, defaultBattleState, defaultBattleStats, replayRecordedAction, replayRecordedActions, resetBattleMatch, resolveAreaStoryCheck, submitAIDecision, tickBattleLocomotion, tickBattleRoyale, triggerRelationshipDrama } from './battleRoyale';
import { AREA_SPECIAL_EVENTS, profileForCharacterId } from '../../data/battleRoyaleConfig';
import { isBattleArenaWalkable } from '../../data/battleArena';
import { blocked } from './movement';

type TestPlayer = ReturnType<typeof createPlayer>;

function createPlayer(id: string, characterId: string, areaId: string): any {
  return {
    id,
    position: { x: 10, y: 10 },
    facing: { dx: 1, dy: 0 },
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

  it('resolves a regional story as a deterministic tabletop check', () => {
    const buildFixture = () => {
      const player = createPlayer('p:1', 'C01', 'A01');
      const game = createGame([player]);
      game.world.battle = defaultBattleState(1_000, 20260807);
      return { game, player };
    };
    const first = buildFixture();
    const second = buildFixture();
    const firstCheck = resolveAreaStoryCheck(first.game, 2_000, first.player, 'A01_01', 'A01');
    const secondCheck = resolveAreaStoryCheck(second.game, 2_000, second.player, 'A01_01', 'A01');
    expect(firstCheck).toEqual(secondCheck);
    expect(firstCheck).toMatchObject({ check: '废墟求生', difficulty: 12 });
    expect(first.game.world.battle.storyLog[0]).toEqual(firstCheck);
  });

  it('keeps an idle contestant moving between tactical decisions', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const game = createGame([player]);
    player.battle.nextLocomotionAt = 1_500;
    expect(tickBattleLocomotion(game, 2_000, player)).toBe(true);
    expect(player.pathfinding?.destination).toBeDefined();
    expect(player.battle.nextLocomotionAt).toBeGreaterThan(2_000);
    expect(player.activity?.description).toContain('巡查');
    expect(player.activity?.emoji).toBe('ROUTE');
  });

  it('only reports MOVE while coordinates are actively advancing', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const game = createGame([player]);
    player.pathfinding = { destination: { x: 20, y: 8 }, started: 1_900, state: { kind: 'moving', path: [] } };
    player.activity = { description: '错误的移动状态', emoji: 'MOVE', until: 5_000 };
    player.battle.locomotionProgressAt = 1_900;
    tickBattleLocomotion(game, 2_000, player);
    expect(player.activity?.emoji).toBe('ROUTE');

    player.speed = 0.00075;
    tickBattleLocomotion(game, 2_100, player);
    expect(player.activity?.emoji).toBe('MOVE');
    expect(player.activity?.description).toContain('正在穿越');
  });

  it('abandons a stalled collision wait and immediately replans', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const game = createGame([player]);
    player.battle.locomotionProgressAt = 1_000;
    player.battle.locomotionX = player.position.x;
    player.battle.locomotionY = player.position.y;
    player.pathfinding = {
      destination: { x: 79, y: 59 },
      started: 1_000,
      state: { kind: 'waiting', until: 9_000 },
    };

    expect(tickBattleLocomotion(game, 5_000, player)).toBe(true);
    expect(player.battle.locomotionRecoveries).toBe(1);
    expect(player.pathfinding?.started).toBe(5_000);
    expect(player.pathfinding?.state.kind).toBe('needsPath');
  });

  it('uses the logical battle layer instead of legacy AI Town object tiles', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const game = createGame([player]);
    game.worldMap.objectTiles[0][10][10] = 1;

    expect(blocked(game, 2_000, player.position, player.id)).toBeNull();
    expect(tickBattleLocomotion(game, 2_000, player)).toBe(true);
    expect(player.pathfinding?.destination).toBeDefined();
  });

  it('does not let eliminated contestants block living battle paths', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const eliminated = createPlayer('p:2', 'C02', 'A01');
    eliminated.battle.eliminated = true;
    eliminated.position = { x: 11, y: 10 };
    const game = createGame([player, eliminated]);

    expect(blocked(game, 2_000, eliminated.position, player.id)).toBeNull();
  });

  it('records model alliance speech and the partner response', () => {
    const first = createPlayer('p:1', 'C01', 'A01');
    const second = createPlayer('p:2', 'C02', 'A01');
    const game = createGame([first, second]);
    claimDecisionDriver(game, 9_000, 'driver-test-001');
    const result = submitAIDecision(game, 10_000, { driverId: 'driver-test-001', playerId: first.id, action: 'ally', targetPlayerId: second.id, reason: '共同防守更有利', speech: '我们先停火，一起守住这个区域。' });
    expect(result).toMatchObject({ accepted: true });
    expect(first.battle.alliance).toBe(second.id);
    expect(game.world.battle.dialogueLog).toHaveLength(2);
    expect(game.world.battle.dialogueLog.some((entry: any) => entry.text.includes('我们先停火'))).toBe(true);
    expect(game.world.battle.feed.filter((event: any) => event.kind === 'dialogue')).toHaveLength(2);
    expect(game.world.battle.actionLog.at(-1)?.patch?.players.map((entry: any) => entry.id)).toEqual([first.id, second.id]);
    expect(game.world.battle.actionLog.at(-1)?.patch?.relationships).toContainEqual(expect.objectContaining({ strength: 14, lastReason: '结盟' }));
  });

  it('reveals the selected character hidden relationship and leaves an audit event', () => {
    const game = createGame([createPlayer('p:4', 'C03', 'A05')]);

    applyIntervention(game, 2_000, { opId: 'REC_01', targetPlayerId: 'p:4' });

    const mentorLink = game.world.battle.relationshipEdges.find((edge: any) => edge.id === 'REL_SEED_04');
    expect(mentorLink.hidden).toBe(false);
    expect(mentorLink.lastReason).toBe('主办方关系侦察');
    expect(game.world.battle.feed.some((event: any) => event.text.includes('隐藏师徒关系已被公开侦察'))).toBe(true);
    const replayEntry = game.world.battle.actionLog.at(-1);
    expect(replayEntry).toMatchObject({ action: 'intervention', accepted: true });
    expect(replayEntry.patch.relationships).toContainEqual(expect.objectContaining({ id: 'REL_SEED_04', hidden: false }));
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

  it('replays accepted model and rule actions deterministically in timestamp and action-id order', () => {
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
      { id: 2, ts: 2_100, playerId: 'p:12', action: 'investigate', source: 'rule', accepted: true },
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
    expect(secondReplay.stateDigest).toBe(firstReplay.stateDigest);
    expect(battleReplayStateDigest(second.game)).toBe(firstReplay.stateDigest);
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

  it('turns hunger into stamina pressure while the hospital restores stress and zone time', () => {
    const hungry = createPlayer('p:5', 'C05', 'A05');
    hungry.battle.satiety = 20;
    hungry.battle.stamina = 50;
    hungry.battle.stress = 30;
    hungry.battle.zoneTime = 20;
    const medic = createPlayer('p:6', 'C06', 'A06');
    medic.battle.stress = 30;
    medic.battle.zoneTime = 20;
    const game = createGame([hungry, medic]);
    game.world.battle.lastVitalsUpdate = 1_000;

    applyBattleVitals(game, 61_000);

    expect(hungry.battle.satiety).toBe(17);
    expect(hungry.battle.stamina).toBe(47);
    expect(hungry.battle.stress).toBe(32);
    expect(medic.battle.stress).toBeCloseTo(30 - 60 / 18);
    expect(medic.battle.zoneTime).toBe(21);
  });

  it('applies consumable food and calming item effects through the production item layer', () => {
    const player = createPlayer('p:12', 'C12', 'A12');
    player.battle.satiety = 60;
    player.battle.stress = 18;
    const game = createGame([player]);

    applyBattleItemEffect(game, 2_000, player, '军用口粮');
    applyBattleItemEffect(game, 2_000, player, '罐装咖啡');

    expect(player.battle.satiety).toBe(88);
    expect(player.battle.stress).toBe(8);
    expect(game.world.battle.feed.filter((event: any) => event.kind === 'item')).toHaveLength(2);
  });

  it('announces the zone warning once and schedules the next closure after it contracts', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const game = createGame([player]);
    game.world.battle.zoneClosesAt = 31_000;
    game.world.battle.lastTick = 1_000_000;

    tickBattleRoyale(game, 7_000);
    expect(game.world.battle.lastZoneWarningAt).toBe(31_000);
    expect(game.world.battle.feed.some((event: any) => event.text.includes('禁区预警'))).toBe(true);
    const warningCount = game.world.battle.feed.filter((event: any) => event.text.includes('禁区预警')).length;
    tickBattleRoyale(game, 3_000);
    expect(game.world.battle.feed.filter((event: any) => event.text.includes('禁区预警'))).toHaveLength(warningCount);

    tickBattleRoyale(game, 31_000);
    expect(game.world.battle.openAreas).toHaveLength(12);
    expect(game.world.battle.zoneClosesAt).toBe(31_000 + 90_000);
  });

  it('persists a lightweight replay frame with player positions at each checkpoint', () => {
    const player = createPlayer('p:12', 'C12', 'A12');
    player.position = { x: 17, y: 5 };
    player.facing = { dx: 0, dy: 1 };
    player.battle.hp = 73;
    player.battle.inventory = ['军用口粮'];
    const game = createGame([player]);
    game.world.battle.lastReplayCheckpointAt = 1_000;

    tickBattleRoyale(game, 31_100);

    const checkpoint = game.world.battle.replayCheckpoints.at(-1);
    expect(checkpoint?.frame?.players).toContainEqual(expect.objectContaining({
      id: player.id, x: 17, y: 5, hp: 73, areaId: 'A12', inventory: ['军用口粮'],
    }));
    expect(checkpoint?.frame?.openAreas).toEqual(game.world.battle.openAreas);
    expect(checkpoint?.actionId).toBeGreaterThan(0);
  });

  it('records the concrete rule action without null optional fields', () => {
    const first = createPlayer('p:1', 'C01', 'A01');
    const second = createPlayer('p:2', 'C02', 'A02');
    first.battle.nextLocomotionAt = 100_000;
    second.battle.nextLocomotionAt = 100_000;
    first.battle.interventionKind = 'SUP_01';
    first.battle.interventionUntil = 10_000;
    second.battle.interventionKind = 'SUP_01';
    second.battle.interventionUntil = 10_000;
    const game = createGame([first, second]);

    tickBattleRoyale(game, 7_000);

    expect(game.world.battle.actionLog.length).toBeGreaterThan(0);
    for (const entry of game.world.battle.actionLog.filter((candidate: any) => candidate.action !== 'worldTick')) {
      expect(entry.action).not.toBe('fallback');
      expect(entry.targetPlayerId).not.toBeNull();
      expect(entry.targetAreaId).not.toBeNull();
      expect(entry.patch?.players.length).toBeGreaterThan(0);
    }
  });

  it('runs rule healing through the shared executor and records its resulting patch', () => {
    const wounded = createPlayer('p:1', 'C01', 'A01');
    wounded.battle.hp = 30;
    wounded.battle.medkits = 1;
    const observer = createPlayer('p:2', 'C02', 'A02');
    observer.position = { x: 60, y: 45 };
    const game = createGame([wounded, observer]);

    tickBattleRoyale(game, 7_000);

    const action = game.world.battle.actionLog.find((entry: any) => entry.playerId === wounded.id);
    expect(wounded.battle.hp).toBe(52);
    expect(wounded.battle.medkits).toBe(0);
    expect(action).toMatchObject({ action: 'heal', source: 'rule', accepted: true });
    expect(action.patch.players).toContainEqual(expect.objectContaining({ id: wounded.id, hp: 52, medkits: 0 }));
  });

  it('requires the terminal card before permission-gated replay stories can trigger', () => {
    const player = createPlayer('p:12', 'C12', 'A12');
    const game = createGame([player]);
    const event = AREA_SPECIAL_EVENTS.find((candidate) => candidate.id === 'A12_02')!;

    expect(areaEventEligible(game, 2_000, event)).toBe(false);
    player.battle.inventory = ['监控终端权限卡'];
    expect(areaEventEligible(game, 2_000, event)).toBe(true);
  });

  it('returns each reset contestant to a walkable spawn inside their assigned battle area', () => {
    const player = createPlayer('p:12', 'C12', 'A12');
    const game = createGame([player]);
    game.world.agents = new Map();
    game.agentDescriptions = new Map();

    resetBattleMatch(game, 2_000);

    expect(player.battle?.areaId).toBe('A01');
    expect(isBattleArenaWalkable('A01', player.position, 80, 60)).toBe(true);
  });

  it('scores relationship reunion, protection and reversal exactly once', () => {
    const guardian = createPlayer('p:1', 'C01', 'A01');
    const protectedPlayer = createPlayer('p:5', 'C05', 'A01');
    protectedPlayer.battle.hp = 20;
    const rivalA = createPlayer('p:4', 'C04', 'A04');
    const rivalB = createPlayer('p:9', 'C09', 'A04');
    rivalA.battle.hp = 40;
    rivalB.battle.hp = 40;
    const game = createGame([guardian, protectedPlayer, rivalA, rivalB]);
    const rivals = game.world.battle.relationshipEdges.find((edge: any) => edge.id === 'REL_SEED_03');
    rivals.strength = -35;

    triggerRelationshipDrama(game, 2_000);
    const afterFirst = game.world.battle.popularity;
    triggerRelationshipDrama(game, 3_000);

    expect(guardian.battle.alliance).toBe(protectedPlayer.id);
    expect(guardian.battle.medkits).toBe(0);
    expect(protectedPlayer.battle.hp).toBe(48);
    expect(rivalA.battle.alliance).toBe(rivalB.id);
    expect(game.world.battle.storyTriggers).toEqual(expect.arrayContaining([
      '关系:重逢:REL_SEED_01', '关系:守护:REL_SEED_01', '关系:逆转:REL_SEED_03',
    ]));
    expect(game.world.battle.popularity).toBe(afterFirst);
  });
});
