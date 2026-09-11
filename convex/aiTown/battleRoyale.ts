import { Infer, v } from 'convex/values';
import type { Game } from './game';
import type { Player } from './player';
import { playerId } from './ids';
import { distance } from '../util/geometry';
import { blocked, findRoute, movePlayer } from './movement';
import { point } from '../util/types';
import {
  BATTLE_CONFIG,
  BATTLE_ACTIONS,
  adjacentAreaIds,
  ITEM_EFFECTS,
  GLOBAL_RARE_ITEMS,
  itemDefinition,
  GLOBAL_SPECIAL_EVENTS,
  AREA_SPECIAL_EVENTS,
  AREA_STORY_NARRATIVES,
  STORY_APPROACHES,
  storyApproachFor,
  storyOptionFor,
  CHARACTER_STORIES,
  availableAreaItemsFor,
  HIDDEN_MISSIONS,
  popularityRatingFor,
  tunedPopularityGain,
  INTERVENTION_OPERATIONS,
  RELATION_GENERATION,
  SUPPORT_CHAIN_SEQUENCE,
  SUPPORT_ORDER_COOLDOWN_MS,
  SUPPORT_ORDER_DURATION_MS,
  profileForIndex,
  profileForCharacterId,
  personaForCharacter,
  supportOrderAcceptChance,
} from '../../data/battleRoyaleConfig';
import { battleAreaNavigationPoints, battleAreaSpawnPoints, isBattleArenaWalkable } from '../../data/battleArena';
import { referenceLog, scoreAward, SCORE_EVENTS, SUPPLEMENTAL_RULES } from '../../data/referenceExecution';
import { REFERENCE_HIDDEN_MISSIONS, REFERENCE_RELATION_CHANGES } from '../../data/referenceRuntime';

const weapons = ['Fists', 'Pistol', 'Shotgun', 'Rifle', 'Sniper'] as const;
export const EXECUTABLE_ITEM_EFFECT_KEYS = ['all_stats_plus', 'aoe_damage', 'chem_immune', 'clue_fragment', 'cold_resist', 'comm_link', 'damage_buff_pct', 'damage_reduction_pct', 'disguise', 'eavesdrop', 'escape_smoke', 'hp', 'lore_text', 'melee_damage', 'move_speed_pct', 'plot_symbol', 'plot_trigger', 'radar_count', 'ranged_damage', 'reveal_relation', 'reveal_secret', 'satiety', 'satiety+stamina', 'scout_resources', 'special', 'stamina', 'stealth_pct', 'stealth_zone', 'truth_trigger', 'unlock', 'watch_area'] as const;

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
  itemEffects: v.optional(v.array(v.object({ key: v.string(), value: v.number(), value2: v.number(), source: v.string(), until: v.optional(v.number()) }))),
  attributeBonus: v.optional(v.number()),
  painUntil: v.optional(v.number()),
  stunnedUntil: v.optional(v.number()),
  smokeUntil: v.optional(v.number()),
  intelUpdatedAt: v.optional(v.number()),
  intel: v.optional(v.array(v.object({ ts: v.number(), source: v.string(), text: v.string() }))),
  watchedAreaId: v.optional(v.string()),
  commTargetId: v.optional(playerId),
  hidingSince: v.optional(v.number()),
  lastHidingPenalty: v.optional(v.number()),
  stalemateSince: v.optional(v.number()),
  lastStalematePenalty: v.optional(v.number()),
  duelStartHp: v.optional(v.number()),
  duelTargetStartHp: v.optional(v.number()),
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
  nextLocomotionAt: v.optional(v.number()),
  locomotionProgressAt: v.optional(v.number()),
  locomotionX: v.optional(v.number()),
  locomotionY: v.optional(v.number()),
  locomotionRecoveries: v.optional(v.number()),
  moveSpeed: v.optional(v.number()),
  pendingStoryApproach: v.optional(v.string()),
  pendingStoryEventId: v.optional(v.string()),
  combatTargetId: v.optional(playerId),
  combatUntil: v.optional(v.number()),
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
  weapon: v.optional(v.string()),
  burst: v.optional(v.number()),
  areaId: v.optional(v.string()),
  text: v.string(),
  eventType: v.optional(v.string()),
  globalText: v.optional(v.string()),
  mapText: v.optional(v.string()),
  characterText: v.optional(v.string()),
  effectKey: v.optional(v.string()),
  itemName: v.optional(v.string()),
});
export type BattleEvent = Infer<typeof battleEvent>;

export const battleDialogue = v.object({
  id: v.number(), ts: v.number(), speakerId: playerId, listenerId: v.optional(playerId), kind: v.string(), text: v.string(),
});
export type BattleDialogue = Infer<typeof battleDialogue>;

export const battleStoryBeat = v.object({
  id: v.number(), eventId: v.string(), ts: v.number(), areaId: v.string(), title: v.string(), actorId: playerId,
  scene: v.string(), choice: v.string(), approach: v.optional(v.string()), check: v.string(), roll: v.number(), bonus: v.number(), difficulty: v.number(), success: v.boolean(), outcome: v.string(),
  effectText: v.optional(v.string()), item: v.optional(v.string()),
});
export type BattleStoryBeat = Infer<typeof battleStoryBeat>;

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
  zoneClosesAt: v.optional(v.number()),
  interventionPoints: v.optional(v.number()),
  interventionPointsMax: v.optional(v.number()),
  areaLocks: v.optional(v.array(v.object({ areaId: v.string(), until: v.number() }))),
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

const battleReplayPatch = v.object({
  rngState: v.number(),
  popularity: v.number(),
  zoneClosesAt: v.optional(v.number()),
  interventionPoints: v.number(),
  interventionPointsMax: v.number(),
  areaLocks: v.array(v.object({ areaId: v.string(), until: v.number() })),
  phase: v.string(),
  day: v.number(),
  timeOfDay: v.union(v.literal('day'), v.literal('night')),
  openAreas: v.optional(v.array(v.string())),
  players: v.array(battleReplayPlayerFrame),
  relationships: v.array(v.object({ id: v.string(), strength: v.number(), hidden: v.boolean(), lastReason: v.optional(v.string()) })),
  resources: v.array(v.object({ areaId: v.string(), remaining: v.number(), max: v.number() })),
  truthCluesAdded: v.array(v.string()),
  storyTriggersAdded: v.array(v.string()),
});
export type BattleReplayPatch = Infer<typeof battleReplayPatch>;

export const battleState = v.object({
  started: v.number(),
  endedAt: v.optional(v.number()),
  matchStatus: v.optional(v.string()),
  winnerPlayerId: v.optional(playerId),
  sessionId: v.optional(v.string()), platform: v.optional(v.string()), elapsedSec: v.optional(v.number()), phaseElapsedSec: v.optional(v.number()), phaseStartedAt: v.optional(v.number()),
  lastTick: v.number(),
  nextEventId: v.number(),
  // Replay actions have their own sequence: several actions may occur between feed events.
  nextActionId: v.optional(v.number()),
  nextDialogueId: v.optional(v.number()),
  feed: v.array(battleEvent),
  dialogueLog: v.optional(v.array(battleDialogue)),
  nextStoryBeatId: v.optional(v.number()),
  storyLog: v.optional(v.array(battleStoryBeat)),
  phase: v.optional(v.string()),
  day: v.optional(v.number()),
  timeOfDay: v.optional(v.union(v.literal('day'), v.literal('night'))),
  openAreas: v.optional(v.array(v.string())),
  lastZoneUpdate: v.optional(v.number()),
  zoneClosesAt: v.optional(v.number()),
  lastZoneWarningAt: v.optional(v.number()),
  yellowAreaIds: v.optional(v.array(v.string())), redAreaIds: v.optional(v.array(v.string())), pendingClosingAreas: v.optional(v.array(v.string())),
  popularity: v.optional(v.number()),
  popularityRating: v.optional(v.string()),
  popularityPeak: v.optional(v.number()),
  comboCount: v.optional(v.number()),
  comboMultiplier: v.optional(v.number()),
  scoreTimestamps: v.optional(v.array(v.number())),
  scoreLedger: v.optional(v.array(v.object({ ts: v.number(), base: v.number(), credited: v.number() }))),
  lastIdlePenalty: v.optional(v.number()),
  settlementReward: v.optional(v.string()),
  lastScoreEvent: v.optional(v.number()),
  interventionPoints: v.optional(v.number()),
  interventionPointsMax: v.optional(v.number()),
  interventionEarnedTotal: v.optional(v.number()),
  interventionSpentTotal: v.optional(v.number()),
  nextSupportOrderId: v.optional(v.number()),
  supportOrders: v.optional(v.array(v.object({
    id: v.number(),
    playerId,
    kind: v.string(),
    doctrine: v.string(),
    stake: v.number(),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    targetPlayerId: v.optional(playerId),
    response: v.string(),
    result: v.optional(v.string()),
    baselineKills: v.number(),
    baselineCoins: v.number(),
    baselineInventory: v.number(),
    baselineSearches: v.number(),
  }))),
  supportChains: v.optional(v.array(v.object({
    playerId,
    stage: v.number(),
    completed: v.number(),
    lastAdvancedAt: v.number(),
  }))),
  heatMilestoneClaimed: v.optional(v.number()),
  hiddenMissions: v.optional(v.array(v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(),
    score: v.optional(v.number()),
    targetA: v.optional(v.string()),
    targetB: v.optional(v.string()),
  }))),
  completedMissionIds: v.optional(v.array(v.string())),
  mainMission: v.optional(v.string()), mainMissionDone: v.optional(v.boolean()), relationSeedId: v.optional(v.string()),
  settlementRating: v.optional(v.string()), settlementPopularity: v.optional(v.number()), selectedOpId: v.optional(v.string()),
  truthPathKnown: v.optional(v.boolean()),
  truthUnlocked: v.optional(v.boolean()),
  truthRevealed: v.optional(v.boolean()),
  truthClues: v.optional(v.array(v.string())),
  storyTriggers: v.optional(v.array(v.string())),
  operationCooldowns: v.optional(v.array(v.object({ id: v.string(), until: v.number() }))),
  encounterCooldowns: v.optional(v.array(v.object({ pairId: v.string(), until: v.number() }))),
  disabledWeaponsUntil: v.optional(v.number()),
  bountyHunterId: v.optional(playerId),
  bountyPlayerId: v.optional(playerId),
  temporaryAllianceUntil: v.optional(v.number()),
  temporaryAlliances: v.optional(v.array(v.object({ first: playerId, second: playerId, until: v.number() }))),
  trappedSupplies: v.optional(v.array(v.object({ areaId: v.string(), remaining: v.number() }))),
  organizerIntel: v.optional(v.array(v.string())),
  monsters: v.optional(v.array(v.object({ id: v.string(), name: v.string(), areaId: v.string(), hp: v.number(), drop: v.string() }))),
  areaEventCooldowns: v.optional(v.array(v.object({ id: v.string(), until: v.number() }))),
  areaLocks: v.optional(v.array(v.object({ areaId: v.string(), until: v.number() }))),
  interventionEffect: v.optional(v.object({ kind: v.string(), areaId: v.optional(v.string()), playerId: v.optional(playerId), until: v.number() })),
  decisionDriverId: v.optional(v.string()),
  decisionDriverUntil: v.optional(v.number()),
  decisionCount: v.optional(v.number()),
  decisionMax: v.optional(v.number()),
  decisionDriverStatus: v.optional(v.string()),
  relationshipEdges: v.optional(v.array(v.object({
    id: v.string(), a: v.string(), b: v.string(), type: v.string(), strength: v.number(), hidden: v.boolean(),
    mutable: v.optional(v.boolean()), triggerWeight: v.optional(v.number()), source: v.optional(v.string()), lastReason: v.optional(v.string()),
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
    id: v.number(), ts: v.number(), playerId: v.optional(playerId), targetPlayerId: v.optional(playerId), targetAreaId: v.optional(v.string()), storyEventId: v.optional(v.string()), storyApproach: v.optional(v.string()), action: v.string(), source: v.string(), accepted: v.boolean(), reason: v.optional(v.string()), patch: v.optional(battleReplayPatch),
  }))),
  replayCheckpoints: v.optional(v.array(v.object({
    ts: v.number(), eventId: v.number(), actionId: v.optional(v.number()), rngState: v.number(), alive: v.number(), popularity: v.number(), phase: v.string(), stateDigest: v.string(), frame: v.optional(battleReplayFrame),
  }))),
  lastReplayCheckpointAt: v.optional(v.number()),
  lastVitalsUpdate: v.optional(v.number()),
  isPaused: v.optional(v.boolean()), pausedAt: v.optional(v.number()),
  heatHistory: v.optional(v.array(v.object({ ts: v.number(), value: v.number() }))),
  operationUses: v.optional(v.array(v.object({ id: v.string(), count: v.number() }))),
  restoredAreas: v.optional(v.array(v.object({ areaId: v.string(), until: v.number() }))),
  weatherAreas: v.optional(v.array(v.object({ areaId: v.string(), until: v.number(), lastDamageAt: v.number() }))),
  exclusiveResources: v.optional(v.array(v.object({ areaId: v.string(), playerId, remaining: v.number(), until: v.number(), item: v.optional(v.string()) }))),
  doubleVictory: v.optional(v.object({ first: playerId, second: playerId, until: v.number() })),
  rareDrops: v.optional(v.array(v.object({ name: v.string(), areaId: v.string(), remaining: v.number() }))),
});
export type BattleState = Infer<typeof battleState>;

const BATTLE_TICK_MS = BATTLE_CONFIG.match.battleTickMs;
const ACTION_COOLDOWN_MS = BATTLE_CONFIG.match.actionCooldownMs;
const COMBAT_REFLEX_COOLDOWN_MS = 3200;
const TARGET_BATTLE_AGENT_COUNT = BATTLE_CONFIG.match.agentCount;

export function defaultBattleStats(profile = profileForIndex(0)): BattleStats {
  const maxHp = profile.hpMax;
  const maxStamina = profile.staminaMax;
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
    satiety: profile.satietyInitial,
    zoneTime: profile.zoneTime,
    maxZoneTime: profile.zoneTimeMax,
    stress: 0,
    stressThreshold: profile.stressThreshold,
    heat: profile.heat,
    clues: 0,
    inventory: [],
    itemEffects: [],
    decisionDueAt: 0,
    areaEnteredAt: 0,
    areaSearches: 0,
    lastZoneDamageAt: 0,
    nextLocomotionAt: 0,
    locomotionProgressAt: 0,
    locomotionRecoveries: 0,
    combatUntil: 0,
  };
}

