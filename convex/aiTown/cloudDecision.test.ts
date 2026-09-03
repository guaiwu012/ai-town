import { buildDecisionPrompt } from './cloudDecision';
import { defaultBattleState, defaultBattleStats } from './battleRoyale';
import { BATTLE_CONFIG, profileForCharacterId } from '../../data/battleRoyaleConfig';

describe('DeepSeek global contestant awareness', () => {
  it('gives every AI the exact position and shortest regional next step for every survivor', () => {
    const observer = {
      id: 'p:0',
      position: { x: 20, y: 8 },
      battle: { ...defaultBattleStats(profileForCharacterId('C01')), areaId: 'A01' },
    } as any;
    const target = {
      id: 'p:2',
      position: { x: 13.4, y: 36.2 },
      battle: { ...defaultBattleStats(profileForCharacterId('C02')), areaId: 'A02' },
    } as any;
    const prompt = buildDecisionPrompt({
      player: observer,
      world: {
        players: [observer, target],
        battle: { ...defaultBattleState(1_000), openAreas: BATTLE_CONFIG.areas.map((area) => area.id) },
      } as any,
      descriptions: [
        { playerId: observer.id, name: '陆敬山' },
        { playerId: target.id, name: '夏语甜' },
      ] as any,
    }, observer.id);

    expect(prompt.candidates).toEqual([
      expect.objectContaining({
        id: target.id,
        name: '夏语甜',
        areaId: 'A02',
        position: { x: 13.4, y: 36.2 },
        distance: 29,
        sameArea: false,
        nextArea: 'A09',
      }),
    ]);
    expect(prompt.instructions).toContain('全局追踪系统');
  });
});
