import { selectDirectorShot, selectDirectorTarget } from './battleDirector';

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

  test('ignores stale events and rotates among leading live candidates', () => {
    const shot = selectDirectorShot(
      [{ id: 'C01', alive: true, heat: 20, moving: true }, { id: 'C02', alive: true, heat: 18 }],
      [{ id: 1, kind: 'attack', actor: 'C02', ts: 1_000 }],
      16_000,
    );
    expect(shot.urgent).toBe(false);
    expect(shot.caption).toContain('巡场跟拍');
  });

  test('packages a recent battle event as an urgent live shot', () => {
    expect(selectDirectorShot(candidates, [{ id: 9, kind: 'attack', actor: 'C01', ts: 9_000 }], 10_000))
      .toMatchObject({ targetId: 'C01', eventId: 9, urgent: true, caption: '交火现场 · 战斗追踪' });
  });

  test('cuts the automatic camera to a live conversation', () => {
    expect(selectDirectorShot(candidates, [{ id: 12, kind: 'dialogue', actor: 'C02', target: 'C01', ts: 9_500 }], 10_000))
      .toMatchObject({ targetId: 'C02', eventId: 12, urgent: true, caption: '现场交谈 · 双人镜头' });
  });

  test('does not cut to a solo support response as if it were a conversation', () => {
    expect(selectDirectorShot(candidates, [{ id: 13, kind: 'dialogue', actor: 'C02', ts: 9_500 }], 10_000).urgent).toBe(false);
  });
});
