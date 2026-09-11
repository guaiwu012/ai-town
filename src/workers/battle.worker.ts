/// <reference lib="webworker" />

import {
  acceptSupportCounter,
  applyAudienceScore,
  applyIntervention,
  activateSupportFinisher,
  claimDecisionDriver,
  heartbeatDecisionDriver,
  reportAIDecisionFailure,
  resetBattleMatch,
  setBattlePaused,
  submitAIDecision,
  submitSupportOrder,
  tickBattleRoyale,
} from '../../convex/aiTown/battleRoyale';
import { configureLocalCloudDecisions, createLocalBattle, serializeLocalBattle, type LocalBattleRuntime } from '../localBattle/createLocalBattle';
import type { LocalBattleAction, WorkerRequest, WorkerResponse } from '../localBattle/protocol';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';

const worker = self as unknown as DedicatedWorkerGlobalScope;
let game: LocalBattleRuntime | undefined;
let visible = true;
let lastPublishedAt = 0;

function setPausedSilently(paused: boolean) {
  if (!game) return;
  const battle = game.world.battle;
  if (!battle) return;
  const feed = battle.feed;
  const nextEventId = battle.nextEventId;
  setBattlePaused(game as never, Date.now(), paused);
  battle.feed = feed;
  battle.nextEventId = nextEventId;
}

function publish(force = false) {
  if (!game) return;
  const now = Date.now();
  if (!force && now - lastPublishedAt < 100) return;
  lastPublishedAt = now;
  worker.postMessage({ type: 'snapshot', snapshot: serializeLocalBattle(game, now) } satisfies WorkerResponse);
}

function runAction(name: LocalBattleAction, args: Record<string, unknown>) {
  if (!game) throw new Error('本地比赛引擎尚未启动');
  const now = Date.now();
  const battleGame = game as never;
  switch (name) {
    case 'earnIntervention': return applyAudienceScore(battleGame, now, Number(args.score ?? 0));
    case 'intervene': return applyIntervention(battleGame, now, args as never);
    case 'resetBattle': {
      const result = resetBattleMatch(battleGame, now);
      configureLocalCloudDecisions(game, now);
      return result;
    }
    case 'submitSupportOrder': return submitSupportOrder(battleGame, now, args as never);
    case 'acceptSupportCounter': return acceptSupportCounter(battleGame, now, args as never);
    case 'activateSupportFinisher': return activateSupportFinisher(battleGame, now, args as never);
    case 'claimDecisionDriver': return claimDecisionDriver(battleGame, now, String(args.driverId ?? ''));
    case 'heartbeatDecisionDriver': return heartbeatDecisionDriver(battleGame, now, String(args.driverId ?? ''));
    case 'submitAIDecision': return submitAIDecision(battleGame, now, args as never);
    case 'reportAIDecisionFailure': return reportAIDecisionFailure(battleGame, now, args as never);
  }
}

worker.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    if (message.config && typeof message.config === 'object') {
      Object.assign(BATTLE_CONFIG as unknown as Record<string, unknown>, message.config);
    }
    game = createLocalBattle();
    publish(true);
    return;
  }
  if (message.type === 'visibility') {
    if (!game) return;
    if (message.visible === visible) return;
    visible = message.visible;
    setPausedSilently(!visible);
    publish(true);
    return;
  }
  try {
    const value = runAction(message.name, message.args);
    worker.postMessage({ type: 'result', requestId: message.requestId, value } satisfies WorkerResponse);
    publish(true);
  } catch (error) {
    worker.postMessage({
      type: 'result',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : '本地比赛操作失败',
    } satisfies WorkerResponse);
  }
};

setInterval(() => {
  if (!visible || !game) return;
  const now = Date.now();
  game.numPathfinds = 0;
  for (const player of game.world.players.values()) player.tickPathfinding(game as never, now);
  for (const player of game.world.players.values()) player.tickPosition(game as never, now);
  tickBattleRoyale(game as never, now);
  publish();
}, 50);
