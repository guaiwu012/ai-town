import { Infer, v } from 'convex/values';
import type { Game } from './game';
import type { Player } from './player';
import { playerId } from './ids';
import { distance } from '../util/geometry';
import { blocked, movePlayer } from './movement';
import { point } from '../util/types';
import {
  BATTLE_CONFIG,
  AREA_SPECIAL_EVENTS,
  CHARACTER_STORIES,
  HIDDEN_MISSIONS,
  INTERVENTION_OPERATIONS,
  profileForIndex,
  profileForCharacterId,
} from '../../data/battleRoyaleConfig';

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
  interventionKind: v.optional(v.string()),
  interventionUntil: v.optional(v.number()),
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
  popularity: v.optional(v.number()),
  popularityPeak: v.optional(v.number()),
  comboCount: v.optional(v.number()),
  comboMultiplier: v.optional(v.number()),
  scoreTimestamps: v.optional(v.array(v.number())),
  lastScoreEvent: v.optional(v.number()),
  interventionPoints: v.optional(v.number()),
  interventionPointsMax: v.optional(v.number()),
  interventionEarnedTotal: v.optional(v.number()),
  interventionSpentTotal: v.optional(v.number()),
  heatMilestoneClaimed: v.optional(v.number()),
  hiddenMissions: v.optional(v.array(v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(),
    targetA: v.optional(v.string()),
    targetB: v.optional(v.string()),
  }))),
  completedMissionIds: v.optional(v.array(v.string())),
  truthPathKnown: v.optional(v.boolean()),
  truthUnlocked: v.optional(v.boolean()),
  truthRevealed: v.optional(v.boolean()),
  truthClues: v.optional(v.array(v.string())),
  storyTriggers: v.optional(v.array(v.string())),
  operationCooldowns: v.optional(v.array(v.object({ id: v.string(), until: v.number() }))),
  disabledWeaponsUntil: v.optional(v.number()),
  bountyPlayerId: v.optional(playerId),
  temporaryAllianceUntil: v.optional(v.number()),
  areaEventCooldowns: v.optional(v.array(v.object({ id: v.string(), until: v.number() }))),
  interventionEffect: v.optional(v.object({ kind: v.string(), areaId: v.optional(v.string()), playerId: v.optional(playerId), until: v.number() })),
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
        text: '【系统】大逃杀大厅已开启，12 名 AI 正在进入战场。',
      },
    ],
    phase: 'early',
    day: 1,
    timeOfDay: 'day',
    openAreas: BATTLE_CONFIG.areas.map((area) => area.id),
    lastZoneUpdate: now,
    popularity: 0,
    popularityPeak: 0,
    comboCount: 0,
    comboMultiplier: 1,
    scoreTimestamps: [],
    lastScoreEvent: now,
    interventionPoints: BATTLE_CONFIG.match.initialInterventionPoints,
    interventionPointsMax: BATTLE_CONFIG.match.maxInterventionPoints,
    interventionEarnedTotal: 0,
    interventionSpentTotal: 0,
    heatMilestoneClaimed: 0,
    hiddenMissions: HIDDEN_MISSIONS.slice(0, 2).map((mission) => ({ ...mission, status: '进行中' })),
    completedMissionIds: [],
    truthPathKnown: false,
    truthUnlocked: false,
    truthRevealed: false,
    truthClues: [],
    storyTriggers: [],
  operationCooldowns: [],
    areaEventCooldowns: [],
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
    player.battle.interventionUntil ??= 0;
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
  battle.popularity ??= 0;
  battle.popularityPeak ??= battle.popularity;
  battle.comboCount ??= 0;
  battle.comboMultiplier ??= 1;
  battle.scoreTimestamps ??= [];
  battle.lastScoreEvent ??= now;
  battle.interventionPoints ??= BATTLE_CONFIG.match.initialInterventionPoints;
  battle.interventionPointsMax ??= BATTLE_CONFIG.match.maxInterventionPoints;
  battle.interventionEarnedTotal ??= 0;
  battle.interventionSpentTotal ??= 0;
  battle.heatMilestoneClaimed ??= 0;
  battle.hiddenMissions ??= HIDDEN_MISSIONS.slice(0, 2).map((mission) => ({ ...mission, status: '进行中' }));
  battle.completedMissionIds ??= [];
  battle.truthPathKnown ??= false;
  battle.truthUnlocked ??= false;
  battle.truthRevealed ??= false;
  battle.truthClues ??= [];
  battle.storyTriggers ??= [];
  battle.operationCooldowns ??= [];
  battle.areaEventCooldowns ??= [];
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
  pushEvent(game, now, 'system', '【系统】比赛已重启，所有 AI 返回战场。');
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
      pushEvent(game, now, 'winner', `【胜利】${winner} 成为最后的幸存者。`, alive[0]);
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
    pushEvent(game, now, 'system', `【时间】第 ${day} 天${timeOfDay === 'day' ? '白昼' : '夜幕'}降临战场。`);
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
      pushEvent(game, now, 'zone', `【禁区关闭】${areaName(closingArea)} 已永久关闭，AI 必须转移。`, undefined, undefined);
    }
  }

  if (now - (battle.lastScoreEvent ?? now) > 120000 && (battle.popularity ?? 0) >= 5) {
    battle.popularity = Math.max(0, (battle.popularity ?? 0) - 5);
    battle.lastScoreEvent = now;
    pushEvent(game, now, 'heat', '【热度】战场沉寂过久，直播热度下降 5 点。');
  }
  triggerAreaSpecialEvent(game, now);
  updateMissionProgress(game, now);
}

