import { BATTLE_CONFIG, AREA_ANCHORS } from './battleRoyaleConfig';

export type BattleArenaZone = {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  radius: number;
  color: number;
  polygon: { x: number; y: number }[];
  spawnPoints: { x: number; y: number }[];
  navigationPoints: { x: number; y: number }[];
  obstacles: { x: number; y: number; width: number; height: number }[];
};

function zoneShape(anchor: { x: number; y: number }, radius: number) {
  const vertices = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return { x: Math.max(0.02, Math.min(0.98, anchor.x + Math.cos(angle) * radius)), y: Math.max(0.02, Math.min(0.98, anchor.y + Math.sin(angle) * radius)) };
  });
  return {
    polygon: vertices,
    spawnPoints: [anchor, ...vertices.filter((_, index) => index % 2 === 0).map((point) => ({ x: (point.x + anchor.x) / 2, y: (point.y + anchor.y) / 2 }))],
    navigationPoints: [
      anchor,
      ...vertices.map((point) => ({ x: anchor.x + (point.x - anchor.x) * 0.42, y: anchor.y + (point.y - anchor.y) * 0.42 })),
      ...vertices.map((point) => ({ x: anchor.x + (point.x - anchor.x) * 0.7, y: anchor.y + (point.y - anchor.y) * 0.7 })),
    ],
  };
}

function landmarkObstacle(anchor: { x: number; y: number }, radius: number) {
  // A small landmark footprint, deliberately offset from the anchor and spawns.
  // It is shared by visual rendering and all battle-local movement validation.
  return {
    x: Math.max(0.02, anchor.x - radius * 0.62),
    y: Math.max(0.02, anchor.y - radius * 0.16),
    width: radius * 0.24,
    height: radius * 0.28,
  };
}

// Shared by the Pixi battlefield, overview markers and logical-area tooling.
// Coordinates are normalized so visual assets can evolve without invalidating rules.
export const BATTLE_ARENA_ZONES: BattleArenaZone[] = BATTLE_CONFIG.areas.map((area) => {
  const radius = area.id === 'S01' ? 0.045 : 0.075;
  const anchor = AREA_ANCHORS[area.id];
  return {
    id: area.id,
    label: area.name,
    anchor,
    radius,
    color: area.danger >= 4 ? 0xd45c5c : area.danger >= 3 ? 0xd99a43 : 0x52bca7,
    ...zoneShape(anchor, radius),
    obstacles: [landmarkObstacle(anchor, radius)],
  };
});

export function battleAreaSpawnPoints(areaId: string, mapWidth: number, mapHeight: number) {
  return (BATTLE_ARENA_ZONES.find((zone) => zone.id === areaId)?.spawnPoints ?? []).map((point) => ({
    x: Math.round(point.x * (mapWidth - 2)) + 1,
    y: Math.round(point.y * (mapHeight - 2)) + 1,
  }));
}

export function battleAreaNavigationPoints(areaId: string, mapWidth: number, mapHeight: number) {
  const zone = BATTLE_ARENA_ZONES.find((candidate) => candidate.id === areaId);
  if (!zone) return [];
  return zone.navigationPoints
    .map((point) => ({
      x: Math.round(point.x * (mapWidth - 2)) + 1,
      y: Math.round(point.y * (mapHeight - 2)) + 1,
    }))
    .filter((point) => isBattleArenaWalkable(areaId, point, mapWidth, mapHeight));
}

export function isPointInBattleArea(areaId: string, point: { x: number; y: number }, mapWidth: number, mapHeight: number) {
  const polygon = BATTLE_ARENA_ZONES.find((zone) => zone.id === areaId)?.polygon;
  if (!polygon) return false;
  const x = point.x / mapWidth;
  const y = point.y / mapHeight;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function isBattleArenaWalkable(areaId: string, point: { x: number; y: number }, mapWidth: number, mapHeight: number) {
  if (!isPointInBattleArea(areaId, point, mapWidth, mapHeight)) return false;
  const zone = BATTLE_ARENA_ZONES.find((candidate) => candidate.id === areaId);
  if (!zone) return false;
  const x = point.x / mapWidth;
  const y = point.y / mapHeight;
  return !zone.obstacles.some((obstacle) => (
    x >= obstacle.x
    && x <= obstacle.x + obstacle.width
    && y >= obstacle.y
    && y <= obstacle.y + obstacle.height
  ));
}

export const BATTLE_ARENA_ART = '/ai-town/assets/battle/arena-live-map.png';
