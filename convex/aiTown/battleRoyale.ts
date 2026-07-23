import { Infer, v } from 'convex/values';
import type { Game } from './game';
import type { Player } from './player';
import { playerId } from './ids';
import { distance } from '../util/geometry';
import { blocked, movePlayer } from './movement';
import { point } from '../util/types';

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
});
export type BattleState = Infer<typeof battleState>;

const BATTLE_TICK_MS = 2500;
const ACTION_COOLDOWN_MS = 6500;
const ATTACK_RANGE = 1.65;
const DANGER_RANGE = 2.4;
const MAX_FEED = 16;
const TARGET_BATTLE_AGENT_COUNT = 10;

export function defaultBattleStats(): BattleStats {
  return {
    hp: 100,
    maxHp: 100,
    coins: 20,
    weapon: 'Pistol',
    weaponPower: 6,
    armor: 0,
    medkits: 1,
    kills: 0,
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
  };
}

export function ensureBattleState(game: Game, now: number) {
  game.world.battle ??= defaultBattleState(now);
  for (const player of game.world.players.values()) {
    player.battle ??= defaultBattleStats();
    if (player.battle.coins > 1000) {
      player.battle.coins = 200;
    }
    if (player.battle.medkits > 6) {
      player.battle.medkits = 2;
    }
  }
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
    player.battle = defaultBattleStats();
    delete player.activity;
    delete player.pathfinding;
    player.speed = 0;
  }
  pushEvent(game, now, 'system', 'Match restarted. Everyone is back in the arena.');
  return { players: game.world.players.size };
}

export function tickBattleRoyale(game: Game, now: number) {
  ensureBattleState(game, now);
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

  if (enemy && stats.hp <= 45 && distance(player.position, enemy.position) <= DANGER_RANGE) {
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

  if (enemy && distance(player.position, enemy.position) <= ATTACK_RANGE) {
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
    pushEvent(
      game,
      now,
      'loot',
      `${playerName(game, player)} searched the area and found ${coins} coins.`,
      player,
    );
  }
  if (!tacticalLootMove(game, now, player)) {
    wander(game, now, player);
  }
}

function tryBuyUpgrade(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  if (stats.coins >= 160 && stats.weaponPower < weaponPower('Sniper')) {
    const next = nextWeapon(stats.weapon);
    const cost = next === 'Sniper' ? 260 : 160;
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
  const partner = alivePlayers(game).find(
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
  battle.feed = battle.feed.slice(0, MAX_FEED);
}

function weaponPower(weapon: string) {
  switch (weapon) {
    case 'Pistol':
      return 6;
    case 'Shotgun':
      return 10;
    case 'Rifle':
      return 13;
    case 'Sniper':
      return 18;
    default:
      return 8;
  }
}

function nextWeapon(weapon: string) {
  const index = Math.max(0, weapons.indexOf(weapon as any));
  return weapons[Math.min(weapons.length - 1, index + 1)];
}

function playerName(game: Game, player: Player) {
  return game.playerDescriptions.get(player.id)?.name ?? player.id;
}
