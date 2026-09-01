import type { BattleReplayFrame, BattleReplayPatch, BattleState } from '../../convex/aiTown/battleRoyale';

export function replayStartTime(battle: BattleState | undefined): number | undefined {
  if (!battle) return undefined;
  return [...(battle.replayCheckpoints ?? [])]
    .filter((checkpoint) => checkpoint.frame)
    .sort((first, second) => first.ts - second.ts)[0]?.ts ?? battle.started;
}

/** Restores the last checkpoint, then applies every recorded action patch up to the requested time. */
export function replayFrameAt(battle: BattleState | undefined, timestamp: number | undefined): BattleReplayFrame | undefined {
  if (!battle || !timestamp) return undefined;
  const checkpoint = [...(battle.replayCheckpoints ?? [])]
    .filter((candidate) => candidate.ts <= timestamp && candidate.frame)
    .sort((first, second) => second.ts - first.ts)[0];
  if (!checkpoint?.frame) return undefined;
  let frame = cloneReplayFrame(checkpoint.frame);
  const patches = [...(battle.actionLog ?? [])]
    .filter((entry) => entry.accepted && entry.patch && entry.ts <= timestamp)
    .filter((entry) => checkpoint.actionId !== undefined ? entry.id > checkpoint.actionId : entry.ts > checkpoint.ts)
    .sort((first, second) => first.ts - second.ts || first.id - second.id);
  for (const entry of patches) frame = applyReplayPatch(frame, entry.patch!);
  return frame;
}

export function applyReplayPatch(frame: BattleReplayFrame, patch: BattleReplayPatch): BattleReplayFrame {
  return {
    ...frame,
    popularity: patch.popularity,
    zoneClosesAt: patch.zoneClosesAt,
    interventionPoints: patch.interventionPoints ?? frame.interventionPoints,
    interventionPointsMax: patch.interventionPointsMax ?? frame.interventionPointsMax,
    areaLocks: (patch.areaLocks ?? frame.areaLocks ?? []).map((entry) => ({ ...entry })),
    phase: patch.phase,
    day: patch.day,
    timeOfDay: patch.timeOfDay,
    openAreas: patch.openAreas ? [...patch.openAreas] : frame.openAreas,
    players: replaceBy(frame.players, patch.players, (entry) => entry.id),
    relationships: replaceBy(frame.relationships, patch.relationships, (entry) => entry.id),
    resources: replaceBy(frame.resources, patch.resources, (entry) => entry.areaId),
    truthClues: unique([...frame.truthClues, ...patch.truthCluesAdded]),
    storyTriggers: unique([...frame.storyTriggers, ...patch.storyTriggersAdded]),
  };
}

function replaceBy<T>(current: T[], changed: T[], key: (entry: T) => string): T[] {
  const replacements = new Map(changed.map((entry) => [key(entry), entry]));
  const merged = current.map((entry) => replacements.get(key(entry)) ?? entry);
  const existing = new Set(current.map(key));
  for (const entry of changed) if (!existing.has(key(entry))) merged.push(entry);
  return merged;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function cloneReplayFrame(frame: BattleReplayFrame): BattleReplayFrame {
  return {
    ...frame,
    openAreas: [...frame.openAreas],
    areaLocks: frame.areaLocks?.map((entry) => ({ ...entry })),
    players: frame.players.map((entry) => ({ ...entry, inventory: [...entry.inventory] })),
    relationships: frame.relationships.map((entry) => ({ ...entry })),
    resources: frame.resources.map((entry) => ({ ...entry })),
    truthClues: [...frame.truthClues],
    storyTriggers: [...frame.storyTriggers],
  };
}
