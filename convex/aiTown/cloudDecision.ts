import { ActionCtx, action, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { api, internal } from '../_generated/api';
import { Doc, Id } from '../_generated/dataModel';
import { playerId } from './ids';
import { AREA_SPECIAL_EVENTS, BATTLE_ACTIONS, BATTLE_CONFIG, adjacentAreaIds, personaForCharacter, profileForCharacterId, storyOptionsFor } from '../../data/battleRoyaleConfig';

type Decision = {
  action: string;
  targetPlayerId?: string;
  targetAreaId?: string;
  storyEventId?: string;
  storyApproach?: string;
  reason?: string;
  speech?: string;
};

type DecisionContext = {
  world: Doc<'worlds'>;
  player: Doc<'worlds'>['players'][number];
  descriptions: Doc<'playerDescriptions'>[];
};

export const context = internalQuery({
  args: { worldId: v.id('worlds'), playerId },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) return null;
    const player = world.players.find((candidate) => candidate.id === args.playerId);
    if (!player?.battle) return null;
    const descriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    return { world, player, descriptions };
  },
});

export const request = action({
  args: { worldId: v.id('worlds'), driverId: v.string(), playerId },
  handler: async (ctx, args) => {
    const snapshot = await ctx.runQuery(internal.aiTown.cloudDecision.context, {
      worldId: args.worldId,
      playerId: args.playerId,
    });
    const now = Date.now();
    const battle = snapshot?.world.battle;
    const player = snapshot?.player;
    if (!snapshot || !battle || !player?.battle || player.battle.eliminated) return { queued: false, reason: '角色不可决策' };
    if (battle.decisionDriverId !== args.driverId || (battle.decisionDriverUntil ?? 0) <= now) return { queued: false, reason: '驾驶权已失效' };
    if ((battle.decisionCount ?? 0) >= (battle.decisionMax ?? BATTLE_CONFIG.match.llmDecisionMaxPerMatch)) return { queued: false, reason: '本局模型额度已用尽' };
    if ((player.battle.decisionDueAt ?? 0) > now) return { queued: false, reason: '尚未到决策时间' };

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      await reportFailure(ctx, args, '云端 DS 密钥未配置');
      return { queued: false, reason: '云端 DS 密钥未配置' };
    }

    try {
      const decision = await requestDecision(snapshot, args.playerId, apiKey);
      await ctx.runMutation(api.aiTown.main.sendInput, {
        worldId: args.worldId,
        name: 'submitAIDecision',
        args: { driverId: args.driverId, playerId: args.playerId, ...decision },
      });
      return { queued: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 100) : '云端模型请求失败';
      await reportFailure(ctx, args, reason);
      return { queued: false, reason };
    }
  },
});

async function reportFailure(ctx: ActionCtx, args: { worldId: Id<'worlds'>; driverId: string; playerId: string }, reason: string) {
  await ctx.runMutation(api.aiTown.main.sendInput, {
    worldId: args.worldId,
    name: 'reportAIDecisionFailure',
    args: { driverId: args.driverId, playerId: args.playerId, reason },
  });
}

