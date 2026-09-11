import { useEffect, useMemo, useRef } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';
import { ServerGame } from '../hooks/serverGame';
import type { LocalBattleAction } from '../localBattle/protocol';

const MAX_CONCURRENT_REQUESTS = 3;

type Props = {
  game: ServerGame;
  dispatch: (name: LocalBattleAction, args?: Record<string, unknown>) => Promise<unknown>;
  enabled?: boolean;
};

// The browser holds only the spectator lease. DeepSeek is called by a Convex
// Action, where DEEPSEEK_API_KEY remains an environment variable.
export default function DecisionDriver({ game, dispatch, enabled = true }: Props) {
  const requestCloudDecision = useAction(api.aiTown.cloudDecision.requestLocal);
  const sessionId = game.world.battle?.sessionId ?? 'initializing';
  const driverId = useMemo(() => `${sessionId}:${crypto.randomUUID()}`, [sessionId]);
  const inFlight = useRef(new Set<string>());
  const lastRequestedAt = useRef(new Map<string, number>());
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    lastRequestedAt.current.clear();
  }, [game.world.battle?.started]);

  useEffect(() => {
    if (!enabled) return;
    const tick = async () => {
      // A background tab must not keep the world alive or spend model quota.
      if (document.visibilityState !== 'visible') return;
      const currentGame = gameRef.current;
      const currentBattle = currentGame.world.battle;
      const now = Date.now();
      const leaseActive =
        currentBattle?.decisionDriverId === driverId &&
        (currentBattle.decisionDriverUntil ?? 0) > now;
      if (!leaseActive) {
        await dispatch('claimDecisionDriver', { driverId });
        return;
      }
      await dispatch('heartbeatDecisionDriver', { driverId });
      const currentSessionId = currentBattle?.sessionId;
      if (!currentSessionId) return;
      const duePlayers = [...currentGame.world.players.values()]
        .filter((player) => player.battle && !player.battle.eliminated)
        .filter((player) => (player.battle?.decisionDueAt ?? 0) <= now)
        .filter((player) => !inFlight.current.has(player.id))
        .filter(
          (player) =>
            now - (lastRequestedAt.current.get(player.id) ?? 0) >=
            BATTLE_CONFIG.match.llmDecisionIntervalMs,
        )
        .slice(0, Math.max(0, MAX_CONCURRENT_REQUESTS - inFlight.current.size));
      duePlayers.forEach((player) => {
        inFlight.current.add(player.id);
        lastRequestedAt.current.set(player.id, now);
        const snapshot = {
          world: {
            players: [...currentGame.world.players.values()].map((candidate) => candidate.serialize()),
            battle: currentBattle && {
              openAreas: currentBattle.openAreas,
              zoneClosesAt: currentBattle.zoneClosesAt,
              relationshipEdges: currentBattle.relationshipEdges,
              consumedAreaStories: currentBattle.consumedAreaStories,
              supportOrders: currentBattle.supportOrders,
            },
          },
          player: player.serialize(),
          descriptions: [...currentGame.playerDescriptions.values()].map((description) => description.serialize()),
        };
        void requestCloudDecision({ sessionId: currentSessionId, playerId: player.id, snapshot })
          .then((result) => gameRef.current.world.battle?.sessionId !== currentSessionId
            ? undefined
            : result.decision
            ? dispatch('submitAIDecision', { sessionId: currentSessionId, driverId, playerId: player.id, ...result.decision })
            : dispatch('reportAIDecisionFailure', { driverId, playerId: player.id, reason: result.reason ?? '云端模型未返回动作' }))
          .catch((error) => dispatch('reportAIDecisionFailure', {
            driverId,
            playerId: player.id,
            reason: error instanceof Error ? error.message : '云端模型请求失败',
          }))
          .finally(() => inFlight.current.delete(player.id));
      });
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1600);
    return () => {
      window.clearInterval(timer);
      inFlight.current.clear();
    };
  }, [dispatch, driverId, enabled, requestCloudDecision]);

  return null;
}
