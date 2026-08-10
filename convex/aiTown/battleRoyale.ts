import { Infer, v } from 'convex/values';
import type { Game } from './game';
import type { Player } from './player';
import { playerId } from './ids';
import { distance } from '../util/geometry';
import { blocked, movePlayer } from './movement';
import { point } from '../util/types';
import {
  BATTLE_CONFIG,
  BATTLE_ACTIONS,
  adjacentAreaIds,
  ITEM_EFFECTS,
  itemDefinition,
  GLOBAL_SPECIAL_EVENTS,
  AREA_SPECIAL_EVENTS,
  CHARACTER_STORIES,
  HIDDEN_MISSIONS,
  INTERVENTION_OPERATIONS,
  profileForIndex,
  profileForCharacterId,
} from '../../data/battleRoyaleConfig';
import { battleAreaNavigationPoints, isBattleArenaWalkable } from '../../data/battleArena';

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
  decisionDueAt: v.optional(v.number()),
  areaEnteredAt: v.optional(v.number()),
  areaSearches: v.optional(v.number()),
  lastDecisionAt: v.optional(v.number()),
  lastDecisionAction: v.optional(v.string()),
  lastDecisionReason: v.optional(v.string()),
  lastDecisionStatus: v.optional(v.string()),
  lastDecisionFallback: v.optional(v.string()),
  lastZoneDamageAt: v.optional(v.number()),
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

const battleReplayPlayerFrame = v.object({
  id: playerId,
  x: v.number(),
  y: v.number(),
  dx: v.number(),
  dy: v.number(),
  speed: v.number(),
  hp: v.number(),
  maxHp: v.number(),
  weapon: v.string(),
  armor: v.number(),
  medkits: v.number(),
  kills: v.number(),
  stamina: v.number(),
  maxStamina: v.number(),
  satiety: v.number(),
  zoneTime: v.number(),
  stress: v.number(),
  heat: v.number(),
  areaId: v.string(),
  eliminated: v.boolean(),
  alliance: v.optional(playerId),
  inventory: v.array(v.string()),
});
export type BattleReplayPlayerFrame = Infer<typeof battleReplayPlayerFrame>;

export const battleReplayFrame = v.object({
  openAreas: v.array(v.string()),
  popularity: v.number(),
  phase: v.string(),
  day: v.number(),
  timeOfDay: v.union(v.literal('day'), v.literal('night')),
  players: v.array(battleReplayPlayerFrame),
  relationships: v.array(v.object({ id: v.string(), strength: v.number(), hidden: v.boolean(), lastReason: v.optional(v.string()) })),
  resources: v.array(v.object({ areaId: v.string(), remaining: v.number(), max: v.number() })),
  truthClues: v.array(v.string()),
  storyTriggers: v.array(v.string()),
});
export type BattleReplayFrame = Infer<typeof battleReplayFrame>;

export const battleState = v.object({
  started: v.number(),
  lastTick: v.number(),
  nextEventId: v.number(),
  // Replay actions have their own sequence: several actions may occur between feed events.
  nextActionId: v.optional(v.number()),
  feed: v.array(battleEvent),
  phase: v.optional(v.string()),
  day: v.optional(v.number()),
  timeOfDay: v.optional(v.union(v.literal('day'), v.literal('night'))),
  openAreas: v.optional(v.array(v.string())),
  lastZoneUpdate: v.optional(v.number()),
  zoneClosesAt: v.optional(v.number()),
  lastZoneWarningAt: v.optional(v.number()),
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
  areaLocks: v.optional(v.array(v.object({ areaId: v.string(), until: v.number() }))),
  interventionEffect: v.optional(v.object({ kind: v.string(), areaId: v.optional(v.string()), playerId: v.optional(playerId), until: v.number() })),
  decisionDriverId: v.optional(v.string()),
  decisionDriverUntil: v.optional(v.number()),
  decisionCount: v.optional(v.number()),
  decisionMax: v.optional(v.number()),
  decisionDriverStatus: v.optional(v.string()),
  relationshipEdges: v.optional(v.array(v.object({
    id: v.string(), a: v.string(), b: v.string(), type: v.string(), strength: v.number(), hidden: v.boolean(), lastReason: v.optional(v.string()),
  }))),
  areaResources: v.optional(v.array(v.object({ areaId: v.string(), remaining: v.number(), max: v.number() }))),
  lastResourceRefresh: v.optional(v.number()),
  consumedAreaStories: v.optional(v.array(v.string())),
  areaEventCounts: v.optional(v.array(v.object({ id: v.string(), count: v.number() }))),
  areaBattleRounds: v.optional(v.array(v.object({ areaId: v.string(), count: v.number() }))),
  lastAreaEventCheck: v.optional(v.number()),
  lastGlobalEventCheck: v.optional(v.number()),
  globalEffects: v.optional(v.array(v.object({ id: v.string(), until: v.number() }))),
  seed: v.optional(v.number()),
  rngState: v.optional(v.number()),
  ruleVersion: v.optional(v.string()),
  actionLog: v.optional(v.array(v.object({
    id: v.number(), ts: v.number(), playerId: v.optional(playerId), targetPlayerId: v.optional(playerId), targetAreaId: v.optional(v.string()), action: v.string(), source: v.string(), accepted: v.boolean(), reason: v.optional(v.string()),
  }))),
  replayCheckpoints: v.optional(v.array(v.object({
    ts: v.number(), eventId: v.number(), rngState: v.number(), alive: v.number(), popularity: v.number(), phase: v.string(), stateDigest: v.string(), frame: v.optional(battleReplayFrame),
  }))),
  lastReplayCheckpointAt: v.optional(v.number()),
  lastVitalsUpdate: v.optional(v.number()),
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
    decisionDueAt: 0,
    areaEnteredAt: 0,
    areaSearches: 0,
    lastZoneDamageAt: 0,
  };
}

