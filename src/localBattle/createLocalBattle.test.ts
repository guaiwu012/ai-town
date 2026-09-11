import { resetBattleMatch, setBattlePaused, tickBattleRoyale } from '../../convex/aiTown/battleRoyale';
import { createLocalBattle, serializeLocalBattle } from './createLocalBattle';

describe('browser-local battle runtime', () => {
  it('creates isolated matches for separate browser workers', () => {
    const first = createLocalBattle(1_000);
    const second = createLocalBattle(2_000);

    expect(first.world).not.toBe(second.world);
    expect(first.world.players.size).toBe(12);
    expect(second.world.players.size).toBe(12);
    first.world.battle!.interventionPoints = 1;
    expect(second.world.battle!.interventionPoints).not.toBe(1);
  });

  it('ticks, pauses, and resets without a database', () => {
    const game = createLocalBattle(1_000);
    tickBattleRoyale(game as never, 2_000);
    setBattlePaused(game as never, 2_100, true);
    const started = game.world.battle!.started;
    tickBattleRoyale(game as never, 30_000);
    expect(game.world.battle!.started).toBe(started);
    setBattlePaused(game as never, 30_000, false);
    expect(game.world.battle!.started).toBeGreaterThan(started);

    const previousSession = game.world.battle!.sessionId;
    resetBattleMatch(game as never, 31_000);
    expect(game.world.battle!.sessionId).not.toBe(previousSession);
    expect(serializeLocalBattle(game).world.players).toHaveLength(12);
  });
});
