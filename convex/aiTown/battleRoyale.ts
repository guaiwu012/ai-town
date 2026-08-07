import { Infer, v } from 'convex/values';
import type { Game } from './game';
import type { Player } from './player';
import { playerId } from './ids';
import { distance } from '../util/geometry';
import { blocked, movePlayer } from './movement';
import { point } from '../util/types';
import { BATTLE_CONFIG, profileForIndex, profileForCharacterId } from '../../data/battleRoyaleConfig';

const weapons = ['Fists', 'Pistol', 'Shotgun', 'Rifle', 'Sniper'] as const;

export const battleStats = v.object({
  hp: v.number(),
  maxHp: v.number(),
  coins: v.number(),
  weapon: v.string(),
  weaponPower: v.number(),
  armor: v.number(),
  medkits: v.number(),
  kills: v.number(),
  alliance: v.optional(playerId),
  eliminated: v.optional(v.boolean()),
  lastBattleAction: v.optional(v.number()),
  characterId: v.optional(v.string()),
  areaId: v.optional(v.string()),
  stamina: v.optional(v.number()),
  maxStamina: v.optional(v.number()),
  satiety: v.optional(v.number()),
  zoneTime: v.optional(v.number()),
  maxZoneTime: v.optional(v.number()),
  stress: v.optional(v.number()),
  stressThreshold: v.optional(v.number()),
  heat: v.optional(v.number()),
  clues: v.optional(v.number()),
  inventory: v.optional(v.array(v.string())),
});
export type BattleStats = Infer<typeof battleStats>;

export const battleEvent = v.object({
  id: v.number(),
  ts: v.number(),
  kind: v.string(),
  actor: v.optional(playerId),
  target: v.optional(playerId),
  from: v.optional(point),
  to: v.optional(point),
  damage: v.optional(v.number()),
  text: v.string(),
});
export type BattleEvent = Infer<typeof battleEvent>;

export const battleState = v.object({
  started: v.number(),
  lastTick: v.number(),
  nextEventId: v.number(),
  feed: v.array(battleEvent),
  phase: v.optional(v.string()),
  day: v.optional(v.number()),
  timeOfDay: v.optional(v.union(v.literal('day'), v.literal('night'))),
  openAreas: v.optional(v.array(v.string())),
  lastZoneUpdate: v.optional(v.number()),
});
export type BattleState = Infer<typeof battleState>;

const BATTLE_TICK_MS = BATTLE_CONFIG.match.battleTickMs;
const ACTION_COOLDOWN_MS = BATTLE_CONFIG.match.actionCooldownMs;
const TARGET_BATTLE_AGENT_COUNT = BATTLE_CONFIG.match.agentCount;

export function defaultBattleStats(profile = profileForIndex(0)): BattleStats {
  const maxHp = BATTLE_CONFIG.runtime.hpBase + (profile.strength - 1) * BATTLE_CONFIG.runtime.hpPerStrength;
  const maxStamina = BATTLE_CONFIG.runtime.staminaBase + (profile.strength - 1) * BATTLE_CONFIG.runtime.staminaPerStrength;
  return {
    hp: maxHp,
    maxHp,
    coins: 20,
    weapon: 'Pistol',
    weaponPower: BATTLE_CONFIG.weapons.Pistol.power,
    armor: 0,
    medkits: 1,
    kills: 0,
    characterId: profile.id,
    areaId: profile.areaId,
    stamina: maxStamina,
    maxStamina,
    satiety: BATTLE_CONFIG.runtime.satietyStart,
    zoneTime: BATTLE_CONFIG.runtime.zoneTimeStart,
    maxZoneTime: BATTLE_CONFIG.runtime.zoneTimeMax,
    stress: 0,
    stressThreshold: profile.stressThreshold,
    heat: profile.heat,
    clues: 0,
    inventory: [],
  };
}