export function defaultBattleState(now: number, seed = now >>> 0): BattleState {
  return {
    started: now,
    sessionId: `battle-${now}-${seed}`, platform: 'PC', elapsedSec: 0, phaseElapsedSec: 0, phaseStartedAt: now,
    lastTick: 0,
    nextEventId: 1,
    nextActionId: 1,
    nextDialogueId: 1,
      feed: [
      {
        id: 0,
        ts: now,
        kind: 'system',
        text: '【系统】大逃杀大厅已开启，12 名 AI 正在进入战场。',
      },
    ],
    dialogueLog: [],
    nextStoryBeatId: 1,
    storyLog: [],
    phase: 'opening',
    day: 1,
    timeOfDay: 'day',
    openAreas: BATTLE_CONFIG.areas.map((area) => area.id),
    lastZoneUpdate: now,
    zoneClosesAt: now + BATTLE_CONFIG.zone.earlyIntervalMs,
    lastZoneWarningAt: 0,
    yellowAreaIds: [], redAreaIds: [], pendingClosingAreas: [], popularity: 0, popularityRating: 'C',
    popularityPeak: 0,
    comboCount: 0,
    comboMultiplier: 1,
    scoreTimestamps: [],
    lastScoreEvent: now,
    interventionPoints: BATTLE_CONFIG.match.initialInterventionPoints,
    interventionPointsMax: BATTLE_CONFIG.match.maxInterventionPoints,
    interventionEarnedTotal: 0,
    interventionSpentTotal: 0,
    nextSupportOrderId: 1,
    supportOrders: [],
    supportChains: [],
    heatMilestoneClaimed: 0,
    hiddenMissions: selectHiddenMissions(seed),
    completedMissionIds: [],
    mainMission: 'REACH_S_RATING', mainMissionDone: false, relationSeedId: `seed-${seed}`,
    truthPathKnown: false,
    truthUnlocked: false,
    truthRevealed: false,
    truthClues: [],
    storyTriggers: [],
    operationCooldowns: [],
    encounterCooldowns: [],
    areaEventCooldowns: [],
    areaLocks: [],
    decisionCount: 0,
    decisionMax: BATTLE_CONFIG.match.llmDecisionMaxPerMatch,
    decisionDriverStatus: '规则 AI 接管',
    relationshipEdges: defaultRelationshipEdges(seed),
    areaResources: defaultAreaResources(),
    lastResourceRefresh: now,
    consumedAreaStories: [],
    areaEventCounts: [], areaBattleRounds: [], lastAreaEventCheck: 0,
    lastGlobalEventCheck: 0, globalEffects: [],
    seed,
    rngState: seed || 1,
    ruleVersion: 'p3.2-reference-execution',
    actionLog: [],
    replayCheckpoints: [],
    lastReplayCheckpointAt: now,
    lastVitalsUpdate: now,
    isPaused: false, heatHistory: [{ ts: now, value: 0 }], operationUses: [], restoredAreas: [], weatherAreas: [], exclusiveResources: [], rareDrops: [],
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
    player.battle.maxHp = profile.hpMax;
    player.battle.hp = Math.min(player.battle.hp, player.battle.maxHp);
    player.battle.maxStamina = profile.staminaMax;
    player.battle.stamina ??= player.battle.maxStamina;
    player.battle.satiety ??= profile.satietyInitial;
    player.battle.zoneTime ??= profile.zoneTime;
    player.battle.maxZoneTime ??= profile.zoneTimeMax;
    player.battle.stress ??= 0;
    player.battle.stressThreshold ??= profile.stressThreshold;
    player.battle.heat ??= profile.heat;
    player.battle.clues ??= 0;
    player.battle.inventory ??= [];
    player.battle.itemEffects ??= [];
    player.battle.interventionUntil ??= 0;
    player.battle.decisionDueAt ??= now + index * 1000;
    player.battle.nextLocomotionAt ??= now + index * 280;
    player.battle.locomotionProgressAt ??= now;
    player.battle.locomotionX ??= player.position.x;
    player.battle.locomotionY ??= player.position.y;
    player.battle.locomotionRecoveries ??= 0;
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
  battle.phase ??= 'opening';
  battle.day ??= 1;
  battle.timeOfDay ??= 'day';
  battle.openAreas ??= BATTLE_CONFIG.areas.map((area) => area.id);
  battle.lastZoneUpdate ??= now;
  battle.zoneClosesAt ??= battle.lastZoneUpdate + BATTLE_CONFIG.zone.earlyIntervalMs;
  battle.lastZoneWarningAt ??= 0;
  battle.yellowAreaIds ??= []; battle.redAreaIds ??= []; battle.pendingClosingAreas ??= [];
  battle.popularity ??= 0; battle.popularityRating ??= 'C';
  battle.popularityPeak ??= battle.popularity;
  battle.comboCount ??= 0;
  battle.comboMultiplier ??= 1;
  battle.scoreTimestamps ??= [];
  battle.lastScoreEvent ??= now;
  battle.interventionPoints ??= BATTLE_CONFIG.match.initialInterventionPoints;
  battle.interventionPointsMax ??= BATTLE_CONFIG.match.maxInterventionPoints;
  battle.interventionEarnedTotal ??= 0;
  battle.interventionSpentTotal ??= 0;
  battle.nextSupportOrderId ??= 1;
  battle.supportOrders ??= [];
  battle.supportChains ??= [];
  battle.heatMilestoneClaimed ??= 0;
  battle.hiddenMissions ??= selectHiddenMissions(battle.seed ?? now >>> 0);
  battle.completedMissionIds ??= [];
  battle.mainMission ??= 'REACH_S_RATING'; battle.mainMissionDone ??= false; battle.relationSeedId ??= `seed-${battle.seed ?? now >>> 0}`;
  battle.truthPathKnown ??= false;
  battle.truthUnlocked ??= false;
  battle.truthRevealed ??= false;
  battle.truthClues ??= [];
  battle.storyTriggers ??= [];
  battle.operationCooldowns ??= [];
  battle.encounterCooldowns ??= [];
  battle.areaEventCooldowns ??= [];
  battle.areaLocks ??= [];
  battle.decisionCount ??= 0;
  battle.decisionMax ??= BATTLE_CONFIG.match.llmDecisionMaxPerMatch;
  battle.decisionDriverStatus ??= '规则 AI 接管';
  battle.relationshipEdges ??= defaultRelationshipEdges(battle.seed ?? now >>> 0);
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
  battle.nextDialogueId ??= 1;
  battle.dialogueLog ??= [];
  battle.nextStoryBeatId ??= 1;
  battle.storyLog ??= [];
  battle.actionLog ??= [];
  battle.replayCheckpoints ??= [];
  battle.lastReplayCheckpointAt ??= now;
  battle.lastVitalsUpdate ??= now;
  battle.sessionId ??= `battle-${battle.started}-${battle.seed ?? 1}`; battle.platform ??= 'PC'; battle.elapsedSec ??= 0; battle.phaseElapsedSec ??= 0; battle.phaseStartedAt ??= battle.started;
  battle.isPaused ??= false; battle.heatHistory ??= [{ ts: now, value: battle.popularity ?? 0 }]; battle.operationUses ??= []; battle.restoredAreas ??= []; battle.weatherAreas ??= []; battle.exclusiveResources ??= []; battle.rareDrops ??= [];
}

function seededRandom(seed: number) { let state = seed || 1; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
function selectHiddenMissions(seed: number) { const random = seededRandom(seed ^ 0x484944); const shuffled = [...HIDDEN_MISSIONS].sort(() => random() - 0.5); return shuffled.slice(0, random() < 0.5 ? 1 : 2).map((mission) => ({ ...mission, status: '进行中' })); }
export function defaultRelationshipEdges(seed = 1) {
  const edges: Array<{ id: string; a: string; b: string; type: string; strength: number; hidden: boolean; mutable?: boolean; triggerWeight?: number; source?: string; lastReason?: string }> = BATTLE_CONFIG.relationships.map((row) => ({ ...row }));
  const random = seededRandom(seed ^ 0x52454c);
  const characters = BATTLE_CONFIG.characters.map((character) => character.id);
  const params = RELATION_GENERATION.params;
  const extraCount = params.extra_drama_min + Math.floor(random() * (params.extra_drama_max - params.extra_drama_min + 1));
  const extraCounts = new Map<string, number>();
  let attempts = 0;
  while (edges.filter((edge) => edge.source === 'random').length < extraCount && attempts++ < 500) {
    const a = characters[Math.floor(random() * characters.length)];
    const b = characters[Math.floor(random() * characters.length)];
    if (a === b || (extraCounts.get(a) ?? 0) >= params.max_extra_drama_per_char || (extraCounts.get(b) ?? 0) >= params.max_extra_drama_per_char || edges.some((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))) continue;
    let cursor = random() * RELATION_GENERATION.types.reduce((sum, entry) => sum + entry.weight, 0);
    const selected = RELATION_GENERATION.types.find((entry) => (cursor -= entry.weight) <= 0) ?? RELATION_GENERATION.types[0];
    const strength = selected.strengthMin + Math.floor(random() * (selected.strengthMax - selected.strengthMin + 1));
    edges.push({ id: `REL_RANDOM_${edges.length + 1}`, a, b, type: selected.type, strength, hidden: false, mutable: true, triggerWeight: selected.triggerWeight, source: 'random' });
    extraCounts.set(a, (extraCounts.get(a) ?? 0) + 1); extraCounts.set(b, (extraCounts.get(b) ?? 0) + 1);
  }
  const extraHidden = params.extra_hidden_min + Math.floor(random() * (params.extra_hidden_max - params.extra_hidden_min + 1));
  for (const edge of [...edges].filter((entry) => entry.source === 'random').sort(() => random() - 0.5).slice(0, extraHidden)) edge.hidden = true;
  for (let i = 0; i < characters.length; i++) for (let j = i + 1; j < characters.length; j++) {
    const a = characters[i]; const b = characters[j];
    if (!edges.some((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))) edges.push({
      id: `REL_STRANGER_${a}_${b}`, a, b, type: 'stranger',
      strength: params.stranger_strength_min + Math.floor(random() * (params.stranger_strength_max - params.stranger_strength_min + 1)),
      hidden: false, mutable: true, triggerWeight: params.stranger_trigger_weight, source: 'generated-default',
    });
  }
  return edges;
}

function defaultAreaResources() {
  return BATTLE_CONFIG.areas.map((area) => ({ areaId: area.id, remaining: area.id === 'S01' ? 2 : BATTLE_CONFIG.match.areaPoolSpawnCount, max: area.id === 'S01' ? 2 : BATTLE_CONFIG.match.areaPoolSpawnCount }));
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
    const index = [...game.world.players.keys()].indexOf(player.id);
    const profile = profileForIndex(index);
    player.battle = defaultBattleStats(profile);
    const spawn = [
      ...battleAreaSpawnPoints(profile.areaId, game.worldMap.width, game.worldMap.height),
      ...battleAreaNavigationPoints(profile.areaId, game.worldMap.width, game.worldMap.height),
    ].find((candidate) => !blocked(game, now, candidate, player.id));
    if (spawn) player.position = spawn;
    player.facing = { dx: 1, dy: 0 };
    delete player.activity;
    delete player.pathfinding;
    player.speed = 0;
  }
  pushEvent(game, now, 'system', '【系统】比赛已重启，所有 AI 返回战场。');
  return { players: game.world.players.size };
}

export function tickBattleRoyale(game: Game, now: number) {
  ensureBattleState(game, now);
  if (game.world.battle!.isPaused || game.world.battle!.phase === 'settlement') return;
  const evacuating = new Set<string>();
  // Rescue contestants that were already in a closed area before applying the
  // next zone drain. Zone survival always outranks combat, support, and model AI.
  for (const player of alivePlayers(game)) {
    if (evacuateClosedArea(game, now, player)) evacuating.add(player.id);
  }
  tickMatchRules(game, now);
  // A rule tick may have closed new areas. Start those evacuations immediately
  // instead of letting one more combat/decision cycle run inside the red zone.
  for (const player of alivePlayers(game)) {
    if (evacuateClosedArea(game, now, player)) evacuating.add(player.id);
  }
  for (const player of alivePlayers(game)) {
    if (!evacuating.has(player.id)) tickBattleLocomotion(game, now, player);
  }
  updateSupportOrders(game, now);
  const battle = game.world.battle!;
  if (now < battle.lastTick + BATTLE_TICK_MS) {
    return;
  }
  battle.lastTick = now;
  recordReplayCheckpoint(game, now);

  const alive = alivePlayers(game);
  const doubleVictory = battle.doubleVictory;
  if (alive.length === 2 && doubleVictory && doubleVictory.until > now) {
    const ids = new Set(alive.map((player) => String(player.id)));
    if (ids.has(doubleVictory.first) && ids.has(doubleVictory.second) && !battle.storyTriggers?.includes('RULE:DOUBLE_VICTORY')) { battle.storyTriggers!.push('RULE:DOUBLE_VICTORY'); settleBattle(battle); pushEvent(game, now, 'winner', `【双胜】${playerName(game, alive[0])}与${playerName(game, alive[1])}共同获胜。`, alive[0], alive[1]); return; }
  }
  if (alive.length <= 1) {
    if (alive.length === 1 && battle.feed[0]?.kind !== 'winner') {
      const winner = game.playerDescriptions.get(alive[0].id)?.name ?? alive[0].id;
      settleBattle(battle);
      pushEvent(game, now, 'winner', `【胜利】${winner} 成为最后的幸存者。`, alive[0]);
    }
    return;
  }

  resolveCloseEncounters(game, now, alive);

  for (const player of alive) {
    if (player.battle?.eliminated) continue;
    if (evacuating.has(player.id)) continue;
    const stats = player.battle!;
    if (runCombatReflex(game, now, player)) continue;
    if (runSupportOrderAction(game, now, player)) continue;
    const unlimitedLocalDecisions = battle.platform === 'BROWSER_LOCAL';
    const llmActive = (battle.decisionDriverUntil ?? 0) > now && (unlimitedLocalDecisions || (battle.decisionCount ?? 0) < (battle.decisionMax ?? 0));
    const modelDecisionDue = (stats.decisionDueAt ?? 0) <= now;
    if (llmActive && modelDecisionDue && now < (stats.decisionDueAt ?? now) + BATTLE_CONFIG.match.llmDecisionTimeoutMs) {
      continue;
    }
    if (llmActive && modelDecisionDue && now >= (stats.decisionDueAt ?? now) + BATTLE_CONFIG.match.llmDecisionTimeoutMs) {
      runAgentBattleAction(game, now, player, '模型决策超时，规则 AI 接管');
      continue;
    }
    if ((stats.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) {
      continue;
    }
    const fallbackReason = !unlimitedLocalDecisions && (battle.decisionCount ?? 0) >= (battle.decisionMax ?? 0)
      ? '本局模型额度已用尽，规则 AI 接管'
      : battle.decisionDriverId ? '模型驾驶器离线，规则 AI 接管' : undefined;
    runAgentBattleAction(game, now, player, fallbackReason);
  }
}

/** Immediately overrides every other behavior when a contestant is in a closed area. */
export function evacuateClosedArea(game: Game, now: number, player: Player) {
  const stats = player.battle;
  const battle = game.world.battle;
  if (!stats || stats.eliminated || !battle || battle.openAreas?.includes(stats.areaId ?? 'A01')) return false;
  const destination = nearestOpenEvacuationArea(game, stats.areaId ?? 'A01');
  if (!destination) return false;

  delete player.pathfinding;
  player.speed = 0;
  stats.combatTargetId = undefined;
  stats.combatUntil = 0;
  stats.pendingStoryEventId = undefined;
  stats.pendingStoryApproach = undefined;
  if (!moveToBattleArea(game, now, player, destination)) return false;
  stats.lastDecisionAt = now;
  stats.lastDecisionAction = 'move';
  stats.lastDecisionReason = `当前区域已关闭，强制撤往${areaName(destination)}`;
  stats.lastDecisionStatus = '禁区紧急撤离';
  stats.nextLocomotionAt = now + 1200;
  player.activity = {
    description: `${playerName(game, player)} 正在紧急撤离禁区，前往${areaName(destination)}`,
    emoji: 'ALERT',
    until: now + 2500,
  };
  return true;
}

function nearestOpenEvacuationArea(game: Game, startAreaId: string) {
  const openAreas = new Set((game.world.battle?.openAreas ?? []).filter((areaId) => areaId !== 'S01'));
  if (!openAreas.size) return undefined;
  const queue = [startAreaId];
  const visited = new Set(queue);
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of adjacentAreaIds(current).map(String)) {
      if (visited.has(neighbor)) continue;
      if (openAreas.has(neighbor)) return neighbor;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
  return [...openAreas][0];
}

function settleBattle(battle: BattleState) {
  battle.phase = 'settlement';
  battle.settlementPopularity = battle.popularity ?? 0;
  battle.settlementRating = popularityRatingFor(battle.popularity ?? 0, battle.interventionSpentTotal ?? 0);
  battle.popularityRating = battle.settlementRating;
  battle.mainMissionDone = battle.settlementRating === 'S';
  battle.settlementReward = SUPPLEMENTAL_RULES.ratingRewards[battle.settlementRating];
}

export function setBattlePaused(game: Game, now: number, paused: boolean) {
  ensureBattleState(game, now); const battle = game.world.battle!; if (paused === battle.isPaused) return { paused };
  if (paused) { battle.isPaused = true; battle.pausedAt = now; pushEvent(game, now, 'system', '【系统】比赛已暂停。'); return { paused: true }; }
  const delta = Math.max(0, now - (battle.pausedAt ?? now)); const shift = (value: number | undefined) => value === undefined ? undefined : value + delta;
  battle.started += delta; battle.lastTick = shift(battle.lastTick) ?? 0; battle.lastZoneUpdate = shift(battle.lastZoneUpdate); battle.zoneClosesAt = shift(battle.zoneClosesAt); battle.lastVitalsUpdate = shift(battle.lastVitalsUpdate);
  battle.operationCooldowns?.forEach((entry) => { entry.until += delta; }); battle.areaEventCooldowns?.forEach((entry) => { entry.until += delta; }); battle.areaLocks?.forEach((entry) => { entry.until += delta; }); battle.globalEffects?.forEach((entry) => { entry.until += delta; }); battle.weatherAreas?.forEach((entry) => { entry.until += delta; entry.lastDamageAt += delta; }); battle.restoredAreas?.forEach((entry) => { entry.until += delta; }); battle.exclusiveResources?.forEach((entry) => { entry.until += delta; });
  battle.scoreLedger?.forEach(entry => { entry.ts += delta; });
  battle.scoreTimestamps = battle.scoreTimestamps?.map(ts => ts + delta);
  battle.lastScoreEvent = shift(battle.lastScoreEvent); battle.lastIdlePenalty = shift(battle.lastIdlePenalty);
  battle.temporaryAlliances?.forEach(pair => { pair.until += delta; });
  for (const player of game.world.players.values()) if (player.battle) {
    const stats = player.battle;
    stats.itemEffects?.forEach(effect => { if (effect.until !== undefined) effect.until += delta; });
    stats.painUntil = shift(stats.painUntil); stats.smokeUntil = shift(stats.smokeUntil); stats.stunnedUntil = shift(stats.stunnedUntil);
    stats.hidingSince = shift(stats.hidingSince); stats.stalemateSince = shift(stats.stalemateSince);
    stats.lastHidingPenalty = shift(stats.lastHidingPenalty); stats.lastStalematePenalty = shift(stats.lastStalematePenalty);
  }
  for (const player of game.world.players.values()) { if (!player.battle) continue; player.battle.decisionDueAt = shift(player.battle.decisionDueAt); player.battle.lastZoneDamageAt = shift(player.battle.lastZoneDamageAt); player.battle.interventionUntil = shift(player.battle.interventionUntil); }
  battle.isPaused = false; battle.pausedAt = undefined; pushEvent(game, now, 'system', '【系统】比赛继续。'); return { paused: false };
}

export function tickBattleLocomotion(game: Game, now: number, player: Player) {
  const stats = player.battle;
  if (!stats || stats.eliminated) return false;
  const standingBlock = blocked(game, now, player.position, player.id);
  if (standingBlock === 'world blocked' || standingBlock === 'out of bounds') {
    const origin = { x: Math.floor(player.position.x), y: Math.floor(player.position.y) };
    const rescue = openTilesNear(game, player, origin, 10, now)
      .sort((a, b) => distance(a, origin) - distance(b, origin))[0];
    if (rescue) {
      player.position = rescue;
      player.speed = 0;
      delete player.pathfinding;
      stats.locomotionX = rescue.x;
      stats.locomotionY = rescue.y;
      stats.locomotionProgressAt = now;
      stats.locomotionRecoveries = (stats.locomotionRecoveries ?? 0) + 1;
      stats.nextLocomotionAt = now;
      player.activity = { description: `${playerName(game, player)} 已脱离无效地形，正在重新定位`, emoji: 'ROUTE', until: now + 1200 };
    }
  }
  const previousPosition = { x: stats.locomotionX ?? player.position.x, y: stats.locomotionY ?? player.position.y };
  if (distance(previousPosition, player.position) >= 0.2) {
    stats.locomotionX = player.position.x;
    stats.locomotionY = player.position.y;
    stats.locomotionProgressAt = now;
  }
  if (player.pathfinding?.state.kind === 'moving' && player.speed > 0) {
    if (!player.activity || player.activity.until <= now || ['MOVE', 'ROUTE'].includes(player.activity.emoji ?? '')) {
      player.activity = { description: `${playerName(game, player)} 正在穿越${areaName(stats.areaId ?? 'A01')}`, emoji: 'MOVE', until: now + 700 };
    }
  } else if (player.activity?.emoji === 'MOVE' && player.activity.until > now) {
    player.activity = { description: `${playerName(game, player)} 正在观察路线`, emoji: 'ROUTE', until: now + 700 };
  }
  if (player.pathfinding) {
    const stalledFor = now - (stats.locomotionProgressAt ?? now);
    const threshold = player.pathfinding.state.kind === 'waiting' ? 1800 : 2800;
    if (stalledFor < threshold) return false;
    delete player.pathfinding;
    player.speed = 0;
    stats.locomotionRecoveries = (stats.locomotionRecoveries ?? 0) + 1;
    stats.nextLocomotionAt = now;
    stats.locomotionProgressAt = now;
    player.activity = { description: `${playerName(game, player)} 遇到阻挡，正在重新规划路线`, emoji: 'ROUTE', until: now + 1400 };
  }
  if (now < (stats.nextLocomotionAt ?? 0)) return false;
  const activeActivity = player.activity && player.activity.until > now ? player.activity : undefined;
  if (activeActivity && ['TALK', 'ALLY'].includes(activeActivity.emoji ?? '')) {
    stats.nextLocomotionAt = activeActivity.until + 250;
    return false;
  }
  const nearbyEnemy = nearestEnemy(game, player, now);
  const nearbyRelation = nearbyEnemy ? relationshipBetween(game, player, nearbyEnemy) : undefined;
  const nearbyEnemyIsHostile = nearbyEnemy && (
    (nearbyRelation?.strength ?? 0) < 25 || nearbyRelation?.type === 'rival'
  );
  if (nearbyEnemy && nearbyEnemyIsHostile && distance(player.position, nearbyEnemy.position) <= BATTLE_CONFIG.match.dangerRange) {
    const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
    const targetDistance = distance(player.position, nearbyEnemy.position);
    const mode = targetDistance > weapon.range ? 'approach' : 'sidestep';
    stats.nextLocomotionAt = now + 700;
    if (tacticalMove(game, now, player, nearbyEnemy, mode)) {
      stats.combatTargetId = nearbyEnemy.id;
      stats.combatUntil = Math.max(stats.combatUntil ?? 0, now + 8_000);
      player.activity = {
        description: mode === 'approach'
          ? `${playerName(game, player)} 正在接敌 ${playerName(game, nearbyEnemy)}`
          : `${playerName(game, player)} 正在交火走位`,
        emoji: 'TARGET',
        until: now + 1200,
      };
      return true;
    }
  }
  stats.nextLocomotionAt = now + 900 + Math.floor(battleRandom(game) * 900);
  const areaId = stats.areaId ?? 'A01';
  const origin = { x: Math.floor(player.position.x), y: Math.floor(player.position.y) };
  const nearbyPoints = openTilesNear(game, player, origin, 6, now);
  const points = nearbyPoints.length >= 4
    ? nearbyPoints
    : battleAreaNavigationPoints(areaId, game.worldMap.width, game.worldMap.height);
  const start = Math.floor(battleRandom(game) * Math.max(1, points.length));
  for (let offset = 0; offset < points.length; offset += 1) {
    const destination = points[(start + offset) % points.length];
    const crowded = [...game.world.players.values()].some((other) => other.id !== player.id && !other.battle?.eliminated && distance(other.position, destination) < 2.5);
    if (distance(player.position, destination) < 2 || crowded || blocked(game, now, destination, player.id)) continue;
    movePlayer(game, now, player, destination);
    stats.locomotionX = player.position.x;
    stats.locomotionY = player.position.y;
    stats.locomotionProgressAt = now;
    if (!activeActivity || activeActivity.emoji === 'MOVE') {
      player.activity = { description: `${playerName(game, player)} 正在规划巡查路线`, emoji: 'ROUTE', until: now + 900 };
    }
    return true;
  }
  stats.nextLocomotionAt = now + 450;
  return false;
}

export function claimDecisionDriver(game: Game, now: number, driverId: string) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  if (driverId.length < 8 || driverId.length > 96) return { granted: false, status: '无效驾驶器标识' };
  const occupied = battle.decisionDriverId && battle.decisionDriverId !== driverId && (battle.decisionDriverUntil ?? 0) > now;
  if (occupied) return { granted: false, status: '已有观众正在驱动 AI' };
  battle.decisionDriverId = driverId;
  battle.decisionDriverUntil = now + BATTLE_CONFIG.match.decisionDriverLeaseMs;
  battle.decisionDriverStatus = battle.platform === 'BROWSER_LOCAL'
    ? 'DeepSeek 正常驾驶 · 本地对局隔离'
    : `云端 DeepSeek 驾驶中（剩余 ${(battle.decisionMax ?? 0) - (battle.decisionCount ?? 0)} 次）`;
  return { granted: true, expiresAt: battle.decisionDriverUntil, remaining: (battle.decisionMax ?? 0) - (battle.decisionCount ?? 0) };
}

export function heartbeatDecisionDriver(game: Game, now: number, driverId: string) {
  const battle = game.world.battle!;
  if (battle.decisionDriverId !== driverId || (battle.platform !== 'BROWSER_LOCAL' && (battle.decisionCount ?? 0) >= (battle.decisionMax ?? 0))) {
    return { active: false };
  }
  battle.decisionDriverUntil = now + BATTLE_CONFIG.match.decisionDriverLeaseMs;
  return { active: true, expiresAt: battle.decisionDriverUntil };
}

export function submitAIDecision(game: Game, now: number, args: {
  sessionId?: string; driverId: string; playerId: string; action: string; targetPlayerId?: string; targetAreaId?: string; storyEventId?: string; storyApproach?: string; reason?: string; speech?: string;
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
    recordReplayAction(game, now, player, args.action, 'model', false, reason, args.targetPlayerId, args.targetAreaId, undefined, args.storyApproach, args.storyEventId);
    return { accepted: false, reason };
  };
  if (args.sessionId && battle.sessionId !== args.sessionId) return fail('对局隔离校验失败');
  if (battle.decisionDriverId !== args.driverId || (battle.decisionDriverUntil ?? 0) <= now) return fail('驾驶权已失效');
  if (battle.platform !== 'BROWSER_LOCAL' && (battle.decisionCount ?? 0) >= (battle.decisionMax ?? 0)) return fail('本局模型决策额度已用尽');
  if (!player?.battle || player.battle.eliminated) return fail('角色已淘汰');
  if (!BATTLE_ACTIONS.includes(args.action as any)) return fail('动作不在允许列表');
  if (args.action === 'investigate' && !args.storyEventId) return fail('调查必须选择区域剧情');
  if ((player.battle.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) return fail('动作冷却中');
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  const safeReason = (args.reason ?? '').replace(/[\r\n]/g, ' ').slice(0, 140);
  const safeSpeech = sanitizeDialogue(args.speech);
  const replayBaseline = captureReplayPatchBaseline(game);
  const requestedWeapon = BATTLE_CONFIG.weapons[player.battle.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
  const action = args.action === 'move' && !args.targetAreaId && target?.battle &&
    target.battle.areaId === player.battle.areaId && distance(player.position, target.position) <= requestedWeapon.range
    ? 'attack'
    : args.action;
  const correctedMove = action === 'attack' && args.action === 'move';
  const result = executeBattleAction(game, now, player, action as any, target, args.targetAreaId, safeReason, safeSpeech, args.storyApproach, args.storyEventId);
  player.battle.lastDecisionAt = now;
  player.battle.lastDecisionAction = action;
  player.battle.lastDecisionReason = correctedMove
    ? `目标已在射程内，移动指令已修正为立即开火。${safeReason}`.slice(0, 140)
    : safeReason || '未提供理由';
  player.battle.lastDecisionStatus = result.accepted ? '已执行' : '已拒绝';
  player.battle.lastDecisionFallback = result.reason;
  player.battle.decisionDueAt = now + BATTLE_CONFIG.match.llmDecisionIntervalMs;
  if (result.accepted) {
    battle.decisionCount = (battle.decisionCount ?? 0) + 1;
    const approach = action === 'investigate' && args.storyEventId ? `（${storyOptionFor(args.storyEventId, args.storyApproach).label}）` : '';
    pushEvent(game, now, 'decision', `【决策】${playerName(game, player)} 选择${actionName(action)}${approach}：${correctedMove ? '目标已经在射程内，取消多余移动并立即开火' : safeReason || '基于当前局势'}。`, player, target);
  }
  recordReplayAction(game, now, player, action, 'model', result.accepted, result.reason, args.targetPlayerId, args.targetAreaId, replayBaseline, args.storyApproach, args.storyEventId);
  return result;
}

export function runCombatReflex(game: Game, now: number, player: Player) {
  const stats = player.battle;
  if (!stats || stats.eliminated || (stats.stunnedUntil ?? 0) > now || (stats.lastBattleAction ?? 0) + COMBAT_REFLEX_COOLDOWN_MS * (stats.weapon === '指虎' ? SUPPLEMENTAL_RULES.fastMeleeCooldownMultiplier : 1) > now) return false;
  const activeOrder = activeSupportOrderFor(game, player);
  const orderedTarget = activeOrder?.kind === 'hunt' && activeOrder.targetPlayerId
    ? game.world.players.get(activeOrder.targetPlayerId as any)
    : undefined;
  const orderedTargetBattle = orderedTarget?.battle;
  const target = orderedTarget && orderedTargetBattle && orderedTargetBattle.areaId === stats.areaId && !orderedTargetBattle.eliminated
    ? orderedTarget
    : nearestEnemy(game, player, now);
  if (!target?.battle || target.battle.eliminated) return false;
  if (activeOrder?.kind === 'ally' && activeOrder.targetPlayerId === target.id) return false;
  const relation = relationshipBetween(game, player, target);
  if ((relation?.strength ?? 0) >= 25 && relation?.type !== 'rival') return false;
  const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
  const replayBaseline = captureReplayPatchBaseline(game);
  const targetDistance = distance(player.position, target.position);
  const committedTarget = activeOrder?.kind === 'hunt' || stats.combatTargetId === target.id || bountyTargetFor(game, player)?.id === target.id;
  if (targetDistance > weapon.range) {
    if (!committedTarget || targetDistance > BATTLE_CONFIG.match.dangerRange * 1.5 || stats.hp / stats.maxHp < 0.28) return false;
    if (player.pathfinding) {
      delete player.pathfinding;
      player.speed = 0;
    }
    const result = executeBattleAction(game, now, player, 'move', target, undefined, '持续交战目标仍在视野内，逼近射击位置');
    if (!result.accepted) return false;
    stats.lastBattleAction = now;
    stats.combatTargetId = target.id;
    stats.combatUntil = now + 12_000;
    stats.lastDecisionAction = 'move';
    stats.lastDecisionReason = `持续追击${playerName(game, target)}，正在进入武器射程`;
    stats.lastDecisionStatus = '持续交战';
    player.activity = { description: `${playerName(game, player)} 正在追击 ${playerName(game, target)}`, emoji: 'TARGET', until: now + 2500 };
    recordReplayAction(game, now, player, 'move', 'rule', true, '持续交战：逼近射击位置', target.id, undefined, replayBaseline);
    return true;
  }
  const result = executeBattleAction(game, now, player, 'attack', target, undefined, '射程内敌对目标触发战斗反射');
  if (!result.accepted) return false;
  stats.lastBattleAction = now;
  stats.lastDecisionAction = 'attack';
  stats.lastDecisionReason = '敌对目标进入武器射程，立即开火';
  stats.lastDecisionStatus = '战斗反射';
  recordReplayAction(game, now, player, 'attack', 'rule', true, '射程内敌对目标触发战斗反射', target.id, undefined, replayBaseline);
  return true;
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
  battle.temporaryAlliances = (battle.temporaryAlliances ?? []).filter(alliance => {
    if (alliance.until > now) return true;
    for (const player of alivePlayers(game)) {
      if (player.id === alliance.first && player.battle?.alliance === alliance.second || player.id === alliance.second && player.battle?.alliance === alliance.first) player.battle!.alliance = undefined;
    }
    return false;
  });
  const replayBaseline = captureReplayPatchBaseline(game);
  applyBattleVitals(game, now);
  const elapsed = Math.max(0, now - battle.started);
  battle.elapsedSec = Math.floor(elapsed / 1000);
  battle.popularityRating = popularityRatingFor(battle.popularity ?? 0, battle.interventionSpentTotal ?? 0);
  const dayLength = BATTLE_CONFIG.match.dayMs + BATTLE_CONFIG.match.nightMs;
  const cycleMs = elapsed % dayLength;
  const timeOfDay = cycleMs < BATTLE_CONFIG.match.dayMs ? 'day' : 'night';
  const day = Math.floor(elapsed / dayLength) + 1;
  if (battle.timeOfDay !== timeOfDay || battle.day !== day) {
    battle.timeOfDay = timeOfDay;
    battle.day = day;
    pushEvent(game, now, 'system', `【时间】第 ${day} 天${timeOfDay === 'day' ? '白昼' : '夜幕'}降临战场。`, undefined, undefined, { eventType: 'day_night', vars: { '昼夜切换': `第${day}天${timeOfDay === 'day' ? '白昼' : '夜幕'}降临` } });
    spawnScheduledRareItems(game, now, day, timeOfDay);
  }

  const aliveCount = alivePlayers(game).length;
  const openNormalCount = (battle.openAreas ?? []).filter((areaId) => areaId !== 'S01').length;
  const phase = openNormalCount <= 3 ? 'finale' : aliveCount <= 6 ? 'intensify' : elapsed > 600000 ? 'develop' : 'opening';
  if (battle.phase !== phase) { battle.phase = phase; battle.phaseStartedAt = now; }
  battle.phaseElapsedSec = Math.floor((now - (battle.phaseStartedAt ?? battle.started)) / 1000);
  const interval = phase === 'finale' || phase === 'intensify'
    ? BATTLE_CONFIG.zone.lateIntervalMs
    : phase === 'develop'
      ? BATTLE_CONFIG.zone.midIntervalMs
      : BATTLE_CONFIG.zone.earlyIntervalMs;
  const zoneClosesAt = battle.zoneClosesAt ?? ((battle.lastZoneUpdate ?? now) + interval);
  battle.zoneClosesAt = zoneClosesAt;
  if (
    openNormalCount > 1
    && now >= zoneClosesAt - BATTLE_CONFIG.zone.warningMs
    && battle.lastZoneWarningAt !== zoneClosesAt
  ) {
    battle.lastZoneWarningAt = zoneClosesAt;
    const areaCounts = new Map<string, number>();
    for (const player of alivePlayers(game)) areaCounts.set(player.battle?.areaId ?? 'A01', (areaCounts.get(player.battle?.areaId ?? 'A01') ?? 0) + 1);
    const candidates = (battle.openAreas ?? []).filter((areaId) => areaId !== 'S01').sort((a, b) => (areaCounts.get(a) ?? 0) - (areaCounts.get(b) ?? 0));
    const plannedCount = Math.min(candidates.length - 1, phase === 'finale' ? candidates.length - 1 : phase === 'intensify' ? 2 + Math.floor(battleRandom(game) * 2) : phase === 'develop' ? 2 : 1 + Math.floor(battleRandom(game) * 2));
    battle.pendingClosingAreas = [...(battle.pendingClosingAreas ?? []).filter(id => candidates.includes(id)), ...candidates.filter(id => !battle.pendingClosingAreas?.includes(id))].slice(0, plannedCount);
    battle.yellowAreaIds = [...battle.pendingClosingAreas];
    battle.interventionEffect = { kind: 'zone-warning', until: zoneClosesAt };
    pushEvent(game, now, 'zone', `【禁区预警】${battle.yellowAreaIds.map(areaName).join('、')} 将在 ${Math.ceil((zoneClosesAt - now) / 1000)} 秒后关闭。`, undefined, undefined, { eventType: 'zone_warning', areaId: battle.yellowAreaIds[0], vars: { '区域': battle.yellowAreaIds.map(areaName).join('、') } });
  }
  if (
    battle.openAreas &&
    openNormalCount > 1 &&
    now >= zoneClosesAt
  ) {
    const openNormalAreas = battle.openAreas.filter((areaId) => areaId !== 'S01');
    const areaCounts = new Map<string, number>();
    for (const player of alivePlayers(game)) {
      const areaId = player.battle?.areaId ?? 'A01';
      areaCounts.set(areaId, (areaCounts.get(areaId) ?? 0) + 1);
    }
    const closeCount = Math.min(openNormalAreas.length - 1, phase === 'finale' ? openNormalAreas.length - 1 : phase === 'intensify' ? 2 + Math.floor(battleRandom(game) * 2) : phase === 'develop' ? 2 : 1 + Math.floor(battleRandom(game) * 2));
    const closingAreas = (battle.pendingClosingAreas?.length ? battle.pendingClosingAreas.filter((areaId) => openNormalAreas.includes(areaId)) : openNormalAreas.sort(
      (a, b) => (areaCounts.get(a) ?? 0) - (areaCounts.get(b) ?? 0),
    ).slice(0, closeCount));
    if (closingAreas.length) {
      battle.openAreas = battle.openAreas.filter((areaId) => !closingAreas.includes(areaId));
      battle.lastZoneUpdate = now;
      battle.zoneClosesAt = now + interval;
      battle.yellowAreaIds = []; battle.redAreaIds = [...new Set([...(battle.redAreaIds ?? []), ...closingAreas])]; battle.pendingClosingAreas = [];
      for (const player of alivePlayers(game)) if (closingAreas.includes(player.battle!.areaId ?? '')) player.battle!.lastZoneDamageAt = now;
      pushEvent(game, now, 'zone', `【禁区关闭】${closingAreas.map(areaName).join('、')} 已永久关闭，AI 必须转移。`, undefined, undefined, { eventType: 'zone_closed', areaId: closingAreas[0], vars: { '区域': closingAreas.map(areaName).join('、') } });
      if (phase === 'finale' && !(battle.storyTriggers ?? []).includes('zone:finale')) {
        battle.storyTriggers!.push('zone:finale');
        for (const player of alivePlayers(game)) player.battle!.zoneTime = Math.min(player.battle!.maxZoneTime ?? BATTLE_CONFIG.runtime.zoneTimeMax, (player.battle!.zoneTime ?? 0) + BATTLE_CONFIG.zone.finaleBufferSeconds);
        pushEvent(game, now, 'zone', `【终局】仅剩最后区域，所有存活者获得 ${BATTLE_CONFIG.zone.finaleBufferSeconds} 秒撤离缓冲。`);
      }
    }
  }

  for (const player of alivePlayers(game).filter((candidate) => !battle.openAreas?.includes(candidate.battle?.areaId ?? 'A01'))) {
    const stats = player.battle!;
    const last = stats.lastZoneDamageAt ?? now;
    const elapsedSeconds = Math.floor((now - last) / 1000);
    if (elapsedSeconds < 1) continue;
    const drainMultiplier = itemModifier(stats, 'zone_drain_mult', now) || 1;
    const cost = elapsedSeconds * BATTLE_CONFIG.zone.zoneTimeCostPerSecond * drainMultiplier;
    stats.zoneTime = Math.max(0, (stats.zoneTime ?? 0) - cost);
    stats.lastZoneDamageAt = now;
    stats.stress = (stats.stress ?? 0) + elapsedSeconds;
    pushEvent(game, now, 'zone', `【禁区时间】${playerName(game, player)}消耗 ${cost} 秒，剩余 ${Math.ceil(stats.zoneTime)} 秒。`, player);
    if (stats.zoneTime === 0) {
      stats.eliminated = true;
      freezeEliminatedRelationships(game, stats.characterId);
      pushEvent(game, now, 'eliminate', `【淘汰】${playerName(game, player)}禁区时间耗尽。`, player);
    }
  }
  battle.restoredAreas = (battle.restoredAreas ?? []).filter((entry) => { if (entry.until > now) return true; battle.openAreas = battle.openAreas?.filter((id) => id !== entry.areaId); pushEvent(game, now, 'zone', `【区域关闭】临时修复的${areaName(entry.areaId)}再次关闭。`); return false; });
  for (const weather of battle.weatherAreas ?? []) { if (weather.until <= now || weather.lastDamageAt + 5000 > now) continue; weather.lastDamageAt = now; for (const player of alivePlayers(game).filter((candidate) => candidate.battle?.areaId === weather.areaId)) { player.battle!.hp = Math.max(1, player.battle!.hp - 5); player.battle!.stress = (player.battle!.stress ?? 0) + 3; } }
  battle.weatherAreas = (battle.weatherAreas ?? []).filter((entry) => entry.until > now);

  if (now - (battle.lastScoreEvent ?? now) > 120000 && now - (battle.lastIdlePenalty ?? 0) >= 60000) {
    awardReferenceScore(game, now, 'SCR_M01', []);
    battle.lastIdlePenalty = now;
    pushEvent(game, now, 'heat', '【热度】战场沉寂过久，直播热度下降 5 点。');
  }
  triggerAreaSpecialEvent(game, now);
  triggerGlobalSpecialEvent(game, now);
  triggerRelationshipDrama(game, now);
  refreshAreaResources(game, now);
  updateMissionProgress(game, now);
  recordReplayAction(game, now, undefined, 'worldTick', 'rule', true, '周期状态更新', undefined, undefined, replayBaseline);
}

export function applyBattleVitals(game: Game, now: number) {
  const battle = game.world.battle!;
  const last = battle.lastVitalsUpdate ?? now;
  const elapsedSeconds = Math.floor((now - last) / 1000);
  if (elapsedSeconds < 10) return;
  battle.lastVitalsUpdate = now;
  for (const player of alivePlayers(game)) {
    const stats = player.battle!;
    itemModifier(stats, '', now);
    refreshItemIntel(game, now, player);
    const hiding = !player.pathfinding && !stats.combatTargetId && (stats.lastDecisionAction === 'observe' || stats.lastDecisionAction === 'investigate');
    stats.hidingSince = hiding ? stats.hidingSince ?? now : undefined;
    if (stats.hidingSince !== undefined && now - stats.hidingSince > 180000 && now - (stats.lastHidingPenalty ?? 0) >= 60000) { awardReferenceScore(game, now, 'SCR_M02', []); stats.lastHidingPenalty = now; }
    const seesOther = alivePlayers(game).some(other => other.id !== player.id && other.battle?.areaId === stats.areaId);
    const interacted = (game.world.battle?.feed ?? []).some(event => event.ts > (stats.stalemateSince ?? now) && (event.actor === player.id || event.target === player.id) && ['attack', 'dialogue', 'trade', 'alliance'].includes(event.kind));
    stats.stalemateSince = seesOther && !interacted ? stats.stalemateSince ?? now : undefined;
    if (stats.stalemateSince !== undefined && now - stats.stalemateSince > 90000 && now - (stats.lastStalematePenalty ?? 0) >= 90000) { awardReferenceScore(game, now, 'SCR_M03', []); stats.lastStalematePenalty = now; }
    const satietyRate = battle.timeOfDay === 'night' ? BATTLE_CONFIG.runtime.nightSatietyPerMinute : BATTLE_CONFIG.runtime.daySatietyPerMinute;
    stats.satiety = Math.max(0, (stats.satiety ?? BATTLE_CONFIG.runtime.satietyStart) - elapsedSeconds * satietyRate / 60);
    if (stats.areaId === 'A06') {
      stats.stress = Math.max(0, (stats.stress ?? 0) - elapsedSeconds / 18);
    }
    if ((stats.satiety ?? 0) <= 20) {
      stats.stamina = Math.max(0, (stats.stamina ?? 0) - Math.ceil(elapsedSeconds / 20));
      stats.stress = (stats.stress ?? 0) + Math.ceil(elapsedSeconds / 30);
    }
    if ((stats.satiety ?? 0) <= 0) stats.hp = Math.max(1, stats.hp - Math.ceil(elapsedSeconds / 10));
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
        awardReferenceScore(game, now, 'SCR_P06', [first, second]);
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
      // Giving a medkit is support, not taking injury to protect someone.
    }
    const reversalId = `关系:逆转:${edge.id}`;
    if (!battle.storyTriggers?.includes(reversalId) && edge.type === 'rival' && edge.strength <= -30 && first.battle!.hp < first.battle!.maxHp * 0.5 && second.battle!.hp < second.battle!.maxHp * 0.5) {
      first.battle!.alliance = second.id;
      second.battle!.alliance = first.id;
      updateRelationship(game, first, second, 24, '绝境逆转');
      battle.storyTriggers!.push(reversalId);
      pushEvent(game, now, 'story', `【关系剧情】${playerName(game, first)}与宿敌${playerName(game, second)}在绝境中暂时联手。`, first, second);
      awardReferenceScore(game, now, 'SCR_P08', [first, second]);
    }
  }
}

function refreshAreaResources(game: Game, now: number) {
  const battle = game.world.battle!;
  if (now < (battle.lastResourceRefresh ?? now) + BATTLE_CONFIG.match.searchCooldownMs) return;
  for (const resource of battle.areaResources ?? []) {
    resource.remaining = Math.min(resource.max, resource.remaining + 1);
  }
  battle.lastResourceRefresh = now;
  pushEvent(game, now, 'resource', '【资源】部分区域资源已刷新。');
}

export function spawnScheduledRareItems(game: Game, now: number, day: number, timeOfDay: 'day' | 'night') {
  const battle = game.world.battle!; const drops = battle.rareDrops ??= [];
  const add = (name: string, areaId: string, quantity = 1) => { if (!GLOBAL_RARE_ITEMS.some((item) => item.name === name) || drops.some((drop) => drop.name === name && drop.areaId === areaId)) return; drops.push({ name, areaId, remaining: quantity }); pushEvent(game, now, 'resource', `【稀有物资】${name}已出现在${areaName(areaId)}。`); };
  if (day === 1 && timeOfDay === 'night') { add('生命树枝', 'A08'); add('生命树枝', 'A11'); }
  if (day === 2 && timeOfDay === 'night') { add('生命树枝', 'A10'); add('生命树枝', 'A06'); }
  if ((day === 2 || day === 3) && timeOfDay === 'day') {
    battle.monsters ??= [];
    const name = day === 2 ? '阿尔法' : '奥米加';
    if (!battle.monsters.some(monster => monster.id === name)) {
      battle.monsters.push({ id: name, name, areaId: 'A07', hp: SUPPLEMENTAL_RULES.eliteMonster.hp, drop: day === 2 ? '秘银盾' : '能源核心' });
      pushEvent(game, now, 'monster', `${name}出现在训练场。`, undefined, undefined, { eventType: 'monster_spawn', areaId: 'A07', vars: { '野怪名': name } });
    }
  }
  if (day === 3 && timeOfDay === 'night') add('VF原液', 'A06');
  const meteorCount = drops.filter((drop) => drop.name === '陨石碎片').reduce((sum, drop) => sum + drop.remaining, 0);
  if ((day > 1 || timeOfDay === 'night') && meteorCount < 4) {
    const occupied = new Set(drops.filter((drop) => drop.name === '陨石碎片').map((drop) => drop.areaId));
    const open = (battle.openAreas ?? []).filter((areaId) => areaId !== 'S01' && !occupied.has(areaId));
    if (open.length) add('陨石碎片', open[Math.floor(battleRandom(game) * open.length)]);
  }
}

export function triggerAreaSpecialEvent(game: Game, now: number) {
  const battle = game.world.battle!;
  battle.areaLocks = (battle.areaLocks ?? []).filter((lock) => lock.until > now);
  if (now < (battle.lastAreaEventCheck ?? 0) + 5000) return;
  battle.lastAreaEventCheck = now;
  const candidates = AREA_SPECIAL_EVENTS.filter((event) => {
    const count = battle.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0;
    if (count >= event.maxTriggers) return false;
    const cooldown = battle.areaEventCooldowns?.find((entry) => entry.id === event.id);
    return (!cooldown || cooldown.until <= now) && areaEventEligible(game, now, event);
  });
  const pendingPlayer = alivePlayers(game).find((player) => candidates.some((event) => (
    event.id === player.battle?.pendingStoryEventId && event.areaId === player.battle?.areaId
  )));
  const event = pendingPlayer
    ? candidates.find((candidate) => candidate.id === pendingPlayer.battle?.pendingStoryEventId)
    : candidates[Math.floor(battleRandom(game) * candidates.length)];
  if (!event) return;
  const affected = alivePlayers(game).filter((player) => player.battle?.areaId === event.areaId);
  if (affected.length === 0) return;
  const randomPlayer = pendingPlayer ?? affected[Math.floor(battleRandom(game) * affected.length)];
  const requiredItem = 'requiredItem' in event ? event.requiredItem : undefined;
  const itemOwner = requiredItem
    ? affected.find((player) => player.battle?.inventory?.includes(requiredItem))
    : undefined;
  if (requiredItem && !itemOwner) return;
  if (requiredItem && itemOwner && 'consumeItem' in event && event.consumeItem) {
    const inventory = itemOwner.battle!.inventory ?? [];
    itemOwner.battle!.inventory = inventory.filter((item, index) => item !== requiredItem || index !== inventory.indexOf(requiredItem));
    pushEvent(game, now, 'story', `【剧情道具】${playerName(game, itemOwner)} 消耗${requiredItem}，开启「${event.title}」。`, itemOwner);
  }
  const storyCheck = resolveAreaStoryCheck(game, now, randomPlayer, event.id, event.areaId);
  if (storyCheck.approach === 'bold') {
    if (storyCheck.success) awardPopularity(game, now, 10, [randomPlayer]);
    else randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + 6;
  }
  if (storyCheck.approach === 'social' && storyCheck.success) {
    const partner = affected.find((player) => player.id !== randomPlayer.id);
    if (partner) updateRelationship(game, randomPlayer, partner, 6, '剧情协作');
  }
  if (['turret', 'collapse', 'explosion', 'beast'].includes(event.effect)) {
    const baseDamage = event.effect === 'turret' ? 25 : event.effect === 'beast' ? 24 : 15;
    randomPlayer.battle!.hp = Math.max(1, randomPlayer.battle!.hp - (storyCheck.success ? Math.ceil(baseDamage * 0.35) : baseDamage));
  }
  if (event.effect === 'stress' || event.effect === 'blackout') affected.forEach((player) => { player.battle!.stress = (player.battle!.stress ?? 0) + (storyCheck.success ? 5 : 15); });
  if (event.effect === 'blizzard') affected.forEach((player) => {
    if (itemModifier(player.battle!, 'cold_resist', now) > 0) return;
    player.battle!.stamina = Math.max(0, (player.battle!.stamina ?? 0) - (storyCheck.success ? 5 : 12));
    player.battle!.stress = (player.battle!.stress ?? 0) + (storyCheck.success ? 3 : 8);
  });
  if (event.effect === 'broadcast') awardPopularity(game, now, storyCheck.success ? 15 : 5, affected);
  if (event.effect === 'surgery') randomPlayer.battle!.hp = Math.max(randomPlayer.battle!.hp, Math.floor(randomPlayer.battle!.maxHp * (storyCheck.success ? 0.8 : 0.55)));
  if (event.effect === 'expiredMedicine') {
    if (!storyCheck.success) randomPlayer.battle!.medkits = Math.max(0, randomPlayer.battle!.medkits - 1);
    randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + (storyCheck.success ? 2 : 10);
  }
  if (event.effect === 'lockdown') {
    setAreaLock(battle, event.areaId, now + (storyCheck.success ? 20000 : 45000));
    affected.forEach((player) => { player.battle!.stress = (player.battle!.stress ?? 0) + 8; });
  }
  if (event.effect === 'autoTrade' && affected.length >= 2 && storyCheck.success) {
    const [first, second] = affected;
    const firstItem = first.battle!.inventory?.shift();
    const secondItem = second.battle!.inventory?.shift();
    if (firstItem) { second.battle!.inventory!.push(firstItem); transferItemEffects(game, now, first, second, firstItem); }
    if (secondItem) { first.battle!.inventory!.push(secondItem); transferItemEffects(game, now, second, first, secondItem); }
    allyPlayers(game, now, first, second);
  }
  if (event.effect === 'trial' && affected.length >= 2 && storyCheck.success) allyPlayers(game, now, affected[0], affected[1]);
  if ((event.effect === 'falseGunshot' || event.effect === 'lost') && !storyCheck.success) {
    const destinations = adjacentAreaIds(event.areaId).filter((areaId) => battle.openAreas?.includes(areaId));
    const destination = destinations[Math.floor(battleRandom(game) * destinations.length)];
    if (destination && moveToBattleArea(game, now, randomPlayer, destination)) {
      pushEvent(game, now, 'move', `【剧情转移】${playerName(game, randomPlayer)} 被${event.effect === 'lost' ? '密林迷雾' : '假枪声'}引向${areaName(destination)}。`, randomPlayer);
    }
  }
  if (event.effect === 'revealRelation') {
    const hidden = battle.relationshipEdges?.find((edge) => edge.hidden);
    if (hidden && storyCheck.success) hidden.hidden = false;
  }
  if (event.effect === 'broker') {
    if (randomPlayer.battle!.coins >= 12) {
      randomPlayer.battle!.coins -= storyCheck.success ? 8 : 12;
      if (storyCheck.success) collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
    } else {
      randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + 8;
    }
  }
  if (['c12Anomaly', 'replay'].includes(event.effect)) {
    if (storyCheck.success) collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
    else randomPlayer.battle!.stress = (randomPlayer.battle!.stress ?? 0) + 8;
  }
  if (event.effect === 'zoneWarning') {
    randomPlayer.battle!.zoneTime = Math.min(randomPlayer.battle!.maxZoneTime ?? 40, (randomPlayer.battle!.zoneTime ?? 0) + 8);
    if (storyCheck.success) collectTruthClue(game, now, `区域-${event.id}`, randomPlayer);
  }
  if (event.effect === 'truth' && randomPlayer.battle?.characterId === 'C12' && storyCheck.success) unlockTruth(game, now, randomPlayer);
  battle.areaEventCooldowns = (battle.areaEventCooldowns ?? []).filter((entry) => entry.id !== event.id);
  battle.areaEventCooldowns.push({ id: event.id, until: now + 90000 });
  const count = battle.areaEventCounts!.find((entry) => entry.id === event.id);
  if (count) count.count += 1; else battle.areaEventCounts!.push({ id: event.id, count: 1 });
  if ((battle.areaEventCounts!.find((entry) => entry.id === event.id)?.count ?? 0) >= event.maxTriggers) battle.consumedAreaStories!.push(event.id);
  battle.interventionEffect = { kind: `story:${event.effect}`, areaId: event.areaId, until: now + 6500 };
  pushEvent(game, now, 'areaStory', `【区域剧情】${playerName(game, randomPlayer)}在${areaName(event.areaId)}进行${storyCheck.check}检定：${storyCheck.roll + storyCheck.bonus}/${storyCheck.difficulty}，${storyCheck.success ? '成功' : '失败'}。`, randomPlayer);
}

export function resolveAreaStoryCheck(game: Game, now: number, player: Player, eventId: string, areaId: string) {
  const battle = game.world.battle!;
  const narrative = AREA_STORY_NARRATIVES[eventId];
  const profile = profileForCharacterId(player.battle?.characterId ?? 'C01');
  const homeArea = BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.owner === profile.id;
  const pendingApproach = player.battle?.pendingStoryApproach;
  const pendingEventId = player.battle?.pendingStoryEventId;
  const approach = pendingApproach ? storyApproachFor(pendingApproach) : undefined;
  const option = pendingApproach && pendingEventId === eventId ? storyOptionFor(eventId, pendingApproach) : undefined;
  player.battle!.pendingStoryApproach = undefined;
  player.battle!.pendingStoryEventId = undefined;
  const ability = option?.ability ?? (!approach || approach.ability === 'event' ? narrative?.ability ?? 'mind' : approach.ability);
  const bonus = Math.max(0, profile[ability] + (player.battle?.attributeBonus ?? 0) - 2) + (homeArea ? 1 : 0);
  const roll = 1 + Math.floor(battleRandom(game) * 20);
  const danger = BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.danger ?? 2;
  const difficulty = Math.max(7, 9 + danger + (option?.difficultyModifier ?? approach?.difficultyModifier ?? 0));
  const success = roll + bonus >= difficulty;
  const beat: BattleStoryBeat = {
    id: battle.nextStoryBeatId ?? 1, eventId, ts: now, areaId,
    title: AREA_SPECIAL_EVENTS.find((event) => event.id === eventId)?.title ?? '区域事件', actorId: player.id,
    scene: narrative?.scene ?? '区域中的异常装置突然启动。',
    choice: `${homeArea ? '熟悉地形：' : ''}${option ? `${option.label}：${option.description}` : approach ? `${approach.label}：${narrative?.choice ?? '观察环境并选择应对方式。'}` : narrative?.choice ?? '观察环境并选择应对方式。'}`,
    ...(approach ? { approach: approach.id } : {}),
    check: `${narrative?.check ?? '临场判断'}${option ? ` · ${option.label}` : approach ? ` · ${approach.label}` : ''}`, roll, bonus, difficulty, success,
    outcome: success ? narrative?.success ?? '角色控制住了局面。' : narrative?.failure ?? '局面朝不利方向发展。',
  };
  battle.nextStoryBeatId = beat.id + 1;
  battle.storyLog = [beat, ...(battle.storyLog ?? [])].slice(0, 24);
  return beat;
}

function setAreaLock(battle: BattleState, areaId: string, until: number) {
  const locks = (battle.areaLocks ?? []).filter((lock) => lock.areaId !== areaId && lock.until > until - 60000);
  locks.push({ areaId, until });
  battle.areaLocks = locks;
}

function isAreaLocked(battle: BattleState | undefined, now: number, areaId: string) {
  return (battle?.areaLocks ?? []).some((lock) => lock.areaId === areaId && lock.until > now);
}

export function areaEventEligible(game: Game, now: number, event: (typeof AREA_SPECIAL_EVENTS)[number]) {
  const battle = game.world.battle!;
  const { id: eventId, areaId } = event;
  const occupants = alivePlayers(game).filter((player) => player.battle?.areaId === areaId);
  if (occupants.length === 0) return false;
  if (event.effect === 'truth') {
    return !battle.truthRevealed &&
      !!battle.truthPathKnown &&
      (battle.truthClues?.length ?? 0) >= 3 &&
      occupants.some((player) => player.battle?.characterId === 'C12');
  }
  if ('requiredItem' in event && event.requiredItem && !occupants.some((player) => player.battle?.inventory?.includes(event.requiredItem))) return false;
  const stayedTwoMinutes = occupants.some((player) => now - (player.battle?.areaEnteredAt ?? now) >= 120000);
  const stayedOneMinuteTogether = occupants.filter((player) => now - (player.battle?.areaEnteredAt ?? now) >= 60000).length >= 2;
  const searchedOnce = occupants.some((player) => (player.battle?.areaSearches ?? 0) >= 1);
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
    case 'A05_01': return occupants.some((player) => player.battle?.inventory?.includes('校园广播磁带'));
    case 'A05_02': return searchedOnce;
    case 'A06_01': return occupants.some((player) => player.battle!.hp / player.battle!.maxHp < 0.3);
    case 'A06_02': return searchedOnce && battleRandom(game) < 0.3;
    case 'A07_01': return occupants.some((player) => (player.battle?.areaSearches ?? 0) >= 1);
    case 'A08_01': return stayedOneMinuteTogether;
    case 'A08_02': return battleRandom(game) < 0.25;
    case 'A09_01': return battleRounds >= 1 && occupants.some((player) => player.battle?.weapon !== 'Fists');
    case 'A10_02': return occupants.some((player) => player.battle?.characterId !== 'C10');
    case 'A10_03': return battle.timeOfDay === 'night' && alivePlayers(game).some((player) => player.battle?.characterId === 'C10');
    case 'A11_01': return occupants.length >= 3;
    case 'A11_02': return searchedOnce;
    case 'A12_01': return !occupants.some((player) => player.battle?.characterId === 'C12') && searchedOnce;
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
  const replayBaseline = captureReplayPatchBaseline(game);
  const points = Math.max(1, Math.min(8, Math.floor(score / 25)));
  const before = battle.interventionPoints ?? 0;
  battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, before + points);
  battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + (battle.interventionPoints - before);
  pushEvent(game, now, 'audience', `【观众】扫雷挑战结算，主办方获得 ${battle.interventionPoints - before} 点干预点。`);
  recordReplayAction(game, now, undefined, 'audience', 'rule', true, `扫雷得分 ${score}`, undefined, undefined, replayBaseline);
  return { points: battle.interventionPoints - before, total: battle.interventionPoints };
}

const SUPPORT_ORDER_KINDS = ['hunt', 'scavenge', 'ally'] as const;
const SUPPORT_DOCTRINES = ['hunter', 'logistics', 'intel'] as const;

export function submitSupportOrder(
  game: Game,
  now: number,
  args: { playerId: string; kind: string; doctrine: string; stake: number; targetPlayerId?: string },
) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  if (!SUPPORT_ORDER_KINDS.includes(args.kind as any)) throw new Error('未知应援任务。');
  if (!SUPPORT_DOCTRINES.includes(args.doctrine as any)) throw new Error('未知阵营路线。');
  const player = game.world.players.get(args.playerId as any);
  if (!player?.battle || player.battle.eliminated) throw new Error('应援角色已经离场。');
  const active = (battle.supportOrders ?? []).find((order) => order.playerId === player.id && ['active', 'countered'].includes(order.status));
  if (active) throw new Error('角色正在执行其他阵营任务。');
  const recent = (battle.supportOrders ?? []).find((order) => order.playerId === player.id && now < order.createdAt + SUPPORT_ORDER_COOLDOWN_MS);
  if (recent) throw new Error(`应援指令冷却中，还需 ${Math.ceil((recent.createdAt + SUPPORT_ORDER_COOLDOWN_MS - now) / 1000)} 秒。`);
  const stake = Math.max(1, Math.min(5, Math.floor(args.stake)));
  if ((battle.interventionPoints ?? 0) < stake) throw new Error('干预点不足。');
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  if ((args.kind === 'hunt' || args.kind === 'ally') && (!target?.battle || target.battle.eliminated || target.id === player.id)) {
    throw new Error('请选择另一名存活角色作为任务目标。');
  }

  const persona = personaForCharacter(player.battle.characterId);
  const acceptChance = supportOrderAcceptChance(args.kind, args.doctrine, stake, persona, player.battle.hp / player.battle.maxHp);
  const roll = battleRandom(game);
  const status = roll < acceptChance ? 'active' : roll < Math.min(0.98, acceptChance + 0.18) ? 'countered' : 'rejected';
  const response = supportOrderResponse(game, player, target, args.kind, status, stake);
  const order = {
    id: battle.nextSupportOrderId ?? 1,
    playerId: player.id,
    kind: args.kind,
    doctrine: args.doctrine,
    stake,
    status,
    createdAt: now,
    expiresAt: now + (status === 'countered' ? 15_000 : SUPPORT_ORDER_DURATION_MS),
    ...(target ? { targetPlayerId: target.id } : {}),
    response,
    baselineKills: player.battle.kills,
    baselineCoins: player.battle.coins,
    baselineInventory: player.battle.inventory?.length ?? 0,
    baselineSearches: player.battle.areaSearches ?? 0,
    ...(status === 'rejected' ? { result: `角色拒绝任务，${stake} 点干预点已退回。` } : {}),
  };
  battle.nextSupportOrderId = order.id + 1;
  battle.supportOrders = [order, ...(battle.supportOrders ?? [])].slice(0, 24);
  if (status !== 'rejected') {
    battle.interventionPoints = (battle.interventionPoints ?? 0) - stake;
    battle.interventionSpentTotal = (battle.interventionSpentTotal ?? 0) + stake;
  }
  recordBattleDialogue(game, now, player, undefined, 'support', response);
  const statusText = status === 'active' ? '接受' : status === 'countered' ? '提出加码' : '拒绝';
  pushEvent(
    game,
    now,
    'supportOrder',
    `【应援任务】${playerName(game, player)}${statusText}了阵营的${supportOrderName(args.kind)}${status === 'rejected' ? `，${stake} 点已退回。` : '。'}`,
    player,
    target,
  );
  if (status === 'active') {
    player.battle.decisionDueAt = order.expiresAt;
    markInterventionReaction(game, now, player, 'FAN_ORDER');
  }
  return { id: order.id, status, response, expiresAt: order.expiresAt, remainingPoints: battle.interventionPoints };
}

