import { replayFrameAt, replayStartTime } from './battleReplay';

describe('replayFrameAt', () => {
  const frame = (label: string) => ({
    openAreas: ['A01'], popularity: 0, phase: label, day: 1, timeOfDay: 'day' as const,
    players: [], relationships: [], resources: [], truthClues: [], storyTriggers: [],
  });

  test('chooses the closest durable checkpoint without looking ahead', () => {
    const battle: any = {
      replayCheckpoints: [
        { ts: 100, frame: frame('early') },
        { ts: 200, frame: frame('mid') },
      ],
    };
    expect(replayFrameAt(battle, 199)?.phase).toBe('early');
    expect(replayFrameAt(battle, 200)?.phase).toBe('mid');
    expect(replayFrameAt(battle, 50)).toBeUndefined();
  });

  test('starts at the earliest retained frame instead of an expired match origin', () => {
    const battle: any = { started: 10, replayCheckpoints: [{ ts: 300 }, { ts: 200, frame: frame('mid') }, { ts: 250, frame: frame('late') }] };
    expect(replayStartTime(battle)).toBe(200);
    expect(replayStartTime({ started: 10 } as any)).toBe(10);
  });

  test('applies accepted action patches after the checkpoint in action order', () => {
    const startingFrame: any = {
      ...frame('early'),
      players: [{ id: 'p:1', x: 1, y: 1, hp: 100, inventory: [] }],
      relationships: [{ id: 'rel', strength: 10, hidden: true }],
      resources: [{ areaId: 'A01', remaining: 10, max: 10 }],
    };
    const patch = (hp: number, popularity: number): any => ({
      rngState: hp,
      popularity,
      phase: 'mid',
      day: 2,
      timeOfDay: 'night',
      players: [{ ...startingFrame.players[0], hp }],
      relationships: [],
      resources: [],
      truthCluesAdded: [],
      storyTriggersAdded: [],
    });
    const battle: any = {
      replayCheckpoints: [{ ts: 100, actionId: 4, frame: startingFrame }],
      actionLog: [
        { id: 6, ts: 120, accepted: true, patch: patch(40, 30) },
        { id: 5, ts: 110, accepted: true, patch: patch(70, 20) },
        { id: 7, ts: 130, accepted: false, patch: patch(1, 99) },
      ],
    };

    expect(replayFrameAt(battle, 115)?.players[0].hp).toBe(70);
    expect(replayFrameAt(battle, 125)).toMatchObject({ popularity: 30, phase: 'mid', day: 2, timeOfDay: 'night' });
    expect(replayFrameAt(battle, 140)?.players[0].hp).toBe(40);
  });

  test('uses action ids when a checkpoint and its next action share a timestamp', () => {
    const startingFrame: any = { ...frame('early'), players: [], relationships: [], resources: [] };
    const battle: any = {
      replayCheckpoints: [{ ts: 100, actionId: 8, frame: startingFrame }],
      actionLog: [{
        id: 9,
        ts: 100,
        accepted: true,
        patch: { rngState: 2, popularity: 15, phase: 'early', day: 1, timeOfDay: 'day', players: [], relationships: [], resources: [], truthCluesAdded: ['线索'], storyTriggersAdded: [] },
      }],
    };
    expect(replayFrameAt(battle, 100)?.truthClues).toEqual(['线索']);
  });
});