export function defaultBattleState(now: number, seed = now >>> 0): BattleState {
  return {
    started: now,
    lastTick: 0,
    nextEventId: 1,
    nextActionId: 1,
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
    zoneClosesAt: now + BATTLE_CONFIG.zone.earlyIntervalMs,
    lastZoneWarningAt: 0,
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
    areaLocks: [],
    decisionCount: 0,
    decisionMax: BATTLE_CONFIG.match.llmDecisionMaxPerMatch,
    decisionDriverStatus: '规则 AI 接管',
    relationshipEdges: defaultRelationshipEdges(),
    areaResources: defaultAreaResources(),
    lastResourceRefresh: now,
    consumedAreaStories: [],
    areaEventCounts: [], areaBattleRounds: [], lastAreaEventCheck: 0,
    lastGlobalEventCheck: 0, globalEffects: [],
    seed,
    rngState: seed || 1,
    ruleVersion: 'p2.0',
    actionLog: [],
    replayCheckpoints: [],
    lastReplayCheckpointAt: now,
    lastVitalsUpdate: now,
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
    player.battle.decisionDueAt ??= now + index * 1000;
    player.battle.areaEnteredAt ??= now;
    player.battle.areaSearches ??= 0;
    if (!player.battle.lastZoneDamageAt) player.battle.lastZoneDamageAt = now;
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
  battle.zoneClosesAt ??= battle.lastZoneUpdate + BATTLE_CONFIG.zone.earlyIntervalMs;
  battle.lastZoneWarningAt ??= 0;
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
  battle.areaLocks ??= [];
  battle.decisionCount ??= 0;
  battle.decisionMax ??= BATTLE_CONFIG.match.llmDecisionMaxPerMatch;
  battle.decisionDriverStatus ??= '规则 AI 接管';
  battle.relationshipEdges ??= defaultRelationshipEdges();
  battle.areaResources ??= defaultAreaResources();
  battle.lastResourceRefresh ??= now;
  battle.consumedAreaStories ??= [];
  battle.areaEventCounts ??= [];
  battle.areaBattleRounds ??= [];
  battle.lastAreaEventCheck ??= 0;
  battle.lastGlobalEventCheck ??= 0;
  battle.globalEffects ??= [];
  battle.seed ??= now >>> 0;
  battle.rngState ??= battle.seed || 1;
  battle.ruleVersion ??= 'p2.0';
  battle.nextActionId ??= 1;
  battle.actionLog ??= [];
  battle.replayCheckpoints ??= [];
  battle.lastReplayCheckpointAt ??= now;
  battle.lastVitalsUpdate ??= now;
}

function defaultRelationshipEdges() {
  return BATTLE_CONFIG.relationships.map(({ id, a, b, type, strength, hidden }) => ({ id, a, b, type, strength, hidden }));
}

function defaultAreaResources() {
  return BATTLE_CONFIG.areas.map((area) => ({ areaId: area.id, remaining: area.id === 'S01' ? 2 : 12, max: area.id === 'S01' ? 2 : 12 }));
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
  recordReplayCheckpoint(game, now);

  const alive = alivePlayers(game);
  if (alive.length <= 1) {
    if (alive.length === 1 && battle.feed[0]?.kind !== 'winner') {
      const winner = game.playerDescriptions.get(alive[0].id)?.name ?? alive[0].id;
      pushEvent(game, now, 'winner', `【胜利】${winner} 成为最后的幸存者。`, alive[0]);
    }
    return;
  }

  for (const player of alive) {
    const stats = player.battle!;
    const llmActive = (battle.decisionDriverUntil ?? 0) > now && (battle.decisionCount ?? 0) < (battle.decisionMax ?? 0);
    if (llmActive && now < (stats.decisionDueAt ?? now) + BATTLE_CONFIG.match.llmDecisionTimeoutMs) {
      continue;
    }
    if (llmActive && now >= (stats.decisionDueAt ?? now) + BATTLE_CONFIG.match.llmDecisionTimeoutMs) {
      runAgentBattleAction(game, now, player, '模型决策超时，规则 AI 接管');
      continue;
    }
    if ((stats.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) {
      continue;
    }
    runAgentBattleAction(game, now, player, battle.decisionDriverId ? '模型驾驶器离线，规则 AI 接管' : undefined);
  }
}

export function claimDecisionDriver(game: Game, now: number, driverId: string) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  if (driverId.length < 8 || driverId.length > 96) return { granted: false, status: '无效驾驶器标识' };
  const occupied = battle.decisionDriverId && battle.decisionDriverId !== driverId && (battle.decisionDriverUntil ?? 0) > now;
  if (occupied) return { granted: false, status: '已有观众正在驱动 AI' };
  battle.decisionDriverId = driverId;
  battle.decisionDriverUntil = now + BATTLE_CONFIG.match.decisionDriverLeaseMs;
  battle.decisionDriverStatus = `DeepSeek 驾驶中（剩余 ${(battle.decisionMax ?? 0) - (battle.decisionCount ?? 0)} 次）`;
  return { granted: true, expiresAt: battle.decisionDriverUntil, remaining: (battle.decisionMax ?? 0) - (battle.decisionCount ?? 0) };
}

export function heartbeatDecisionDriver(game: Game, now: number, driverId: string) {
  const battle = game.world.battle!;
  if (battle.decisionDriverId !== driverId || (battle.decisionCount ?? 0) >= (battle.decisionMax ?? 0)) {
    return { active: false };
  }
  battle.decisionDriverUntil = now + BATTLE_CONFIG.match.decisionDriverLeaseMs;
  return { active: true, expiresAt: battle.decisionDriverUntil };
}

export function submitAIDecision(game: Game, now: number, args: {
  driverId: string; playerId: string; action: string; targetPlayerId?: string; targetAreaId?: string; reason?: string;
}) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  const player = game.world.players.get(args.playerId as any);
  const fail = (reason: string) => {
    if (player?.battle) {
      player.battle.lastDecisionAt = now;
      player.battle.lastDecisionStatus = '已拒绝';
      player.battle.lastDecisionFallback = reason;
      player.battle.decisionDueAt = now + BATTLE_CONFIG.match.llmDecisionIntervalMs;
    }
    pushEvent(game, now, 'decision', `【决策】${player ? playerName(game, player) : 'AI'} 的模型动作被拒绝：${reason}。`, player);
    recordReplayAction(game, now, player, args.action, 'model', false, reason, args.targetPlayerId, args.targetAreaId);
    return { accepted: false, reason };
  };
  if (battle.decisionDriverId !== args.driverId || (battle.decisionDriverUntil ?? 0) <= now) return fail('驾驶权已失效');
  if ((battle.decisionCount ?? 0) >= (battle.decisionMax ?? 0)) return fail('本局模型决策额度已用尽');
  if (!player?.battle || player.battle.eliminated) return fail('角色已淘汰');
  if (!BATTLE_ACTIONS.includes(args.action as any)) return fail('动作不在允许列表');
  if ((player.battle.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) return fail('动作冷却中');
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  const safeReason = (args.reason ?? '').replace(/[\r\n]/g, ' ').slice(0, 140);
  const result = executeBattleAction(game, now, player, args.action as any, target, args.targetAreaId, safeReason);
  player.battle.lastDecisionAt = now;
  player.battle.lastDecisionAction = args.action;
  player.battle.lastDecisionReason = safeReason || '未提供理由';
  player.battle.lastDecisionStatus = result.accepted ? '已执行' : '已拒绝';
  player.battle.lastDecisionFallback = result.reason;
  player.battle.decisionDueAt = now + BATTLE_CONFIG.match.llmDecisionIntervalMs;
  if (result.accepted) {
    battle.decisionCount = (battle.decisionCount ?? 0) + 1;
    pushEvent(game, now, 'decision', `【决策】${playerName(game, player)} 选择${actionName(args.action)}：${safeReason || '基于当前局势'}。`, player, target);
  }
  recordReplayAction(game, now, player, args.action, 'model', result.accepted, result.reason, args.targetPlayerId, args.targetAreaId);
  return result;
}

export function reportAIDecisionFailure(game: Game, now: number, args: { driverId: string; playerId: string; reason: string }) {
  ensureBattleState(game, now);
  const player = game.world.players.get(args.playerId as any);
  const battle = game.world.battle!;
  if (!player?.battle || battle.decisionDriverId !== args.driverId) return { recorded: false };
  player.battle.lastDecisionAt = now;
  player.battle.lastDecisionStatus = '模型失败';
  player.battle.lastDecisionFallback = args.reason.slice(0, 100);
  player.battle.decisionDueAt = now - BATTLE_CONFIG.match.llmDecisionTimeoutMs;
  pushEvent(game, now, 'decision', `【决策】${playerName(game, player)} 的模型请求失败，规则 AI 即将接管。`, player);
  return { recorded: true };
}

function tickMatchRules(game: Game, now: number) {
  const battle = game.world.battle!;
  applyBattleVitals(game, now);
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
  const zoneClosesAt = battle.zoneClosesAt ?? ((battle.lastZoneUpdate ?? now) + interval);
  battle.zoneClosesAt = zoneClosesAt;
  if (
    battle.openAreas && battle.openAreas.length > 3
    && now >= zoneClosesAt - BATTLE_CONFIG.zone.warningMs
    && battle.lastZoneWarningAt !== zoneClosesAt
  ) {
    battle.lastZoneWarningAt = zoneClosesAt;
    battle.interventionEffect = { kind: 'zone-warning', until: zoneClosesAt };
    pushEvent(game, now, 'zone', `【禁区预警】${Math.ceil((zoneClosesAt - now) / 1000)} 秒后将收缩，请尽快规划转移。`);
  }
  if (
    battle.openAreas &&
    battle.openAreas.length > 3 &&
    now >= zoneClosesAt
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
      battle.zoneClosesAt = now + interval;
      pushEvent(game, now, 'zone', `【禁区关闭】${areaName(closingArea)} 已永久关闭，AI 必须转移。`, undefined, undefined);
      for (const player of alivePlayers(game).filter((candidate) => candidate.battle?.areaId === closingArea)) {
        const destination = adjacentAreaIds(closingArea).find((areaId) => battle.openAreas?.includes(areaId));
        if (destination && moveToBattleArea(game, now, player, destination)) {
          pushEvent(game, now, 'zone', `【禁区撤离】${playerName(game, player)} 被迫转移至${areaName(destination)}。`, player);
        } else {
          player.battle!.hp = Math.max(1, player.battle!.hp - 12);
          player.battle!.stress = (player.battle!.stress ?? 0) + 20;
          pushEvent(game, now, 'zone', `【禁区伤害】${playerName(game, player)} 未能撤离，受到红区伤害。`, player);
        }
      }
    }
  }

  for (const player of alivePlayers(game).filter((candidate) => !battle.openAreas?.includes(candidate.battle?.areaId ?? 'A01'))) {
    const stats = player.battle!;
    const last = stats.lastZoneDamageAt ?? now;
    const elapsedSeconds = Math.floor((now - last) / 1000);
    if (elapsedSeconds < 1) continue;
    const damage = elapsedSeconds * BATTLE_CONFIG.zone.redZoneDamagePerSecond;
    stats.hp = Math.max(0, stats.hp - damage);
    stats.lastZoneDamageAt = now;
    stats.stress = (stats.stress ?? 0) + elapsedSeconds;
    pushEvent(game, now, 'zone', `【红区伤害】${playerName(game, player)}在封锁区持续受伤 ${damage} 点。`, player);
    if (stats.hp === 0) {
      stats.eliminated = true;
      pushEvent(game, now, 'eliminate', `【淘汰】${playerName(game, player)}倒在红区中。`, player);
    }
  }

  if (now - (battle.lastScoreEvent ?? now) > 120000 && (battle.popularity ?? 0) >= 5) {
    battle.popularity = Math.max(0, (battle.popularity ?? 0) - 5);
    battle.lastScoreEvent = now;
    pushEvent(game, now, 'heat', '【热度】战场沉寂过久，直播热度下降 5 点。');
  }
  triggerAreaSpecialEvent(game, now);
  triggerGlobalSpecialEvent(game, now);
  triggerRelationshipDrama(game, now);
  refreshAreaResources(game, now);
  updateMissionProgress(game, now);
}

