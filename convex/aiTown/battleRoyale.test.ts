import { applyIntervention, battleRandom, defaultBattleState, defaultBattleStats, replayRecordedAction } from './battleRoyale';
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
  return {
    world: {
      battle: defaultBattleState(1_000),
      players: playerMap,
    },
    playerDescriptions: new Map(players.map((player) => [player.id, { name: player.battle.characterId }])),
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
});
