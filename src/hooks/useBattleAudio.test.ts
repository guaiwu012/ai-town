import { battleEventMatchesCamera, effectUrlsForEvent } from './useBattleAudio';

describe('battle audio camera synchronization', () => {
  it('only plays combat events involving the followed contestant', () => {
    const event = { kind: 'attack', actor: 'p:1', target: 'p:2', areaId: 'A01' } as any;
    expect(battleEventMatchesCamera(event, { focusPlayerId: 'p:1' })).toBe(true);
    expect(battleEventMatchesCamera(event, { focusPlayerId: 'p:3' })).toBe(false);
  });

  it('plays combat events only from the focused area in an area shot', () => {
    const event = { kind: 'attack', actor: 'p:1', target: 'p:2', areaId: 'A01' } as any;
    expect(battleEventMatchesCamera(event, { focusAreaId: 'A01' })).toBe(true);
    expect(battleEventMatchesCamera(event, { focusAreaId: 'A02' })).toBe(false);
  });

  it('does not turn melee attacks into gunshots and delays ranged impact to the projectile', () => {
    expect(effectUrlsForEvent('attack', 'Fists')).toHaveLength(1);
    expect(effectUrlsForEvent('attack', 'Fists')[0]).toMatchObject({ delay: 0 });
    expect(effectUrlsForEvent('attack', 'Rifle')).toHaveLength(2);
    expect(effectUrlsForEvent('attack', 'Rifle')[1]).toMatchObject({ delay: 520 });
  });
});
