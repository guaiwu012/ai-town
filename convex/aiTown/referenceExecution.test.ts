import { applyBattleItemEffect, applyIntervention, attack, awardReferenceScore, defaultBattleState, defaultBattleStats, refreshItemIntel, moveToBattleArea, applyBattleVitals, pushEvent } from './battleRoyale';
import { profileForCharacterId } from '../../data/battleRoyaleConfig';
import { REFERENCE_ITEMS } from '../../data/referenceRuntime';
import { battleMovementMultiplier } from './movement';
import { battleAreaSpawnPoints } from '../../data/battleArena';

function fixture() {
  const players = ['C01', 'C02', 'C12'].map((characterId, i) => ({ id: `p:${i}`, position: battleAreaSpawnPoints('A03', 80, 60)[0], facing: { dx: 1, dy: 0 }, speed: 0, battle: { ...defaultBattleStats(profileForCharacterId(characterId)), characterId, areaId: 'A03', hp: 100, maxHp: 100, inventory: [] as string[] } }));
  const game = { world: { battle: defaultBattleState(1000, 123), players: new Map(players.map(p => [p.id, p])), conversations: new Map() }, playerDescriptions: new Map(players.map(p => [p.id, { name: p.battle.characterId }])), worldMap: { width: 80, height: 60, objectTiles: [Array.from({ length: 80 }, () => Array(60).fill(-1))] } } as any;
  return { game, player: players[0] as any, target: players[1] as any, c12: players[2] as any };
}