function triggerAreaSpecialEvent(game: Game, now: number) {
  const battle = game.world.battle!;
  if (Math.random() > 0.035) return;
  const candidates = AREA_SPECIAL_EVENTS.filter((event) => {
    const cooldown = battle.areaEventCooldowns?.find((entry) => entry.id === event.id);
    return !cooldown || cooldown.until <= now;
  });
  const event = candidates[Math.floor(Math.random() * candidates.length)];
  if (!event) return;
  const affected = alivePlayers(game).filter((player) => player.battle?.areaId === event.areaId);
  if (affected.length === 0) return;
  for (const player of affected) {
    const stats = player.battle!;
    if (event.effect === 'damage') stats.hp = Math.max(1, stats.hp - event.value);
    if (event.effect === 'stamina') stats.stamina = Math.max(0, (stats.stamina ?? 0) - event.value);
    if (event.effect === 'stress') stats.stress = (stats.stress ?? 0) + event.value;
    if (event.effect === 'heal') stats.hp = Math.min(stats.maxHp, stats.hp + event.value);
    if (event.effect === 'supply') stats.coins += event.value;
    if (event.effect === 'clue') collectTruthClue(game, now, `区域-${event.id}`, player);
  }
  if (event.effect === 'alliance' && affected.length >= 2) {
    affected[0].battle!.alliance = affected[1].id;
    affected[1].battle!.alliance = affected[0].id;
    awardPopularity(game, now, 15, [affected[0], affected[1]]);
  }
  battle.areaEventCooldowns = (battle.areaEventCooldowns ?? []).filter((entry) => entry.id !== event.id);
  battle.areaEventCooldowns.push({ id: event.id, until: now + 90000 });
  battle.interventionEffect = { kind: `story:${event.effect}`, areaId: event.areaId, until: now + 6500 };
  pushEvent(game, now, 'areaStory', `【区域剧情】${areaName(event.areaId)}触发「${event.title}」。`);
}

export function applyAudienceScore(game: Game, now: number, score: number) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  const points = Math.max(1, Math.min(8, Math.floor(score / 25)));
  const before = battle.interventionPoints ?? 0;
  battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, before + points);
  battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + (battle.interventionPoints - before);
  pushEvent(game, now, 'audience', `【观众】扫雷挑战结算，主办方获得 ${battle.interventionPoints - before} 点干预点。`);
  return { points: battle.interventionPoints - before, total: battle.interventionPoints };
}

