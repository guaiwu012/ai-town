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

export type BattleArenaGridCell = {
  areaId?: string;
  kind: 'void' | 'area' | 'corridor' | 'landmark';
  walkable: boolean;
};

export type BattleArenaGrid = {
  width: number;
  height: number;
  cells: BattleArenaGridCell[][];
};

const AREA_FOOTPRINTS: Record<string, Array<{ x: number; y: number }>> = {
  A01: [{ x: 0.18, y: 0.08 }, { x: 0.28, y: 0.02 }, { x: 0.39, y: 0.08 }, { x: 0.43, y: 0.2 }, { x: 0.35, y: 0.33 }, { x: 0.22, y: 0.31 }, { x: 0.16, y: 0.2 }],
  A02: [{ x: 0.08, y: 0.68 }, { x: 0.15, y: 0.57 }, { x: 0.29, y: 0.58 }, { x: 0.35, y: 0.74 }, { x: 0.31, y: 0.9 }, { x: 0.17, y: 0.95 }, { x: 0.08, y: 0.86 }],
  A03: [{ x: 0.29, y: 0.63 }, { x: 0.35, y: 0.56 }, { x: 0.47, y: 0.57 }, { x: 0.53, y: 0.7 }, { x: 0.49, y: 0.86 }, { x: 0.36, y: 0.9 }, { x: 0.29, y: 0.8 }],
  A04: [{ x: 0.77, y: 0.55 }, { x: 0.84, y: 0.49 }, { x: 0.94, y: 0.53 }, { x: 0.98, y: 0.66 }, { x: 0.92, y: 0.78 }, { x: 0.8, y: 0.76 }, { x: 0.76, y: 0.65 }],
  A05: [{ x: 0.61, y: 0.65 }, { x: 0.69, y: 0.59 }, { x: 0.81, y: 0.64 }, { x: 0.85, y: 0.79 }, { x: 0.78, y: 0.91 }, { x: 0.65, y: 0.88 }, { x: 0.6, y: 0.77 }],
  A06: [{ x: 0.63, y: 0.16 }, { x: 0.71, y: 0.1 }, { x: 0.83, y: 0.13 }, { x: 0.88, y: 0.25 }, { x: 0.82, y: 0.36 }, { x: 0.68, y: 0.35 }, { x: 0.62, y: 0.26 }],
  A07: [{ x: 0.71, y: 0.34 }, { x: 0.8, y: 0.29 }, { x: 0.92, y: 0.34 }, { x: 0.97, y: 0.45 }, { x: 0.91, y: 0.55 }, { x: 0.78, y: 0.54 }, { x: 0.71, y: 0.46 }],
  A08: [{ x: 0.36, y: 0.31 }, { x: 0.47, y: 0.27 }, { x: 0.61, y: 0.31 }, { x: 0.68, y: 0.43 }, { x: 0.63, y: 0.58 }, { x: 0.49, y: 0.63 }, { x: 0.37, y: 0.55 }, { x: 0.34, y: 0.42 }],
  A09: [{ x: 0.12, y: 0.41 }, { x: 0.19, y: 0.34 }, { x: 0.31, y: 0.36 }, { x: 0.36, y: 0.48 }, { x: 0.31, y: 0.61 }, { x: 0.18, y: 0.63 }, { x: 0.12, y: 0.54 }],
  A10: [{ x: 0.4, y: 0.08 }, { x: 0.48, y: 0.02 }, { x: 0.61, y: 0.04 }, { x: 0.68, y: 0.15 }, { x: 0.64, y: 0.28 }, { x: 0.52, y: 0.32 }, { x: 0.41, y: 0.24 }],
  A11: [{ x: 0.47, y: 0.69 }, { x: 0.54, y: 0.62 }, { x: 0.64, y: 0.66 }, { x: 0.68, y: 0.8 }, { x: 0.63, y: 0.92 }, { x: 0.52, y: 0.94 }, { x: 0.46, y: 0.83 }],
  A12: [{ x: 0.04, y: 0.18 }, { x: 0.08, y: 0.12 }, { x: 0.16, y: 0.14 }, { x: 0.2, y: 0.24 }, { x: 0.16, y: 0.34 }, { x: 0.08, y: 0.36 }, { x: 0.04, y: 0.29 }],
  S01: [{ x: 0.02, y: 0.52 }, { x: 0.06, y: 0.45 }, { x: 0.13, y: 0.48 }, { x: 0.16, y: 0.59 }, { x: 0.12, y: 0.69 }, { x: 0.05, y: 0.7 }, { x: 0.02, y: 0.63 }],
};

function zoneShape(anchor: { x: number; y: number }, radius: number, footprint?: Array<{ x: number; y: number }>) {
  const vertices = footprint ?? Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return { x: Math.max(0.02, Math.min(0.98, anchor.x + Math.cos(angle) * radius)), y: Math.max(0.02, Math.min(0.98, anchor.y + Math.sin(angle) * radius)) };
  });
  return {
    polygon: vertices,
    spawnPoints: [anchor, ...vertices.map((point) => ({ x: (point.x + anchor.x) / 2, y: (point.y + anchor.y) / 2 }))],
    navigationPoints: [
      anchor,
      ...vertices.map((point) => ({ x: anchor.x + (point.x - anchor.x) * 0.42, y: anchor.y + (point.y - anchor.y) * 0.42 })),
      ...vertices.map((point) => ({ x: anchor.x + (point.x - anchor.x) * 0.7, y: anchor.y + (point.y - anchor.y) * 0.7 })),
    ],
  };
}