export function defaultBattleState(now: number): BattleState {
  return {
    started: now,
    lastTick: 0,
    nextEventId: 1,
      feed: [
      {
        id: 0,
        ts: now,
        kind: 'system',
        text: 'Battle royale lobby opened. Agents are dropping into AI Town.',
      },
    ],
    phase: 'early',
    day: 1,
    timeOfDay: 'day',
    openAreas: BATTLE_CONFIG.areas.map((area) => area.id),
    lastZoneUpdate: now,
  };
}

export function ensureBattleState(game: Game, now: number) {
  game.world.battle ??= defaultBattleState(now);
  let index = 0;
  for (const player of game.world.players.values()) {
    player.battle ??= defaultBattleStats(profileForIndex(index));
    const profile = profileForCharacterId(player.battle.characterId ?? profileForIndex(index).id);
    player.battle.characterId = profile.id;
    player.battle.areaId ??= profile.areaId;
    player.battle.maxHp = BATTLE_CONFIG.runtime.hpBase + (profile.strength - 1) * BATTLE_CONFIG.runtime.hpPerStrength;
    player.battle.hp = Math.min(player.battle.hp, player.battle.maxHp);
    player.battle.maxStamina = BATTLE_CONFIG.runtime.staminaBase + (profile.strength - 1) * BATTLE_CONFIG.runtime.staminaPerStrength;
    player.battle.stamina ??= player.battle.maxStamina;
    player.battle.satiety ??= BATTLE_CONFIG.runtime.satietyStart;
    player.battle.zoneTime ??= BATTLE_CONFIG.runtime.zoneTimeStart;
    player.battle.maxZoneTime ??= BATTLE_CONFIG.runtime.zoneTimeMax;
    player.battle.stress ??= 0;
    player.battle.stressThreshold ??= profile.stressThreshold;
    player.battle.heat ??= profile.heat;
    player.battle.clues ??= 0;
    player.battle.inventory ??= [];
    if (player.battle.coins > 1000) {
      player.battle.coins = 200;
    }
    if (player.battle.medkits > 6) {
      player.battle.medkits = 2;
    }
    index += 1;
  }
  const battle = game.world.battle!;
  battle.phase ??= 'early';
  battle.day ??= 1;
  battle.timeOfDay ??= 'day';
  battle.openAreas ??= BATTLE_CONFIG.areas.map((area) => area.id);
  battle.lastZoneUpdate ??= now;
}

export function resetBattleMatch(game: Game, now: number) {
  const activePlayerIds = new Set(
    [...game.world.players.keys()].slice(0, TARGET_BATTLE_AGENT_COUNT),
  );
  for (const playerIdValue of [...game.world.players.keys()]) {
    if (!activePlayerIds.has(playerIdValue)) {
      game.world.players.delete(playerIdValue);
      game.playerDescriptions.delete(playerIdValue);
    }
  }
  for (const [agentIdValue, agent] of [...game.world.agents.entries()]) {
    if (!activePlayerIds.has(agent.playerId)) {
      game.world.agents.delete(agentIdValue);
      game.agentDescriptions.delete(agentIdValue);
    }
  }
  game.world.conversations.clear();
  game.world.battle = defaultBattleState(now);
  for (const player of game.world.players.values()) {
    const profile = profileForIndex([...game.world.players.keys()].indexOf(player.id));
    player.battle = defaultBattleStats(profile);
    delete player.activity;
    delete player.pathfinding;
    player.speed = 0;
  }
  pushEvent(game, now, 'system', 'Match restarted. Everyone is back in the arena.');
  return { players: game.world.players.size };
}

