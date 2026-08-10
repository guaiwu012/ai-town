import { replayFrameAt } from './battleReplay';

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
});
