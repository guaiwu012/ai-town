import { useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { BATTLE_ACTIONS, BATTLE_CONFIG, adjacentAreaIds, profileForCharacterId } from '../../data/battleRoyaleConfig';
import { ServerGame } from '../hooks/serverGame';
import { DeepSeekConfig } from './DeepSeekConfigGate';

const DRIVER_KEY = 'ai-battleground:decision-driver-id';
const MAX_CONCURRENT_REQUESTS = 2;

type Decision = {
  action: string;
  targetPlayerId?: string;
  targetAreaId?: string;
  reason?: string;
};

type Props = { worldId: Id<'worlds'>; game: ServerGame; config?: DeepSeekConfig; enabled?: boolean };

export default function DecisionDriver({ worldId, game, config, enabled = true }: Props) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const driverId = useMemo(getDriverId, []);
  const inFlight = useRef(new Map<string, AbortController>());
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!config || !enabled) return;
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
        .slice(0, Math.max(0, MAX_CONCURRENT_REQUESTS - inFlight.current.size));
      duePlayers.forEach((player) => {
        const controller = new AbortController();
        inFlight.current.set(player.id, controller);
        requestAndSubmitDecision(config, currentGame, worldId, driverId, player.id, sendInput, controller.signal)
          .finally(() => inFlight.current.delete(player.id));
      });
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1600);
    return () => {
      window.clearInterval(timer);
      inFlight.current.forEach((controller) => controller.abort());
      inFlight.current.clear();
    };
  }, [config, driverId, enabled, sendInput, worldId]);

  return null;
}

async function requestAndSubmitDecision(
  config: DeepSeekConfig,
  game: ServerGame,
  worldId: Id<'worlds'>,
  driverId: string,
  playerId: GameId<'players'>,
  sendInput: ReturnType<typeof useMutation>,
  signal: AbortSignal,
) {
  const player = game.world.players.get(playerId);
  if (!player?.battle) return;
  try {
    const decision = await requestDecision(config, game, playerId, signal);
    await sendInput({
      worldId,
      name: 'submitAIDecision',
      args: {
        driverId,
        playerId,
        action: decision.action,
        targetPlayerId: decision.targetPlayerId as GameId<'players'> | undefined,
        targetAreaId: decision.targetAreaId,
        reason: decision.reason,
      },
    });
  } catch (error) {
    if (signal.aborted) return;
    await sendInput({
      worldId,
      name: 'reportAIDecisionFailure',
      args: { driverId, playerId, reason: error instanceof Error ? error.message.slice(0, 100) : '浏览器请求失败' },
    });
  }
}

async function requestDecision(config: DeepSeekConfig, game: ServerGame, playerId: GameId<'players'>, signal: AbortSignal): Promise<Decision> {
  const player = game.world.players.get(playerId)!;
  const stats = player.battle!;
  const name = game.playerDescriptions.get(playerId)?.name ?? playerId;
  const profile = profileForCharacterId(stats.characterId ?? 'C01');
  const candidates = [...game.world.players.values()]
    .filter((candidate) => candidate.id !== playerId && candidate.battle && !candidate.battle.eliminated)
    .map((candidate) => ({ id: candidate.id, name: game.playerDescriptions.get(candidate.id)?.name ?? candidate.id, areaId: candidate.battle?.areaId, hp: Math.ceil(candidate.battle?.hp ?? 0), alliance: stats.alliance === candidate.id }));
  const relationships = (game.world.battle?.relationshipEdges ?? [])
    .filter((edge) => edge.a === stats.characterId || edge.b === stats.characterId)
    .map((edge) => ({ with: edge.a === stats.characterId ? edge.b : edge.a, type: edge.type, strength: edge.strength, hidden: edge.hidden }));
  const prompt = {
    role: `${name} (${stats.characterId})`,
    persona: { codename: profile.codename, strength: profile.strength, mind: profile.mind, psyche: profile.psyche, social: profile.social, aggression: profile.aggro, cooperation: profile.coop, riskPreference: profile.risk },
    self: { areaId: stats.areaId, hp: Math.ceil(stats.hp), maxHp: stats.maxHp, stamina: Math.ceil(stats.stamina ?? 0), satiety: Math.ceil(stats.satiety ?? 0), zoneTime: Math.ceil(stats.zoneTime ?? 0), stress: Math.ceil(stats.stress ?? 0), stressThreshold: stats.stressThreshold, weapon: stats.weapon, medkits: stats.medkits, materials: stats.coins, inventory: stats.inventory, alliance: stats.alliance },
    openAreas: game.world.battle?.openAreas, relationships,
    adjacentAreas: adjacentAreaIds(stats.areaId ?? 'A01'),
    candidates,
    instructions: '你是吃鸡比赛中的 AI。只返回 JSON，不要 Markdown。格式：{"action":"move|search|buy|trade|ally|attack|flee|heal|investigate","targetPlayerId":"可选候选 ID","targetAreaId":"移动时必填且只能选相邻开放区","reason":"不超过70字中文理由"}。攻击、结盟、交易只可选同区域目标。高压力或低饱食时优先撤离、治疗、搜索补给；行动需符合 persona。',
  };
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), BATTLE_CONFIG.match.llmDecisionTimeoutMs);
  const abort = () => timeoutController.abort();
  signal.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: timeoutController.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, temperature: 0.65, max_tokens: 180, messages: [{ role: 'system', content: '你是严格输出 JSON 的游戏战术代理。' }, { role: 'user', content: JSON.stringify(prompt) }] }),
    });
    if (!response.ok) throw new Error(`DS ${response.status}`);
    const json = await response.json();
    const raw = String(json.choices?.[0]?.message?.content ?? '').replace(/^```json\s*|\s*```$/g, '').trim();
    const decision = JSON.parse(raw) as Decision;
    if (!BATTLE_ACTIONS.includes(decision.action as any)) throw new Error('invalid action');
    decision.reason = String(decision.reason ?? '').slice(0, 140);
    return decision;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

function getDriverId() {
  const existing = window.localStorage.getItem(DRIVER_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(DRIVER_KEY, value);
  return value;
}