function landmarkObstacles(anchor: { x: number; y: number }, radius: number, index: number) {
  // Alternating footprints make each landmark readable while keeping the anchor
  // and radial navigation points clear for spawning and local patrols.
  const side = index % 2 === 0 ? -1 : 1;
  return [
    {
      x: Math.max(0.02, anchor.x + side * radius * 0.48),
      y: Math.max(0.02, anchor.y - radius * 0.42),
      width: radius * 0.22,
      height: radius * 0.3,
    },
    {
      x: Math.max(0.02, anchor.x - side * radius * 0.7),
      y: Math.max(0.02, anchor.y + radius * 0.25),
      width: radius * 0.28,
      height: radius * 0.2,
    },
  ];
}

// Shared by the Pixi battlefield, overview markers and logical-area tooling.
// Coordinates are normalized so visual assets can evolve without invalidating rules.
export const BATTLE_ARENA_ZONES: BattleArenaZone[] = BATTLE_CONFIG.areas.map((area, index) => {
  const radius = area.id === 'S01' ? 0.045 : 0.075;
  const anchor = AREA_ANCHORS[area.id];
  return {
    id: area.id,
    label: area.name,
    anchor,
    radius,
    color: area.danger >= 4 ? 0xd45c5c : area.danger >= 3 ? 0xd99a43 : 0x52bca7,
    ...zoneShape(anchor, radius, AREA_FOOTPRINTS[area.id]),
    obstacles: landmarkObstacles(anchor, radius, index),
  };
});

const gridCache = new Map<string, BattleArenaGrid>();

function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function buildBattleArenaGrid(mapWidth: number, mapHeight: number): BattleArenaGrid {
  const key = `${mapWidth}x${mapHeight}`;
  const cached = gridCache.get(key);
  if (cached) return cached;
  const cells: BattleArenaGridCell[][] = Array.from({ length: mapWidth }, () => (
    Array.from({ length: mapHeight }, () => ({ kind: 'void', walkable: false }))
  ));
  const corridors = BATTLE_CONFIG.adjacency.map(([fromId, toId]) => ({
    fromId,
    toId,
    from: AREA_ANCHORS[fromId],
    to: AREA_ANCHORS[toId],
  }));
  const corridorRadius = 1.35 / Math.min(mapWidth, mapHeight);
  for (let x = 0; x < mapWidth; x += 1) {
    for (let y = 0; y < mapHeight; y += 1) {
      const point = { x: x / mapWidth, y: y / mapHeight };
      const zone = BATTLE_ARENA_ZONES
        .filter((candidate) => pointInPolygon(point, candidate.polygon))
        .sort((a, b) => Math.hypot(point.x - a.anchor.x, point.y - a.anchor.y) - Math.hypot(point.x - b.anchor.x, point.y - b.anchor.y))[0];
      if (zone) cells[x][y] = { areaId: zone.id, kind: 'area', walkable: true };
      if (!zone) {
        const corridor = corridors.find((candidate) => distanceToSegment(point, candidate.from, candidate.to) <= corridorRadius);
        if (corridor) cells[x][y] = { areaId: corridor.fromId, kind: 'corridor', walkable: true };
      }
    }
  }
  for (const zone of BATTLE_ARENA_ZONES) {
    for (const obstacle of zone.obstacles) {
      const minX = Math.max(0, Math.floor(obstacle.x * mapWidth));
      const maxX = Math.min(mapWidth - 1, Math.floor((obstacle.x + obstacle.width) * mapWidth));
      const minY = Math.max(0, Math.floor(obstacle.y * mapHeight));
      const maxY = Math.min(mapHeight - 1, Math.floor((obstacle.y + obstacle.height) * mapHeight));
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const normalizedX = x / mapWidth;
          const normalizedY = y / mapHeight;
          if (normalizedX < obstacle.x || normalizedX > obstacle.x + obstacle.width || normalizedY < obstacle.y || normalizedY > obstacle.y + obstacle.height) continue;
          cells[x][y] = { areaId: zone.id, kind: 'landmark', walkable: false };
        }
      }
    }
  }
  const grid = { width: mapWidth, height: mapHeight, cells };
  gridCache.set(key, grid);
  return grid;
}

export function battleArenaGridCell(point: { x: number; y: number }, mapWidth: number, mapHeight: number) {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return undefined;
  return buildBattleArenaGrid(mapWidth, mapHeight).cells[x][y];
}

export function isBattleArenaPositionWalkable(point: { x: number; y: number }, mapWidth: number, mapHeight: number) {
  return battleArenaGridCell(point, mapWidth, mapHeight)?.walkable ?? false;
}

export function battleAreaSpawnPoints(areaId: string, mapWidth: number, mapHeight: number) {
  return (BATTLE_ARENA_ZONES.find((zone) => zone.id === areaId)?.spawnPoints ?? []).map((point) => ({
    x: Math.round(point.x * (mapWidth - 2)) + 1,
    y: Math.round(point.y * (mapHeight - 2)) + 1,
  })).filter((point) => isBattleArenaWalkable(areaId, point, mapWidth, mapHeight));
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
  return pointInPolygon({ x: point.x / mapWidth, y: point.y / mapHeight }, polygon);
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
