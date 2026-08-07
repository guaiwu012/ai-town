export type DirectorCandidate = {
  id: string;
  alive: boolean;
  heat: number;
};

export type DirectorEvent = {
  kind: string;
  actor?: string;
};

const FEATURED_EVENT_KINDS = new Set([
  'eliminate', 'attack', 'intervention', 'areaStory', 'globalStory', 'story', 'alliance', 'betrayal',
]);

/** Chooses a view target only; it must never affect match simulation state. */
export function selectDirectorTarget(
  candidates: DirectorCandidate[],
  events: DirectorEvent[],
): string | undefined {
  const alive = candidates.filter((candidate) => candidate.alive);
  const featuredActor = events.find((event) =>
    FEATURED_EVENT_KINDS.has(event.kind) && event.actor && alive.some((candidate) => candidate.id === event.actor),
  )?.actor;
  if (featuredActor) return featuredActor;
  return alive.sort((a, b) => b.heat - a.heat || a.id.localeCompare(b.id))[0]?.id;
}
