export type DirectorCandidate = {
  id: string;
  alive: boolean;
  heat: number;
  hpRatio?: number;
  moving?: boolean;
};

export type DirectorEvent = {
  kind: string;
  actor?: string;
  target?: string;
  id?: number;
  ts?: number;
};

export type DirectorShot = { targetId?: string; caption: string; eventId?: number; urgent: boolean };

const FEATURED_EVENT_KINDS = new Set([
  'eliminate', 'attack', 'dialogue', 'intervention', 'areaStory', 'globalStory', 'story', 'alliance', 'betrayal',
]);

/** Chooses a view target only; it must never affect match simulation state. */
export function selectDirectorTarget(
  candidates: DirectorCandidate[],
  events: DirectorEvent[],
): string | undefined {
  const alive = candidates.filter((candidate) => candidate.alive);
  const featuredActor = events.find((event) =>
    FEATURED_EVENT_KINDS.has(event.kind) &&
    (event.kind !== 'dialogue' || Boolean(event.target)) &&
    event.actor && alive.some((candidate) => candidate.id === event.actor),
  )?.actor;
  if (featuredActor) return featuredActor;
  return alive.sort((a, b) => b.heat - a.heat || a.id.localeCompare(b.id))[0]?.id;
}

export function selectDirectorShot(
  candidates: DirectorCandidate[],
  events: DirectorEvent[],
  now: number,
): DirectorShot {
  const alive = candidates.filter((candidate) => candidate.alive);
  const featured = events.find((event) =>
    FEATURED_EVENT_KINDS.has(event.kind) &&
    (event.kind !== 'dialogue' || Boolean(event.target)) &&
    (event.ts === undefined || now - event.ts <= 6500) &&
    event.actor && alive.some((candidate) => candidate.id === event.actor),
  );
  if (featured?.actor) {
    return { targetId: featured.actor, caption: eventCaption(featured.kind), eventId: featured.id, urgent: true };
  }
  const ranked = [...alive].sort((a, b) => {
    const score = (candidate: DirectorCandidate) => candidate.heat + (candidate.moving ? 8 : 0) + (1 - (candidate.hpRatio ?? 1)) * 18;
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
  const target = ranked.length ? ranked[Math.floor(now / 8000) % Math.min(4, ranked.length)] : undefined;
  return { targetId: target?.id, caption: target?.moving ? '巡场跟拍 · 移动镜头' : '热点观察 · 选手近景', urgent: false };
}

function eventCaption(kind: string) {
  return ({ eliminate: '淘汰瞬间 · 关键镜头', attack: '交火现场 · 战斗追踪', dialogue: '现场交谈 · 双人镜头', intervention: '主办方干预 · 现场直击', areaStory: '区域剧情 · 事件现场', globalStory: '全局异变 · 特别报道', story: '人物剧情 · 焦点跟拍', alliance: '关系进展 · 谈判现场', betrayal: '联盟破裂 · 冲突追踪' } as Record<string, string>)[kind] ?? '现场直击';
}