export function applyBattleVitals(game: Game, now: number) {
  const battle = game.world.battle!;
  const last = battle.lastVitalsUpdate ?? now;
  const elapsedSeconds = Math.floor((now - last) / 1000);
  if (elapsedSeconds < 10) return;
  battle.lastVitalsUpdate = now;
  for (const player of alivePlayers(game)) {
    const stats = player.battle!;
    stats.satiety = Math.max(0, (stats.satiety ?? BATTLE_CONFIG.runtime.satietyStart) - elapsedSeconds / 20);
    stats.zoneTime = Math.max(0, (stats.zoneTime ?? BATTLE_CONFIG.runtime.zoneTimeStart) - elapsedSeconds / 15);
    if (stats.areaId === 'A06') {
      stats.stress = Math.max(0, (stats.stress ?? 0) - elapsedSeconds / 18);
      stats.zoneTime = Math.min(stats.maxZoneTime ?? 40, (stats.zoneTime ?? 0) + elapsedSeconds / 12);
    }
    if ((stats.satiety ?? 0) <= 20) {
      stats.stamina = Math.max(0, (stats.stamina ?? 0) - Math.ceil(elapsedSeconds / 20));
      stats.stress = (stats.stress ?? 0) + Math.ceil(elapsedSeconds / 30);
    }
    if ((stats.stress ?? 0) >= (stats.stressThreshold ?? 80)) {
      player.activity = { description: `${playerName(game, player)} 压力过高，正在寻找撤离路线`, emoji: 'ALERT', until: now + 4000 };
    }
  }
}

export function triggerRelationshipDrama(game: Game, now: number) {
  const battle = game.world.battle!;
  for (const edge of battle.relationshipEdges ?? []) {
    const first = alivePlayers(game).find((player) => player.battle?.characterId === edge.a);
    const second = alivePlayers(game).find((player) => player.battle?.characterId === edge.b);
    if (!first || !second || first.battle?.areaId !== second.battle?.areaId) continue;
    const reunionId = `关系:重逢:${edge.id}`;
    if (!battle.storyTriggers?.includes(reunionId) && edge.strength >= 45 && edge.type !== 'rival') {
      if (allyPlayers(game, now, first, second)) {
        battle.storyTriggers!.push(reunionId);
        pushEvent(game, now, 'story', `【关系剧情】${playerName(game, first)}与${playerName(game, second)}在${areaName(first.battle!.areaId ?? 'A01')}重逢，决定共同生存。`, first, second);
        awardPopularity(game, now, 20, [first, second]);
      }
    }
    const sacrificeId = `关系:守护:${edge.id}`;
    const low = first.battle!.hp <= Math.floor(first.battle!.maxHp * 0.3) ? first : second.battle!.hp <= Math.floor(second.battle!.maxHp * 0.3) ? second : undefined;
    const guardian = low?.id === first.id ? second : low ? first : undefined;
    if (!battle.storyTriggers?.includes(sacrificeId) && low && guardian && ['family', 'mentor', 'friend'].includes(edge.type) && guardian.battle!.medkits > 0) {
      guardian.battle!.medkits -= 1;
      low.battle!.hp = Math.min(low.battle!.maxHp, low.battle!.hp + 28);
      updateRelationship(game, guardian, low, 18, '危局守护');
      battle.storyTriggers!.push(sacrificeId);
      pushEvent(game, now, 'story', `【关系剧情】${playerName(game, guardian)}消耗医疗包守护濒危的${playerName(game, low)}。`, guardian, low);
      awardPopularity(game, now, 30, [guardian, low]);
    }
    const reversalId = `关系:逆转:${edge.id}`;
    if (!battle.storyTriggers?.includes(reversalId) && edge.type === 'rival' && edge.strength <= -30 && first.battle!.hp < first.battle!.maxHp * 0.5 && second.battle!.hp < second.battle!.maxHp * 0.5) {
      first.battle!.alliance = second.id;
      second.battle!.alliance = first.id;
      updateRelationship(game, first, second, 24, '绝境逆转');
      battle.storyTriggers!.push(reversalId);
      pushEvent(game, now, 'story', `【关系剧情】${playerName(game, first)}与宿敌${playerName(game, second)}在绝境中暂时联手。`, first, second);
      awardPopularity(game, now, 35, [first, second]);
    }
  }
}

