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

function zoneShape(anchor: { x: number; y: number }, radius: number) {
  const vertices = Array.from({ length: 6 }, (_, index) => {
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
    ...zoneShape(anchor, radius),
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