export function acceptSupportCounter(game: Game, now: number, args: { orderId: number }) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  const order = battle.supportOrders?.find((candidate) => candidate.id === args.orderId);
  if (!order || order.status !== 'countered' || order.expiresAt <= now) throw new Error('这次还价已经失效。');
  if ((battle.interventionPoints ?? 0) < 1) throw new Error('接受还价还需要 1 点干预点。');
  const player = game.world.players.get(order.playerId as any);
  if (!player?.battle || player.battle.eliminated) throw new Error('应援角色已经离场。');
  battle.interventionPoints = (battle.interventionPoints ?? 0) - 1;
  battle.interventionSpentTotal = (battle.interventionSpentTotal ?? 0) + 1;
  order.stake += 1;
  order.status = 'active';
  order.expiresAt = now + SUPPORT_ORDER_DURATION_MS;
  player.battle.decisionDueAt = order.expiresAt;
  order.response = supportOrderResponse(game, player, order.targetPlayerId ? game.world.players.get(order.targetPlayerId as any) : undefined, order.kind, 'active', order.stake);
  recordBattleDialogue(game, now, player, undefined, 'support', order.response);
  pushEvent(game, now, 'supportOrder', `【应援任务】阵营接受加码，${playerName(game, player)}开始执行${supportOrderName(order.kind)}。`, player);
  return { status: order.status, response: order.response, expiresAt: order.expiresAt, remainingPoints: battle.interventionPoints };
}

