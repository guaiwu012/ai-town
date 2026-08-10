import type { BattleReplayFrame, BattleState } from '../../convex/aiTown/battleRoyale';

/** Returns the last durable frame at or before the requested replay timestamp. */
export function replayFrameAt(battle: BattleState | undefined, timestamp: number | undefined): BattleReplayFrame | undefined {
  if (!battle || !timestamp) return undefined;
  const checkpoint = [...(battle.replayCheckpoints ?? [])]
    .filter((candidate) => candidate.ts <= timestamp && candidate.frame)
    .sort((first, second) => second.ts - first.ts)[0];
  return checkpoint?.frame;
}
