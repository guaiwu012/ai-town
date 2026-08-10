import { HistoryManager } from './useHistoricalValue';
import type { History } from '../../convex/engine/historicalObject';

const history: History = {
  initialValue: 2,
  samples: [
    { time: 100, value: 4 },
    { time: 200, value: 7 },
  ],
};

describe('HistoryManager', () => {
  test('preserves samples for a replay that seeks backwards', () => {
    const manager = new HistoryManager();
    manager.receive({ x: history });

    expect(manager.query(250, true)).toEqual({ x: 7 });
    expect(manager.query(50, true)).toEqual({ x: 2 });
    expect(manager.query(150, true)).toEqual({ x: 4 });
  });

  test('keeps the forward-only trimming behavior for live playback', () => {
    const manager = new HistoryManager();
    manager.receive({ x: history });

    expect(manager.query(150)).toEqual({ x: 4 });
    expect(manager.histories.x).toHaveLength(1);
  });
});