export function tickBattleRoyale(game: Game, now: number) {
  ensureBattleState(game, now);
  tickMatchRules(game, now);
  const battle = game.world.battle!;
  if (now < battle.lastTick + BATTLE_TICK_MS) {
    return;
  }
  battle.lastTick = now;

  const alive = alivePlayers(game);
  if (alive.length <= 1) {
    if (alive.length === 1 && battle.feed[0]?.kind !== 'winner') {
      const winner = game.playerDescriptions.get(alive[0].id)?.name ?? alive[0].id;
      pushEvent(game, now, 'winner', `${winner} is the last agent standing.`, alive[0]);
    }
    return;
  }

  for (const player of alive) {
    if ((player.battle?.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) {
      continue;
    }
    runAgentBattleAction(game, now, player);
  }
}

function tickMatchRules(game: Game, now: number) {
  const battle = game.world.battle!;
  const elapsed = Math.max(0, now - battle.started);
  const dayLength = BATTLE_CONFIG.match.dayMs + BATTLE_CONFIG.match.nightMs;
  const cycleMs = elapsed % dayLength;
  const timeOfDay = cycleMs < BATTLE_CONFIG.match.dayMs ? 'day' : 'night';
  const day = Math.floor(elapsed / dayLength) + 1;
  if (battle.timeOfDay !== timeOfDay || battle.day !== day) {
    battle.timeOfDay = timeOfDay;
    battle.day = day;
    pushEvent(game, now, 'system', `Day ${day} ${timeOfDay === 'day' ? 'daylight' : 'nightfall'} reached the arena.`);
  }

  const aliveCount = alivePlayers(game).length;
  const phase = aliveCount <= 6 ? 'late' : elapsed > 600000 ? 'mid' : 'early';
  battle.phase = phase;
  const interval = phase === 'late'
    ? BATTLE_CONFIG.zone.lateIntervalMs
    : phase === 'mid'
      ? BATTLE_CONFIG.zone.midIntervalMs
      : BATTLE_CONFIG.zone.earlyIntervalMs;
  if (
    battle.openAreas &&
    battle.openAreas.length > 3 &&
    now >= (battle.lastZoneUpdate ?? battle.started) + interval
  ) {
    const openNormalAreas = battle.openAreas.filter((areaId) => areaId !== 'S01');
    const areaCounts = new Map<string, number>();
    for (const player of alivePlayers(game)) {
      const areaId = player.battle?.areaId ?? 'A01';
      areaCounts.set(areaId, (areaCounts.get(areaId) ?? 0) + 1);
    }
    const closingArea = openNormalAreas.sort(
      (a, b) => (areaCounts.get(a) ?? 0) - (areaCounts.get(b) ?? 0),
    )[0];
    if (closingArea) {
      battle.openAreas = battle.openAreas.filter((areaId) => areaId !== closingArea);
      battle.lastZoneUpdate = now;
      pushEvent(game, now, 'zone', `${areaName(closingArea)} is now a permanent red zone. Agents must rotate.`, undefined, undefined);
    }
  }
}

export function applyTip(game: Game, now: number, playerIdValue: string, score: number) {
  ensureBattleState(game, now);
  const player = game.world.players.get(playerIdValue as any);
  if (!player || !player.battle || player.battle.eliminated) {
    throw new Error('Cannot tip this agent.');
  }
  const coins = Math.max(1, Math.min(200, Math.floor(score)));
  player.battle.coins += coins;
  player.activity = {
    description: `${playerName(game, player)} received an audience tip`,
    emoji: 'TIP',
    until: now + 1800,
  };
  pushEvent(
    game,
    now,
    'tip',
    `Audience tipped ${playerName(game, player)} ${coins} coins from a mini-game score.`,
    player,
  );
  return { coins };
}

function runAgentBattleAction(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  stats.lastBattleAction = now;

  const enemy = nearestEnemy(game, player);
  if (stats.hp <= 36 && stats.medkits > 0) {
    stats.medkits -= 1;
    stats.hp = Math.min(stats.maxHp, stats.hp + 18);
    player.activity = {
      description: `${playerName(game, player)} used a medkit`,
      emoji: 'MED',
      until: now + 1800,
    };
    pushEvent(game, now, 'heal', `${playerName(game, player)} patched up with a medkit.`, player);
    return;
  }

  if (enemy && stats.hp <= 45 && distance(player.position, enemy.position) <= BATTLE_CONFIG.match.dangerRange) {
    if (tacticalMove(game, now, player, enemy, 'retreat')) {
      player.activity = {
        description: `${playerName(game, player)} backed away to survive`,
        emoji: 'MOVE',
        until: now + 1500,
      };
      pushEvent(game, now, 'move', `${playerName(game, player)} retreated to reset the fight.`, player);
      return;
    }
  }

  const weaponConfig = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
  if (enemy && distance(player.position, enemy.position) <= weaponConfig.range) {
    attack(game, now, player, enemy);
    return;
  }

  if (enemy && !player.pathfinding && Math.random() < 0.48) {
    if (tacticalMove(game, now, player, enemy, 'approach')) {
      player.activity = {
        description: `${playerName(game, player)} pushed toward ${playerName(game, enemy)}`,
        emoji: 'MOVE',
        until: now + 1500,
      };
      return;
    }
  }

  if (tryBuyUpgrade(game, now, player)) {
    return;
  }

  if (Math.random() < 0.24 && tryAlliance(game, now, player)) {
    return;
  }

  if (Math.random() < 0.62) {
    loot(game, now, player);
    return;
  }

  if (enemy) {
    moveToward(game, now, player, enemy);
    return;
  }
  wander(game, now, player);
}

function attack(game: Game, now: number, attacker: Player, target: Player) {
  const attack = attacker.battle!;
  const defend = target.battle!;
  const damage = Math.max(
    2,
    Math.floor(attack.weaponPower * (0.55 + Math.random() * 0.35) - defend.armor),
  );
  defend.hp = Math.max(0, defend.hp - damage);
  attacker.activity = {
    description: `${playerName(game, attacker)} attacked ${playerName(game, target)}`,
    emoji: attack.weapon === 'Fists' ? 'HIT' : 'FIRE',
    until: now + 1600,
  };
  target.activity = {
    description: `${playerName(game, target)} took ${damage} damage`,
    emoji: 'HIT',
    until: now + 1600,
  };
  pushEvent(
    game,
    now,
    'attack',
    `${playerName(game, attacker)} hit ${playerName(game, target)} for ${damage} with ${attack.weapon}.`,
    attacker,
    target,
    {
      from: attacker.position,
      to: target.position,
      damage,
    },
  );

  if (defend.hp <= 0) {
    defend.eliminated = true;
    attack.kills += 1;
    attack.coins += 45 + Math.floor(defend.coins / 2);
    defend.coins = Math.floor(defend.coins / 2);
    delete target.pathfinding;
    target.speed = 0;
    pushEvent(
      game,
      now,
      'eliminate',
      `${playerName(game, attacker)} eliminated ${playerName(game, target)} and looted coins.`,
      attacker,
      target,
      {
        from: attacker.position,
        to: target.position,
      },
    );
  } else if (Math.random() < 0.72) {
    tacticalMove(game, now, attacker, target, attack.weapon === 'Shotgun' ? 'approach' : 'sidestep');
  }
}

function loot(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  const roll = Math.random();
  if (roll < 0.16 && stats.medkits < 2) {
    stats.medkits += 1;
    pushEvent(game, now, 'loot', `${playerName(game, player)} found a medkit.`, player);
  } else if (roll < 0.34) {
    const weapon = weapons[Math.min(weapons.length - 1, 1 + Math.floor(Math.random() * 4))];
    const power = weaponPower(weapon);
    if (power > stats.weaponPower) {
      stats.weapon = weapon;
      stats.weaponPower = power;
      pushEvent(game, now, 'loot', `${playerName(game, player)} found a ${weapon}.`, player);
    } else {
      stats.coins += 12;
      pushEvent(
        game,
        now,
        'loot',
        `${playerName(game, player)} sold spare gear for 12 coins.`,
        player,
      );
    }
  } else {
    const coins = 2 + Math.floor(Math.random() * 6);
    stats.coins += coins;
    const areaId = stats.areaId ?? 'A01';
    const pool = BATTLE_CONFIG.areaItems[areaId] ?? [];
    const foundItem = pool[Math.floor(Math.random() * pool.length)];
    if (foundItem && (stats.inventory?.length ?? 0) < BATTLE_CONFIG.match.maxInventorySlots) {
      stats.inventory = [...(stats.inventory ?? []), foundItem];
    }
    pushEvent(
      game,
      now,
      'loot',
      `${playerName(game, player)} searched ${areaName(areaId)} and found ${foundItem ?? `${coins} coins`}.`,
      player,
    );
  }
  if (!tacticalLootMove(game, now, player)) {
    wander(game, now, player);
  }
}

function tryBuyUpgrade(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  if (stats.coins >= 80 && stats.weaponPower < weaponPower('Sniper')) {
    const next = nextWeapon(stats.weapon);
    const cost = BATTLE_CONFIG.weapons[next as keyof typeof BATTLE_CONFIG.weapons]?.cost ?? 300;
    if (stats.coins >= cost) {
      stats.coins -= cost;
      stats.weapon = next;
      stats.weaponPower = weaponPower(next);
      pushEvent(game, now, 'buy', `${playerName(game, player)} bought a ${next}.`, player);
      return true;
    }
  }
  if (stats.coins >= 90 && stats.armor < 12) {
    stats.coins -= 90;
    stats.armor += 5;
    pushEvent(game, now, 'buy', `${playerName(game, player)} bought armor plating.`, player);
    return true;
  }
  return false;
}

function tryAlliance(game: Game, now: number, player: Player) {
  const relatedPartners = BATTLE_CONFIG.relationships
    .filter((relation) => relation.type !== 'rival')
    .map((relation) => {
      const ownId = player.battle?.characterId;
      if (relation.a !== ownId && relation.b !== ownId) {
        return undefined;
      }
      const partnerId = relation.a === ownId ? relation.b : relation.a;
      return alivePlayers(game).find((candidate) => candidate.battle?.characterId === partnerId);
    })
    .filter((candidate): candidate is Player => !!candidate);
  const partner = [...relatedPartners, ...alivePlayers(game)].find(
    (candidate) =>
      candidate.id !== player.id &&
      candidate.battle?.alliance !== player.id &&
      !candidate.battle?.eliminated,
  );
  if (!partner || !player.battle || !partner.battle) {
    return false;
  }
  player.battle.alliance = partner.id;
  partner.battle.alliance = player.id;
  player.activity = {
    description: `${playerName(game, player)} negotiated an alliance`,
    emoji: 'TALK',
    until: now + 2400,
  };
  partner.activity = {
    description: `${playerName(game, partner)} accepted an alliance`,
    emoji: 'ALLY',
    until: now + 2400,
  };
  const transfer = Math.min(15, Math.floor(player.battle.coins / 3));
  if (transfer > 0) {
    player.battle.coins -= transfer;
    partner.battle.coins += transfer;
  }
  pushEvent(
    game,
    now,
    'alliance',
    `${playerName(game, player)} allied with ${playerName(game, partner)} and shared supplies.`,
    player,
    partner,
  );
  return true;
}

function alivePlayers(game: Game) {
  return [...game.world.players.values()].filter((player) => !player.battle?.eliminated);
}

function nearestEnemy(game: Game, player: Player) {
  const candidates = alivePlayers(game).filter(
    (candidate) => candidate.id !== player.id && candidate.id !== player.battle?.alliance,
  );
  return candidates.sort(
    (a, b) => distance(player.position, a.position) - distance(player.position, b.position),
  )[0];
}

function moveToward(game: Game, now: number, player: Player, target: Player) {
  tacticalMove(game, now, player, target, 'approach');
}

function wander(game: Game, now: number, player: Player) {
  if (player.pathfinding) {
    return;
  }
  const destination = randomOpenTile(game, player);
  if (destination) {
    movePlayer(game, now, player, destination);
  }
}

function tacticalLootMove(game: Game, now: number, player: Player) {
  if (player.pathfinding) {
    return false;
  }
  const destination = randomOpenTile(game, player);
  if (!destination) {
    return false;
  }
  player.activity = {
    description: `${playerName(game, player)} moved to search a new area`,
    emoji: 'LOOT',
    until: now + 1500,
  };
  movePlayer(game, now, player, destination);
  return true;
}

function tacticalMove(
  game: Game,
  now: number,
  player: Player,
  target: Player,
  mode: 'approach' | 'retreat' | 'sidestep',
) {
  if (player.pathfinding) {
    return false;
  }
  const destination = tacticalDestination(game, player, target, mode);
  if (!destination) {
    return false;
  }
  movePlayer(game, now, player, destination);
  return true;
}

function tacticalDestination(
  game: Game,
  player: Player,
  target: Player,
  mode: 'approach' | 'retreat' | 'sidestep',
) {
  const origin = {
    x: Math.floor(player.position.x),
    y: Math.floor(player.position.y),
  };
  const targetTile = {
    x: Math.floor(target.position.x),
    y: Math.floor(target.position.y),
  };
  const candidates = openTilesNear(game, player, origin, mode === 'approach' ? 6 : 4);
  if (candidates.length === 0) {
    return undefined;
  }
  if (mode === 'approach') {
    return candidates.sort(
      (a, b) => distance(a, targetTile) - distance(b, targetTile) + distance(a, origin) * 0.05,
    )[0];
  }
  if (mode === 'retreat') {
    return candidates.sort(
      (a, b) => distance(b, targetTile) - distance(a, targetTile) + distance(a, origin) * 0.08,
    )[0];
  }
  const dx = targetTile.x - origin.x;
  const dy = targetTile.y - origin.y;
  return candidates.sort((a, b) => {
    const sideA = Math.abs((a.x - origin.x) * dx + (a.y - origin.y) * dy);
    const sideB = Math.abs((b.x - origin.x) * dx + (b.y - origin.y) * dy);
    return sideA - sideB + Math.abs(distance(a, targetTile) - 2.5) - Math.abs(distance(b, targetTile) - 2.5);
  })[0];
}

function randomOpenTile(game: Game, player: Player) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = {
      x: 1 + Math.floor(Math.random() * (game.worldMap.width - 2)),
      y: 1 + Math.floor(Math.random() * (game.worldMap.height - 2)),
    };
    if (!blocked(game, Date.now(), candidate, player.id)) {
      return candidate;
    }
  }
  return undefined;
}