export function applyIntervention(
  game: Game,
  now: number,
  args: { opId: string; targetAreaId?: string; targetPlayerId?: string; secondPlayerId?: string },
) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  const operation = INTERVENTION_OPERATIONS.find((candidate) => candidate.id === args.opId);
  if (!operation) throw new Error('未知干预操作。');
  const cooldown = battle.operationCooldowns?.find((entry) => entry.id === operation.id);
  if (cooldown && cooldown.until > now) throw new Error(`${operation.name}仍在冷却。`);
  if ((battle.interventionPoints ?? 0) < operation.cost) throw new Error('干预点不足。');
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  const second = args.secondPlayerId ? game.world.players.get(args.secondPlayerId as any) : undefined;
  const areaId = args.targetAreaId ?? target?.battle?.areaId ?? 'A01';
  const affected = alivePlayers(game).filter((player) => player.battle?.areaId === areaId);
  const announce = (text: string) => pushEvent(game, now, 'intervention', `【主办方】${text}`);

  if (operation.target === 'area' && !BATTLE_CONFIG.areas.some((area) => area.id === areaId)) throw new Error('无效区域。');
  if (operation.target === 'player' && !target) throw new Error('请选择角色。');
  if (operation.target === 'pair' && (!target || !second || target.id === second.id)) throw new Error('请选择两名不同角色。');

  switch (operation.id) {
    case 'ENV_01': affected.forEach((player) => { player.battle!.hp = Math.max(1, player.battle!.hp - 8); }); announce(`${areaName(areaId)}升起障碍物，区域内角色受到冲击。`); break;
    case 'ENV_02': affected.forEach((player) => { player.battle!.stamina = Math.max(0, (player.battle!.stamina ?? 0) - 16); }); announce(`${areaName(areaId)}遭遇极端天气，体力被迅速消耗。`); break;
    case 'ENV_03':
      if (!battle.openAreas?.includes(areaId) || areaId === 'S01') throw new Error('该区域不能关闭。');
      battle.openAreas = battle.openAreas.filter((id) => id !== areaId); announce(`${areaName(areaId)}被主办方提前划为禁区。`); break;
    case 'ENV_04': case 'SUP_03':
      affected.forEach((player) => { player.battle!.hp = Math.max(1, player.battle!.hp - (operation.id === 'ENV_04' ? 12 : 10)); }); announce(`${areaName(areaId)}的${operation.id === 'ENV_04' ? '机关' : '补给箱'}被激活。`); break;
    case 'SUP_01': affected.forEach((player) => { player.battle!.medkits += 1; player.battle!.coins += 20; }); announce(`补给已投放至${areaName(areaId)}。`); break;
    case 'SUP_02': affected.forEach((player) => { player.battle!.hp = Math.min(player.battle!.maxHp, player.battle!.hp + 20); player.battle!.stamina = player.battle!.maxStamina; }); announce(`${areaName(areaId)}开启盛宴补给。`); break;
    case 'SUP_05': target!.battle!.coins += 35; target!.battle!.armor += 4; announce(`${playerName(game, target!)}获得品牌赞助。`); break;
    case 'RUL_01': target!.battle!.alliance = second!.id; second!.battle!.alliance = target!.id; battle.temporaryAllianceUntil = now + 45000; announce(`${playerName(game, target!)}与${playerName(game, second!)}被规则强制结盟。`); awardPopularity(game, now, 20, [target!, second!]); break;
    case 'RUL_02': battle.disabledWeaponsUntil = now + 30000; announce('武器规则已冻结，全场进入徒手阶段。'); break;
    case 'RUL_04': battle.bountyPlayerId = target!.id; announce(`${playerName(game, target!)}成为悬赏目标。`); break;
    case 'INF_01': collectTruthClue(game, now, `情报-${target!.battle!.characterId}`, target!); announce(`${playerName(game, target!)}收到了一条真实情报。`); break;
    case 'INF_02': target!.battle!.stress = (target!.battle!.stress ?? 0) + 20; announce(`${playerName(game, target!)}被虚假情报扰乱。`); break;
    case 'INF_03': target!.battle!.alliance = undefined; second!.battle!.alliance = undefined; announce(`匿名消息挑拨了${playerName(game, target!)}与${playerName(game, second!)}。`); awardPopularity(game, now, 25, [target!, second!]); break;
    case 'INF_04': announce(`${playerName(game, target!)}的位置已被标记：${areaName(target!.battle!.areaId ?? 'A01')}。`); break;
    case 'REC_01': announce(`${playerName(game, target!)}的关系档案已被公开侦察。`); break;
    case 'REC_02': battle.hiddenMissions![0] && (battle.hiddenMissions![0].status = `已揭示：${battle.hiddenMissions![0].status}`); announce('一条隐藏任务已被侦察揭示。'); break;
    case 'TRU_01': unlockTruth(game, now, target!); break;
  }
  battle.interventionPoints! -= operation.cost;
  battle.interventionSpentTotal! += operation.cost;
  if (operation.cooldownMs > 0) {
    battle.operationCooldowns = (battle.operationCooldowns ?? []).filter((entry) => entry.id !== operation.id);
    battle.operationCooldowns.push({ id: operation.id, until: now + operation.cooldownMs });
  }
  battle.interventionEffect = {
    kind: operation.id,
    areaId: operation.target === 'area' ? areaId : target?.battle?.areaId,
    playerId: target?.id,
    until: now + 7000,
  };
  const responders = operation.target === 'global'
    ? alivePlayers(game)
    : operation.target === 'area'
      ? affected
      : [target, second].filter((player): player is Player => !!player && !player.battle?.eliminated);
  responders.forEach((player) => markInterventionReaction(game, now, player, operation.id));
  return { remainingPoints: battle.interventionPoints, operation: operation.name };
}

