import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { Descriptions, characters } from '../data/characters';
import { insertInput } from './aiTown/insertInput';
import {
  DEFAULT_NAME,
  ENGINE_ACTION_DURATION,
  IDLE_WORLD_TIMEOUT,
  WORLD_HEARTBEAT_INTERVAL,
} from './constants';
import { playerId } from './aiTown/ids';
import { kickEngine, startEngine, stopEngine } from './aiTown/main';
import { engineInsertInput } from './engine/abstractGame';
import { defaultBattleState, defaultBattleStats } from './aiTown/battleRoyale';
import { BATTLE_CONFIG, profileForIndex } from '../data/battleRoyaleConfig';

const TARGET_BATTLE_AGENT_COUNT = BATTLE_CONFIG.match.agentCount;

export const defaultWorldStatus = query({
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    return worldStatus;
  },
});

export const heartbeatWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldStatus) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    const now = Date.now();

    // Skip the update (and then potentially make the transaction readonly)
    // if it's been viewed sufficiently recently..
    if (!worldStatus.lastViewed || worldStatus.lastViewed < now - WORLD_HEARTBEAT_INTERVAL / 2) {
      await ctx.db.patch(worldStatus._id, {
        lastViewed: Math.max(worldStatus.lastViewed ?? now, now),
      });
    }

    // Restart inactive worlds, but leave worlds explicitly stopped by the developer alone.
    if (worldStatus.status === 'stoppedByDeveloper') {
      console.debug(`World ${worldStatus._id} is stopped by developer, not restarting.`);
    }
    if (worldStatus.status === 'inactive') {
      console.log(`Restarting inactive world ${worldStatus._id}...`);
      await ctx.db.patch(worldStatus._id, { status: 'running' });
      await startEngine(ctx, worldStatus.worldId);
    }
  },
});

export const stopInactiveWorlds = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - IDLE_WORLD_TIMEOUT;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (cutoff < worldStatus.lastViewed || worldStatus.status !== 'running') {
        continue;
      }
      console.log(`Stopping inactive world ${worldStatus._id}`);
      await ctx.db.patch(worldStatus._id, { status: 'inactive' });
      await stopEngine(ctx, worldStatus.worldId);
    }
  },
});

export const restartDeadWorlds = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Restart an engine if it hasn't run for 2x its action duration.
    const engineTimeout = now - ENGINE_ACTION_DURATION * 2;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (worldStatus.status !== 'running') {
        continue;
      }
      const engine = await ctx.db.get(worldStatus.engineId);
      if (!engine) {
        throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
      }
      if (engine.currentTime && engine.currentTime < engineTimeout) {
        console.warn(`Restarting dead engine ${engine._id}...`);
        await kickEngine(ctx, worldStatus.worldId);
      }
    }
  },
});

export const userStatus = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   return null;
    // }
    // return identity.tokenIdentifier;
    return DEFAULT_NAME;
  },
});

export const joinWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new ConvexError(`Not logged in`);
    // }
    // const name =
    //   identity.givenName || identity.nickname || (identity.email && identity.email.split('@')[0]);
    const name = DEFAULT_NAME;

    // if (!name) {
    //   throw new ConvexError(`Missing name on ${JSON.stringify(identity)}`);
    // }
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new ConvexError(`Invalid world ID: ${args.worldId}`);
    }
    // const { tokenIdentifier } = identity;
    return await insertInput(ctx, world._id, 'join', {
      name,
      character: characters[Math.floor(Math.random() * characters.length)].name,
      description: `${DEFAULT_NAME} is a human player`,
      // description: `${identity.givenName} is a human player`,
      tokenIdentifier: DEFAULT_NAME,
    });
  },
});

export const leaveWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error(`Not logged in`);
    // }
    // const { tokenIdentifier } = identity;
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    // const existingPlayer = world.players.find((p) => p.human === tokenIdentifier);
    const existingPlayer = world.players.find((p) => p.human === DEFAULT_NAME);
    if (!existingPlayer) {
      return;
    }
    await insertInput(ctx, world._id, 'leave', {
      playerId: existingPlayer.id,
    });
  },
});

export const sendWorldInput = mutation({
  args: {
    engineId: v.id('engines'),
    name: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error(`Not logged in`);
    // }
    return await engineInsertInput(ctx, args.engineId, args.name as any, args.args);
  },
});