function supportOrderResponse(game: Game, player: Player, target: Player | undefined, kind: string, status: string, stake: number) {
  const persona = personaForCharacter(player.battle?.characterId);
  const targetName = target ? playerName(game, target) : '';
  if (status === 'rejected') return kind === 'hunt' ? `不。现在追杀${targetName}只会白白送命。` : '这个指令不符合我的判断，我不会执行。';
  if (status === 'countered') return `条件不够。再加 1 点，我就执行${supportOrderName(kind)}。`;
  if (kind === 'hunt') return `${persona.attackLines[0]} 目标锁定：${targetName}。投入 ${stake} 点，任务开始。`;
  if (kind === 'ally') return `${persona.allianceLine} 我会去找${targetName}谈条件。`;
  return `${persona.tradeLine} 我会在一分钟内找到有价值的物资。`;
}

function supportOrderName(kind: string) {
  return kind === 'hunt' ? '悬赏追猎' : kind === 'ally' ? '接触谈判' : '物资搜集';
}

function activeSupportOrderFor(game: Game, player: Player) {
  return game.world.battle?.supportOrders?.find((order) => order.playerId === player.id && order.status === 'active');
}

export function runSupportOrderAction(game: Game, now: number, player: Player) {
  const order = activeSupportOrderFor(game, player);
  if (!order || !player.battle || player.battle.eliminated) return false;
  const stats = player.battle;
  const target = order.targetPlayerId ? game.world.players.get(order.targetPlayerId as any) : undefined;
  const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
  const huntTargetInRange = order.kind === 'hunt' && target?.battle && !target.battle.eliminated &&
    target.battle.areaId === stats.areaId && distance(player.position, target.position) <= weapon.range;
  if (player.pathfinding && huntTargetInRange) {
    delete player.pathfinding;
    player.speed = 0;
  } else if (player.pathfinding) {
    if (player.activity?.emoji === 'TARGET') return true;
    delete player.pathfinding;
    player.speed = 0;
  }
  if ((stats.lastBattleAction ?? 0) + ACTION_COOLDOWN_MS > now) return true;
  const execute = (action: string, actionTarget?: Player, targetAreaId?: string) => {
    const baseline = captureReplayPatchBaseline(game);
    const result = executeBattleAction(game, now, player, action, actionTarget, targetAreaId, '执行已接受的观众阵营任务');
    if (!result.accepted) return false;
    stats.lastBattleAction = now;
    stats.lastDecisionStatus = '阵营任务执行中';
    stats.lastDecisionAction = action;
    stats.lastDecisionReason = `${supportOrderName(order.kind)}优先执行`;
    stats.lastDecisionFallback = undefined;
    recordReplayAction(game, now, player, action, 'rule', true, `应援任务 #${order.id}`, actionTarget?.id, targetAreaId, baseline);
    return true;
  };

  if (order.kind === 'hunt' && target?.battle && !target.battle.eliminated) {
    if (target.battle.areaId !== stats.areaId) {
      const destination = nextOpenAreaToward(game, stats.areaId ?? 'A01', target.battle.areaId ?? 'A01');
      if (destination && execute('move', undefined, destination)) {
        player.activity = { description: `${playerName(game, player)} 正在追踪 ${playerName(game, target)}`, emoji: 'TARGET', until: now + ACTION_COOLDOWN_MS };
        pushEvent(game, now, 'supportOrder', `【任务追踪】${playerName(game, player)} 正沿区域路线逼近 ${playerName(game, target)}。`, player, target);
      }
      return true;
    }
    if (distance(player.position, target.position) <= weapon.range) {
      execute('attack', target);
      return true;
    }
    if (execute('move', target)) {
      player.activity = { description: `${playerName(game, player)} 正在进入对 ${playerName(game, target)} 的射击位置`, emoji: 'TARGET', until: now + ACTION_COOLDOWN_MS };
    }
    return true;
  }

  if (order.kind === 'ally' && target?.battle && !target.battle.eliminated) {
    if (target.battle.areaId !== stats.areaId) {
      const destination = nextOpenAreaToward(game, stats.areaId ?? 'A01', target.battle.areaId ?? 'A01');
      if (destination && execute('move', undefined, destination)) player.activity = { description: `${playerName(game, player)} 正在接近谈判目标`, emoji: 'TARGET', until: now + ACTION_COOLDOWN_MS };
      return true;
    }
    if (distance(player.position, target.position) > BATTLE_CONFIG.match.dangerRange) {
      if (execute('move', target)) player.activity = { description: `${playerName(game, player)} 正在接近谈判目标`, emoji: 'TARGET', until: now + ACTION_COOLDOWN_MS };
      return true;
    }
    execute('ally', target);
    return true;
  }

  if (order.kind === 'scavenge') {
    const resource = game.world.battle?.areaResources?.find((entry) => entry.areaId === stats.areaId);
    if ((resource?.remaining ?? 0) > 0) {
      execute('search');
      return true;
    }
    const destination = adjacentAreaIds(stats.areaId ?? 'A01')
      .filter((areaId) => game.world.battle?.openAreas?.includes(areaId))
      .sort((a, b) => (game.world.battle?.areaResources?.find((entry) => entry.areaId === b)?.remaining ?? 0) - (game.world.battle?.areaResources?.find((entry) => entry.areaId === a)?.remaining ?? 0))[0];
    if (destination && execute('move', undefined, destination)) player.activity = { description: `${playerName(game, player)} 正在前往高资源区域`, emoji: 'TARGET', until: now + ACTION_COOLDOWN_MS };
    return true;
  }
  return true;
}

export function updateSupportOrders(game: Game, now: number) {
  const battle = game.world.battle;
  if (!battle?.supportOrders) return;
  for (const order of battle.supportOrders) {
    if (order.status === 'countered' && order.expiresAt <= now) {
      order.status = 'failed';
      order.result = '阵营没有接受加码，谈判超时。';
      pushEvent(game, now, 'supportOrder', `【应援失败】${playerNameById(game, order.playerId)}的任务谈判超时。`);
      continue;
    }
    if (order.status !== 'active') continue;
    const player = game.world.players.get(order.playerId as any);
    const target = order.targetPlayerId ? game.world.players.get(order.targetPlayerId as any) : undefined;
    let success = false;
    let failure: string | undefined;
    if (!player?.battle || player.battle.eliminated) failure = '应援角色被淘汰。';
    if (!failure && order.kind === 'hunt') {
      success = Boolean(battle.feed.some((event) => event.kind === 'eliminate' && event.actor === order.playerId && event.target === order.targetPlayerId && event.ts >= order.createdAt));
      if (!success && target?.battle?.eliminated) failure = '目标被其他角色抢先淘汰。';
    }
    if (!failure && order.kind === 'scavenge') {
      const searchesSinceOrder = battle.feed.filter((event) => event.kind === 'search' && event.actor === order.playerId && event.ts >= order.createdAt).length;
      success = searchesSinceOrder >= 2 || (player!.battle!.areaSearches ?? 0) >= order.baselineSearches + 2 ||
        (player!.battle!.inventory?.length ?? 0) > order.baselineInventory || player!.battle!.coins >= order.baselineCoins + 25;
    }
    if (!failure && order.kind === 'ally') success = player!.battle!.alliance === order.targetPlayerId;
    if (!success && !failure && now >= order.expiresAt) failure = '55 秒任务时间结束。';
    if (!success && !failure) continue;
    if (success) {
      const doctrineMatch = (order.kind === 'hunt' && order.doctrine === 'hunter') || (order.kind === 'scavenge' && order.doctrine === 'logistics') || (order.kind === 'ally' && order.doctrine === 'intel');
      const reward = 1 + order.stake + (doctrineMatch ? 1 : 0);
      const before = battle.interventionPoints ?? 0;
      battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, before + reward);
      const gained = battle.interventionPoints - before;
      battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + gained;
      order.status = 'success';
      order.result = `${supportOrderName(order.kind)}完成，返还 ${gained} 点干预点。`;
      pushEvent(game, now, 'supportOrder', `【应援成功】${playerName(game, player!)}完成${supportOrderName(order.kind)}，阵营获得 ${gained} 点干预点。`, player, target);
      advanceSupportChain(game, now, player!, order.kind);
      awardPopularity(game, now, 14 + order.stake * 2, [player!]);
    } else {
      order.status = 'failed';
      order.result = failure;
      pushEvent(game, now, 'supportOrder', `【应援失败】${playerNameById(game, order.playerId)}未能完成${supportOrderName(order.kind)}：${failure}`);
    }
    if (player?.battle) player.battle.decisionDueAt = now;
  }
}

function advanceSupportChain(game: Game, now: number, player: Player, kind: string) {
  const battle = game.world.battle!;
  const chain = battle.supportChains!.find((entry) => entry.playerId === player.id) ?? {
    playerId: player.id,
    stage: 0,
    completed: 0,
    lastAdvancedAt: 0,
  };
  if (!battle.supportChains!.some((entry) => entry.playerId === player.id)) battle.supportChains!.push(chain);
  const expected = SUPPORT_CHAIN_SEQUENCE[Math.min(chain.stage, SUPPORT_CHAIN_SEQUENCE.length - 1)];
  if (kind !== expected || chain.stage >= SUPPORT_CHAIN_SEQUENCE.length) return;
  chain.stage += 1;
  chain.lastAdvancedAt = now;
  const next = SUPPORT_CHAIN_SEQUENCE[chain.stage];
  pushEvent(
    game,
    now,
    'supportOrder',
    chain.stage >= SUPPORT_CHAIN_SEQUENCE.length
      ? `【阵营连携】${playerName(game, player)}完成三段战术链，终结技已经就绪。`
      : `【阵营连携】${playerName(game, player)}推进战术链，下一步：${supportOrderName(next)}。`,
    player,
  );
}