function refreshAreaResources(game: Game, now: number) {
  const battle = game.world.battle!;
  if (now < (battle.lastResourceRefresh ?? now) + 120000) return;
  for (const resource of battle.areaResources ?? []) {
    resource.remaining = Math.min(resource.max, resource.remaining + 3);
  }
  battle.lastResourceRefresh = now;
  pushEvent(game, now, 'resource', '【资源】部分区域资源已刷新。');
}

function triggerAreaSpecialEvent(game: Game, now: number) {
  const battle = game.world.battle!;
  battle.areaLocks = (battle.areaLocks ?? []).filter((lock) => lock.until > now);
  if (now < (battle.lastAreaEventCheck ?? 0) + 5000) return;
  battle.lastAreaEventCheck = now;
  const candidates = AREA_SPECIAL_EVENTS.filter((event) => {
    const count = battle.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0;
    if (count >= event.maxTriggers) return false;
    const cooldown = battle.areaEventCooldowns?.find((entry) => entry.id === event.id);
    return (!cooldown || cooldown.until <= now) && areaEventEligible(game, now, event.id, event.areaId);
  });
  const event = candidates[Math.floor(battleRandom(game) * candidates.length)];
  if (!event) return;
  const affected = alivePlayers(game).filter((player) => player.battle?.areaId === event.areaId);
  if (affected.length === 0) return;
  const randomPlayer = affected[Math.floor(battleRandom(game) * affected.length)];
  if (['turret', 'collapse', 'explosion', 'beast'].includes(event.effect)) randomPlayer.battle!.hp = Math.max(1, randomPlayer.battle!.hp - (event.effect === 'turret' ? 25 : event.effect === 'beast' ? 24 : 15));
  if (event.effect === 'stress' || event.effect === 'blackout') affected.forEach((player) => { player.battle!.stress = (player.battle!.stress ?? 0) + 15; });
  if (event.effect === 'blizzard') affected.forEach((player) => {
    player.battle!.stamina = Math.max(0, (player.battle!.stamina ?? 0) - 12);
    player.battle!.stress = (player.battle!.stress ?? 0) + 8;
  });
  if (event.effect === 'broadcast') awardPopularity(game, now, 10, affected);
  if (event.effect === 'surgery') randomPlayer.battle!.hp = Math.max(randomPlayer.battle!.hp, Math.floor(randomPlayer.battle!.maxHp * 0.8));
  if (event.effect === 'expiredMedicine') {
    randomPlayer.battle!.medkits = Math.max(0, randomPlayer.battle!.medkits - 1);
    randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + 10;
  }
  if (event.effect === 'lockdown') {
    setAreaLock(battle, event.areaId, now + 45000);
    affected.forEach((player) => { player.battle!.stress = (player.battle!.stress ?? 0) + 8; });
  }
  if (event.effect === 'autoTrade' && affected.length >= 2) {
    const [first, second] = affected;
    const firstItem = first.battle!.inventory?.shift();
    const secondItem = second.battle!.inventory?.shift();
    if (firstItem) second.battle!.inventory!.push(firstItem);
    if (secondItem) first.battle!.inventory!.push(secondItem);
    allyPlayers(game, now, first, second);
  }
  if (event.effect === 'trial' && affected.length >= 2) allyPlayers(game, now, affected[0], affected[1]);
  if (event.effect === 'falseGunshot' || event.effect === 'lost') {
    const destinations = adjacentAreaIds(event.areaId).filter((areaId) => battle.openAreas?.includes(areaId));
    const destination = destinations[Math.floor(battleRandom(game) * destinations.length)];
    if (destination && moveToBattleArea(game, now, randomPlayer, destination)) {
      pushEvent(game, now, 'move', `【剧情转移】${playerName(game, randomPlayer)} 被${event.effect === 'lost' ? '密林迷雾' : '假枪声'}引向${areaName(destination)}。`, randomPlayer);
    }
  }
  if (event.effect === 'revealRelation') {
    const hidden = battle.relationshipEdges?.find((edge) => edge.hidden);
    if (hidden) hidden.hidden = false;
  }
  if (event.effect === 'broker') {
    if (randomPlayer.battle!.coins >= 12) {
      randomPlayer.battle!.coins -= 12;
      collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
    } else {
      randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + 8;
    }
  }
  if (['c12Anomaly', 'replay'].includes(event.effect)) collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
  if (event.effect === 'zoneWarning') {
    randomPlayer.battle!.zoneTime = Math.min(randomPlayer.battle!.maxZoneTime ?? 40, (randomPlayer.battle!.zoneTime ?? 0) + 8);
    collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
  }
  if (event.effect === 'truth' && randomPlayer.battle?.characterId === 'C12') unlockTruth(game, now, randomPlayer);
  battle.areaEventCooldowns = (battle.areaEventCooldowns ?? []).filter((entry) => entry.id !== event.id);
  battle.areaEventCooldowns.push({ id: event.id, until: now + 90000 });
  const count = battle.areaEventCounts!.find((entry) => entry.id === event.id);
  if (count) count.count += 1; else battle.areaEventCounts!.push({ id: event.id, count: 1 });
  if ((battle.areaEventCounts!.find((entry) => entry.id === event.id)?.count ?? 0) >= event.maxTriggers) battle.consumedAreaStories!.push(event.id);
  battle.interventionEffect = { kind: `story:${event.effect}`, areaId: event.areaId, until: now + 6500 };
  pushEvent(game, now, 'areaStory', `【区域剧情】${areaName(event.areaId)}触发「${event.title}」：${areaEffectSummary(event.effect)}。`, randomPlayer);
}

function setAreaLock(battle: BattleState, areaId: string, until: number) {
  const locks = (battle.areaLocks ?? []).filter((lock) => lock.areaId !== areaId && lock.until > until - 60000);
  locks.push({ areaId, until });
  battle.areaLocks = locks;
}

function isAreaLocked(battle: BattleState | undefined, now: number, areaId: string) {
  return (battle?.areaLocks ?? []).some((lock) => lock.areaId === areaId && lock.until > now);
}

function areaEffectSummary(effect: string) {
  const summaries: Record<string, string> = {
    turret: '哨戒炮命中一名参赛者', blizzard: '区域体力下降并累积压力', broadcast: '直播热度上升', replay: '获得一条真相线索',
    revealRelation: '一条隐藏关系被公开', blackout: '区域内参赛者压力上升', collapse: '地板塌陷造成伤害', lockdown: '格斗笼封锁生效',
    stress: '黑板留言引发压力', surgery: '濒危参赛者被紧急救治', expiredMedicine: '药品失效并增加压力', falseGunshot: '假枪声诱导一名参赛者转移',
    autoTrade: '两名参赛者交换了物资并尝试结盟', broker: '信息贩子出售真相线索', explosion: '弹药殉爆造成伤害', beast: '野兽袭击一名参赛者',
    lost: '迷雾将一名参赛者引向相邻区域', zoneWarning: '林中低语提供禁区线索', trial: '法庭促成谈判', c12Anomaly: '异常数据留下真相线索', truth: '制造者日志开始解锁',
  };
  return summaries[effect] ?? '战场状态发生变化';
}

