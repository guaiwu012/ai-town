import { applyBattleItemEffect, applyBattleVitals, applyIntervention, areaEventEligible, battleRandom, battleReplayStateDigest, claimDecisionDriver, defaultBattleState, defaultBattleStats, encounterDisposition, replayRecordedAction, replayRecordedActions, resetBattleMatch, resolveAreaStoryCheck, resolveCloseEncounters, submitAIDecision, tickBattleLocomotion, tickBattleRoyale, triggerAreaSpecialEvent, triggerRelationshipDrama } from './battleRoyale';
import { AREA_SPECIAL_EVENTS, profileForCharacterId } from '../../data/battleRoyaleConfig';
import { battleAreaNavigationPoints, battleAreaSpawnPoints, isBattleArenaWalkable } from '../../data/battleArena';
import { blocked } from './movement';

type TestPlayer = ReturnType<typeof createPlayer>;

function createPlayer(id: string, characterId: string, areaId: string): any {
  return {
    id,
    position: battleAreaSpawnPoints(areaId, 80, 60)[0],
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
    game.worldMap.objectTiles[0][Math.floor(player.position.x)][Math.floor(player.position.y)] = 1;

    expect(blocked(game, 2_000, player.position, player.id)).toBeNull();
    expect(tickBattleLocomotion(game, 2_000, player)).toBe(true);
    expect(player.pathfinding?.destination).toBeDefined();
  });

  it('does not let eliminated contestants block living battle paths', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    const eliminated = createPlayer('p:2', 'C02', 'A01');
    eliminated.battle.eliminated = true;
    eliminated.position = battleAreaNavigationPoints('A01', 80, 60).find((point) => (
      Math.hypot(point.x - player.position.x, point.y - player.position.y) > 2
    ))!;
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

  it('lets an aggressive persona choose combat in most same-area encounters', () => {
    let attacks = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const fighter = createPlayer('p:4', 'C04', 'A04');
      const rival = createPlayer('p:9', 'C09', 'A04');
      const game = createGame([fighter, rival]);
      game.world.battle = defaultBattleState(1_000, seed);
      if (encounterDisposition(game, fighter, rival) === 'attack') attacks += 1;
    }
    expect(attacks).toBeGreaterThan(38);
  });

  it('uses persona combat dialogue when an attack is executed', () => {
    const fighter = createPlayer('p:4', 'C04', 'A04');
    const rival = createPlayer('p:9', 'C09', 'A04');
    rival.position = { ...fighter.position };
    const game = createGame([fighter, rival]);

    expect(replayRecordedAction(game, 2_000, { playerId: fighter.id, action: 'attack', targetPlayerId: rival.id })).toMatchObject({ accepted: true });
    expect(game.world.battle.dialogueLog[0]).toMatchObject({ speakerId: fighter.id, listenerId: rival.id, kind: 'combat' });
    expect(['别废话，来。', '站着挨打，还是跪着认输？']).toContain(game.world.battle.dialogueLog[0].text);
    expect(game.world.battle.feed.find((entry: any) => entry.kind === 'attack')).toMatchObject({ weapon: fighter.battle.weapon });
  });

  it('forces a close pair to talk or shoot exactly once during its encounter cooldown', () => {
    const first = createPlayer('p:1', 'C01', 'A01');
    const second = createPlayer('p:5', 'C05', 'A01');
    second.position = { ...first.position };
    first.battle.alliance = second.id;
    second.battle.alliance = first.id;
    const game = createGame([first, second]);
    const relation = game.world.battle.relationshipEdges.find((entry: any) => entry.id === 'REL_SEED_01');

    resolveCloseEncounters(game, 2_000, [first, second]);

    expect(game.world.battle.actionLog.at(-1)).toMatchObject({ action: 'encounterTalk', accepted: true });
    expect([first.id, second.id]).toContain(game.world.battle.actionLog.at(-1)?.targetPlayerId);
    expect(game.world.battle.dialogueLog).toHaveLength(2);
    expect(relation.strength).toBe(87);
    expect(relation.lastReason).toBe('近距离并肩交流');
    expect(game.world.battle.encounterCooldowns).toHaveLength(1);
    resolveCloseEncounters(game, 3_000, [first, second]);
    expect(game.world.battle.dialogueLog).toHaveLength(2);
  });

  it('does not announce a close encounter for contestants outside the proximity threshold', () => {
    const first = createPlayer('p:1', 'C01', 'A01');
    const second = createPlayer('p:5', 'C05', 'A01');
    second.position = { x: first.position.x + 3, y: first.position.y };
    const game = createGame([first, second]);

    resolveCloseEncounters(game, 2_000, [first, second]);

    expect(game.world.battle.dialogueLog).toHaveLength(0);
    expect(game.world.battle.actionLog).toHaveLength(0);
  });

  it('applies a support-faction drop only to its selected contestant', () => {
    const supported = createPlayer('p:5', 'C05', 'A05');
    const bystander = createPlayer('p:6', 'C06', 'A05');
    supported.battle.stamina = 40;
    supported.battle.armor = 0;
    supported.battle.coins = 0;
    bystander.battle.stamina = 40;
    const game = createGame([supported, bystander]);

    const result = applyIntervention(game, 2_000, { opId: 'FAN_01', targetPlayerId: supported.id });

    expect(result).toMatchObject({ remainingPoints: 13, operation: '阵营应援空投' });
    expect(supported.battle).toMatchObject({ stamina: 58, armor: 2, coins: 12, interventionKind: 'FAN_01' });
    expect(bystander.battle).toMatchObject({ stamina: 40, armor: 0, coins: 20 });
    expect(game.world.battle.feed.some((event: any) => event.text.includes('专属空投'))).toBe(true);
    expect(game.world.battle.dialogueLog[0]).toMatchObject({ kind: 'support', text: '是给我的吗？谢谢……我会努力活下去。' });
    expect(supported.battle.nextLocomotionAt).toBe(2_900);
  });

  it('assigns a bounty from the first contestant to the second contestant', () => {
    const hunter = createPlayer('p:1', 'C01', 'A01');
    const target = createPlayer('p:2', 'C02', 'A06');
    const game = createGame([hunter, target]);

    expect(() => applyIntervention(game, 2_000, { opId: 'RUL_04', targetPlayerId: hunter.id }))
      .toThrow('请选择两名不同角色。');

    const result = applyIntervention(game, 2_000, {
      opId: 'RUL_04',
      targetPlayerId: hunter.id,
      secondPlayerId: target.id,
    });

    expect(result).toMatchObject({ remainingPoints: 11, operation: '悬赏追杀' });
    expect(game.world.battle).toMatchObject({ bountyHunterId: hunter.id, bountyPlayerId: target.id });
    expect(hunter.activity?.description).toContain('接到追杀任务');
    expect(target.activity?.description).toContain('悬赏警报');
    expect(game.world.battle.feed.some((event: any) => event.text.includes('向C01发布追杀任务，目标为C02'))).toBe(true);
  });

  it('makes the assigned hunter pursue across areas and awards only a completed contract', () => {
    const hunter = createPlayer('p:1', 'C01', 'A01');
    const target = createPlayer('p:2', 'C02', 'A06');
    const game = createGame([hunter, target]);
    applyIntervention(game, 2_000, {
      opId: 'RUL_04',
      targetPlayerId: hunter.id,
      secondPlayerId: target.id,
    });

    tickBattleRoyale(game, 7_000);
    expect(hunter.battle.areaId).toBe('A06');
    expect(game.world.battle.feed.some((event: any) => event.text.includes('沿区域路线追踪'))).toBe(true);

    hunter.position = { ...target.position };
    target.battle.hp = 1;
    target.battle.coins = 20;
    const coinsBefore = hunter.battle.coins;
    expect(replayRecordedAction(game, 8_000, {
      playerId: hunter.id,
      action: 'attack',
      targetPlayerId: target.id,
    })).toMatchObject({ accepted: true });

    expect(hunter.battle.coins - coinsBefore).toBe(90);
    expect(game.world.battle.bountyHunterId).toBeUndefined();
    expect(game.world.battle.bountyPlayerId).toBeUndefined();
    expect(game.world.battle.feed.some((event: any) => event.text.includes('【悬赏完成】'))).toBe(true);
  });

  it('invalidates a bounty without paying its reward when a third party eliminates the target', () => {
    const hunter = createPlayer('p:1', 'C01', 'A01');
    const target = createPlayer('p:2', 'C02', 'A01');
    const thirdParty = createPlayer('p:3', 'C03', 'A01');
    const game = createGame([hunter, target, thirdParty]);
    applyIntervention(game, 2_000, {
      opId: 'RUL_04',
      targetPlayerId: hunter.id,
      secondPlayerId: target.id,
    });
    thirdParty.position = { ...target.position };
    target.battle.hp = 1;
    target.battle.coins = 20;
    const coinsBefore = thirdParty.battle.coins;

    replayRecordedAction(game, 3_000, {
      playerId: thirdParty.id,
      action: 'attack',
      targetPlayerId: target.id,
    });

    expect(thirdParty.battle.coins - coinsBefore).toBe(55);
    expect(game.world.battle.bountyHunterId).toBeUndefined();
    expect(game.world.battle.bountyPlayerId).toBeUndefined();
    expect(game.world.battle.feed.some((event: any) => event.text.includes('【悬赏失效】'))).toBe(true);
  });

  it('records a validated model-selected investigation approach', () => {
    const player = createPlayer('p:3', 'C03', 'A03');
    const game = createGame([player]);
    claimDecisionDriver(game, 9_000, 'driver-story-001');

    const result = submitAIDecision(game, 10_000, {
      driverId: 'driver-story-001', playerId: player.id, action: 'investigate', storyEventId: 'A03_01', storyApproach: 'bold', reason: '冒险抢在断电前取得档案',
    });

    expect(result).toMatchObject({ accepted: true });
    expect(player.battle.pendingStoryApproach).toBe('bold');
    expect(player.battle.pendingStoryEventId).toBe('A03_01');
    expect(player.battle.areaSearches).toBe(1);
    expect(game.world.battle.actionLog.at(-1)).toMatchObject({ action: 'investigate', storyEventId: 'A03_01', storyApproach: 'bold', accepted: true });
    expect(game.world.battle.feed.some((event: any) => event.text.includes('数据泄露·抢先突破'))).toBe(true);
  });

  it('rejects an investigation approach outside the server allowlist', () => {
    const player = createPlayer('p:3', 'C03', 'A03');
    const game = createGame([player]);
    claimDecisionDriver(game, 9_000, 'driver-story-002');

    const result = submitAIDecision(game, 10_000, {
      driverId: 'driver-story-002', playerId: player.id, action: 'investigate', storyEventId: 'A03_01', storyApproach: 'teleport', reason: '尝试不存在的路线',
    });

    expect(result).toMatchObject({ accepted: false, reason: '调查路线不在允许列表' });
    expect(player.battle.pendingStoryApproach).toBeUndefined();
    expect(game.world.battle.decisionCount).toBe(0);
  });

  it('consumes the selected approach in the next seeded tabletop check', () => {
    const player = createPlayer('p:3', 'C03', 'A03');
    player.battle.pendingStoryApproach = 'bold';
    player.battle.pendingStoryEventId = 'A03_01';
    const game = createGame([player]);
    game.world.battle = defaultBattleState(1_000, 20260807);

    const beat = resolveAreaStoryCheck(game, 2_000, player, 'A03_01', 'A03');

    expect(beat).toMatchObject({ approach: 'bold', bonus: 1, difficulty: 13 });
    expect(beat.choice).toContain('熟悉地形');
    expect(beat.choice).toContain('数据泄露·抢先突破');
    expect(beat.check).toContain('数据泄露·抢先突破');
    expect(player.battle.pendingStoryApproach).toBeUndefined();
    expect(player.battle.pendingStoryEventId).toBeUndefined();
  });

  it('rejects a model story from another area without spending quota', () => {
    const player = createPlayer('p:3', 'C03', 'A03');
    const game = createGame([player]);
    claimDecisionDriver(game, 9_000, 'driver-story-area');

    const result = submitAIDecision(game, 10_000, {
      driverId: 'driver-story-area', playerId: player.id, action: 'investigate', storyEventId: 'A04_01', storyApproach: 'cautious', reason: '尝试调查别区剧情',
    });

    expect(result).toMatchObject({ accepted: false, reason: '所选剧情不在当前区域' });
    expect(game.world.battle.decisionCount).toBe(0);
  });

  it('requires the configured item before a model can select a gated story', () => {
    const player = createPlayer('p:2', 'C02', 'A02');
    const game = createGame([player]);
    claimDecisionDriver(game, 9_000, 'driver-story-item');

    const result = submitAIDecision(game, 10_000, {
      driverId: 'driver-story-item', playerId: player.id, action: 'investigate', storyEventId: 'A02_02', storyApproach: 'cautious', reason: '读取监控回放',
    });

    expect(result).toMatchObject({ accepted: false, reason: '调查需要监控终端权限卡' });
    expect(game.world.battle.decisionCount).toBe(0);
  });

  it('prioritizes the exact story selected by the model when multiple events are eligible', () => {
    const player = createPlayer('p:1', 'C01', 'A01');
    player.battle.areaEnteredAt = 1_000;
    player.battle.pendingStoryEventId = 'A01_02';
    player.battle.pendingStoryApproach = 'social';
    const game = createGame([player]);
    game.world.battle.timeOfDay = 'night';
    game.world.battle.lastAreaEventCheck = 0;

    triggerAreaSpecialEvent(game, 130_000);

    expect(game.world.battle.storyLog[0]).toMatchObject({ eventId: 'A01_02', approach: 'social' });
    expect(game.world.battle.storyLog[0].choice).toContain('暴风雪·协同应对');
    expect(player.battle.pendingStoryEventId).toBeUndefined();
  });

  it('uses the reference one-minute requirement for shadow-market auto trade', () => {
    const first = createPlayer('p:8', 'C08', 'A08');
    const second = createPlayer('p:9', 'C09', 'A08');
    first.battle.areaEnteredAt = 1_000;
    second.battle.areaEnteredAt = 1_000;
    const game = createGame([first, second]);
    const event = AREA_SPECIAL_EVENTS.find((candidate) => candidate.id === 'A08_01')!;

    expect(areaEventEligible(game, 60_999, event)).toBe(false);
    expect(areaEventEligible(game, 61_000, event)).toBe(true);
  });

  it('requires a remote weapon before armory ammunition can detonate', () => {
    const player = createPlayer('p:9', 'C09', 'A09');
    player.battle.weapon = 'Fists';
    const game = createGame([player]);
    game.world.battle.areaBattleRounds = [{ areaId: 'A09', count: 1 }];
    const event = AREA_SPECIAL_EVENTS.find((candidate) => candidate.id === 'A09_01')!;

    expect(areaEventEligible(game, 2_000, event)).toBe(false);
    player.battle.weapon = 'Pistol';
    expect(areaEventEligible(game, 2_000, event)).toBe(true);
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
    expect(first.game.world.battle.truthClues).toEqual([]);
    expect(first.player.battle.pendingStoryApproach).toBe('cautious');
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
