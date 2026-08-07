import { selectDirectorTarget } from './battleDirector';

describe('battle director', () => {
  const candidates = [
    { id: 'C01', alive: true, heat: 12 },
    { id: 'C02', alive: true, heat: 36 },
    { id: 'C03', alive: false, heat: 99 },
  ];

  test('prioritizes a living actor in a featured battle event', () => {
    expect(selectDirectorTarget(candidates, [{ kind: 'attack', actor: 'C01' }])).toBe('C01');
  });

  test('ignores eliminated actors and falls back to the hottest survivor', () => {
    expect(selectDirectorTarget(candidates, [{ kind: 'eliminate', actor: 'C03' }])).toBe('C02');
  });

  test('has a stable tie-breaker when no event is available', () => {
    expect(selectDirectorTarget([
      { id: 'C02', alive: true, heat: 10 },
      { id: 'C01', alive: true, heat: 10 },
    ], [])).toBe('C01');
  });
});