function markInterventionReaction(game: Game, now: number, player: Player, operationId: string) {
  const stats = player.battle!;
  stats.interventionKind = operationId;
  stats.interventionUntil = now + 10000;
  const reaction = interventionReaction(operationId);
  player.activity = {
    description: `${playerName(game, player)} ${reaction.description}`,
    emoji: reaction.emoji,
    until: now + 5000,
  };
  pushEvent(game, now, 'reaction', `【反应】${playerName(game, player)} ${reaction.description}。`, player);
}

function interventionReaction(operationId: string) {
  if (operationId.startsWith('ENV')) return { description: '察觉环境异常，准备撤离', emoji: 'ALERT' };
  if (operationId === 'SUP_01' || operationId === 'SUP_02') return { description: '发现主办方补给，正在搜集物资', emoji: 'LOOT' };
  if (operationId === 'SUP_03') return { description: '被可疑补给惊动，拉开距离', emoji: 'ALERT' };
  if (operationId.startsWith('INF') || operationId.startsWith('REC')) return { description: '收到干预情报，正在重新判断局势', emoji: 'THINK' };
  if (operationId === 'RUL_01') return { description: '被规则锁定为盟友，开始交谈', emoji: 'TALK' };
  if (operationId === 'RUL_02') return { description: '武器被禁用，切换近战策略', emoji: 'HIT' };
  return { description: '察觉主办方干预，调整行动', emoji: 'ALERT' };
}

function runAgentBattleAction(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  stats.lastBattleAction = now;

  if ((stats.interventionUntil ?? 0) > now) {
    if (stats.interventionKind?.startsWith('ENV') || stats.interventionKind === 'SUP_03') {
      if (tacticalLootMove(game, now, player)) {
        pushEvent(game, now, 'reaction', `【反应】${playerName(game, player)} 正在避开主办方干预区域。`, player);
        return;
      }
    }
    if (stats.interventionKind === 'SUP_01' || stats.interventionKind === 'SUP_02') {
      loot(game, now, player);
      return;
    }
  }

  const enemy = nearestEnemy(game, player);
  if (stats.hp <= 36 && stats.medkits > 0) {
    stats.medkits -= 1;
    stats.hp = Math.min(stats.maxHp, stats.hp + 18);
    player.activity = {
      description: `${playerName(game, player)} 使用医疗包`,
      emoji: 'MED',
      until: now + 1800,
    };
    pushEvent(game, now, 'heal', `【治疗】${playerName(game, player)} 使用医疗包恢复了状态。`, player);
    return;
  }

  if (enemy && stats.hp <= 45 && distance(player.position, enemy.position) <= BATTLE_CONFIG.match.dangerRange) {
    if (tacticalMove(game, now, player, enemy, 'retreat')) {
      player.activity = {
        description: `${playerName(game, player)} 正在撤离`,
        emoji: 'MOVE',
        until: now + 1500,
      };
      pushEvent(game, now, 'move', `【移动】${playerName(game, player)} 暂时撤离，重新调整战斗。`, player);
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
        description: `${playerName(game, player)} 正在逼近 ${playerName(game, enemy)}`,
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
  const weaponsDisabled = (game.world.battle?.disabledWeaponsUntil ?? 0) > now;
  const effectiveWeaponPower = weaponsDisabled ? BATTLE_CONFIG.weapons.Fists.power : attack.weaponPower;
  const damage = Math.max(
    2,
    Math.floor(effectiveWeaponPower * (0.55 + Math.random() * 0.35) - defend.armor),
  );
  defend.hp = Math.max(0, defend.hp - damage);
  attacker.activity = {
    description: `${playerName(game, attacker)} 正在攻击 ${playerName(game, target)}`,
    emoji: attack.weapon === 'Fists' ? 'HIT' : 'FIRE',
    until: now + 1600,
  };
  target.activity = {
    description: `${playerName(game, target)} 受到 ${damage} 点伤害`,
    emoji: 'HIT',
    until: now + 1600,
  };
  pushEvent(
    game,
    now,
    'attack',
    `【战斗】${playerName(game, attacker)} 使用${weaponName(weaponsDisabled ? 'Fists' : attack.weapon)}命中 ${playerName(game, target)}，造成 ${damage} 点伤害。`,
    attacker,
    target,
    {
      from: attacker.position,
      to: target.position,
      damage,
    },
  );
  awardPopularity(game, now, 10, [attacker, target]);

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
      `【淘汰】${playerName(game, attacker)} 淘汰了 ${playerName(game, target)}，并缴获其物资。`,
      attacker,
      target,
      {
        from: attacker.position,
        to: target.position,
      },
    );
    awardPopularity(game, now, 25 + (game.world.battle?.bountyPlayerId === target.id ? 15 : 0), [attacker]);
  } else if (Math.random() < 0.72) {
    tacticalMove(game, now, attacker, target, attack.weapon === 'Shotgun' ? 'approach' : 'sidestep');
  }
}