function openTilesNear(game: Game, player: Player, origin: { x: number; y: number }, radius: number) {
  const candidates: Array<{ x: number; y: number }> = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (Math.abs(dx) + Math.abs(dy) < 2 || Math.abs(dx) + Math.abs(dy) > radius) {
        continue;
      }
      const candidate = {
        x: Math.max(1, Math.min(game.worldMap.width - 2, origin.x + dx)),
        y: Math.max(1, Math.min(game.worldMap.height - 2, origin.y + dy)),
      };
      if (!blocked(game, Date.now(), candidate, player.id)) {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function pushEvent(
  game: Game,
  now: number,
  kind: string,
  text: string,
  actor?: Player,
  target?: Player,
  details?: { from?: { x: number; y: number }; to?: { x: number; y: number }; damage?: number },
) {
  const battle = game.world.battle!;
  battle.feed.unshift({
    id: battle.nextEventId++,
    ts: now,
    kind,
    actor: actor?.id,
    target: target?.id,
    from: details?.from,
    to: details?.to,
    damage: details?.damage,
    text,
  });
  battle.feed = battle.feed.slice(0, BATTLE_CONFIG.match.maxFeed);
}

function weaponPower(weapon: string) {
  return BATTLE_CONFIG.weapons[weapon as keyof typeof BATTLE_CONFIG.weapons]?.power ?? BATTLE_CONFIG.weapons.Fists.power;
}

function nextWeapon(weapon: string) {
  const index = Math.max(0, weapons.indexOf(weapon as any));
  return weapons[Math.min(weapons.length - 1, index + 1)];
}

function playerName(game: Game, player: Player) {
  return game.playerDescriptions.get(player.id)?.name ?? player.id;
}

function areaName(areaId: string) {
  return BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.name ?? areaId;
}
