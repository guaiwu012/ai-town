import { v } from 'convex/values';
import { agentId, conversationId, parseGameId, playerId } from './ids';
import { Player, activity } from './player';
import { Conversation, conversationInputs } from './conversation';
import { movePlayer } from './movement';
import { inputHandler } from './inputHandler';
import { point } from '../util/types';
import { Descriptions } from '../../data/characters';
import { AgentDescription } from './agentDescription';
import { Agent } from './agent';
import { applyAudienceScore, applyIntervention, claimDecisionDriver, heartbeatDecisionDriver, reportAIDecisionFailure, submitAIDecision } from './battleRoyale';

export const agentInputs = {
  finishRememberConversation: inputHandler({
    args: {
      operationId: v.string(),
      agentId,
    },
    handler: (game, now, args) => {
      const agentId = parseGameId('agents', args.agentId);
      const agent = game.world.agents.get(agentId);
      if (!agent) {
        throw new Error(`Couldn't find agent: ${agentId}`);
      }
      if (
        !agent.inProgressOperation ||
        agent.inProgressOperation.operationId !== args.operationId
      ) {
        console.debug(`Agent ${agentId} isn't remembering ${args.operationId}`);
      } else {
        delete agent.inProgressOperation;
        delete agent.toRemember;
      }
      return null;
    },
  }),
  finishDoSomething: inputHandler({
    args: {
      operationId: v.string(),
      agentId: v.id('agents'),
      destination: v.optional(point),
      invitee: v.optional(v.id('players')),
      activity: v.optional(activity),
    },
    handler: (game, now, args) => {
      const agentId = parseGameId('agents', args.agentId);
      const agent = game.world.agents.get(agentId);
      if (!agent) {
        throw new Error(`Couldn't find agent: ${agentId}`);
      }
      if (
        !agent.inProgressOperation ||
        agent.inProgressOperation.operationId !== args.operationId
      ) {
        console.debug(`Agent ${agentId} didn't have ${args.operationId} in progress`);
        return null;
      }
      delete agent.inProgressOperation;
      const player = game.world.players.get(agent.playerId)!;
      if (args.invitee) {
        const inviteeId = parseGameId('players', args.invitee);
        const invitee = game.world.players.get(inviteeId);
        if (!invitee) {
          throw new Error(`Couldn't find player: ${inviteeId}`);
        }
        Conversation.start(game, now, player, invitee);
        agent.lastInviteAttempt = now;
      }
      if (args.destination) {
        movePlayer(game, now, player, args.destination);
      }
      if (args.activity) {
        player.activity = args.activity;
      }
      return null;
    },
  }),
  agentFinishSendingMessage: inputHandler({
    args: {
      agentId,
      conversationId,
      timestamp: v.number(),
      operationId: v.string(),
      leaveConversation: v.boolean(),
    },
    handler: (game, now, args) => {
      const agentId = parseGameId('agents', args.agentId);
      const agent = game.world.agents.get(agentId);
      if (!agent) {
        throw new Error(`Couldn't find agent: ${agentId}`);
      }
      const player = game.world.players.get(agent.playerId);
      if (!player) {
        throw new Error(`Couldn't find player: ${agent.playerId}`);
      }
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Couldn't find conversation: ${conversationId}`);
      }
      if (
        !agent.inProgressOperation ||
        agent.inProgressOperation.operationId !== args.operationId
      ) {
        console.debug(`Agent ${agentId} wasn't sending a message ${args.operationId}`);
        return null;
      }
      delete agent.inProgressOperation;
      conversationInputs.finishSendingMessage.handler(game, now, {
        playerId: agent.playerId,
        conversationId: args.conversationId,
        timestamp: args.timestamp,
      });
      if (args.leaveConversation) {
        conversation.leave(game, now, player);
      }
      return null;
    },
  }),
  createAgent: inputHandler({
    args: {
      descriptionIndex: v.number(),
    },
    handler: (game, now, args) => {
      const usedNames = new Set(
        [...game.playerDescriptions.values()].map((description) => description.name),
      );
      const description = selectUniqueDescription(args.descriptionIndex, usedNames);
      const playerId = Player.join(
        game,
        now,
        description.name,
        description.character,
        description.identity,
      );
      const agentId = game.allocId('agents');
      game.world.agents.set(
        agentId,
        new Agent({
          id: agentId,
          playerId: playerId,
          inProgressOperation: undefined,
          lastConversation: undefined,
          lastInviteAttempt: undefined,
          toRemember: undefined,
        }),
      );
      game.agentDescriptions.set(
        agentId,
        new AgentDescription({
          agentId: agentId,
          identity: description.identity,
          plan: description.plan,
        }),
      );
      return { agentId };
    },
  }),
  earnIntervention: inputHandler({
    args: {
      score: v.number(),
    },
    handler: (game, now, args) => {
      return applyAudienceScore(game, now, args.score);
    },
  }),
  intervene: inputHandler({
    args: {
      opId: v.string(),
      targetAreaId: v.optional(v.string()),
      targetPlayerId: v.optional(playerId),
      secondPlayerId: v.optional(playerId),
    },
    handler: (game, now, args) => applyIntervention(game, now, args),
  }),
  claimDecisionDriver: inputHandler({
    args: { driverId: v.string() },
    handler: (game, now, args) => claimDecisionDriver(game, now, args.driverId),
  }),
  heartbeatDecisionDriver: inputHandler({
    args: { driverId: v.string() },
    handler: (game, now, args) => heartbeatDecisionDriver(game, now, args.driverId),
  }),
  submitAIDecision: inputHandler({
    args: {
      driverId: v.string(), playerId, action: v.string(), targetPlayerId: v.optional(playerId), targetAreaId: v.optional(v.string()), storyEventId: v.optional(v.string()), storyApproach: v.optional(v.string()), reason: v.optional(v.string()), speech: v.optional(v.string()),
    },
    handler: (game, now, args) => submitAIDecision(game, now, args),
  }),
  reportAIDecisionFailure: inputHandler({
    args: { driverId: v.string(), playerId, reason: v.string() },
    handler: (game, now, args) => reportAIDecisionFailure(game, now, args),
  }),
};

function selectUniqueDescription(descriptionIndex: number, usedNames: Set<string>) {
  for (let i = 0; i < Descriptions.length; i++) {
    const description = Descriptions[(descriptionIndex + i) % Descriptions.length];
    if (!usedNames.has(description.name)) {
      return description;
    }
  }
  const description = Descriptions[descriptionIndex % Descriptions.length];
  let suffix = 2;
  let name = `${description.name} ${suffix}`;
  while (usedNames.has(name)) {
    suffix += 1;
    name = `${description.name} ${suffix}`;
  }
  return { ...description, name };
}