function areaEventEligible(game: Game, now: number, eventId: string, areaId: string) {
  const battle = game.world.battle!;
  const occupants = alivePlayers(game).filter((player) => player.battle?.areaId === areaId);
  if (occupants.length === 0) return false;
  const stayedTwoMinutes = occupants.some((player) => now - (player.battle?.areaEnteredAt ?? now) >= 120000);
  const searched = occupants.some((player) => (player.battle?.areaSearches ?? 0) >= 3);
  const battleRounds = battle.areaBattleRounds?.find((entry) => entry.areaId === areaId)?.count ?? 0;
  switch (eventId) {
    case 'A01_01': case 'A10_01': return stayedTwoMinutes;
    case 'A01_02': return battle.timeOfDay === 'night' && battle.openAreas?.includes(areaId);
    case 'A02_01': return battle.consumedAreaStories?.includes('A05_01') ?? false;
    case 'A02_02': return occupants.some((player) => player.battle?.inventory?.includes('监控终端权限卡'));
    case 'A03_01': return searched;
    case 'A03_02': return battle.timeOfDay === 'night' && occupants.length >= 2;
    case 'A04_01': return battleRounds >= 3;
    case 'A04_02': return battleRounds >= 1 && occupants.length >= 2;
    case 'A05_01': return occupants.some((player) => player.battle?.inventory?.includes('演播档案带'));
    case 'A05_02': return occupants.some((player) => (player.battle?.areaSearches ?? 0) >= 1);
    case 'A06_01': return occupants.some((player) => player.battle!.hp / player.battle!.maxHp < 0.3);
    case 'A06_02': return searched;
    case 'A07_01': return occupants.some((player) => (player.battle?.areaSearches ?? 0) >= 1);
    case 'A08_01': return occupants.length >= 2 && stayedTwoMinutes;
    case 'A08_02': return battleRandom(game) < 0.25;
    case 'A09_01': return battleRounds >= 1;
    case 'A10_02': return occupants.some((player) => player.battle?.characterId !== 'C10');
    case 'A10_03': return battle.timeOfDay === 'night' && alivePlayers(game).some((player) => player.battle?.characterId === 'C10');
    case 'A11_01': return occupants.length >= 3;
    case 'A11_02': return searched;
    case 'A12_01': return !occupants.some((player) => player.battle?.characterId === 'C12') && searched;
    case 'A12_02': return occupants.some((player) => player.battle?.inventory?.includes('监控终端权限卡'));
    case 'S01_01': return occupants.some((player) => player.battle?.characterId === 'C12');
    default: return false;
  }
}

