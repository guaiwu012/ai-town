import type { SerializedWorld } from '../../convex/aiTown/world';
import type { SerializedPlayerDescription } from '../../convex/aiTown/playerDescription';

export type LocalBattleAction =
  | 'earnIntervention'
  | 'intervene'
  | 'resetBattle'
  | 'submitSupportOrder'
  | 'acceptSupportCounter'
  | 'activateSupportFinisher'
  | 'claimDecisionDriver'
  | 'heartbeatDecisionDriver'
  | 'submitAIDecision'
  | 'reportAIDecisionFailure';

export type LocalBattleSnapshot = {
  world: SerializedWorld;
  playerDescriptions: SerializedPlayerDescription[];
  savedAt: number;
};

export type WorkerRequest =
  | { type: 'init'; config?: unknown }
  | { type: 'visibility'; visible: boolean }
  | { type: 'action'; requestId: string; name: LocalBattleAction; args: Record<string, unknown> };

export type WorkerResponse =
  | { type: 'snapshot'; snapshot: LocalBattleSnapshot }
  | { type: 'result'; requestId: string; value?: unknown; error?: string };