export function activateSupportFinisher(
  game: Game,
  now: number,
  args: { playerId: string; doctrine: string; targetPlayerId?: string },
) {
  ensureBattleState(game, now);
  const battle = game.world.battle!;
  const player = game.world.players.get(args.playerId as any);
  if (!player?.battle || player.battle.eliminated) throw new Error('应援角色已经离场。');
  const chain = battle.supportChains!.find((entry) => entry.playerId === player.id);
  if (!chain || chain.stage < SUPPORT_CHAIN_SEQUENCE.length) throw new Error('三段战术连携尚未完成。');
  if (!['hunter', 'logistics', 'intel'].includes(args.doctrine)) throw new Error('未知阵营路线。');
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  let label = '';
  if (args.doctrine === 'hunter') {
    if (!target?.battle || target.battle.eliminated || target.id === player.id) throw new Error('请选择另一名存活角色作为终局目标。');
    player.battle.weaponPower += 12;
    battle.bountyHunterId = player.id;
    battle.bountyPlayerId = target.id;
    label = `终局标记锁定${playerName(game, target)}，武器威力提升`;
    markInterventionReaction(game, now, player, 'RUL_04');
  } else if (args.doctrine === 'logistics') {
    player.battle.hp = Math.min(player.battle.maxHp, player.battle.hp + 35);
    player.battle.stamina = player.battle.maxStamina;
    player.battle.armor += 10;
    player.battle.medkits += 1;
    player.battle.coins += 30;
    label = '全装空投抵达，生命、护甲、体力和物资全面补充';
    markInterventionReaction(game, now, player, 'FAN_01');
  } else {
    const hidden = battle.relationshipEdges?.find((edge) => edge.hidden && (edge.a === player.battle!.characterId || edge.b === player.battle!.characterId));
    if (hidden) {
      hidden.hidden = false;
      hidden.lastReason = '情报频道终结技揭露';
    }
    player.battle.stress = Math.max(0, (player.battle.stress ?? 0) - 25);
    player.battle.clues = (player.battle.clues ?? 0) + 1;
    label = hidden ? '关系透视揭露隐藏关系，并获得一条关键线索' : '关系透视排除错误情报，并稳定角色压力';
    markInterventionReaction(game, now, player, 'INF_01');
  }
  chain.stage = 0;
  chain.completed += 1;
  chain.lastAdvancedAt = now;
  awardPopularity(game, now, 35, [player]);
  pushEvent(game, now, 'supportOrder', `【阵营终结技】${playerName(game, player)}：${label}。`, player, target);
  return { label, completed: chain.completed };
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
  if (battle.phase === 'finale' && (operation.id.startsWith('ZON_') || operation.id === 'ENV_03')) throw new Error('终局不可干预禁区。');
  const cooldown = battle.operationCooldowns?.find((entry) => entry.id === operation.id);
  if (cooldown && cooldown.until > now) throw new Error(`${operation.name}仍在冷却。`);
  if ((battle.interventionPoints ?? 0) < operation.cost) throw new Error('干预点不足。');
  const maxUses = operation.maxUses ?? ({ ZON_02: 3, ZON_03: 2, ZON_04: 3 } as Record<string, number>)[operation.id]; const used = battle.operationUses?.find((entry) => entry.id === operation.id)?.count ?? 0; if (maxUses && used >= maxUses) throw new Error(`${operation.name}已达到本局使用上限。`);
  const target = args.targetPlayerId ? game.world.players.get(args.targetPlayerId as any) : undefined;
  const second = args.secondPlayerId ? game.world.players.get(args.secondPlayerId as any) : undefined;
  const areaId = args.targetAreaId ?? target?.battle?.areaId ?? 'A01';
  const affected = alivePlayers(game).filter((player) => player.battle?.areaId === areaId);
  const announce = (text: string) => pushEvent(game, now, 'intervention', `【主办方】${text}`, target, undefined, { areaId, privateOnly: operation.broadcast === '否' });

  if (operation.target === 'area' && !BATTLE_CONFIG.areas.some((area) => area.id === areaId)) throw new Error('无效区域。');
  if (operation.target === 'player' && !target) throw new Error('请选择角色。');
  if (target && (!target.battle || target.battle.eliminated) || second && (!second.battle || second.battle.eliminated)) throw new Error('目标角色已淘汰。');
  if (operation.target === 'pair' && (!target || !second || target.id === second.id)) throw new Error('请选择两名不同角色。');
  if (['ZON_02', 'ZON_03', 'ENV_03'].includes(operation.id) && (battle.openAreas ?? []).filter(id => id !== 'S01').length <= 1) throw new Error('至少保留一个开放区域。');
  const replayBaseline = captureReplayPatchBaseline(game);

  switch (operation.id) {
    case 'ENV_01': setAreaLock(battle, areaId, now + 90000); announce(`${areaName(areaId)}出口被障碍封锁 90 秒。`); break;
    case 'ENV_02': battle.weatherAreas!.push({ areaId, until: now + 60000, lastDamageAt: now }); announce(`${areaName(areaId)}遭遇持续 60 秒的极端天气。`); break;
    case 'ENV_03': {
      const open = (battle.openAreas ?? []).filter(id => id !== 'S01');
      if (open.length <= 1) throw new Error('至少保留一个开放区域。');
      const count = Math.min(open.length - 1, battle.phase === 'opening' ? 1 + Math.floor(battleRandom(game) * 2) : battle.phase === 'intensify' ? 2 + Math.floor(battleRandom(game) * 2) : 2);
      const closing = [...(battle.pendingClosingAreas ?? []).filter(id => open.includes(id)), ...open.filter(id => !battle.pendingClosingAreas?.includes(id))].slice(0, count);
      battle.openAreas = battle.openAreas!.filter(id => !closing.includes(id));
      battle.redAreaIds = [...new Set([...(battle.redAreaIds ?? []), ...closing])];
      battle.pendingClosingAreas = []; battle.yellowAreaIds = []; battle.lastZoneUpdate = now; battle.zoneClosesAt = undefined;
      for (const player of alivePlayers(game)) if (closing.includes(player.battle!.areaId ?? '')) player.battle!.lastZoneDamageAt = now;
      announce(`一轮禁区关闭：${closing.map(areaName).join('、')}。`); break;
    }
    case 'SUP_03': battle.trappedSupplies ??= []; battle.trappedSupplies.push({ areaId, remaining: 1 }); announce(`${areaName(areaId)}放置了陷阱物资。`); break;
    case 'ENV_04': {
      const victims = affected.length ? [affected[Math.floor(battleRandom(game) * affected.length)]] : [];
      victims.forEach((player) => { player.battle!.hp = Math.max(1, player.battle!.hp - (operation.id === 'ENV_04' ? 12 : 10)); }); announce(`${areaName(areaId)}的${operation.id === 'ENV_04' ? '机关' : '补给箱'}被激活。`); break;
    }
    case 'ENV_05': if (battle.openAreas?.includes(areaId) || areaId === 'S01') throw new Error('请选择已关闭的普通区域。'); battle.openAreas = [...(battle.openAreas ?? []), areaId]; battle.restoredAreas!.push({ areaId, until: now + 120000 }); announce(`${areaName(areaId)}临时修复并重新开放 120 秒。`); break;
    case 'SUP_01': case 'SUP_02': {
      const pool = availableAreaItemsFor(undefined, areaId).filter((item) => operation.id === 'SUP_01' ? ['uncommon', 'rare'].includes(itemDefinition(item).rarity) : ['uncommon', 'rare', 'legendary'].includes(itemDefinition(item).rarity));
      const count = operation.id === 'SUP_01' ? 2 + Math.floor(battleRandom(game) * 2) : 5;
      for (let index = 0; index < count && pool.length; index++) { const item = pool[Math.floor(battleRandom(game) * pool.length)]; battle.rareDrops!.push({ name: item, areaId, remaining: 1 }); }
      announce(`${operation.id === 'SUP_01' ? '空投补给' : '盛宴'}已投放至${areaName(areaId)}，共 ${Math.min(count, pool.length)} 件高级物资。`); break;
    }
    case 'SUP_04': { const resource = battle.areaResources?.find((entry) => entry.areaId === areaId); if (resource) resource.remaining = Math.max(0, resource.remaining - 1); announce(`${areaName(areaId)}的一份可搜索物资已被移除。`); break; }
    case 'SUP_05': {
      const pool = availableAreaItemsFor(target!.battle!.characterId, target!.battle!.areaId ?? 'A01'); const item = weightedAreaItem(game, pool);
      if (!item || inventorySlotsUsed(target!.battle!.inventory ?? []) + itemDefinition(item).slotSize > BATTLE_CONFIG.match.maxInventorySlots) throw new Error('目标背包没有足够空间。');
      target!.battle!.inventory = [...(target!.battle!.inventory ?? []), item]; applyBattleItemEffect(game, now, target!, item); announce(`${playerName(game, target!)}获得品牌赞助物品 ${item}。`); break;
    }
    case 'FAN_01':
      target!.battle!.stamina = Math.min(target!.battle!.maxStamina ?? 100, (target!.battle!.stamina ?? 0) + 18);
      target!.battle!.armor += 2;
      target!.battle!.coins += 12;
      recordBattleDialogue(game, now, target!, undefined, 'support', personaForCharacter(target!.battle!.characterId).supportLine);
      announce(`${playerName(game, target!)}收到应援阵营的专属空投。`);
      awardPopularity(game, now, 12, [target!]);
      break;
    case 'RUL_01': target!.battle!.alliance = second!.id; second!.battle!.alliance = target!.id; battle.temporaryAllianceUntil = now + 180000; battle.temporaryAlliances ??= []; battle.temporaryAlliances.push({ first: target!.id, second: second!.id, until: now + 180000 }); announce(`${playerName(game, target!)}与${playerName(game, second!)}被规则强制结盟 180 秒。`); awardReferenceScore(game, now, 'SCR_P04', [target!, second!]); break;
    case 'RUL_02': battle.disabledWeaponsUntil = now + 120000; announce('武器规则已冻结，全场 120 秒只能徒手战斗。'); break;
    case 'RUL_03': battle.doubleVictory = { first: target!.id, second: second!.id, until: now + 300000 }; announce(`${playerName(game, target!)}与${playerName(game, second!)}在 300 秒内可共同获胜。`); break;
    case 'RUL_04':
      battle.bountyHunterId = undefined;
      battle.bountyPlayerId = target!.id;
      announce(`悬赏${playerName(game, target!)}：任意击杀者获得额外禁区时间和装备。`);
      break;
    case 'INF_01': { const resource = battle.areaResources?.find(entry => entry.remaining > 0); addItemIntel(game, now, target!, operation.name, resource ? `${areaName(resource.areaId)}当前可搜索资源${resource.remaining}份。` : '当前所有区域资源已耗尽。'); break; }
    case 'INF_02': addItemIntel(game, now, target!, operation.name, `${areaName(areaId)}有未公开的高级补给，建议前往搜索。`); target!.battle!.stress = (target!.battle!.stress ?? 0) + 20; break;
    case 'INF_03': {
      const hadAlliance = target!.battle!.alliance === second!.id;
      if (hadAlliance) { target!.battle!.alliance = undefined; second!.battle!.alliance = undefined; awardReferenceScore(game, now, 'SCR_P05', [target!, second!]); }
      updateRelationship(game, target!, second!, -25, '匿名挑拨'); addItemIntel(game, now, target!, operation.name, `${playerName(game, second!)}曾背叛你。`); break;
    }
    case 'INF_04': addItemIntel(game, now, second!, operation.name, `${playerName(game, target!)}在${areaName(target!.battle!.areaId ?? 'A01')}(${target!.position.x.toFixed(1)},${target!.position.y.toFixed(1)})。`); break;
    case 'INF_05': { const item = availableAreaItemsFor(target!.battle!.characterId, areaId)[0]; if (!item) throw new Error('该区域无可隐藏物品。'); battle.exclusiveResources!.push({ areaId, playerId: target!.id, remaining: 1, until: now + 120000, item }); addItemIntel(game, now, target!, operation.name, `${areaName(areaId)}的${item}只有你可见。`); break; }
    case 'REC_01': {
      const characterId = target!.battle!.characterId;
      battle.organizerIntel = (battle.relationshipEdges ?? []).filter(edge => edge.a === characterId || edge.b === characterId).map(edge => `${edge.a}—${edge.b}：${relationshipTypeName(edge.type)} ${edge.strength}${edge.hidden ? '（隐藏）' : ''}`);
      break;
    }
    case 'REC_02': battle.hiddenMissions![0] && (battle.hiddenMissions![0].status = `已揭示：${battle.hiddenMissions![0].status}`); announce('一条隐藏任务已被侦察揭示。'); break;
    case 'ZON_01': {
      const useKey = `ZON_01:${areaId}`; if ((battle.operationUses?.find((entry) => entry.id === useKey)?.count ?? 0) >= 1) throw new Error('该区域已延迟过一次。');
      if (!(battle.pendingClosingAreas ?? []).includes(areaId)) throw new Error('请选择黄色预警中的区域。'); battle.zoneClosesAt = (battle.zoneClosesAt ?? now) + 30000; battle.operationUses!.push({ id: useKey, count: 1 }); announce(`区域 ${areaName(areaId)} 禁令暂缓 30 秒。`); break;
    }
    case 'ZON_02': if (!battle.openAreas?.includes(areaId) || areaId === 'S01') throw new Error('该区域不能关闭。'); battle.openAreas = battle.openAreas.filter((id) => id !== areaId); battle.redAreaIds = [...new Set([...(battle.redAreaIds ?? []), areaId])]; battle.yellowAreaIds = (battle.yellowAreaIds ?? []).filter((id) => id !== areaId); announce(`区域 ${areaName(areaId)} 即刻关闭！`); break;
    case 'ZON_03': if (!battle.openAreas?.includes(areaId) || areaId === 'S01') throw new Error('该区域不能指定关闭。'); battle.pendingClosingAreas = [areaId, ...(battle.pendingClosingAreas ?? []).filter((id) => id !== areaId)]; break;
    case 'ZON_04': target!.battle!.zoneTime = Math.min(target!.battle!.maxZoneTime ?? BATTLE_CONFIG.runtime.zoneTimeMax, (target!.battle!.zoneTime ?? 0) + 5); markInterventionReaction(game, now, target!, operation.id); break;
    case 'ZON_05': {
      const useKey = `ZON_05:${target!.id}`; if ((battle.operationUses?.find((entry) => entry.id === useKey)?.count ?? 0) >= 1) throw new Error('该角色已受过一次加倍消耗。');
      target!.battle!.itemEffects ??= []; target!.battle!.itemEffects.push({ key: 'zone_drain_mult', value: 2, value2: 0, source: operation.name, until: now + 20000 }); battle.operationUses!.push({ id: useKey, count: 1 }); markInterventionReaction(game, now, target!, operation.id); break;
    }
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
  const use = battle.operationUses!.find((entry) => entry.id === operation.id); if (use) use.count += 1; else battle.operationUses!.push({ id: operation.id, count: 1 });
  if (operation.cooldownMs > 0) {
    battle.operationCooldowns = (battle.operationCooldowns ?? []).filter((entry) => entry.id !== operation.id);
    battle.operationCooldowns.push({ id: operation.id, until: now + operation.cooldownMs });
  }
  battle.interventionEffect = {
    kind: operation.id,
    areaId: operation.target === 'area' ? areaId : target?.battle?.areaId,
    playerId: operation.id === 'RUL_04' ? second?.id : target?.id,
    until: now + 7000,
  };
  const responders = operation.target === 'global'
    ? alivePlayers(game)
    : operation.target === 'area'
      ? affected
      : [target, second].filter((player): player is Player => !!player && !player.battle?.eliminated);
  responders.forEach((player) => markInterventionReaction(game, now, player, operation.id));
  recordReplayAction(game, now, target, 'intervention', 'rule', true, `${operation.id} ${operation.name}`, second?.id, operation.target === 'area' ? areaId : undefined, replayBaseline);
  return { remainingPoints: battle.interventionPoints, operation: operation.name };
}

function markInterventionReaction(game: Game, now: number, player: Player, operationId: string) {
  const stats = player.battle!;
  stats.interventionKind = operationId;
  stats.interventionUntil = now + 10000;
  const reaction = operationId === 'RUL_04'
    ? player.id === game.world.battle?.bountyHunterId
      ? { description: `接到追杀任务，正在锁定${playerNameById(game, game.world.battle?.bountyPlayerId)}`, emoji: 'TARGET' }
      : { description: '收到悬赏警报，正在提防追杀者', emoji: 'ALERT' }
    : interventionReaction(operationId);
  player.activity = {
    description: `${playerName(game, player)} ${reaction.description}`,
    emoji: reaction.emoji,
    until: now + 5000,
  };
  pushEvent(game, now, 'reaction', `【反应】${playerName(game, player)} ${reaction.description}。`, player, undefined, { privateOnly: INTERVENTION_OPERATIONS.find(op => op.id === operationId)?.broadcast === '否' });
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
  entry: { playerId?: string; action: string; targetPlayerId?: string; targetAreaId?: string; storyEventId?: string; storyApproach?: string },
) {
  const player = entry.playerId ? game.world.players.get(entry.playerId as any) : undefined;
  if (!player?.battle || player.battle.eliminated) return { accepted: false, reason: '回放角色不可用' };
  const target = entry.targetPlayerId ? game.world.players.get(entry.targetPlayerId as any) : undefined;
  return executeBattleAction(game, now, player, entry.action, target, entry.targetAreaId, '回放已验证行动', undefined, entry.storyApproach, entry.storyEventId);
}

/**
 * Replays accepted model and rule decisions in their recorded order. This deliberately
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
    storyEventId?: string;
    storyApproach?: string;
    action: string;
    source?: string;
    accepted?: boolean;
  }>,
) {
  const ordered = entries
    .filter((entry) => entry.accepted !== false && BATTLE_ACTIONS.includes(entry.action as any))
    .filter((entry) => entry.source === undefined || entry.source === 'model' || entry.source === 'rule')
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
  speech?: string,
  storyApproach?: string,
  storyEventId?: string,
) {
  const stats = player.battle!;
  if ((stats.stunnedUntil ?? 0) > now) return { accepted: false, reason: '角色处于眩晕状态' };
  if (action === 'move') {
    if (!targetAreaId && target) {
      return tacticalMove(game, now, player, target, 'approach')
        ? { accepted: true }
        : { accepted: false, reason: '无法逼近目标' };
    }
    if (!targetAreaId) {
      if (player.pathfinding) return { accepted: false, reason: '角色已经在移动' };
      wander(game, now, player);
      return player.pathfinding ? { accepted: true } : { accepted: false, reason: '没有可用巡逻路线' };
    }
    if (!adjacentAreaIds(stats.areaId ?? 'A01').map(String).includes(targetAreaId)) return { accepted: false, reason: '目标区域不相邻' };
    if (!game.world.battle?.openAreas?.includes(targetAreaId)) return { accepted: false, reason: '目标区域已关闭' };
    if (isAreaLocked(game.world.battle, now, stats.areaId ?? 'A01')) return { accepted: false, reason: '当前区域被剧情封锁' };
    if (!moveToBattleArea(game, now, player, targetAreaId)) return { accepted: false, reason: '无法抵达目标区域' };
    return { accepted: true };
  }
  if (action === 'search') { const cost = BATTLE_CONFIG.runtime.searchStaminaCost; if ((stats.stamina ?? 0) < cost) stats.hp = Math.max(1, stats.hp - 5); else stats.stamina = Math.max(0, (stats.stamina ?? 0) - cost); loot(game, now, player); return { accepted: true }; }
  if (action === 'buy') return tryBuyUpgrade(game, now, player) ? { accepted: true } : { accepted: false, reason: '物资不足或无可升级装备' };
  if (action === 'heal') {
    if (stats.medkits <= 0 || stats.hp >= stats.maxHp) return { accepted: false, reason: '不需要治疗或没有医疗包' };
    stats.medkits -= 1; stats.hp = Math.min(stats.maxHp, stats.hp + 22);
    pushEvent(game, now, 'heal', `【治疗】${playerName(game, player)} 按模型决策使用医疗包。`, player);
    return { accepted: true };
  }
  if (action === 'attack') {
    if (target && ((target.battle?.smokeUntil ?? 0) > now || game.world.battle?.temporaryAlliances?.some(pair => pair.until > now && (pair.first === player.id && pair.second === target.id || pair.first === target.id && pair.second === player.id)))) return { accepted: false, reason: '烟幕或强制联盟禁止攻击目标' };
    if (!target || target.battle?.eliminated) return { accepted: false, reason: '没有有效攻击目标' };
    if (target.battle?.areaId !== stats.areaId) return { accepted: false, reason: '目标不在同一区域' };
    const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
    const visionMultiplier = game.world.battle?.timeOfDay === 'night' ? 1 - BATTLE_CONFIG.runtime.nightVisionPenalty : 1;
    if (distance(player.position, target.position) > weapon.range * visionMultiplier) return { accepted: false, reason: '目标超出武器射程' };
    stats.stamina = Math.max(0, (stats.stamina ?? 0) - BATTLE_CONFIG.runtime.attackStaminaCost);
    attack(game, now, player, target); return { accepted: true };
  }
  if (action === 'flee') {
    stats.stamina = Math.max(0, (stats.stamina ?? 0) - BATTLE_CONFIG.runtime.fleeStaminaCost);
    const enemy = target ?? nearestEnemy(game, player, now);
    const escaped = enemy
      ? tacticalMove(game, now, player, enemy, 'retreat')
      : tacticalLootMove(game, now, player);
    if (!escaped) return { accepted: false, reason: '没有可撤离路线' };
    stats.combatTargetId = undefined; stats.combatUntil = 0;
    if (enemy?.battle?.combatTargetId === player.id) { enemy.battle.combatTargetId = undefined; enemy.battle.combatUntil = 0; }
    pushEvent(game, now, 'combat', `${playerName(game, player)}脱离交战。`, player, enemy, { eventType: 'combat_end' });
    pushEvent(game, now, 'move', `【撤离】${playerName(game, player)} 按模型决策脱离战斗。`, player, enemy);
    return { accepted: true };
  }
  if (action === 'ally') {
    if (!target || target.battle?.eliminated || target.battle?.areaId !== stats.areaId) return { accepted: false, reason: '盟友必须在同一区域' };
    return allyPlayers(game, now, player, target, speech) ? { accepted: true } : { accepted: false, reason: '无法结盟' };
  }
  if (action === 'trade') {
    if (!target?.battle || target.battle.eliminated || target.battle.areaId !== stats.areaId) return { accepted: false, reason: '交易对象必须在同一区域' };
    const offered = stats.inventory?.shift();
    const received = target.battle.inventory?.shift();
    const multiplier = stats.areaId === 'A08' ? 1.3 : 1;
    if (offered) {
      target.battle.inventory!.push(offered);
      if (received) stats.inventory!.push(received);
      transferItemEffects(game, now, player, target, offered);
      if (received) transferItemEffects(game, now, target, player, received);
      const balance = Math.max(0, Math.floor((itemDefinition(offered).tradeValue - (received ? itemDefinition(received).tradeValue : 0)) * multiplier));
      target.battle.coins = Math.max(0, target.battle.coins - balance);
      stats.coins += balance;
      updateRelationship(game, player, target, 5, '物资交易');
      recordBattleDialogue(game, now, player, target, 'trade', speech || personaForCharacter(stats.characterId).tradeLine);
      recordBattleDialogue(game, now + 1, target, player, 'trade', personaForCharacter(target.battle.characterId).replyLine);
      pushEvent(game, now, 'trade', `【交易】${playerName(game, player)} 以${offered}${received ? `换得${received}` : '完成出售'}。`, player, target);
      return { accepted: true };
    }
    const transfer = Math.min(10, Math.floor(stats.coins / 3));
    if (transfer < 1) return { accepted: false, reason: '物资不足以交易' };
    stats.coins -= transfer; target.battle.coins += transfer;
    updateRelationship(game, player, target, 5, '物资交易');
    recordBattleDialogue(game, now, player, target, 'trade', speech || personaForCharacter(stats.characterId).tradeLine);
    recordBattleDialogue(game, now + 1, target, player, 'trade', personaForCharacter(target.battle.characterId).replyLine);
    pushEvent(game, now, 'trade', `【交易】${playerName(game, player)} 与 ${playerName(game, target)} 交换物资。`, player, target);
    return { accepted: true };
  }
  if (action === 'investigate') {
    if (storyApproach && !STORY_APPROACHES.some((approach) => approach.id === storyApproach)) return { accepted: false, reason: '调查路线不在允许列表' };
    const inferredEventId = AREA_SPECIAL_EVENTS.find((candidate) => {
      if (candidate.areaId !== (stats.areaId ?? 'A01')) return false;
      const count = game.world.battle?.areaEventCounts?.find((entry) => entry.id === candidate.id)?.count ?? 0;
      const requiredItem = 'requiredItem' in candidate ? candidate.requiredItem : undefined;
      return count < candidate.maxTriggers && !game.world.battle?.consumedAreaStories?.includes(candidate.id) && (!requiredItem || stats.inventory?.includes(requiredItem));
    })?.id;
    const event = AREA_SPECIAL_EVENTS.find((candidate) => candidate.id === (storyEventId ?? inferredEventId));
    if (!event || event.areaId !== (stats.areaId ?? 'A01')) return { accepted: false, reason: '所选剧情不在当前区域' };
    const count = game.world.battle?.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0;
    if (count >= event.maxTriggers || game.world.battle?.consumedAreaStories?.includes(event.id)) return { accepted: false, reason: '所选剧情已无法再次触发' };
    const requiredItem = 'requiredItem' in event ? event.requiredItem : undefined;
    if (requiredItem && !stats.inventory?.includes(requiredItem)) return { accepted: false, reason: `调查需要${requiredItem}` };
    const approach = storyApproachFor(storyApproach);
    stats.pendingStoryApproach = approach.id;
    stats.pendingStoryEventId = event.id;
    stats.areaSearches = (stats.areaSearches ?? 0) + 1;
    const option = storyOptionFor(event.id, approach.id);
    pushEvent(game, now, 'investigate', `【调查】${playerName(game, player)} 选择「${option.label}」，正在调查${areaName(stats.areaId ?? 'A01')}。`, player);
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
  const performRuleAction = (action: string, target?: Player, targetAreaId?: string) => {
    const baseline = captureReplayPatchBaseline(game);
    const result = executeBattleAction(game, now, player, action, target, targetAreaId, fallbackReason);
    if (result.accepted) {
      recordReplayAction(game, now, player, action, 'rule', true, fallbackReason, target?.id, targetAreaId, baseline);
    }
    return result.accepted;
  };

  if ((stats.interventionUntil ?? 0) > now) {
    if (stats.interventionKind?.startsWith('ENV') || stats.interventionKind === 'SUP_03') {
      if (performRuleAction('flee')) {
        pushEvent(game, now, 'reaction', `【反应】${playerName(game, player)} 正在避开主办方干预区域。`, player);
        return;
      }
    }
    if (stats.interventionKind === 'SUP_01' || stats.interventionKind === 'SUP_02') {
      performRuleAction('search');
      return;
    }
  }

  const enemy = nearestEnemy(game, player, now);
  if ((stats.stress ?? 0) >= (stats.stressThreshold ?? 80)) {
    const destination = adjacentAreaIds(stats.areaId ?? 'A01')
      .filter((areaId) => game.world.battle?.openAreas?.includes(areaId))
      .sort((first, second) => areaDanger(first) - areaDanger(second))[0];
    if (destination && performRuleAction('move', undefined, destination)) {
      pushEvent(game, now, 'reaction', `【压力】${playerName(game, player)} 压力过高，撤离至${areaName(destination)}。`, player);
      return;
    }
  }
  if (stats.hp <= 36 && stats.medkits > 0) {
    if (performRuleAction('heal')) {
      player.activity = { description: `${playerName(game, player)} 使用医疗包`, emoji: 'MED', until: now + 1800 };
      return;
    }
  }

  const supportOrder = activeSupportOrderFor(game, player);
  if (supportOrder) {
    const supportTarget = supportOrder.targetPlayerId ? game.world.players.get(supportOrder.targetPlayerId as any) : undefined;
    if (supportOrder.kind === 'hunt' && supportTarget?.battle && !supportTarget.battle.eliminated) {
      if (supportTarget.battle.areaId !== stats.areaId) {
        const destination = nextOpenAreaToward(game, stats.areaId ?? 'A01', supportTarget.battle.areaId ?? 'A01');
        if (destination && performRuleAction('move', undefined, destination)) return;
      } else {
        const weapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
        if (distance(player.position, supportTarget.position) <= weapon.range) {
          performRuleAction('attack', supportTarget);
          return;
        }
        if (performRuleAction('move', supportTarget)) return;
      }
    }
    if (supportOrder.kind === 'scavenge') {
      const resource = game.world.battle?.areaResources?.find((entry) => entry.areaId === stats.areaId);
      if ((resource?.remaining ?? 0) > 0 && performRuleAction('search')) return;
      const destination = adjacentAreaIds(stats.areaId ?? 'A01')
        .filter((areaId) => game.world.battle?.openAreas?.includes(areaId))
        .sort((a, b) => (game.world.battle?.areaResources?.find((entry) => entry.areaId === b)?.remaining ?? 0) - (game.world.battle?.areaResources?.find((entry) => entry.areaId === a)?.remaining ?? 0))[0];
      if (destination && performRuleAction('move', undefined, destination)) return;
    }
    if (supportOrder.kind === 'ally' && supportTarget?.battle && !supportTarget.battle.eliminated) {
      if (supportTarget.battle.areaId !== stats.areaId) {
        const destination = nextOpenAreaToward(game, stats.areaId ?? 'A01', supportTarget.battle.areaId ?? 'A01');
        if (destination && performRuleAction('move', undefined, destination)) return;
      } else if (performRuleAction('ally', supportTarget)) return;
    }
  }

  const bountyTarget = bountyTargetFor(game, player);
  if (bountyTarget?.battle) {
    if (player.pathfinding) {
      delete player.pathfinding;
      player.speed = 0;
    }
    if (bountyTarget.battle.areaId !== stats.areaId) {
      const destination = nextOpenAreaToward(
        game,
        stats.areaId ?? 'A01',
        bountyTarget.battle.areaId ?? 'A01',
      );
      if (destination && performRuleAction('move', undefined, destination)) {
        player.activity = {
          description: `${playerName(game, player)} 正在追踪 ${playerName(game, bountyTarget)}`,
          emoji: 'TARGET',
          until: now + 2000,
        };
        pushEvent(game, now, 'bounty', `【悬赏】${playerName(game, player)} 正沿区域路线追踪 ${playerName(game, bountyTarget)}。`, player, bountyTarget);
        return;
      }
    } else {
      const bountyWeapon = BATTLE_CONFIG.weapons[stats.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
      if (distance(player.position, bountyTarget.position) <= bountyWeapon.range) {
        performRuleAction('attack', bountyTarget);
        return;
      }
      if (performRuleAction('move', bountyTarget)) {
        player.activity = { description: `${playerName(game, player)} 正在逼近悬赏目标`, emoji: 'TARGET', until: now + 2000 };
        return;
      }
    }
  }

  if (enemy && stats.hp <= 45 && distance(player.position, enemy.position) <= BATTLE_CONFIG.match.dangerRange) {
    if (performRuleAction('flee', enemy)) {
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
  if (enemy && distance(player.position, enemy.position) <= BATTLE_CONFIG.match.dangerRange) {
    const disposition = encounterDisposition(game, player, enemy);
    if (disposition === 'ally' && performRuleAction('ally', enemy)) return;
    if (disposition === 'flee' && performRuleAction('flee', enemy)) return;
    if (disposition === 'attack') {
      if (distance(player.position, enemy.position) <= weaponConfig.range) {
        performRuleAction('attack', enemy);
        return;
      }
      if (performRuleAction('move', enemy)) {
        player.activity = {
          description: `${playerName(game, player)} 正在逼近 ${playerName(game, enemy)}`,
          emoji: 'MOVE',
          until: now + 1500,
        };
        return;
      }
    }
  }

  if (performRuleAction('buy')) {
    return;
  }

  if (battleRandom(game) < 0.24) {
    const partner = allianceCandidate(game, player);
    if (partner && performRuleAction('ally', partner)) return;
  }

  if (battleRandom(game) < 0.62) {
    performRuleAction('search');
    return;
  }

  if (enemy) {
    performRuleAction('move', enemy);
    return;
  }
  const trackedOpponent = globallyTrackedOpponent(game, player);
  if (trackedOpponent?.battle) {
    const destination = nextOpenAreaToward(
      game,
      stats.areaId ?? 'A01',
      trackedOpponent.battle.areaId ?? 'A01',
    );
    if (destination && performRuleAction('move', undefined, destination)) {
      player.activity = {
        description: `${playerName(game, player)} 正在追踪 ${playerName(game, trackedOpponent)}`,
        emoji: 'TARGET',
        until: now + 2000,
      };
      return;
    }
  }
  performRuleAction('move');
}

function areaDanger(areaId: string) {
  return BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.danger ?? 99;
}

export function attack(game: Game, now: number, attacker: Player, target: Player) {
  const attack = attacker.battle!;
  const defend = target.battle!;
  if (attack.eliminated || defend.eliminated || (attack.stunnedUntil ?? 0) > now || (defend.smokeUntil ?? 0) > now) return;
  if (game.world.battle?.temporaryAlliances?.some(pair => pair.until > now && (pair.first === attacker.id && pair.second === target.id || pair.first === target.id && pair.second === attacker.id))) return;
  const newDuel = attack.combatTargetId !== target.id || (attack.combatUntil ?? 0) <= now;
  const ambush = newDuel && (defend.combatUntil ?? 0) <= now && (game.world.battle?.timeOfDay === 'night' || itemModifier(attack, 'stealth_pct', now) > 0);
  if (newDuel) {
    attack.duelStartHp = attack.hp; attack.duelTargetStartHp = defend.hp;
    defend.duelStartHp = defend.hp; defend.duelTargetStartHp = attack.hp;
    pushEvent(game, now, 'combat', `${playerName(game, attacker)}与${playerName(game, target)}发生冲突。`, attacker, target, { eventType: 'combat_start' });
  }
  const wasAllied = attack.alliance === target.id;
  delete attacker.pathfinding;
  attacker.speed = 0;
  attack.combatTargetId = target.id;
  attack.combatUntil = now + 12_000;
  defend.combatTargetId = attacker.id;
  defend.combatUntil = now + 9_000;
  const relation = relationshipBetween(game, attacker, target, now);
  const betrayal = wasAllied || ['lover', 'friend', 'family'].includes(relation?.type ?? '');
  const areaId = attacker.battle?.areaId;
  if (areaId && areaId === target.battle?.areaId) {
    const entry = game.world.battle?.areaBattleRounds?.find((candidate) => candidate.areaId === areaId);
    if (entry) entry.count += 1; else game.world.battle?.areaBattleRounds?.push({ areaId, count: 1 });
  }
  const weaponsDisabled = (game.world.battle?.disabledWeaponsUntil ?? 0) > now;
  const nightAmbush = game.world.battle?.timeOfDay === 'night' ? 1 + BATTLE_CONFIG.runtime.nightAmbushBonus : 1;
  const itemDamageBonus = 1 + itemModifier(attack, 'damage_buff_pct', now) / 100;
  const targetStealth = Math.min(1, itemModifier(defend, 'stealth_pct', now) / 100);
  if (targetStealth > 0 && battleRandom(game) < targetStealth) { pushEvent(game, now, 'combat', `${playerName(game, target)}隐蔽成功，攻击落空。`, attacker, target, { eventType: 'combat_hit', to: target.position, effectKey: 'stealth_pct', itemName: '隐蔽' }); return; }
  const painPenalty = (attack.painUntil ?? 0) > now ? 1 - SUPPLEMENTAL_RULES.pain.damagePenalty : 1;
  const effectiveWeaponPower = (weaponsDisabled ? BATTLE_CONFIG.weapons.Fists.power : attack.weaponPower) * (areaId === 'A04' ? 1.15 : 1) * nightAmbush * itemDamageBonus * painPenalty;
  const critical = !weaponsDisabled && attack.weapon === '手术刀' && battleRandom(game) < SUPPLEMENTAL_RULES.criticalChance ? 2 : 1;
  const reduction = Math.min(100, itemModifier(defend, 'damage_reduction_pct', now));
  const damage = Math.max(
    0,
    Math.floor(Math.max(2, effectiveWeaponPower * (0.55 + battleRandom(game) * 0.35) * critical - defend.armor) * (1 - reduction / 100)),
  );
  const protector = alivePlayers(game).find(candidate => candidate.id !== attacker.id && candidate.id !== target.id && candidate.battle && candidate.battle.areaId === defend.areaId && defend.hp < defend.maxHp * 0.3 && candidate.battle.hp > candidate.battle.maxHp * 0.5 && (candidate.battle.alliance === target.id || itemModifier(candidate.battle, 'protect_others', now) > 0 && battleRandom(game) < 0.5));
  const absorbed = protector ? Math.floor(damage / 2) : 0;
  if (protector && absorbed > 0) {
    protector.battle!.hp -= absorbed;
    awardReferenceScore(game, now, 'SCR_P07', [protector]);
    pushEvent(game, now, 'story', `${playerName(game, protector)}替${playerName(game, target)}承受${absorbed}点伤害。`, protector, target, { eventType: 'rel_trigger', to: protector.position, damage: absorbed, effectKey: 'damage_reduction_pct', itemName: '舍身保护' });
  }
  defend.hp = Math.max(0, defend.hp - damage + absorbed);
  if (damage > 0 && !defend.itemEffects?.some(effect => effect.source === '止痛药' && (effect.until ?? 0) > now)) defend.painUntil = now + SUPPLEMENTAL_RULES.pain.durationMs;
  if (!weaponsDisabled && attack.weapon === '法槌' && battleRandom(game) < SUPPLEMENTAL_RULES.stunChance) { defend.stunnedUntil = now + SUPPLEMENTAL_RULES.stunMs; delete target.pathfinding; target.speed = 0; }
  if (ambush && damage > 0) awardReferenceScore(game, now, 'SCR_P09', [attacker]);
  if (wasAllied) awardReferenceScore(game, now, 'SCR_P05', [attacker, target]);
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
  const persona = personaForCharacter(attack.characterId);
  const recentCombatLine = game.world.battle?.dialogueLog?.find(
    (entry) => entry.speakerId === attacker.id && entry.kind === 'combat' && entry.ts > now - 18000,
  );
  if (!recentCombatLine) {
    const line = persona.attackLines[(game.world.battle?.nextDialogueId ?? 1) % persona.attackLines.length];
    recordBattleDialogue(game, now, attacker, target, 'combat', line);
  }
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
      weapon: weaponsDisabled ? 'Fists' : attack.weapon,
      burst: weaponBurst(weaponsDisabled ? 'Fists' : attack.weapon),
    },
  );
  awardReferenceScore(game, now, 'SCR_P01', [attacker, target]);
  if (betrayal) {
    attack.alliance = undefined;
    defend.alliance = undefined;
    pushEvent(game, now, 'betrayal', `【背叛】${playerName(game, attacker)} 背叛了 ${playerName(game, target)}。`, attacker, target);
    awardReferenceScore(game, now, 'SCR_P03', [attacker, target]); completeMission(game, now, 'HID_04', [attacker, target]);
    updateRelationship(game, attacker, target, -30, '背叛');
  }

  if (defend.hp <= 0) {
    const battle = game.world.battle!;
    const completedBounty = battle.bountyPlayerId === target.id && (!battle.bountyHunterId || battle.bountyHunterId === attacker.id);
    const bountyTargetEliminated = battle.bountyPlayerId === target.id;
    const bountyHunterEliminated = battle.bountyHunterId === target.id;
    defend.eliminated = true;
    updateRelationship(game, attacker, target, -40, '淘汰');
    freezeEliminatedRelationships(game, defend.characterId);
    attack.combatTargetId = undefined;
    attack.combatUntil = 0;
    defend.combatTargetId = undefined;
    defend.combatUntil = 0;
    attack.kills += 1;
    if ((game.world.battle?.phase ?? '') !== 'finale') attack.zoneTime = Math.min(attack.maxZoneTime ?? 40, (attack.zoneTime ?? 0) + BATTLE_CONFIG.zone.killRewardSeconds);
    attack.coins += 45 + Math.floor(defend.coins / 2);
    if (completedBounty) {
      attack.zoneTime = Math.min(attack.maxZoneTime ?? 40, (attack.zoneTime ?? 0) + BATTLE_CONFIG.zone.killRewardSeconds);
      attack.inventory ??= []; if (!attack.inventory.includes('防弹插板')) attack.inventory.push('防弹插板');
      applyBattleItemEffect(game, now, attacker, '防弹插板');
    }
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
    if (completedBounty) {
      pushEvent(game, now + 1, 'bounty', `【悬赏完成】${playerName(game, attacker)} 获得额外 ${BATTLE_CONFIG.zone.killRewardSeconds} 秒禁区时间和防弹插板。`, attacker, target);
    } else if (bountyTargetEliminated) {
      pushEvent(game, now + 1, 'bounty', `【悬赏失效】目标${playerName(game, target)}被第三方淘汰，${playerNameById(game, battle.bountyHunterId)}的任务终止。`, attacker, target);
    } else if (bountyHunterEliminated) {
      pushEvent(game, now + 1, 'bounty', `【悬赏失败】执行者${playerName(game, target)}被淘汰，追杀任务终止。`, attacker, target);
    }
    if (completedBounty || bountyTargetEliminated || bountyHunterEliminated) {
      battle.bountyHunterId = undefined;
      battle.bountyPlayerId = undefined;
    }
    awardReferenceScore(game, now, 'SCR_P02', [attacker]);
    pushEvent(game, now, 'combat', `${playerName(game, attacker)}与${playerName(game, target)}的战斗结束。`, attacker, target, { eventType: 'combat_end' });
    if ((attack.duelStartHp ?? attack.maxHp) < attack.maxHp * 0.2 && (attack.duelTargetStartHp ?? 0) >= defend.maxHp) awardReferenceScore(game, now, 'SCR_P10', [attacker]);
  } else if (attack.weapon !== 'Fists') {
    tacticalMove(game, now, attacker, target, attack.weapon === 'Shotgun' ? 'approach' : 'sidestep');
  }
  if (!defend.eliminated) updateRelationship(game, attacker, target, -20, '攻击');
}

function loot(game: Game, now: number, player: Player) {
  const stats = player.battle!;
  stats.areaSearches = (stats.areaSearches ?? 0) + 1;
  const areaId = stats.areaId ?? 'A01';
  const monster = game.world.battle?.monsters?.find(entry => entry.areaId === areaId && entry.hp > 0);
  if (monster) {
    monster.hp = Math.max(0, monster.hp - stats.weaponPower);
    if (monster.hp === 0) {
      stats.zoneTime = Math.min(stats.maxZoneTime ?? 40, (stats.zoneTime ?? 0) + SUPPLEMENTAL_RULES.eliteMonster.zoneReward);
      game.world.battle!.rareDrops!.push({ name: monster.drop, areaId, remaining: 1 });
      pushEvent(game, now, 'monster', `${playerName(game, player)}击杀${monster.name}。`, player, undefined, { eventType: 'monster_kill', areaId, vars: { '野怪名': monster.name }, to: player.position, effectKey: 'aoe_damage', itemName: monster.name });
    } else {
      stats.hp = Math.max(1, stats.hp - SUPPLEMENTAL_RULES.eliteMonster.retaliation * (1 - Math.min(100, itemModifier(stats, 'damage_reduction_pct', now)) / 100));
      pushEvent(game, now, 'monster', `${playerName(game, player)}与${monster.name}交战，野怪剩余${monster.hp}生命。`, player, undefined, { eventType: 'combat_hit', to: player.position, effectKey: 'aoe_damage', itemName: monster.name });
    }
    return;
  }
  const trap = game.world.battle?.trappedSupplies?.find(entry => entry.areaId === areaId && entry.remaining > 0);
  if (trap) {
    trap.remaining -= 1;
    const immune = itemModifier(stats, 'chem_immune', now) > 0;
    if (!immune) stats.hp = Math.max(1, stats.hp - 10);
    pushEvent(game, now, 'item', immune ? '防护服阻挡了补给中的化学毒剂。' : '拾取陷阱物资，受到10点化学伤害。', player, undefined, { to: player.position, effectKey: 'aoe_damage', itemName: '陷阱物资' });
    return;
  }
  const exclusive = game.world.battle?.exclusiveResources?.find((entry) => entry.areaId === areaId && entry.remaining > 0 && entry.until > now);
  const resource = game.world.battle?.areaResources?.find((entry) => entry.areaId === areaId);
  if (resource && resource.remaining <= 0) {
    pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 发现${areaName(areaId)}资源已经枯竭。`, player);
    return;
  }
  const rareDrop = game.world.battle?.rareDrops?.find((drop) => drop.areaId === areaId && drop.remaining > 0); if (rareDrop) {
    const definition = itemDefinition(rareDrop.name);
    if (inventorySlotsUsed(stats.inventory ?? []) + definition.slotSize <= BATTLE_CONFIG.match.maxInventorySlots) {
      rareDrop.remaining -= 1; stats.inventory = [...(stats.inventory ?? []), rareDrop.name]; applyBattleItemEffect(game, now, player, rareDrop.name); pushEvent(game, now, 'loot', `【稀有发现】${playerName(game, player)}在${areaName(areaId)}获得${rareDrop.name}。`, player); triggerCharacterStory(game, now, player, areaId, rareDrop.name);
    } else pushEvent(game, now, 'loot', `【背包】${playerName(game, player)}没有足够空间拾取${rareDrop.name}。`, player);
    return;
  }
  let requested = BATTLE_CONFIG.match.searchMinItems + Math.floor(battleRandom(game) * (BATTLE_CONFIG.match.searchMaxItems - BATTLE_CONFIG.match.searchMinItems + 1));
  if (game.world.battle?.timeOfDay === 'day' && battleRandom(game) < BATTLE_CONFIG.runtime.daySearchBonus) requested = Math.min(BATTLE_CONFIG.match.searchMaxItems, requested + 1);
  const count = Math.min(requested, resource?.remaining ?? requested);
  const pool = availableAreaItemsFor(stats.characterId, areaId).filter(item => !exclusive || exclusive.playerId === player.id || item !== exclusive.item);
  if (itemModifier(stats, 'clue_search_bonus', now) > 0 && pool.includes('医疗记录终端')) pool.push('医疗记录终端');
  const found: string[] = [];
  for (let index = 0; index < count; index++) {
    const item = index === 0 && exclusive?.playerId === player.id && exclusive.item ? exclusive.item : weightedAreaItem(game, pool);
    if (!item) break;
    const definition = itemDefinition(item);
    if (!definition.stackable && stats.inventory?.includes(item)) continue;
    if (inventorySlotsUsed(stats.inventory ?? []) + definition.slotSize > BATTLE_CONFIG.match.maxInventorySlots) break;
    stats.inventory = [...(stats.inventory ?? []), item];
    if (exclusive?.playerId === player.id && exclusive.item === item) exclusive.remaining = Math.max(0, exclusive.remaining - 1);
    pushEvent(game, now, 'itemPickup', `拾取${item}`, player, undefined, { eventType: 'item_pickup', itemName: item });
    found.push(item);
    applyBattleItemEffect(game, now, player, item);
    triggerCharacterStory(game, now, player, areaId, item);
    if (['加密档案', '医疗记录终端', '监控日志碎片', '案件卷宗', '演播档案带'].includes(item)) collectTruthClue(game, now, item, player);
  }
  if (resource) resource.remaining = Math.max(0, resource.remaining - Math.max(1, found.length));
  pushEvent(game, now, 'loot', `【搜索】${playerName(game, player)} 在${areaName(areaId)}搜索到${found.length ? found.join('、') : '背包已满'}。`, player, undefined, { vars: { '物品列表': found.length ? found.join('、') : '无' } });
  if (!tacticalLootMove(game, now, player)) {
    wander(game, now, player);
  }
}

export function applyBattleItemEffect(game: Game, now: number, player: Player, item: string) {
  const definition = itemDefinition(item);
  const fallback = ITEM_EFFECTS[item];
  const stats = player.battle!;
  const key = definition.effectKey || fallback?.kind;
  const value = definition.effectKey ? definition.effectValue : fallback?.value ?? 0;
  const value2 = definition.effectValue2 || 0;
  const expiresAt = definition.durationSeconds > 0 ? now + definition.durationSeconds * 1000 : undefined;
  const storeModifier = () => {
    stats.itemEffects ??= [];
    stats.itemEffects = stats.itemEffects.filter((entry) => entry.key !== key || entry.source !== item);
    stats.itemEffects.push({ key, value, value2, source: item, ...(expiresAt ? { until: expiresAt } : {}) });
  };

  if (stats.eliminated) return false;
  if (definition.characterExclusive && definition.exclusiveCharacterId !== stats.characterId) return false;
  if (!definition.consumable && stats.itemEffects?.some(entry => entry.source === item && (entry.until === undefined || entry.until > now))) return false;
  if (key === 'hp' || key === 'heal') {
    stats.hp = Math.min(stats.maxHp, stats.hp + value);
    if (value2 > 0) collectTruthClue(game, now, `物品-${definition.id}`, player);
  }
  else if (key === 'stamina') stats.stamina = Math.min(stats.maxStamina ?? 100, (stats.stamina ?? 0) + value);
  else if (key === 'satiety') stats.satiety = Math.min(BATTLE_CONFIG.runtime.satietyMax, (stats.satiety ?? 0) + value);
  else if (key === 'satiety+stamina') {
    stats.satiety = Math.min(BATTLE_CONFIG.runtime.satietyMax, (stats.satiety ?? 0) + value);
    stats.stamina = Math.min(stats.maxStamina ?? 100, (stats.stamina ?? 0) + value2);
  } else if (key === 'damage_reduction_pct') storeModifier();
  else if (key === 'armor') stats.armor += value;
  else if (key === 'aoe_damage') {
    const victims = alivePlayers(game).filter(candidate => candidate.id !== player.id && candidate.battle?.areaId === stats.areaId);
    const hits = definition.id === 'ITEM_A07_003' ? victims.slice(0, 1).filter(() => battleRandom(game) < SUPPLEMENTAL_RULES.shotHitChance) : victims;
    for (const victim of hits) {
      const damage = Math.max(0, Math.floor(value * (1 - Math.min(100, itemModifier(victim.battle!, 'damage_reduction_pct', now)) / 100)));
      victim.battle!.hp = Math.max(0, victim.battle!.hp - damage);
      pushEvent(game, now, 'attack', `${item}命中${playerName(game, victim)}，造成${damage}点伤害。`, player, victim, { from: player.position, to: victim.position, damage, effectKey: key, itemName: item });
      if (victim.battle!.hp === 0) {
        victim.battle!.eliminated = true; stats.kills += 1;
        delete victim.pathfinding; victim.speed = 0;
        freezeEliminatedRelationships(game, victim.battle!.characterId);
        awardReferenceScore(game, now, 'SCR_P02', [player]);
        pushEvent(game, now, 'eliminate', `${playerName(game, victim)}被${item}淘汰。`, player, victim, { to: victim.position });
      }
    }
  } else if (['melee_damage', 'ranged_damage', 'weapon'].includes(key)) {
    if (value > stats.weaponPower) { stats.weapon = item; stats.weaponPower = value; }
    storeModifier();
  } else if (key === 'all_stats_plus' || key === 'allStats') {
    stats.attributeBonus = (stats.attributeBonus ?? 0) + value;
  } else if (key === 'clue_fragment' || key === 'clue') collectTruthClue(game, now, `碎片-${value}`, player);
  else if (key === 'truth_trigger') unlockTruth(game, now, player);
  else if (key === 'reveal_relation') {
    const hidden = game.world.battle?.relationshipEdges?.find((edge) => edge.hidden);
    addItemIntel(game, now, player, item, hidden ? `${hidden.a}与${hidden.b}：${relationshipTypeName(hidden.type)}，强度${hidden.strength}` : '未发现隐藏关系。');
  } else if (key === 'reveal_secret') {
    const subject = alivePlayers(game).find(candidate => candidate.id !== player.id && candidate.battle?.areaId === stats.areaId);
    addItemIntel(game, now, player, item, subject ? `${playerName(game, subject)}的隐藏信息：${profileForCharacterId(subject.battle!.characterId ?? 'C01').hiddenTruth}` : '附近没有可调查的角色。');
  } else if (key === 'escape_smoke') {
    stats.smokeUntil = now + SUPPLEMENTAL_RULES.smokeMs;
    stats.combatTargetId = undefined; stats.combatUntil = 0; delete player.pathfinding; player.speed = 0;
    for (const enemy of alivePlayers(game)) if (enemy.battle?.combatTargetId === player.id) { enemy.battle.combatTargetId = undefined; enemy.battle.combatUntil = 0; }
    const destination = adjacentAreaIds(stats.areaId ?? 'A01').find(id => game.world.battle?.openAreas?.includes(id));
    if (destination) moveToBattleArea(game, now, player, destination);
  } else if (['cold_resist', 'chem_immune', 'damage_buff_pct', 'move_speed_pct', 'stealth_pct', 'stealth_zone', 'disguise', 'unlock'].includes(key)) {
    storeModifier();
    if (key === 'move_speed_pct' || key === 'disguise') if (player.pathfinding) player.pathfinding.state = { kind: 'needsPath' };
  } else if (['eavesdrop', 'comm_link', 'scout_resources', 'radar_count', 'watch_area'].includes(key)) {
    storeModifier();
    if (key === 'watch_area') stats.watchedAreaId = stats.areaId;
    if (key === 'comm_link') stats.commTargetId = alivePlayers(game).find(candidate => candidate.id !== player.id)?.id;
    refreshItemIntel(game, now, player, true);
  } else if (key === 'lore_text') {
    addItemIntel(game, now, player, item, SUPPLEMENTAL_RULES.manufacturerLog);
    storeModifier();
  } else if (key === 'plot_symbol') {
    if (stats.characterId === definition.exclusiveCharacterId) { collectTruthClue(game, now, `符号-${definition.id}`, player); storeModifier(); }
    else addItemIntel(game, now, player, item, '这些刻痕需要听林者解读。');
  } else if (key === 'plot_trigger' || key === 'story_item') {
    triggerCharacterStory(game, now, player, stats.areaId ?? '', item);
  } else if (key === 'special' && definition.id === 'ITEM_A06_002') {
    storeModifier(); stats.painUntil = undefined;
  } else {
    throw new Error(`Unimplemented item effect: ${definition.id}/${key}`);
  }

  if (definition.consumable) {
    const inventory = stats.inventory ?? [];
    const index = inventory.indexOf(item);
    if (index >= 0) stats.inventory = inventory.filter((_, itemIndex) => itemIndex !== index);
  }
  pushEvent(game, now, 'item', `【物品】${playerName(game, player)} 使用${item}：${definition.effectDescription}。`, player, undefined, { to: player.position, effectKey: key, itemName: item, vars: { '效果': definition.effectDescription } });
  return true;
}

export function addItemIntel(game: Game, now: number, player: Player, source: string, text: string) {
  const stats = player.battle!;
  const previous = stats.intel?.find(entry => entry.source === source);
  if (previous?.text === text) return;
  stats.intel = [{ ts: now, source, text }, ...(stats.intel ?? []).filter(entry => entry.source !== source)].slice(0, 20);
  pushEvent(game, now, 'intel', `${source}：${text}`, player, undefined, { privateOnly: true, eventType: 'mission_hint' });
}

export function refreshItemIntel(game: Game, now: number, player: Player, force = false) {
  const stats = player.battle!;
  if (!force && now - (stats.intelUpdatedAt ?? 0) < SUPPLEMENTAL_RULES.intelRefreshMs) return;
  stats.intelUpdatedAt = now;
  const neighbors: string[] = adjacentAreaIds(stats.areaId ?? 'A01');
  const visible = (areaId: string) => !alivePlayers(game).some(candidate => candidate.battle?.areaId === areaId && itemModifier(candidate.battle!, 'stealth_zone', now) > 0);
  for (const effect of stats.itemEffects ?? []) {
    if (effect.until !== undefined && effect.until <= now) continue;
    if (effect.key === 'scout_resources' && !stats.intel?.some(entry => entry.source === effect.source)) {
      const pool = [...(game.world.battle?.areaResources ?? [])]; const found: string[] = [];
      while (pool.length && found.length < effect.value) { const [area] = pool.splice(Math.floor(battleRandom(game) * pool.length), 1); found.push(`${areaName(area.areaId)}：资源${area.remaining}`); }
      addItemIntel(game, now, player, effect.source, found.join('；'));
    }
    if (effect.key === 'radar_count') addItemIntel(game, now, player, effect.source, neighbors.slice(0, effect.value).map(id => `${areaName(id)}：${visible(id) ? alivePlayers(game).filter(candidate => candidate.battle?.areaId === id).length : '信号中断'}人`).join('；'));
    if (effect.key === 'watch_area') {
      const id = stats.watchedAreaId ?? stats.areaId ?? 'A01';
      addItemIntel(game, now, player, effect.source, visible(id) ? `${areaName(id)}：${alivePlayers(game).filter(candidate => candidate.battle?.areaId === id).map(candidate => `${playerName(game, candidate)}(${candidate.position.x.toFixed(1)},${candidate.position.y.toFixed(1)})`).join('、') || '无人'}` : `${areaName(id)}监控信号中断`);
    }
    if (effect.key === 'eavesdrop') {
      const dialogue = game.world.battle?.dialogueLog?.find(entry => entry.ts > now - 30000 && neighbors.includes([...game.world.players.values()].find(candidate => candidate.id === entry.speakerId)?.battle?.areaId ?? ''));
      addItemIntel(game, now, player, effect.source, dialogue ? `邻区对话：${dialogue.text}` : '邻区暂无可听取的对话。');
    }
    if (effect.key === 'comm_link') {
      const recipient = [...game.world.players.values()].find(candidate => candidate.id === stats.commTargetId);
      if (recipient?.battle && !recipient.battle.eliminated) addItemIntel(game, now, recipient, `来自${playerName(game, player)}的单向通讯`, `我在${areaName(stats.areaId ?? '')}，生命${Math.ceil(stats.hp)}，需要${stats.hp < stats.maxHp / 2 ? '治疗' : '合作'}。`);
    }
  }
}

export function inventorySlotsUsed(items: readonly string[]) {
  return items.reduce((sum, item) => sum + Math.max(1, itemDefinition(item).slotSize), 0);
}

function itemModifier(stats: BattleStats, key: string, now: number) {
  const expired = (stats.itemEffects ?? []).filter(effect => effect.until !== undefined && effect.until <= now);
  if (expired.some(effect => effect.key === 'damage_buff_pct' && effect.source === '肾上腺素')) {
    stats.stamina = Math.max(0, (stats.stamina ?? 0) - SUPPLEMENTAL_RULES.fatigue.staminaLoss);
    stats.itemEffects!.push({ key: 'fatigue', value: 20, value2: 0, source: '肾上腺素后疲劳', until: now + SUPPLEMENTAL_RULES.fatigue.durationMs });
  }
  stats.itemEffects = (stats.itemEffects ?? []).filter((effect) => effect.until === undefined || effect.until > now);
  return stats.itemEffects.filter((effect) => effect.key === key).reduce((sum, effect) => sum + effect.value, 0);
}

function transferItemEffects(game: Game, now: number, from: Player, to: Player, item: string) {
  from.battle!.itemEffects = (from.battle!.itemEffects ?? []).filter(effect => effect.source !== item);
  if (from.battle!.weapon === item) {
    const best = (from.battle!.inventory ?? []).map(name => ({ name, definition: itemDefinition(name) })).filter(entry => ['melee_damage', 'ranged_damage'].includes(entry.definition.effectKey)).sort((a, b) => b.definition.effectValue - a.definition.effectValue)[0];
    from.battle!.weapon = best?.name ?? 'Fists'; from.battle!.weaponPower = best?.definition.effectValue ?? BATTLE_CONFIG.weapons.Fists.power;
  }
  const definition = itemDefinition(item);
  if (!definition.consumable) applyBattleItemEffect(game, now, to, item);
  pushEvent(game, now, 'itemDrop', `转交${item}`, from, undefined, { eventType: 'item_drop', itemName: item });
  pushEvent(game, now, 'itemPickup', `收到${item}`, to, undefined, { eventType: 'item_pickup', itemName: item });
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
  return itemDefinition(item).searchWeight;
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

function allianceCandidate(game: Game, player: Player) {
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
      !candidate.battle?.eliminated &&
      candidate.battle?.areaId === player.battle?.areaId,
  );
  if (!partner || !player.battle || !partner.battle) {
    return undefined;
  }
  return partner;
}

function allyPlayers(game: Game, now: number, player: Player, partner: Player, proposal?: string) {
  if (!player.battle || !partner.battle || player.id === partner.id) return false;
  if (player.battle.alliance === partner.id && partner.battle.alliance === player.id) return false;
  const formationQualifies = (relationshipBetween(game, player, partner, now)?.strength ?? 0) <= 0;
  player.battle.alliance = partner.id;
  partner.battle.alliance = player.id;
  player.battle.combatTargetId = undefined;
  player.battle.combatUntil = 0;
  partner.battle.combatTargetId = undefined;
  partner.battle.combatUntil = 0;
  delete player.pathfinding; delete partner.pathfinding;
  player.speed = 0; partner.speed = 0;
  recordBattleDialogue(game, now, player, partner, 'alliance', proposal || defaultAllianceProposal(game, player, partner));
  recordBattleDialogue(game, now + 1, partner, player, 'alliance', allianceReply(game, partner, player));
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
  updateRelationship(game, player, partner, 15, '结盟');
  if (formationQualifies) awardReferenceScore(game, now, 'SCR_P04', [player, partner]);
  return true;
}

function sanitizeDialogue(text?: string) {
  return String(text ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 56);
}

function defaultAllianceProposal(game: Game, speaker: Player, _listener: Player) {
  const line = personaForCharacter(speaker.battle?.characterId).allianceLine;
  if ((speaker.battle?.hp ?? 100) < 45) return `先停火。${line}`;
  return line;
}

function allianceReply(game: Game, speaker: Player, listener: Player) {
  const edge = game.world.battle?.relationshipEdges?.find((candidate) => {
    const a = speaker.battle?.characterId; const b = listener.battle?.characterId;
    return (candidate.a === a && candidate.b === b) || (candidate.a === b && candidate.b === a);
  });
  const line = personaForCharacter(speaker.battle?.characterId).replyLine;
  if ((edge?.strength ?? 0) >= 35) return `我信你。${line}`;
  return line;
}

function recordBattleDialogue(game: Game, now: number, speaker: Player, listener: Player | undefined, kind: string, rawText: string) {
  const battle = game.world.battle!; const text = sanitizeDialogue(rawText);
  if (!text) return;
  const entry: BattleDialogue = { id: battle.nextDialogueId ?? 1, ts: now, speakerId: speaker.id, ...(listener ? { listenerId: listener.id } : {}), kind, text };
  battle.nextDialogueId = entry.id + 1;
  battle.dialogueLog = [entry, ...(battle.dialogueLog ?? [])].slice(0, 40);
  const movingDialogue = kind === 'combat' || kind === 'support';
  speaker.activity = { description: `${playerName(game, speaker)}：“${text}”`, emoji: kind === 'combat' ? 'FIRE' : kind === 'trade' ? 'TRADE' : 'TALK', until: now + (movingDialogue ? 2200 : 5500) };
  speaker.battle!.nextLocomotionAt = now + (movingDialogue ? 900 : 5750);
  pushEvent(game, now, 'dialogue', `【交谈】${playerName(game, speaker)}：${text}`, speaker, listener);
}

function updateRelationship(game: Game, first: Player, second: Player, delta: number, reason: string) {
  const battle = game.world.battle!;
  const a = first.battle?.characterId;
  const b = second.battle?.characterId;
  if (!a || !b) return;
  let edge = battle.relationshipEdges?.find((candidate) => (candidate.a === a && candidate.b === b) || (candidate.a === b && candidate.b === a));
  if (!edge) {
    edge = { id: `REL_${a}_${b}`, a, b, type: 'stranger', strength: 0, hidden: false, mutable: true, triggerWeight: RELATION_GENERATION.params.stranger_trigger_weight, source: 'runtime' };
    battle.relationshipEdges!.push(edge);
  }
  if (edge.mutable === false) return;
  const eventKey = ({ '结盟': 'ally_success', '危局守护': 'rescue_success', '物资交易': 'trade_share', '背叛': 'betray', '攻击': 'wound', '淘汰': 'eliminate' } as Record<string, string>)[reason];
  const rule = REFERENCE_RELATION_CHANGES.find(row => row.event_key === eventKey);
  const configuredDelta = typeof rule?.delta_strength === 'number' ? rule.delta_strength : delta;
  edge.strength = Math.max(-100, Math.min(100, edge.strength + configuredDelta));
  if (eventKey === 'betray') edge.type = edge.type === 'lover' ? 'ex' : 'rival';
  edge.lastReason = reason;
}

function freezeEliminatedRelationships(game: Game, characterId?: string) {
  if (!characterId) return;
  for (const edge of game.world.battle?.relationshipEdges ?? []) if (edge.a === characterId || edge.b === characterId) {
    edge.mutable = false;
    edge.lastReason = edge.lastReason ?? '淘汰后冻结';
  }
}

function relationshipBetween(game: Game, first: Player, second: Player, now = game.world.battle?.lastTick ?? 0) {
  if ([first, second].some(player => player.battle?.itemEffects?.some(effect => effect.key === 'disguise' && (effect.until === undefined || effect.until > now)))) return undefined;
  const a = first.battle?.characterId;
  const b = second.battle?.characterId;
  return game.world.battle?.relationshipEdges?.find((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
}

export function moveToBattleArea(game: Game, now: number, player: Player, areaId: string) {
  const currentAreaId = player.battle?.areaId ?? 'A01';
  const isEmergencyEvacuation = !game.world.battle?.openAreas?.includes(currentAreaId);
  if (!isEmergencyEvacuation && isAreaLocked(game.world.battle, now, currentAreaId)) return false;
  if (areaId === 'S01' && (player.battle?.characterId !== 'C12' || !game.world.battle?.truthUnlocked)) return false;
  if (areaId !== 'S01' && !game.world.battle?.openAreas?.includes(areaId)) return false;
  if (!isEmergencyEvacuation && areaId === 'A09' && itemModifier(player.battle!, 'unlock', now) <= 0) return false;
  if (areaId === 'A01' && itemModifier(player.battle!, 'cold_resist', now) <= 0) { player.battle!.hp = Math.max(1, player.battle!.hp - 10); player.battle!.stress = (player.battle!.stress ?? 0) + 5; }
  const candidates = battleAreaNavigationPoints(areaId, game.worldMap.width, game.worldMap.height);
  const destination = candidates.find((candidate) => candidate.x > 0 && candidate.y > 0 && candidate.x < game.worldMap.width - 1 && candidate.y < game.worldMap.height - 1 && !blocked(game, now, candidate, player.id));
  if (!destination) return false;
  const oldAreaId = player.battle!.areaId;
  if (areaId === 'A09') {
    const charge = player.battle!.itemEffects?.find(effect => effect.key === 'unlock' && itemDefinition(effect.source).consumable);
    const permanent = player.battle!.itemEffects?.some(effect => effect.key === 'unlock' && !itemDefinition(effect.source).consumable);
    if (charge && !permanent) player.battle!.itemEffects = player.battle!.itemEffects!.filter(effect => effect !== charge);
  }
  player.battle!.areaId = areaId;
  player.battle!.areaEnteredAt = now;
  player.battle!.areaSearches = 0;
  player.battle!.stamina = Math.max(0, (player.battle!.stamina ?? 0) - BATTLE_CONFIG.runtime.moveStaminaCost);
  movePlayer(game, now, player, destination);
  player.activity = { description: `${playerName(game, player)} 正在前往${areaName(areaId)}`, emoji: 'MOVE', until: now + 2000 };
  pushEvent(game, now, 'move', `【移动】${playerName(game, player)} 进入${areaName(areaId)}。`, player, undefined, { vars: { '区域A': areaName(oldAreaId ?? ''), '区域B': areaName(areaId) } });
  return true;
}

export function awardReferenceScore(game: Game, now: number, eventId: string, participants: Player[]) {
  const rule = SCORE_EVENTS[eventId];
  if (!rule) throw new Error(`Unknown score event ${eventId}`);
  const anchored = rule.anchor === 'C12_heat' ? participants.filter(player => player.battle?.characterId === 'C12') : rule.anchor === 'participants_max_heat' ? participants : participants.slice(0, 1);
  return awardPopularity(game, now, rule.base, anchored, rule.combo, rule.heat);
}

function awardPopularity(game: Game, now: number, baseScore: number, participants: Player[], comboEligible = true, heatApplies = true) {
  const battle = game.world.battle!;
  const heat = heatApplies && baseScore > 0 ? Math.max(0, ...participants.map(player => player.battle?.heat ?? 0)) : 0;
  const result = scoreAward(now, baseScore, heat, comboEligible, battle.scoreLedger ?? []);
  battle.scoreLedger = result.entries;
  battle.scoreTimestamps = result.entries.map(entry => entry.ts);
  const gained = tunedPopularityGain(battle.popularity ?? 0, result.gained);
  battle.popularity = Math.max(0, Math.round(((battle.popularity ?? 0) + gained) * 100) / 100);
  battle.popularityPeak = Math.max(battle.popularityPeak ?? 0, battle.popularity);
  battle.comboCount = result.entries.length;
  battle.comboMultiplier = result.multiplier;
  if (baseScore > 0) battle.lastScoreEvent = now;
  recordHeatPoint(battle, now);
  const milestones = Math.floor(battle.popularity / BATTLE_CONFIG.match.heatRewardStep);
  const newRewards = Math.max(0, milestones - (battle.heatMilestoneClaimed ?? 0));
  if (newRewards) {
    battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, (battle.interventionPoints ?? 0) + newRewards);
    battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + newRewards;
    battle.heatMilestoneClaimed = milestones;
    pushEvent(game, now, 'heat', `【热度】直播热度达到 ${battle.popularity}，主办方获得 ${newRewards} 点干预点。`);
  }
  return gained;
}

function recordHeatPoint(battle: BattleState, now: number) { const history = battle.heatHistory ??= []; const last = history[history.length - 1]; if (last && now - last.ts < 5000) last.value = battle.popularity ?? 0; else history.push({ ts: now, value: battle.popularity ?? 0 }); battle.heatHistory = history.slice(-30); }

function triggerCharacterStory(game: Game, now: number, player: Player, areaId: string, foundItem?: string) {
  const stats = player.battle!;
  const story = CHARACTER_STORIES[stats.characterId ?? ''];
  const battle = game.world.battle!;
  const triggerId = `${stats.characterId}:${story?.title}`;
  if (!story || story.areaId !== areaId || story.item !== foundItem || battle.storyTriggers?.includes(triggerId)) return;
  battle.storyTriggers!.push(triggerId);
  const boost = (key: string, value: number) => { stats.itemEffects ??= []; stats.itemEffects.push({ key, value, value2: 0, source: story.title, until: now + 60000 }); };
  const related = (battle.relationshipEdges ?? []).find(edge => edge.a === stats.characterId || edge.b === stats.characterId);
  const relationText = related ? `${related.a}与${related.b}：${relationshipTypeName(related.type)}，强度${related.strength}` : '暂未发现相关人物';
  switch (stats.characterId) {
    case 'C01': boost('damage_reduction_pct', 10); boost('protect_others', 1); break;
    case 'C02': case 'C05': case 'C11': addItemIntel(game, now, player, story.title, `${story.description} ${relationText}`); break;
    case 'C03': addItemIntel(game, now, player, story.title, `建议：${alivePlayers(game).some(candidate => candidate.battle!.hp < candidate.battle!.maxHp * 0.3) ? '赞助低生命角色以延长对抗' : '在资源最稀缺区域投放盛宴，促成相遇'}。`); break;
    case 'C04': { boost('damage_buff_pct', 10); const enemy = nearestEnemy(game, player, now); if (enemy) attack(game, now, player, enemy); break; }
    case 'C06': boost('clue_search_bonus', 1); addItemIntel(game, now, player, story.title, story.description); break;
    case 'C07': boost('move_speed_pct', 15); if (player.pathfinding) player.pathfinding.state = { kind: 'needsPath' }; break;
    case 'C08': { const partnerId = related?.a === stats.characterId ? related?.b : related?.a; const partner = alivePlayers(game).find(candidate => candidate.battle?.characterId === partnerId); if (partner) updateRelationship(game, player, partner, 5, '物资交易'); addItemIntel(game, now, player, story.title, `${story.description} ${relationText}`); break; }
    case 'C09': boost('damage_buff_pct', 10); addItemIntel(game, now, player, story.title, Object.entries(BATTLE_CONFIG.areaItems).map(([id, items]) => `${areaName(id)}：${items.filter(item => /damage/.test(itemDefinition(item).effectKey)).join('、') || '无武器'}`).join('；')); break;
    case 'C10': {
      const planned = battle.pendingClosingAreas?.length ? battle.pendingClosingAreas : (battle.openAreas ?? []).filter(id => id !== 'S01').sort((a, b) => alivePlayers(game).filter(p => p.battle?.areaId === a).length - alivePlayers(game).filter(p => p.battle?.areaId === b).length).slice(0, 1);
      battle.pendingClosingAreas = [...planned];
      addItemIntel(game, now, player, story.title, `下轮禁区包含：${planned.map(areaName).join('、')}`); break;
    }
    case 'C12': battle.truthPathKnown = true; break;
  }
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
  if (player.battle?.characterId !== 'C12') return false;
  if (!battle.truthPathKnown || (battle.truthClues?.length ?? 0) < 3) return false;
  if (battle.truthRevealed) return false;
  battle.truthUnlocked = true;
  battle.truthRevealed = true;
  player.battle.areaId = 'S01';
  pushEvent(game, now, 'truth', '【真相】N-00 进入真相之间，制造者日志向全场公开。', player);
  awardReferenceScore(game, now, 'SCR_P12', [player]);
  completeMission(game, now, 'HID_06');
  return true;
}

function updateMissionProgress(game: Game, now: number) {
  const battle = game.world.battle!;
  if (popularityRatingFor(battle.popularity ?? 0, battle.interventionSpentTotal ?? 0) === 'S' && !battle.completedMissionIds?.includes('MAIN_S')) {
    battle.completedMissionIds!.push('MAIN_S');
    battle.mainMissionDone = true;
    pushEvent(game, now, 'mission', '【任务】主线目标完成：直播热度达到 S 级。');
  }
  const c05 = alivePlayers(game).find((player) => player.battle?.characterId === 'C05');
  if (c05 && alivePlayers(game).length <= 3) completeMission(game, now, 'HID_01');
  const c09 = [...game.world.players.values()].find((player) => player.battle?.characterId === 'C09');
  if (c09?.battle?.eliminated) completeMission(game, now, 'HID_02');
  const c02 = alivePlayers(game).find((player) => player.battle?.characterId === 'C02');
  const c07 = alivePlayers(game).find((player) => player.battle?.characterId === 'C07');
  if (c02?.battle?.alliance === c07?.id) completeMission(game, now, 'HID_03');
  const finalists = alivePlayers(game); if (finalists.length === 2 && finalists.some((player) => player.battle?.characterId === 'C01') && finalists.some((player) => player.battle?.characterId === 'C04')) completeMission(game, now, 'HID_05');
}

function completeMission(game: Game, now: number, missionId: string, participants: Player[] = []) {
  const battle = game.world.battle!;
  const mission = battle.hiddenMissions?.find((candidate) => candidate.id === missionId);
  if (!mission || battle.completedMissionIds?.includes(missionId)) return;
  mission.status = '已完成';
  battle.completedMissionIds!.push(missionId);
  pushEvent(game, now, 'mission', `【任务】隐藏任务「${mission.title}」已完成。`);
  const definition = HIDDEN_MISSIONS.find((candidate) => candidate.id === missionId);
  if (definition) {
    const source = REFERENCE_HIDDEN_MISSIONS.find(row => row.mission_id === missionId)!;
    const targetIds: string[] = [...('targetA' in definition ? [definition.targetA] : []), ...('targetB' in definition ? [definition.targetB] : [])];
    const targets = participants.length ? participants : [...game.world.players.values()].filter(player => targetIds.includes(player.battle?.characterId ?? ''));
    awardPopularity(game, now, definition.score, targets, false, source.heat_multiplier_applies === true);
    const reward = BATTLE_CONFIG.match.hiddenMissionRewardPoints;
    battle.interventionPoints = Math.min(battle.interventionPointsMax ?? 30, (battle.interventionPoints ?? 0) + reward);
    battle.interventionEarnedTotal = (battle.interventionEarnedTotal ?? 0) + reward;
  }
}

function alivePlayers(game: Game) {
  return [...game.world.players.values()].filter((player) => !player.battle?.eliminated);
}

export function resolveCloseEncounters(game: Game, now: number, players = alivePlayers(game)) {
  const battle = game.world.battle!;
  const busy = new Set<string>();
  battle.encounterCooldowns = (battle.encounterCooldowns ?? []).filter((entry) => entry.until > now);
  for (let firstIndex = 0; firstIndex < players.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < players.length; secondIndex++) {
      const first = players[firstIndex];
      const second = players[secondIndex];
      if (!first.battle || !second.battle || first.battle.eliminated || second.battle.eliminated) continue;
      if (busy.has(first.id) || busy.has(second.id) || first.battle.areaId !== second.battle.areaId) continue;
      if (distance(first.position, second.position) > BATTLE_CONFIG.match.closeEncounterRange) continue;
      const pairId = [first.id, second.id].sort().join('|');
      if (battle.encounterCooldowns.some((entry) => entry.pairId === pairId)) continue;

      const speaker = battleRandom(game) < 0.5 ? first : second;
      const listener = speaker.id === first.id ? second : first;
      const disposition = speaker.battle!.alliance === listener.id ? 'ally' : encounterDisposition(game, speaker, listener);
      const weapon = BATTLE_CONFIG.weapons[speaker.battle!.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
      const canShoot = disposition === 'attack' && distance(speaker.position, listener.position) <= weapon.range;
      const baseline = captureReplayPatchBaseline(game);
      if (canShoot) {
        attack(game, now, speaker, listener);
        recordReplayAction(game, now, speaker, 'attack', 'rule', true, '近距离遭遇：按人设立即开火', listener.id, undefined, baseline);
      } else {
        const result = socialEncounter(game, now, speaker, listener, disposition);
        recordReplayAction(game, now, speaker, 'encounterTalk', 'rule', true, result.reason, listener.id, undefined, baseline);
      }
      speaker.battle!.lastBattleAction = now;
      listener.battle!.lastBattleAction = now;
      battle.encounterCooldowns.push({ pairId, until: now + BATTLE_CONFIG.match.closeEncounterCooldownMs });
      busy.add(first.id);
      busy.add(second.id);
    }
  }
}

function socialEncounter(game: Game, now: number, speaker: Player, listener: Player, disposition: 'attack' | 'ally' | 'flee' | 'observe') {
  const speakerPersona = personaForCharacter(speaker.battle?.characterId);
  const listenerPersona = personaForCharacter(listener.battle?.characterId);
  const relation = relationshipBetween(game, speaker, listener);
  const allied = speaker.battle?.alliance === listener.id;
  let kind = 'probe';
  let delta = 1;
  let reason = '近距离试探';
  let opening = speakerPersona.tradeLine;
  if (allied) {
    kind = 'rapport'; delta = 2; reason = '近距离并肩交流'; opening = speakerPersona.allianceLine;
  } else if (disposition === 'ally') {
    kind = 'truce'; delta = 4; reason = '近距离停火交涉'; opening = speakerPersona.allianceLine;
  } else if (disposition === 'attack' || disposition === 'flee') {
    kind = 'warning'; delta = -3; reason = '近距离警告'; opening = speakerPersona.attackLines[0];
  } else if ((relation?.strength ?? 0) < 0) {
    kind = 'warning'; delta = -2; reason = '敌意试探'; opening = speakerPersona.attackLines[0];
  }
  recordBattleDialogue(game, now, speaker, listener, kind, opening);
  recordBattleDialogue(game, now + 1, listener, speaker, kind, listenerPersona.replyLine);
  updateRelationship(game, speaker, listener, delta, reason);
  pushEvent(game, now + 2, 'relationship', `【关系】${playerName(game, speaker)}与${playerName(game, listener)}${delta > 0 ? '关系升温' : '关系恶化'} ${Math.abs(delta)} 点。`, speaker, listener);
  awardPopularity(game, now, kind === 'warning' ? 7 : 5, [speaker, listener]);
  return { delta, reason, kind };
}

function nearestEnemy(game: Game, player: Player, now: number) {
  const candidates = alivePlayers(game).filter(
    (candidate) => candidate.id !== player.id &&
      (candidate.battle?.smokeUntil ?? 0) <= now &&
      candidate.id !== player.battle?.alliance &&
      candidate.battle?.areaId === player.battle?.areaId,
  );
  const bountyTarget = bountyTargetFor(game, player);
  if (bountyTarget && candidates.some((candidate) => candidate.id === bountyTarget.id)) return bountyTarget;
  const lockedTarget = (player.battle?.combatUntil ?? 0) > now && player.battle?.combatTargetId
    ? candidates.find((candidate) => candidate.id === player.battle?.combatTargetId)
    : undefined;
  if (lockedTarget) return lockedTarget;
  return candidates.sort(
    (a, b) => distance(player.position, a.position) - distance(player.position, b.position),
  )[0];
}

function globallyTrackedOpponent(game: Game, player: Player) {
  const playerArea = player.battle?.areaId ?? 'A01';
  return alivePlayers(game)
    .filter((candidate) => candidate.id !== player.id && candidate.id !== player.battle?.alliance)
    .map((candidate) => {
      const relation = relationshipBetween(game, player, candidate);
      const rivalPriority = relation?.type === 'rival' ? -4 : 0;
      const hostilityPriority = Math.min(0, (relation?.strength ?? 0) / 20);
      const hops = areaHopDistance(game, playerArea, candidate.battle?.areaId ?? 'A01');
      const hpRatio = (candidate.battle?.hp ?? 0) / Math.max(1, candidate.battle?.maxHp ?? 1);
      return { candidate, score: hops * 10 + hpRatio * 2 + rivalPriority + hostilityPriority };
    })
    .sort((a, b) => a.score - b.score)[0]?.candidate;
}

function areaHopDistance(game: Game, startAreaId: string, targetAreaId: string) {
  if (startAreaId === targetAreaId) return 0;
  const openAreas = new Set(game.world.battle?.openAreas ?? []);
  const queue = [{ areaId: startAreaId, distance: 0 }];
  const visited = new Set([startAreaId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacentAreaIds(current.areaId).map(String)) {
      if (visited.has(neighbor) || !openAreas.has(neighbor)) continue;
      if (neighbor === targetAreaId) return current.distance + 1;
      visited.add(neighbor);
      queue.push({ areaId: neighbor, distance: current.distance + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function bountyTargetFor(game: Game, player: Player) {
  const battle = game.world.battle;
  if (!battle?.bountyPlayerId || battle.bountyPlayerId === player.id || battle.bountyHunterId && battle.bountyHunterId !== player.id) return undefined;
  const target = game.world.players.get(battle.bountyPlayerId as any);
  return target?.battle?.eliminated ? undefined : target;
}

function playerNameById(game: Game, playerId?: string) {
  if (!playerId) return '未知角色';
  const player = game.world.players.get(playerId as any);
  return player ? playerName(game, player) : '未知角色';
}

function nextOpenAreaToward(game: Game, startAreaId: string, targetAreaId: string) {
  if (startAreaId === targetAreaId) return undefined;
  const openAreas = new Set(game.world.battle?.openAreas ?? []);
  const queue: Array<{ areaId: string; firstStep?: string }> = [{ areaId: startAreaId }];
  const visited = new Set([startAreaId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacentAreaIds(current.areaId).map(String)) {
      if (visited.has(neighbor) || !openAreas.has(neighbor)) continue;
      const firstStep = current.firstStep ?? neighbor;
      if (neighbor === targetAreaId) return firstStep;
      visited.add(neighbor);
      queue.push({ areaId: neighbor, firstStep });
    }
  }
  return undefined;
}

export function encounterDisposition(game: Game, player: Player, target: Player): 'attack' | 'ally' | 'flee' | 'observe' {
  const persona = personaForCharacter(player.battle?.characterId);
  const relation = relationshipBetween(game, player, target);
  const hpRatio = (player.battle?.hp ?? 0) / Math.max(1, player.battle?.maxHp ?? 100);
  const targetHpRatio = (target.battle?.hp ?? 0) / Math.max(1, target.battle?.maxHp ?? 100);
  const relationStrength = relation?.strength ?? 0;
  const rivalBoost = relation?.type === 'rival' ? 0.34 : 0;
  const trustBoost = relationStrength > 0 ? Math.min(0.35, relationStrength / 220) : 0;
  const hostilityBoost = relationStrength < 0 ? Math.min(0.35, Math.abs(relationStrength) / 180) : 0;
  const weakness = Math.max(0, targetHpRatio - hpRatio);
  const trusted = relationStrength >= 25 && relation?.type !== 'rival';
  const scores = [
    {
      action: 'attack' as const,
      score: (trusted ? persona.attackBias * 0.32 : 0.95 + persona.attackBias * 1.2) + rivalBoost + hostilityBoost + Math.max(0, hpRatio - targetHpRatio) * 0.3,
    },
    { action: 'ally' as const, score: trusted ? persona.allianceBias + trustBoost : persona.allianceBias * 0.16 },
    { action: 'flee' as const, score: persona.retreatBias + weakness * 0.7 + (hpRatio < 0.4 ? 0.45 : 0) },
    { action: 'observe' as const, score: trusted ? 0.12 : 0.04 },
  ];
  const total = scores.reduce((sum, entry) => sum + Math.max(0, entry.score), 0);
  let cursor = battleRandom(game) * total;
  for (const entry of scores) {
    cursor -= Math.max(0, entry.score);
    if (cursor <= 0) return entry.action;
  }
  return 'observe';
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
  const destination = tacticalDestination(game, now, player, target, mode);
  if (!destination) {
    return false;
  }
  movePlayer(game, now, player, destination);
  return true;
}

function tacticalDestination(
  game: Game,
  now: number,
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
  if (mode === 'approach') {
    const weapon = BATTLE_CONFIG.weapons[player.battle?.weapon as keyof typeof BATTLE_CONFIG.weapons] ?? BATTLE_CONFIG.weapons.Fists;
    const firingTiles = openTilesNear(game, player, targetTile, Math.max(3, Math.ceil(weapon.range) + 1))
      .filter((candidate) => distance(candidate, target.position) <= Math.max(1.2, weapon.range * 0.82))
      .sort((a, b) => distance(a, origin) - distance(b, origin))
      .slice(0, 6);
    const shortest = firingTiles
      .map((candidate) => {
        const route = findRoute(game, now, player, candidate);
        const reachesCandidate = route && !route.newDestination;
        const firstTs = route?.path[0]?.[4];
        const lastTs = route?.path.at(-1)?.[4];
        return {
          candidate,
          travelMs: reachesCandidate && firstTs !== undefined && lastTs !== undefined
            ? lastTs - firstTs
            : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a.travelMs - b.travelMs)[0];
    if (shortest && Number.isFinite(shortest.travelMs)) return shortest.candidate;
  }
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

function openTilesNear(game: Game, player: Player, origin: { x: number; y: number }, radius: number, now = Date.now()) {
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
      if (isInPlayerBattleArea(game, player, candidate) && !blocked(game, now, candidate, player.id)) {
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

type ReplayPatchBaseline = {
  globals: string;
  openAreas: string;
  players: Map<string, string>;
  relationships: Map<string, string>;
  resources: Map<string, string>;
  truthClues: Set<string>;
  storyTriggers: Set<string>;
};

function captureReplayPatchBaseline(game: Game): ReplayPatchBaseline {
  const battle = game.world.battle!;
  return {
    globals: replayGlobalsDigest(battle),
    openAreas: JSON.stringify(battle.openAreas ?? []),
    players: new Map([...game.world.players.values()].map((entry) => [entry.id, JSON.stringify(battleReplayPlayerFrameFor(entry))])),
    relationships: new Map((battle.relationshipEdges ?? []).map((entry) => [entry.id, JSON.stringify(entry)])),
    resources: new Map((battle.areaResources ?? []).map((entry) => [entry.areaId, JSON.stringify(entry)])),
    truthClues: new Set(battle.truthClues ?? []),
    storyTriggers: new Set(battle.storyTriggers ?? []),
  };
}

function replayGlobalsDigest(battle: BattleState) {
  return JSON.stringify({
    popularity: battle.popularity ?? 0,
    zoneClosesAt: battle.zoneClosesAt,
    interventionPoints: battle.interventionPoints ?? 0,
    interventionPointsMax: battle.interventionPointsMax ?? 30,
    areaLocks: battle.areaLocks ?? [],
    phase: battle.phase ?? 'early',
    day: battle.day ?? 1,
    timeOfDay: battle.timeOfDay ?? 'day',
    openAreas: battle.openAreas ?? [],
  });
}

function replayPatchSince(
  game: Game,
  baseline: ReplayPatchBaseline,
): BattleReplayPatch {
  const battle = game.world.battle!;
  const players = [...game.world.players.values()]
    .map(battleReplayPlayerFrameFor)
    .filter((entry) => baseline.players.get(entry.id) !== JSON.stringify(entry));
  const relationships = (battle.relationshipEdges ?? [])
    .filter((entry) => baseline.relationships.get(entry.id) !== JSON.stringify(entry))
    .map(({ id, strength, hidden, lastReason }) => ({ id, strength, hidden, lastReason }));
  const resources = (battle.areaResources ?? [])
    .filter((entry) => baseline.resources.get(entry.areaId) !== JSON.stringify(entry))
    .map(({ areaId, remaining, max }) => ({ areaId, remaining, max }));
  const currentOpenAreas = JSON.stringify(battle.openAreas ?? []);
  return {
    rngState: battle.rngState ?? battle.seed ?? 1,
    popularity: battle.popularity ?? 0,
    zoneClosesAt: battle.zoneClosesAt,
    interventionPoints: battle.interventionPoints ?? 0,
    interventionPointsMax: battle.interventionPointsMax ?? 30,
    areaLocks: (battle.areaLocks ?? []).map((entry) => ({ ...entry })),
    phase: battle.phase ?? 'early',
    day: battle.day ?? 1,
    timeOfDay: battle.timeOfDay ?? 'day',
    ...(currentOpenAreas !== baseline.openAreas ? { openAreas: [...(battle.openAreas ?? [])] } : {}),
    players,
    relationships,
    resources,
    truthCluesAdded: (battle.truthClues ?? []).filter((entry) => !baseline.truthClues.has(entry)),
    storyTriggersAdded: (battle.storyTriggers ?? []).filter((entry) => !baseline.storyTriggers.has(entry)),
  };
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
  replayBaseline?: ReplayPatchBaseline,
  storyApproach?: string,
  storyEventId?: string,
) {
  const battle = game.world.battle!;
  const patch = accepted && replayBaseline ? replayPatchSince(game, replayBaseline) : undefined;
  const hasReplayChange = !replayBaseline || replayBaseline.globals !== replayGlobalsDigest(battle) || Boolean(
    patch && (
      patch.players.length > 0 ||
      patch.relationships.length > 0 ||
      patch.resources.length > 0 ||
      patch.truthCluesAdded.length > 0 ||
      patch.storyTriggersAdded.length > 0
    ),
  );
  if (action === 'worldTick' && !hasReplayChange) return;
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
  if (storyApproach) entry.storyApproach = storyApproach;
  if (storyEventId) entry.storyEventId = storyEventId;
  if (reason) entry.reason = reason.slice(0, 140);
  if (patch) entry.patch = patch;
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
    actionId: Math.max(0, (battle.nextActionId ?? 1) - 1),
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
    zoneClosesAt: battle.zoneClosesAt,
    interventionPoints: battle.interventionPoints ?? 0,
    interventionPointsMax: battle.interventionPointsMax ?? 30,
    areaLocks: (battle.areaLocks ?? []).map((entry) => ({ ...entry })),
    phase: battle.phase ?? 'early',
    day: battle.day ?? 1,
    timeOfDay: battle.timeOfDay ?? 'day',
    players: [...game.world.players.values()].map(battleReplayPlayerFrameFor),
    relationships: (battle.relationshipEdges ?? []).map(({ id, strength, hidden, lastReason }) => ({ id, strength, hidden, lastReason })),
    resources: (battle.areaResources ?? []).map(({ areaId, remaining, max }) => ({ areaId, remaining, max })),
    truthClues: [...(battle.truthClues ?? [])],
    storyTriggers: [...(battle.storyTriggers ?? [])],
  };
}

function battleReplayPlayerFrameFor(player: Player): BattleReplayPlayerFrame {
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

export function pushEvent(
  game: Game,
  now: number,
  kind: string,
  text: string,
  actor?: Player,
  target?: Player,
  details?: { from?: { x: number; y: number }; to?: { x: number; y: number }; damage?: number; weapon?: string; burst?: number; areaId?: string; eventType?: string; vars?: Record<string, string>; privateOnly?: boolean; effectKey?: string; itemName?: string },
) {
  const battle = game.world.battle!;
  const areaId = details?.areaId ?? actor?.battle?.areaId ?? target?.battle?.areaId;
  const eventTypes: Record<string, string> = { move: 'char_move', search: 'char_search', loot: 'char_search', item: 'item_use', attack: 'combat_hit', eliminate: target ? 'chareliminatedcombat' : 'char_eliminated', alliance: 'rel_alliance', betrayal: 'rel_betrayal', story: 'story_trigger', intervention: 'gm_intervene', mission: 'mission_hint', truth: 'story_trigger' };
  const type = details?.eventType ?? eventTypes[kind] ?? kind;
  const logs = referenceLog(type, {
    A: actor ? playerName(game, actor) : '未知', B: target ? playerName(game, target) : '未知',
    '角色': target && kind === 'eliminate' ? playerName(game, target) : actor ? playerName(game, actor) : '未知',
    '区域': areaName(areaId ?? ''), '物品': details?.itemName ?? '', '效果': text,
    '操作描述': text.replace(/^【[^】]+】/, ''), ...details?.vars,
  }, text, details?.privateOnly);
  battle.feed.unshift({
    id: battle.nextEventId++,
    ts: now,
    kind,
    actor: actor?.id,
    target: target?.id,
    from: details?.from,
    to: details?.to,
    damage: details?.damage,
    weapon: details?.weapon,
    burst: details?.burst,
    areaId,
    ...logs,
    effectKey: details?.effectKey,
    itemName: details?.itemName,
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

function weaponBurst(weapon: string) {
  return ({ Fists: 1, Pistol: 2, Shotgun: 1, Rifle: 4, Sniper: 1 } as Record<string, number>)[weapon] ?? 1;
}

function actionName(action: string) {
  return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查', encounterTalk: '近距交谈' } as Record<string, string>)[action] ?? action;
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