function triggerGlobalSpecialEvent(game: Game, now: number) {
  const battle = game.world.battle!;
  if (now < (battle.lastGlobalEventCheck ?? 0) + 30000) return;
  battle.lastGlobalEventCheck = now;
  const candidates = GLOBAL_SPECIAL_EVENTS.filter((event) => (battle.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0) < event.maxTriggers)
    .filter((event) => event.id !== 'GLB_02' || battle.timeOfDay === 'night');
  const event = candidates.find((candidate) => battleRandom(game) < (candidate.id === 'GLB_01' ? 0.1 : candidate.id === 'GLB_03' ? 0.05 : 0.12));
  if (!event) return;
  const alive = alivePlayers(game);
  if (event.effect === 'beastRage') alive.forEach((player) => { player.battle!.stress = (player.battle!.stress ?? 0) + 12; });
  if (event.effect === 'blackout') alive.forEach((player) => markInterventionReaction(game, now, player, 'ENV_02'));
  if (event.effect === 'signalIntrusion') collectTruthClue(game, now, '全局-信号入侵', alive[0]);
  battle.globalEffects!.push({ id: event.id, until: now + 120000 });
  battle.areaEventCounts!.push({ id: event.id, count: 1 });
  battle.interventionEffect = { kind: `global:${event.effect}`, until: now + 6500 };
  pushEvent(game, now, 'globalStory', `【全局事件】${event.title}席卷战场。`);
  awardPopularity(game, now, event.id === 'GLB_02' ? 15 : 10, []);
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
    case 'INF_03': target!.battle!.alliance = undefined; second!.battle!.alliance = undefined; updateRelationship(game, target!, second!, -25, '匿名挑拨'); announce(`匿名消息挑拨了${playerName(game, target!)}与${playerName(game, second!)}。`); awardPopularity(game, now, 25, [target!, second!]); break;
    case 'INF_04': announce(`${playerName(game, target!)}的位置已被标记：${areaName(target!.battle!.areaId ?? 'A01')}。`); break;
    case 'REC_01': {
      const characterId = target!.battle!.characterId;
      const edge = battle.relationshipEdges?.find((candidate) => candidate.hidden && (candidate.a === characterId || candidate.b === characterId));
      if (edge) {
        edge.hidden = false;
        edge.lastReason = '主办方关系侦察';
        announce(`${playerName(game, target!)}的隐藏${relationshipTypeName(edge.type)}关系已被公开侦察。`);
      } else {
        announce(`${playerName(game, target!)}的关系档案已被公开侦察，但没有新的隐藏关系。`);
      }
      break;
    }
    case 'REC_02': battle.hiddenMissions![0] && (battle.hiddenMissions![0].status = `已揭示：${battle.hiddenMissions![0].status}`); announce('一条隐藏任务已被侦察揭示。'); break;
    case 'STO_01':
      if (areaId !== 'A04') throw new Error('拆除笼门只能作用于格斗笼。');
      battle.areaEventCooldowns = (battle.areaEventCooldowns ?? []).filter((entry) => entry.id !== 'A04_02');
      battle.areaLocks = (battle.areaLocks ?? []).filter((lock) => lock.areaId !== 'A04');
      announce('格斗笼门锁被主办方拆除，参赛者获得撤离窗口。'); break;
    case 'STO_02':
      if (areaId !== 'A06') throw new Error('替换药品只能作用于战地医院。');
      affected.forEach((player) => { player.battle!.medkits += 1; player.battle!.hp = Math.min(player.battle!.maxHp, player.battle!.hp + 12); });
      announce('战地医院的过期药品已替换为有效药品。'); break;
    case 'STO_03':
      if (areaId !== 'A10') throw new Error('激怒野兽只能作用于密林深处。');
      affected.forEach((player) => { player.battle!.hp = Math.max(1, player.battle!.hp - 48); });
      announce('密林野兽被激怒，袭击伤害翻倍。'); break;
    case 'STO_04':
      if (areaId !== 'A10') throw new Error('驱赶野兽只能作用于密林深处。');
      affected.forEach((player) => { player.battle!.hp = Math.min(player.battle!.maxHp, player.battle!.hp + 15); player.battle!.stress = Math.max(0, (player.battle!.stress ?? 0) - 15); });
      announce('野兽已被驱赶，密林暂时恢复平静。'); break;
    case 'STO_05':
      if (areaId !== 'A11' || affected.length < 2) throw new Error('法庭遗址至少需要两名角色。');
      allyPlayers(game, now, affected[0], affected[1]); announce('主办方强制开启法庭谈判。'); break;
    case 'STO_06':
      battle.globalEffects = (battle.globalEffects ?? []).map((effect) => effect.id === 'GLB_02' ? { ...effect, until: effect.until + 60000 } : effect);
      if (!battle.globalEffects.some((effect) => effect.id === 'GLB_02')) battle.globalEffects.push({ id: 'GLB_02', until: now + 60000 });
      announce('全图停电被延长 60 秒。'); break;
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

export function replayRecordedAction(
  game: Game,
  now: number,
  entry: { playerId?: string; action: string; targetPlayerId?: string; targetAreaId?: string },
) {
  const player = entry.playerId ? game.world.players.get(entry.playerId as any) : undefined;
  if (!player?.battle || player.battle.eliminated) return { accepted: false, reason: '回放角色不可用' };
  const target = entry.targetPlayerId ? game.world.players.get(entry.targetPlayerId as any) : undefined;
  return executeBattleAction(game, now, player, entry.action, target, entry.targetAreaId, '回放已验证行动');
}

/**
 * Replays the accepted model decisions in their recorded order. This deliberately
 * does not consult the driver lease, decision budget, or DeepSeek: a replay is a
 * pure execution of the already-audited structured actions against a fresh match.
 */
export function replayRecordedActions(
  game: Game,
  entries: Array<{
    id?: number;
    ts: number;
    playerId?: string;
    targetPlayerId?: string;
    targetAreaId?: string;
    action: string;
    source?: string;
    accepted?: boolean;
  }>,
) {
  const ordered = entries
    .filter((entry) => entry.accepted !== false && (entry.source === undefined || entry.source === 'model'))
    .sort((first, second) => first.ts - second.ts || (first.id ?? 0) - (second.id ?? 0));
  const results = ordered.map((entry) => ({
    id: entry.id,
    ts: entry.ts,
    action: entry.action,
    playerId: entry.playerId,
    result: replayRecordedAction(game, entry.ts, entry),
  }));
  return {
    applied: results.filter(({ result }) => result.accepted).length,
    rejected: results.filter(({ result }) => !result.accepted).length,
    stateDigest: battleReplayStateDigest(game),
    results,
  };
}

function executeBattleAction(
  game: Game,
  now: number,
  player: Player,
  action: string,
  target?: Player,
  targetAreaId?: string,
  _reason?: string,
) {
  const stats = player.battle!;
  if (action === 'move') {
    if (!targetAreaId || !adjacentAreaIds(stats.areaId ?? 'A01').map(String).includes(targetAreaId)) return { accepted: false, reason: '目标区域不相邻' };
    if (!game.world.battle?.openAreas?.includes(targetAreaId)) return { accepted: false, reason: '目标区域已关闭' };
    if (isAreaLocked(game.world.battle, now, stats.areaId ?? 'A01')) return { accepted: false, reason: '当前区域被剧情封锁' };
    if (!moveToBattleArea(game, now, player, targetAreaId)) return { accepted: false, reason: '无法抵达目标区域' };
    return { accepted: true };
  }
  if (action === 'search') { loot(game, now, player); return { accepted: true }; }
  if (action === 'buy') return tryBuyUpgrade(game, now, player) ? { accepted: true } : { accepted: false, reason: '物资不足或无可升级装备' };
  if (action === 'heal') {
    if (stats.medkits <= 0 || stats.hp >= stats.maxHp) return { accepted: false, reason: '不需要治疗或没有医疗包' };
    stats.medkits -= 1; stats.hp = Math.min(stats.maxHp, stats.hp + 22);
    pushEvent(game, now, 'heal', `【治疗】${playerName(game, player)} 按模型决策使用医疗包。`, player);
    return { accepted: true };
  }
  if (action === 'attack') {
    if (!target || target.battle?.eliminated) return { accepted: false, reason: '没有有效攻击目标' };
    if (target.battle?.areaId !== stats.areaId) return { accepted: false, reason: '目标不在同一区域' };
    const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
    if (distance(player.position, target.position) > weapon.range) return { accepted: false, reason: '目标超出武器射程' };
    attack(game, now, player, target); return { accepted: true };
  }
  if (action === 'flee') {
    const enemy = target ?? nearestEnemy(game, player);
    if (!enemy || !tacticalMove(game, now, player, enemy, 'retreat')) return { accepted: false, reason: '没有可撤离路线' };
    pushEvent(game, now, 'move', `【撤离】${playerName(game, player)} 按模型决策脱离战斗。`, player, enemy);
    return { accepted: true };
  }
  if (action === 'ally') {
    if (!target || target.battle?.eliminated || target.battle?.areaId !== stats.areaId) return { accepted: false, reason: '盟友必须在同一区域' };
    return allyPlayers(game, now, player, target) ? { accepted: true } : { accepted: false, reason: '无法结盟' };
  }
  if (action === 'trade') {
    if (!target?.battle || target.battle.eliminated || target.battle.areaId !== stats.areaId) return { accepted: false, reason: '交易对象必须在同一区域' };
    const offered = stats.inventory?.shift();
    const received = target.battle.inventory?.shift();
    const multiplier = stats.areaId === 'A08' ? 1.3 : 1;
    if (offered) {
      target.battle.inventory!.push(offered);
      if (received) stats.inventory!.push(received);
      const balance = Math.max(0, Math.floor((itemDefinition(offered).tradeValue - (received ? itemDefinition(received).tradeValue : 0)) * multiplier));
      target.battle.coins = Math.max(0, target.battle.coins - balance);
      stats.coins += balance;
      updateRelationship(game, player, target, stats.areaId === 'A08' ? 8 : 6, '物资交易');
      pushEvent(game, now, 'trade', `【交易】${playerName(game, player)} 以${offered}${received ? `换得${received}` : '完成出售'}。`, player, target);
      return { accepted: true };
    }
    const transfer = Math.min(10, Math.floor(stats.coins / 3));
    if (transfer < 1) return { accepted: false, reason: '物资不足以交易' };
    stats.coins -= transfer; target.battle.coins += transfer;
    updateRelationship(game, player, target, stats.areaId === 'A08' ? 8 : 6, '物资交易');
    pushEvent(game, now, 'trade', `【交易】${playerName(game, player)} 与 ${playerName(game, target)} 交换物资。`, player, target);
    return { accepted: true };
  }
  if (action === 'investigate') {
    collectTruthClue(game, now, `调查-${stats.areaId}`, player);
    pushEvent(game, now, 'investigate', `【调查】${playerName(game, player)} 正在调查${areaName(stats.areaId ?? 'A01')}。`, player);
    return { accepted: true };
  }
  return { accepted: false, reason: '未实现的动作' };
}

function runAgentBattleAction(game: Game, now: number, player: Player, fallbackReason?: string) {
  const stats = player.battle!;
  stats.lastBattleAction = now;
  stats.lastDecisionStatus = '规则回退';
  stats.lastDecisionFallback = fallbackReason ?? '未启用模型驾驶器';
  stats.decisionDueAt = now + BATTLE_CONFIG.match.llmDecisionIntervalMs;
  recordReplayAction(game, now, player, 'fallback', 'rule', true, fallbackReason);

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
  if ((stats.stress ?? 0) >= (stats.stressThreshold ?? 80)) {
    const destination = adjacentAreaIds(stats.areaId ?? 'A01')
      .filter((areaId) => game.world.battle?.openAreas?.includes(areaId))
      .sort((first, second) => areaDanger(first) - areaDanger(second))[0];
    if (destination && moveToBattleArea(game, now, player, destination)) {
      pushEvent(game, now, 'reaction', `【压力】${playerName(game, player)} 压力过高，撤离至${areaName(destination)}。`, player);
      return;
    }
  }
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

  if (enemy && !player.pathfinding && battleRandom(game) < 0.48) {
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

  if (battleRandom(game) < 0.24 && tryAlliance(game, now, player)) {
    return;
  }

  if (battleRandom(game) < 0.62) {
    loot(game, now, player);
    return;
  }

  if (enemy) {
    moveToward(game, now, player, enemy);
    return;
  }
  wander(game, now, player);
}

function areaDanger(areaId: string) {
  return BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.danger ?? 99;
}

function attack(game: Game, now: number, attacker: Player, target: Player) {
  const attack = attacker.battle!;
  const defend = target.battle!;
  const relation = relationshipBetween(game, attacker, target);
  const betrayal = attack.alliance === target.id || (relation?.strength ?? 0) >= 70;
  const areaId = attacker.battle?.areaId;
  if (areaId && areaId === target.battle?.areaId) {
    const entry = game.world.battle?.areaBattleRounds?.find((candidate) => candidate.areaId === areaId);
    if (entry) entry.count += 1; else game.world.battle?.areaBattleRounds?.push({ areaId, count: 1 });
  }
  const weaponsDisabled = (game.world.battle?.disabledWeaponsUntil ?? 0) > now;
  const effectiveWeaponPower = (weaponsDisabled ? BATTLE_CONFIG.weapons.Fists.power : attack.weaponPower) * (areaId === 'A04' ? 1.15 : 1);
  const damage = Math.max(
    2,
    Math.floor(effectiveWeaponPower * (0.55 + battleRandom(game) * 0.35) - defend.armor),
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
  if (betrayal) {
    attack.alliance = undefined;
    defend.alliance = undefined;
    pushEvent(game, now, 'betrayal', `【背叛】${playerName(game, attacker)} 背叛了 ${playerName(game, target)}。`, attacker, target);
    awardPopularity(game, now, 30, [attacker, target]);
    updateRelationship(game, attacker, target, -30, '背叛');
  }

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
  } else if (battleRandom(game) < 0.72) {
    tacticalMove(game, now, attacker, target, attack.weapon === 'Shotgun' ? 'approach' : 'sidestep');
  }
  updateRelationship(game, attacker, target, -12, '攻击');
}

function loot(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  stats.areaSearches = (stats.areaSearches ?? 0) + 1;
  const areaId = stats.areaId ?? 'A01';
  const resource = game.world.battle?.areaResources?.find((entry) => entry.areaId === areaId);
  if (resource && resource.remaining <= 0) {
    pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 发现${areaName(areaId)}资源已经枯竭。`, player);
    return;
  }
  if (resource) resource.remaining -= 1;
  const roll = battleRandom(game);
  if (roll < 0.16 && stats.medkits < 2) {
    stats.medkits += areaId === 'A06' ? 2 : 1;
    pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 搜索到医疗包。`, player);
  } else if (roll < 0.34) {
    const weapon = weapons[Math.min(weapons.length - 1, 1 + Math.floor(battleRandom(game) * 4))];
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
    const coins = 2 + Math.floor(battleRandom(game) * 6);
    stats.coins += coins;
    const pool = BATTLE_CONFIG.areaItems[areaId] ?? [];
    const foundItem = weightedAreaItem(game, pool);
    if (foundItem && (stats.inventory?.length ?? 0) < BATTLE_CONFIG.match.maxInventorySlots) {
      stats.inventory = [...(stats.inventory ?? []), foundItem];
      applyBattleItemEffect(game, now, player, foundItem);
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

export function applyBattleItemEffect(game: Game, now: number, player: Player, item: string) {
  const effect = ITEM_EFFECTS[item];
  if (!effect) return;
  const stats = player.battle!;
  if (effect.kind === 'heal') stats.hp = Math.min(stats.maxHp, stats.hp + effect.value);
  if (effect.kind === 'armor') stats.armor += effect.value;
  if (effect.kind === 'stamina') stats.stamina = Math.min(stats.maxStamina ?? 100, (stats.stamina ?? 0) + effect.value);
  if (effect.kind === 'satiety') stats.satiety = Math.min(100, (stats.satiety ?? 0) + effect.value);
  if (effect.kind === 'stress') stats.stress = Math.max(0, (stats.stress ?? 0) + effect.value);
  if (effect.kind === 'clue') collectTruthClue(game, now, `物品-${item}`, player);
  if (effect.kind === 'weapon' && effect.value > stats.weaponPower) {
    stats.weapon = item === '手枪' ? 'Pistol' : item === '突击步枪' ? 'Rifle' : 'Fists';
    stats.weaponPower = effect.value;
  }
  pushEvent(game, now, 'item', `【物品】${playerName(game, player)} 使用${item}获得即时效果。`, player);
}

function weightedAreaItem(game: Game, pool: readonly string[]) {
  if (pool.length === 0) return undefined;
  const total = pool.reduce((sum, item) => sum + itemWeight(item), 0);
  let cursor = battleRandom(game) * total;
  for (const item of pool) {
    cursor -= itemWeight(item);
    if (cursor <= 0) return item;
  }
  return pool[pool.length - 1];
}

function itemWeight(item: string) {
  return ({ common: 10, uncommon: 5, rare: 2, legendary: 0.5 } as Record<string, number>)[itemDefinition(item).rarity] ?? 10;
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
  const relatedPartners = (game.world.battle?.relationshipEdges ?? [])
    .filter((relation) => relation.type !== 'rival' && relation.strength >= 20)
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
  return allyPlayers(game, now, player, partner);
}

function allyPlayers(game: Game, now: number, player: Player, partner: Player) {
  if (!player.battle || !partner.battle || player.id === partner.id) return false;
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
  updateRelationship(game, player, partner, 14, '结盟');
  awardPopularity(game, now, 20, [player, partner]);
  return true;
}

function updateRelationship(game: Game, first: Player, second: Player, delta: number, reason: string) {
  const battle = game.world.battle!;
  const a = first.battle?.characterId;
  const b = second.battle?.characterId;
  if (!a || !b) return;
  let edge = battle.relationshipEdges?.find((candidate) => (candidate.a === a && candidate.b === b) || (candidate.a === b && candidate.b === a));
  if (!edge) {
    edge = { id: `REL_${a}_${b}`, a, b, type: 'friend', strength: 0, hidden: false };
    battle.relationshipEdges!.push(edge);
  }
  edge.strength = Math.max(-100, Math.min(100, edge.strength + delta));
  edge.lastReason = reason;
}

function relationshipBetween(game: Game, first: Player, second: Player) {
  const a = first.battle?.characterId;
  const b = second.battle?.characterId;
  return game.world.battle?.relationshipEdges?.find((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
}

function moveToBattleArea(game: Game, now: number, player: Player, areaId: string) {
  if (isAreaLocked(game.world.battle, now, player.battle?.areaId ?? 'A01')) return false;
  const candidates = battleAreaNavigationPoints(areaId, game.worldMap.width, game.worldMap.height);
  const destination = candidates.find((candidate) => candidate.x > 0 && candidate.y > 0 && candidate.x < game.worldMap.width - 1 && candidate.y < game.worldMap.height - 1 && !blocked(game, now, candidate, player.id));
  if (!destination) return false;
  player.battle!.areaId = areaId;
  player.battle!.areaEnteredAt = now;
  player.battle!.areaSearches = 0;
  player.battle!.stamina = Math.max(0, (player.battle!.stamina ?? 0) - BATTLE_CONFIG.runtime.moveStaminaCost);
  movePlayer(game, now, player, destination);
  player.activity = { description: `${playerName(game, player)} 正在前往${areaName(areaId)}`, emoji: 'MOVE', until: now + 2000 };
  pushEvent(game, now, 'move', `【移动】${playerName(game, player)} 进入${areaName(areaId)}。`, player);
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
  const points = battleAreaNavigationPoints(
    player.battle?.areaId ?? 'A01',
    game.worldMap.width,
    game.worldMap.height,
  );
  if (points.length === 0) return undefined;
  const start = Math.floor(battleRandom(game) * points.length);
  for (let offset = 0; offset < points.length; offset++) {
    const candidate = points[(start + offset) % points.length];
    if (!blocked(game, Date.now(), candidate, player.id)) return candidate;
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
      if (isInPlayerBattleArea(game, player, candidate) && !blocked(game, Date.now(), candidate, player.id)) {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function isInPlayerBattleArea(game: Game, player: Player, point: { x: number; y: number }) {
  return isBattleArenaWalkable(player.battle?.areaId ?? 'A01', point, game.worldMap.width, game.worldMap.height);
}

export function battleRandom(game: Game) {
  const battle = game.world.battle!;
  // Numerical Recipes LCG: persisted state makes server-side rules replayable.
  const state = battle.rngState ?? battle.seed ?? 1;
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  battle.rngState = next || 1;
  return next / 0x1_0000_0000;
}

function recordReplayAction(
  game: Game,
  now: number,
  player: Player | undefined,
  action: string,
  source: 'model' | 'rule',
  accepted: boolean,
  reason?: string,
  targetPlayerId?: string,
  targetAreaId?: string,
) {
  const battle = game.world.battle!;
  const log = battle.actionLog ?? (battle.actionLog = []);
  const entry: NonNullable<BattleState['actionLog']>[number] = {
    id: battle.nextActionId!++,
    ts: now,
    action,
    source,
    accepted,
  };
  // Convex validates optional fields as absent, not null. Avoid serializing
  // target-less rule actions as null, which would otherwise reject the whole tick.
  if (player) entry.playerId = player.id;
  if (targetPlayerId) entry.targetPlayerId = targetPlayerId as any;
  if (targetAreaId) entry.targetAreaId = targetAreaId;
  if (reason) entry.reason = reason.slice(0, 140);
  log.push(entry);
  if (log.length > 480) log.splice(0, log.length - 480);
}

function recordReplayCheckpoint(game: Game, now: number) {
  const battle = game.world.battle!;
  if (now < (battle.lastReplayCheckpointAt ?? now) + 30000) return;
  const checkpoints = battle.replayCheckpoints ?? (battle.replayCheckpoints = []);
  checkpoints.push({
    ts: now,
    eventId: Math.max(0, battle.nextEventId - 1),
    rngState: battle.rngState ?? battle.seed ?? 1,
    alive: alivePlayers(game).length,
    popularity: battle.popularity ?? 0,
    phase: battle.phase ?? 'early',
    stateDigest: battleReplayStateDigest(game),
    frame: battleReplayFrameFor(game),
  });
  if (checkpoints.length > 60) checkpoints.splice(0, checkpoints.length - 60);
  battle.lastReplayCheckpointAt = now;
}

/**
 * A checkpoint intentionally captures only the deterministic, viewer-facing state.
 * Keeping it narrow makes a whole match scrubbable without serializing conversations,
 * agent prompts, or a second full world document every thirty seconds.
 */
export function battleReplayFrameFor(game: Game): BattleReplayFrame {
  const battle = game.world.battle!;
  return {
    openAreas: [...(battle.openAreas ?? [])],
    popularity: battle.popularity ?? 0,
    phase: battle.phase ?? 'early',
    day: battle.day ?? 1,
    timeOfDay: battle.timeOfDay ?? 'day',
    players: [...game.world.players.values()].map((player) => {
      const stats = player.battle!;
      return {
        id: player.id,
        x: player.position.x,
        y: player.position.y,
        dx: player.facing.dx,
        dy: player.facing.dy,
        speed: player.speed,
        hp: stats.hp,
        maxHp: stats.maxHp,
        weapon: stats.weapon,
        armor: stats.armor,
        medkits: stats.medkits,
        kills: stats.kills,
        stamina: stats.stamina ?? stats.maxStamina ?? 0,
        maxStamina: stats.maxStamina ?? 0,
        satiety: stats.satiety ?? 0,
        zoneTime: stats.zoneTime ?? 0,
        stress: stats.stress ?? 0,
        heat: stats.heat ?? 0,
        areaId: stats.areaId ?? 'A01',
        eliminated: !!stats.eliminated,
        alliance: stats.alliance,
        inventory: [...(stats.inventory ?? [])],
      };
    }),
    relationships: (battle.relationshipEdges ?? []).map(({ id, strength, hidden, lastReason }) => ({ id, strength, hidden, lastReason })),
    resources: (battle.areaResources ?? []).map(({ areaId, remaining, max }) => ({ areaId, remaining, max })),
    truthClues: [...(battle.truthClues ?? [])],
    storyTriggers: [...(battle.storyTriggers ?? [])],
  };
}

export function battleReplayStateDigest(game: Game) {
  const battle = game.world.battle!;
  const players = [...game.world.players.values()]
    .map((player) => ({
      id: player.id,
      area: player.battle?.areaId,
      hp: Math.round(player.battle?.hp ?? 0),
      stamina: Math.round(player.battle?.stamina ?? 0),
      satiety: Math.round(player.battle?.satiety ?? 0),
      stress: Math.round(player.battle?.stress ?? 0),
      weapon: player.battle?.weapon,
      armor: player.battle?.armor,
      coins: player.battle?.coins,
      medkits: player.battle?.medkits,
      inventory: player.battle?.inventory ?? [],
      eliminated: !!player.battle?.eliminated,
      alliance: player.battle?.alliance,
    }))
    .sort((first, second) => first.id.localeCompare(second.id));
  const relationships = [...(battle.relationshipEdges ?? [])]
    .map(({ id, strength, hidden, lastReason }) => ({ id, strength, hidden, lastReason }))
    .sort((first, second) => first.id.localeCompare(second.id));
  const resources = [...(battle.areaResources ?? [])]
    .map(({ areaId, remaining }) => ({ areaId, remaining }))
    .sort((first, second) => first.areaId.localeCompare(second.areaId));
  return JSON.stringify({
    seed: battle.seed,
    rngState: battle.rngState,
    phase: battle.phase,
    day: battle.day,
    timeOfDay: battle.timeOfDay,
    openAreas: [...(battle.openAreas ?? [])].sort(),
    popularity: battle.popularity,
    players,
    relationships,
    resources,
    truthClues: [...(battle.truthClues ?? [])].sort(),
    storyTriggers: [...(battle.storyTriggers ?? [])].sort(),
  });
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

function actionName(action: string) {
  return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查' } as Record<string, string>)[action] ?? action;
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

function relationshipTypeName(type: string) {
  return ({ family: '亲属', ex: '旧识', rival: '宿敌', mentor: '师徒', friend: '同伴' } as Record<string, string>)[type] ?? type;
}