function loot(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  const roll = Math.random();
  if (roll < 0.16 && stats.medkits < 2) {
    stats.medkits += 1;
    pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 搜索到医疗包。`, player);
  } else if (roll < 0.34) {
    const weapon = weapons[Math.min(weapons.length - 1, 1 + Math.floor(Math.random() * 4))];
    const power = weaponPower(weapon);
    if (power > stats.weaponPower) {
      stats.weapon = weapon;
      stats.weaponPower = power;
      pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 搜索到${weaponName(weapon)}。`, player);
    } else {
      stats.coins += 12;
      pushEvent(
        game,
        now,
        'loot',
        `【交易】${playerName(game, player)} 出售多余装备，获得 12 物资。`,
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
      `【搜索】${playerName(game, player)} 在${areaName(areaId)}搜索到${foundItem ?? `${coins} 物资`}。`,
      player,
    );
    triggerCharacterStory(game, now, player, areaId, foundItem);
    if (foundItem && ['加密档案', '医疗记录终端', '监控日志碎片', '案件卷宗', '演播档案带'].includes(foundItem)) {
      collectTruthClue(game, now, foundItem, player);
    }
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
      pushEvent(game, now, 'buy', `【购买】${playerName(game, player)} 购买了${weaponName(next)}。`, player);
      return true;
    }
  }
  if (stats.coins >= 90 && stats.armor < 12) {
    stats.coins -= 90;
    stats.armor += 5;
    pushEvent(game, now, 'buy', `【购买】${playerName(game, player)} 购买了防弹插板。`, player);
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
    description: `${playerName(game, player)} 正在协商结盟`,
    emoji: 'TALK',
    until: now + 2400,
  };
  partner.activity = {
    description: `${playerName(game, partner)} 接受结盟`,
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
    `【结盟】${playerName(game, player)} 与 ${playerName(game, partner)} 结为盟友，并分享了物资。`,
    player,
    partner,
  );
  awardPopularity(game, now, 20, [player, partner]);
  return true;
}

function awardPopularity(game: Game, now: number, baseScore: number, participants: Player[]) {
  const battle = game.world.battle!;
  const timestamps = (battle.scoreTimestamps ?? []).filter((timestamp) => now - timestamp <= 60000);
  timestamps.push(now);
  battle.scoreTimestamps = timestamps;
  const comboMultiplier = timestamps.length >= 5 ? 2 : timestamps.length >= 3 ? 1.5 : 1;
  const participantMultiplier = Math.max(1, ...participants.map((player) => 1 + (player.battle?.heat ?? 0) / 500));
  const gained = Math.max(1, Math.round(baseScore * comboMultiplier * participantMultiplier));
  battle.popularity = (battle.popularity ?? 0) + gained;
  battle.popularityPeak = Math.max(battle.popularityPeak ?? 0, battle.popularity);
  battle.comboCount = timestamps.length;
  battle.comboMultiplier = comboMultiplier;
  battle.lastScoreEvent = now;
  const milestones = Math.floor(battle.popularity / BATTLE_CONFIG.match.heatRewardStep);
  const newRewards = Math.max(0, milestones - (battle.heatMilestoneClaimed ?? 0));
  if (newRewards) {
    battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, (battle.interventionPoints ?? 0) + newRewards);
    battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + newRewards;
    battle.heatMilestoneClaimed = milestones;
    pushEvent(game, now, 'heat', `【热度】直播热度达到 ${battle.popularity}，主办方获得 ${newRewards} 点干预点。`);
  }
}