async function requestDecision(snapshot: DecisionContext, playerId: string, apiKey: string): Promise<Decision> {
  const player = snapshot.player;
  const stats = player.battle!;
  const nameFor = (id: string) => snapshot.descriptions.find((description) => description.playerId === id)?.name ?? id;
  const profile = profileForCharacterId(stats.characterId ?? 'C01');
  const characterPersona = personaForCharacter(stats.characterId);
  const candidates = snapshot.world.players
    .filter((candidate) => candidate.id !== playerId && candidate.battle && !candidate.battle.eliminated)
    .map((candidate) => ({ id: candidate.id, name: nameFor(candidate.id), areaId: candidate.battle?.areaId, hp: Math.ceil(candidate.battle?.hp ?? 0), alliance: stats.alliance === candidate.id }));
  const relationships = (snapshot.world.battle?.relationshipEdges ?? [])
    .filter((edge) => edge.a === stats.characterId || edge.b === stats.characterId)
    .map((edge) => ({ with: edge.a === stats.characterId ? edge.b : edge.a, type: edge.type, strength: edge.strength, hidden: edge.hidden }));
  const availableStories = AREA_SPECIAL_EVENTS
    .filter((event) => event.areaId === stats.areaId)
    .filter((event) => !(snapshot.world.battle?.consumedAreaStories ?? []).includes(event.id))
    .map((event) => ({
      id: event.id,
      title: event.title,
      requiredItem: 'requiredItem' in event ? event.requiredItem : undefined,
      options: storyOptionsFor(event.id).map(({ id, label, description, difficultyModifier }) => ({ id, label, description, difficultyModifier })),
    }));
  const activeSupportOrder = snapshot.world.battle?.supportOrders?.find((order) => order.playerId === playerId && order.status === 'active');
  const supportOrder = activeSupportOrder ? {
    kind: activeSupportOrder.kind,
    targetPlayerId: activeSupportOrder.targetPlayerId,
    targetName: activeSupportOrder.targetPlayerId ? nameFor(activeSupportOrder.targetPlayerId) : undefined,
    secondsRemaining: Math.max(0, Math.ceil((activeSupportOrder.expiresAt - Date.now()) / 1000)),
    priority: '这是观众阵营已经付费且角色已接受的任务。除非濒死或路径非法，优先完成。hunt 要追踪并攻击目标；scavenge 要连续搜索物资；ally 要接近目标并结盟。',
  } : undefined;
  const prompt = {
    role: `${nameFor(playerId)} (${stats.characterId})`,
    persona: {
      codename: profile.codename,
      title: characterPersona.title,
      archetype: characterPersona.archetype,
      goal: characterPersona.goal,
      combatStyle: characterPersona.combatStyle,
      speechStyle: characterPersona.speechStyle,
      aggression: profile.aggro,
      cooperation: profile.coop,
      riskPreference: profile.risk,
      attackBias: characterPersona.attackBias,
      allianceBias: characterPersona.allianceBias,
      retreatBias: characterPersona.retreatBias,
    },
    self: { areaId: stats.areaId, hp: Math.ceil(stats.hp), maxHp: stats.maxHp, stamina: Math.ceil(stats.stamina ?? 0), satiety: Math.ceil(stats.satiety ?? 0), zoneTime: Math.ceil(stats.zoneTime ?? 0), stress: Math.ceil(stats.stress ?? 0), stressThreshold: stats.stressThreshold, weapon: stats.weapon, medkits: stats.medkits, materials: stats.coins, inventory: stats.inventory, alliance: stats.alliance },
    openAreas: snapshot.world.battle?.openAreas,
    zoneClosesAt: snapshot.world.battle?.zoneClosesAt,
    relationships,
    adjacentAreas: adjacentAreaIds(stats.areaId ?? 'A01'),
    candidates,
    availableStories,
    supportOrder,
    instructions: '你是吃鸡比赛中的 AI。只返回 JSON，不要 Markdown。格式：{"action":"move|search|buy|trade|ally|attack|flee|heal|investigate","targetPlayerId":"可选候选 ID","targetAreaId":"移动时必填且只能选相邻开放区","storyEventId":"investigate 时必填，必须选 availableStories.id","storyApproach":"investigate 时必填，必须选对应剧情 options.id","reason":"不超过70字中文理由","speech":"结盟、交易或交战时的第一人称中文台词，不超过48字"}。攻击、结盟、交易只可选同区域目标。遇到同区角色时必须根据 persona 的攻击、结盟、撤退倾向和关系做出选择；台词必须符合 speechStyle，不得使用通用模板。调查必须明确选择一个当前可用剧情及其专属处置方案，并满足 requiredItem。高压力或低饱食时优先撤离、治疗、搜索补给；所有行动需符合 persona。',
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BATTLE_CONFIG.match.llmDecisionTimeoutMs);
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.65, max_tokens: 220, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: '你是严格输出 JSON 的游戏战术代理。' }, { role: 'user', content: JSON.stringify(prompt) }] }),
    });
    if (!response.ok) throw new Error(`云端 DS ${response.status}`);
    const json = await response.json();
    const raw = String(json.choices?.[0]?.message?.content ?? '').replace(/^```json\s*|\s*```$/g, '').trim();
    const decision = JSON.parse(raw) as Decision;
    if (!BATTLE_ACTIONS.includes(decision.action as typeof BATTLE_ACTIONS[number])) throw new Error('模型返回了无效动作');
    if (decision.action === 'investigate') {
      const story = availableStories.find((candidate) => candidate.id === decision.storyEventId);
      if (!story || !story.options.some((option) => option.id === decision.storyApproach)) throw new Error('模型返回了无效剧情选择');
    }
    return { ...decision, reason: String(decision.reason ?? '').replace(/[\r\n]/g, ' ').slice(0, 140), speech: String(decision.speech ?? '').replace(/[\r\n]/g, ' ').slice(0, 56) };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('云端模型请求超时');
    if (error instanceof SyntaxError) throw new Error('模型返回的 JSON 无效');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