export const resetBattle = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    const now = Date.now();
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const agentDescriptions = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const activePlayers = world.players.slice(0, TARGET_BATTLE_AGENT_COUNT);
    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const activeAgents = world.agents.filter((agent) => activePlayerIds.has(agent.playerId));
    const activeAgentIds = new Set(activeAgents.map((agent) => agent.id));
    const agentsByPlayerId = new Map(activeAgents.map((agent) => [agent.playerId, agent]));
    const playerDescriptionsByPlayerId = new Map(
      playerDescriptions.map((description) => [description.playerId, description]),
    );
    const agentDescriptionsByAgentId = new Map(
      agentDescriptions.map((description) => [description.agentId, description]),
    );
    const assignedDescriptions = activePlayers.map((_, index) => uniqueDescriptionForIndex(index));
    for (const [index, player] of activePlayers.entries()) {
      const description = assignedDescriptions[index];
      const playerDescription = playerDescriptionsByPlayerId.get(player.id);
      if (playerDescription) {
        await ctx.db.patch(playerDescription._id, {
          name: description.name,
          description: description.identity,
          character: description.character,
        });
      }
      const agent = agentsByPlayerId.get(player.id);
      const agentDescription = agent && agentDescriptionsByAgentId.get(agent.id);
      if (agentDescription) {
        await ctx.db.patch(agentDescription._id, {
          identity: description.identity,
          plan: description.plan,
        });
      }
    }
    await ctx.db.patch(args.worldId, {
      battle: {
        ...defaultBattleState(now),
        feed: [
          {
            id: 1,
            ts: now,
            kind: 'system',
            text: '【系统】比赛已重启，所有 AI 返回战场。',
          },
        ],
        nextEventId: 2,
      },
      agents: activeAgents,
      conversations: [],
      players: activePlayers.map((player, index) => {
        const { activity: _activity, pathfinding: _pathfinding, battle: _battle, ...rest } = player;
        return {
          ...rest,
          speed: 0,
          battle: defaultBattleStats(profileForIndex(index)),
        };
      }),
    });
    for (let index = activePlayers.length; index < TARGET_BATTLE_AGENT_COUNT; index++) {
      await insertInput(ctx, args.worldId, 'createAgent', {
        descriptionIndex: index,
      });
    }
    for (const playerDescription of playerDescriptions) {
      if (!activePlayerIds.has(playerDescription.playerId)) {
        await ctx.db.delete(playerDescription._id);
      }
    }
    for (const agentDescription of agentDescriptions) {
      if (!activeAgentIds.has(agentDescription.agentId)) {
        await ctx.db.delete(agentDescription._id);
      }
    }
    // The reset writes a complete world document. Invalidate a running engine's
    // in-memory copy so its next step reloads this new match instead of saving
    // stale players back over it.
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .unique();
    const engine = worldStatus && await ctx.db.get(worldStatus.engineId);
    if (engine?.running) {
      await kickEngine(ctx, args.worldId);
    }
    return { players: activePlayers.length };
  },
});

function uniqueDescriptionForIndex(index: number) {
  const description = Descriptions[index % Descriptions.length];
  if (index < Descriptions.length) {
    return description;
  }
  return {
    ...description,
    name: `${description.name} ${Math.floor(index / Descriptions.length) + 1}`,
  };
}

export const worldState = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', world._id))
      .unique();
    if (!worldStatus) {
      throw new Error(`Invalid world status ID: ${world._id}`);
    }
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
    }
    return { world, engine };
  },
});

export const gameDescriptions = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const agentDescriptions = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const worldMap = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldMap) {
      throw new Error(`No map for world: ${args.worldId}`);
    }
    return { worldMap, playerDescriptions, agentDescriptions };
  },
});

export const previousConversation = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    // Walk the player's history in descending order, looking for a nonempty
    // conversation.
    const members = ctx.db
      .query('participatedTogether')
      .withIndex('playerHistory', (q) => q.eq('worldId', args.worldId).eq('player1', args.playerId))
      .order('desc');

    for await (const member of members) {
      const conversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('id', member.conversationId))
        .unique();
      if (!conversation) {
        throw new Error(`Invalid conversation ID: ${member.conversationId}`);
      }
      if (conversation.numMessages > 0) {
        return conversation;
      }
    }
    return null;
  },
});