function triggerCharacterStory(game: Game, now: number, player: Player, areaId: string, foundItem?: string) {
  const stats = player.battle!;
  const story = CHARACTER_STORIES[stats.characterId ?? ''];
  const battle = game.world.battle!;
  const triggerId = `${stats.characterId}:${story?.title}`;
  if (!story || story.areaId !== areaId || story.item !== foundItem || battle.storyTriggers?.includes(triggerId)) return;
  battle.storyTriggers!.push(triggerId);
  if (story.effect === 'armor') stats.armor += 10;
  if (story.effect === 'coins') stats.coins += 25;
  if (story.effect === 'weapon') stats.weaponPower += 8;
  if (story.effect === 'medkit') stats.medkits += 1;
  if (story.effect === 'stamina') stats.stamina = stats.maxStamina;
  if (story.effect === 'truthPath') battle.truthPathKnown = true;
  if (story.effect === 'clue') collectTruthClue(game, now, `剧情-${stats.characterId}`, player);
  pushEvent(game, now, 'story', `【剧情】${playerName(game, player)}触发角色剧情「${story.title}」。`, player);
  awardPopularity(game, now, story.score, [player]);
}

function collectTruthClue(game: Game, now: number, clue: string, player: Player) {
  const battle = game.world.battle!;
  if (battle.truthClues?.includes(clue)) return;
  battle.truthClues!.push(clue);
  player.battle!.clues = (player.battle!.clues ?? 0) + 1;
  pushEvent(game, now, 'clue', `【线索】${playerName(game, player)}获得真相线索「${clue}」。`, player);
}

function unlockTruth(game: Game, now: number, player: Player) {
  const battle = game.world.battle!;
  if (player.battle?.characterId !== 'C12') throw new Error('只有 N-00 能进入真相之间。');
  if (!battle.truthPathKnown || (battle.truthClues?.length ?? 0) < 3) throw new Error('真相路径尚未满足：需要空白身份卡与 3 条线索。');
  if (battle.truthRevealed) throw new Error('真相已经揭示。');
  battle.truthUnlocked = true;
  battle.truthRevealed = true;
  player.battle.areaId = 'S01';
  pushEvent(game, now, 'truth', '【真相】N-00 进入真相之间，制造者日志向全场公开。', player);
  awardPopularity(game, now, 100, [player]);
  completeMission(game, now, 'HID_06');
}

function updateMissionProgress(game: Game, now: number) {
  const battle = game.world.battle!;
  if ((battle.popularity ?? 0) >= 500 && !battle.completedMissionIds?.includes('MAIN_S')) {
    battle.completedMissionIds!.push('MAIN_S');
    pushEvent(game, now, 'mission', '【任务】主线目标完成：直播热度达到 S 级。');
  }
  const c05 = alivePlayers(game).find((player) => player.battle?.characterId === 'C05');
  if (c05 && alivePlayers(game).length <= 3) completeMission(game, now, 'HID_01');
  const c09 = [...game.world.players.values()].find((player) => player.battle?.characterId === 'C09');
  if (c09?.battle?.eliminated) completeMission(game, now, 'HID_02');
  const c02 = alivePlayers(game).find((player) => player.battle?.characterId === 'C02');
  const c07 = alivePlayers(game).find((player) => player.battle?.characterId === 'C07');
  if (c02?.battle?.alliance === c07?.id) completeMission(game, now, 'HID_03');
}

function completeMission(game: Game, now: number, missionId: string) {
  const battle = game.world.battle!;
  const mission = battle.hiddenMissions?.find((candidate) => candidate.id === missionId);
  if (!mission || battle.completedMissionIds?.includes(missionId)) return;
  mission.status = '已完成';
  battle.completedMissionIds!.push(missionId);
  pushEvent(game, now, 'mission', `【任务】隐藏任务「${mission.title}」已完成。`);
  awardPopularity(game, now, missionId === 'HID_06' ? 0 : 45, []);
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
    description: `${playerName(game, player)} 前往新区域搜索`,
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

function weaponName(weapon: string) {
  return ({ Fists: '拳头', Pistol: '手枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪' } as Record<string, string>)[weapon] ?? weapon;
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
