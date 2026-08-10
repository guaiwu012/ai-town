import { useEffect, useMemo, useRef } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';
import { ServerGame } from '../hooks/serverGame';

const DRIVER_KEY = 'ai-battleground:decision-driver-id';
const MAX_CONCURRENT_REQUESTS = 2;

type Props = { worldId: Id<'worlds'>; game: ServerGame; enabled?: boolean };

// The browser holds only the spectator lease. DeepSeek is called by a Convex
// Action, where DEEPSEEK_API_KEY remains an environment variable.
export default function DecisionDriver({ worldId, game, enabled = true }: Props) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const requestCloudDecision = useAction(api.aiTown.cloudDecision.request);
  const driverId = useMemo(getDriverId, []);
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
      const currentGame = gameRef.current;
      const currentBattle = currentGame.world.battle;
      const now = Date.now();
      const leaseActive = currentBattle?.decisionDriverId === driverId && (currentBattle.decisionDriverUntil ?? 0) > now;
      if (!leaseActive) {
        await sendInput({ worldId, name: 'claimDecisionDriver', args: { driverId } });
        return;
      }
      await sendInput({ worldId, name: 'heartbeatDecisionDriver', args: { driverId } });
      if ((currentBattle?.decisionCount ?? 0) >= (currentBattle?.decisionMax ?? BATTLE_CONFIG.match.llmDecisionMaxPerMatch)) return;
      const duePlayers = [...currentGame.world.players.values()]
        .filter((player) => player.battle && !player.battle.eliminated)
        .filter((player) => (player.battle?.decisionDueAt ?? 0) <= now)
        .filter((player) => !inFlight.current.has(player.id))
        .filter((player) => now - (lastRequestedAt.current.get(player.id) ?? 0) >= BATTLE_CONFIG.match.llmDecisionIntervalMs)
        .slice(0, Math.max(0, MAX_CONCURRENT_REQUESTS - inFlight.current.size));
      duePlayers.forEach((player) => {
        inFlight.current.add(player.id);
        lastRequestedAt.current.set(player.id, now);
        void requestCloudDecision({ worldId, driverId, playerId: player.id as GameId<'players'> })
          .finally(() => inFlight.current.delete(player.id));
      });
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1600);
    return () => {
      window.clearInterval(timer);
      inFlight.current.clear();
    };
  }, [driverId, enabled, requestCloudDecision, sendInput, worldId]);

  return null;
}

function getDriverId() {
  const existing = window.localStorage.getItem(DRIVER_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(DRIVER_KEY, value);
  return value;
}
