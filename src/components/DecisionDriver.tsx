import { useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { BATTLE_ACTIONS, BATTLE_CONFIG, adjacentAreaIds } from '../../data/battleRoyaleConfig';
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

type Props = { worldId: Id<'worlds'>; game: ServerGame; config?: DeepSeekConfig };

export default function DecisionDriver({ worldId, game, config }: Props) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const driverId = useMemo(getDriverId, []);
  const inFlight = useRef(new Set<string>());
  const battle = game.world.battle;

  useEffect(() => {
    if (!config) return;
    const tick = async () => {
      const now = Date.now();
      const leaseActive = battle?.decisionDriverId === driverId && (battle.decisionDriverUntil ?? 0) > now;
      if (!leaseActive) {
        await sendInput({ worldId, name: 'claimDecisionDriver', args: { driverId } });
        return;
      }
      await sendInput({ worldId, name: 'heartbeatDecisionDriver', args: { driverId } });
      if ((battle?.decisionCount ?? 0) >= (battle?.decisionMax ?? BATTLE_CONFIG.match.llmDecisionMaxPerMatch)) return;
      const duePlayers = [...game.world.players.values()]
        .filter((player) => player.battle && !player.battle.eliminated)
        .filter((player) => (player.battle?.decisionDueAt ?? 0) <= now)
        .filter((player) => !inFlight.current.has(player.id))
        .slice(0, Math.max(0, MAX_CONCURRENT_REQUESTS - inFlight.current.size));
      duePlayers.forEach((player) => {
        inFlight.current.add(player.id);
        requestAndSubmitDecision(config, game, worldId, driverId, player.id, sendInput)
          .finally(() => inFlight.current.delete(player.id));
      });
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1600);
    return () => window.clearInterval(timer);
  }, [battle?.decisionDriverId, battle?.decisionDriverUntil, battle?.decisionCount, battle?.decisionMax, config, driverId, game, sendInput, worldId]);

  return null;
}

async function requestAndSubmitDecision(
  config: DeepSeekConfig,
  game: ServerGame,
  worldId: Id<'worlds'>,
  driverId: string,
  playerId: GameId<'players'>,
  sendInput: ReturnType<typeof useMutation>,
) {
  const player = game.world.players.get(playerId);
  if (!player?.battle) return;
  try {
    const decision = await requestDecision(config, game, playerId);
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
    await sendInput({
      worldId,
      name: 'reportAIDecisionFailure',
      args: { driverId, playerId, reason: error instanceof Error ? error.message.slice(0, 100) : '浏览器请求失败' },
    });
  }
}

async function requestDecision(config: DeepSeekConfig, game: ServerGame, playerId: GameId<'players'>): Promise<Decision> {
  const player = game.world.players.get(playerId)!;
  const stats = player.battle!;
  const name = game.playerDescriptions.get(playerId)?.name ?? playerId;
  const candidates = [...game.world.players.values()]
    .filter((candidate) => candidate.id !== playerId && candidate.battle && !candidate.battle.eliminated)
    .map((candidate) => ({ id: candidate.id, name: game.playerDescriptions.get(candidate.id)?.name ?? candidate.id, areaId: candidate.battle?.areaId, hp: Math.ceil(candidate.battle?.hp ?? 0), alliance: stats.alliance === candidate.id }));
  const prompt = {
    role: `${name} (${stats.characterId})`,
    self: { areaId: stats.areaId, hp: Math.ceil(stats.hp), maxHp: stats.maxHp, stamina: Math.ceil(stats.stamina ?? 0), weapon: stats.weapon, medkits: stats.medkits, materials: stats.coins, inventory: stats.inventory, alliance: stats.alliance },
    openAreas: game.world.battle?.openAreas,
    adjacentAreas: adjacentAreaIds(stats.areaId ?? 'A01'),
    candidates,
    instructions: '你是吃鸡比赛中的 AI。只返回 JSON，不要 Markdown。格式：{"action":"move|search|buy|trade|ally|attack|flee|heal|investigate","targetPlayerId":"可选候选 ID","targetAreaId":"移动时必填且只能选相邻开放区","reason":"不超过70字中文理由"}。攻击、结盟、交易只可选同区域目标。优先求生、利用人设和当前物资。',
  };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), BATTLE_CONFIG.match.llmDecisionTimeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
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
  }
}

function getDriverId() {
  const existing = window.localStorage.getItem(DRIVER_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(DRIVER_KEY, value);
  return value;
}