describe('reference rules through production execution', () => {
  test.each(REFERENCE_ITEMS.map(item => [item.id, item]))('%s reaches a production effect handler as its configured owner', (_, item) => {
    const row = item as typeof REFERENCE_ITEMS[number];
    const { game, player } = fixture();
    const profile = profileForCharacterId(row.exclusiveCharacterId ?? 'C01');
    player.battle = { ...defaultBattleStats(profile), characterId: profile.id, areaId: row.primaryAreaId === 'GLOBAL' ? 'A03' : row.primaryAreaId, hp: 50, maxHp: 200, stamina: 50, maxStamina: 200, satiety: 50, inventory: [row.name] };
    expect(applyBattleItemEffect(game, 2000, player, row.name)).not.toBe(false);
    expect(game.world.battle.feed.some((event: any) => event.kind === 'item' && event.itemName === row.name && event.effectKey === row.effectKey)).toBe(true);
  });
  test.each(REFERENCE_ITEMS.filter(item => ['hp', 'stamina', 'satiety', 'satiety+stamina'].includes(item.effectKey)).map(item => [item.name, item]))('%s applies exact recovery values and consumes one unit', (name, item) => {
    const { game, player } = fixture(); const row = item as typeof REFERENCE_ITEMS[number];
    player.battle.hp = 0; player.battle.maxHp = 200; player.battle.stamina = 0; player.battle.maxStamina = 200; player.battle.satiety = 0; player.battle.inventory = [name, name];
    applyBattleItemEffect(game, 2000, player, String(name));
    const field = row.effectKey === 'hp' ? 'hp' : row.effectKey === 'stamina' ? 'stamina' : 'satiety';
    expect(player.battle[field]).toBe(row.effectValue);
    if (row.effectKey === 'satiety+stamina') expect(player.battle.stamina).toBe(row.effectValue2);
    expect(player.battle.inventory).toHaveLength(1);
    expect(game.world.battle.feed.find((e: any) => e.kind === 'item')).toMatchObject({ effectKey: row.effectKey, itemName: name, to: player.position, eventType: 'item_use' });
  });
  test('energy core increases all four checks without granting healing or armor', () => {
    const { game, player } = fixture(); player.battle.hp = 30;
    applyBattleItemEffect(game, 2000, player, '能源核心');
    expect(player.battle.attributeBonus).toBe(1); expect(player.battle.hp).toBe(30); expect(player.battle.armor).toBe(0);
  });
  test('15 percent armor reduces the same seeded damage rather than subtracting 15', () => {
    const plain = fixture(); const armored = fixture();
    applyBattleItemEffect(armored.game, 2000, armored.target, '防弹插板');
    attack(plain.game, 3000, plain.player, plain.target); attack(armored.game, 3000, armored.player, armored.target);
    const original = 100 - plain.target.battle.hp; const reduced = 100 - armored.target.battle.hp;
    expect(reduced).toBeGreaterThan(0); expect(reduced).toBeLessThan(original); expect(armored.target.battle.armor).toBe(0);
  });
  test('equipment does not stack when reapplied and running shoes change movement timing', () => {
    const { game, player } = fixture();
    applyBattleItemEffect(game, 2000, player, '跑鞋'); applyBattleItemEffect(game, 2000, player, '跑鞋');
    expect(battleMovementMultiplier(player, 3000)).toBe(1.1);
    expect(player.battle.itemEffects.filter((e: any) => e.source === '跑鞋')).toHaveLength(1);
  });
  test('painkillers block pain until expiry; adrenaline expires into one fatigue penalty', () => {
    const { game, player, target } = fixture();
    applyBattleItemEffect(game, 2000, target, '止痛药'); attack(game, 3000, player, target);
    expect(target.battle.painUntil).toBeUndefined();
    applyBattleItemEffect(game, 2000, player, '肾上腺素'); player.battle.stamina = 100;
    applyBattleVitals(game, 63000);
    expect(player.battle.itemEffects.some((e: any) => e.key === 'fatigue')).toBe(true);
    expect(player.battle.stamina).toBe(85);
    attack(game, 123000, player, target); expect(target.battle.painUntil).toBeGreaterThan(123000);
  });
  test('smoke removes both combat targets and prevents immediate follow-up hits', () => {
    const { game, player, target } = fixture(); attack(game, 2000, player, target);
    applyBattleItemEffect(game, 3000, target, '烟雾弹'); const hp = target.battle.hp;
    attack(game, 4000, player, target); expect(target.battle.hp).toBe(hp); expect(player.battle.combatTargetId).toBeUndefined();
  });
  test('a disposable key opens exactly one locked entry', () => {
    const { game, player } = fixture(); applyBattleItemEffect(game, 2000, player, '万能钥匙');
    expect(moveToBattleArea(game, 3000, player, 'A09')).toBe(true);
    expect(moveToBattleArea(game, 4000, player, 'A09')).toBe(false);
  });
  test('resource map yields three real resource counts, and jammer blocks monitoring', () => {
    const { game, player, target } = fixture(); applyBattleItemEffect(game, 2000, player, '情报地图');
    expect(player.battle.intel[0].text.split('；')).toHaveLength(3);
    applyBattleItemEffect(game, 3000, player, '监控终端权限卡'); applyBattleItemEffect(game, 4000, target, '信号干扰器'); refreshItemIntel(game, 5000, player, true);
    expect(player.battle.intel.find((e: any) => e.source === '监控终端权限卡').text).toContain('信号中断');
    refreshItemIntel(game, 35000, player, true); expect(player.battle.intel.find((e: any) => e.source === '监控终端权限卡').text).toContain('C02');
  });
  test('grenades hurt every other occupant using the table damage', () => {
    const { game, player, target, c12 } = fixture(); applyBattleItemEffect(game, 2000, player, '破片手雷');
    expect(player.battle.hp).toBe(100); expect(target.battle.hp).toBe(75); expect(c12.battle.hp).toBe(75);
  });
  test('truth scores are never included in combo history', () => {
    const { game, c12 } = fixture(); c12.battle.heat = 50;
    awardReferenceScore(game, 2000, 'SCR_P12', [c12]); expect(game.world.battle.popularity).toBeCloseTo(110); expect(game.world.battle.scoreLedger).toHaveLength(0);
    awardReferenceScore(game, 3000, 'SCR_M01', [c12]); expect(game.world.battle.popularity).toBeCloseTo(105);
  });
  test('private log routes stay off map and global channels', () => {
    const { game, player } = fixture(); pushEvent(game, 2000, 'move', 'old text', player, undefined, { vars: { 区域A: '学园', 区域B: '医院' } });
    expect(game.world.battle.feed[0]).toMatchObject({ characterText: '学园 → 医院', globalText: undefined, mapText: undefined });
  });
  test('forced allies cannot attack and private position intel reaches only recipient', () => {
    const { game, player, target } = fixture(); applyIntervention(game, 2000, { opId: 'RUL_01', targetPlayerId: player.id, secondPlayerId: target.id });
    attack(game, 3000, player, target); expect(target.battle.hp).toBe(100);
    applyIntervention(game, 4000, { opId: 'INF_04', targetPlayerId: player.id, secondPlayerId: target.id });
    expect(target.battle.intel[0].text).toContain('C01'); expect(player.battle.intel).toBeUndefined();
    expect(game.world.battle.feed[0].globalText).toBeUndefined();
  });
});
