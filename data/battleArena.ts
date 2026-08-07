import { BATTLE_CONFIG, AREA_ANCHORS } from './battleRoyaleConfig';

export type BattleArenaZone = {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  radius: number;
  color: number;
  polygon: { x: number; y: number }[];
  spawnPoints: { x: number; y: number }[];
};

function zoneShape(anchor: { x: number; y: number }, radius: number) {
  const vertices = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return { x: Math.max(0.02, Math.min(0.98, anchor.x + Math.cos(angle) * radius)), y: Math.max(0.02, Math.min(0.98, anchor.y + Math.sin(angle) * radius)) };
  });
  return {
    polygon: vertices,
    spawnPoints: [anchor, ...vertices.filter((_, index) => index % 2 === 0).map((point) => ({ x: (point.x + anchor.x) / 2, y: (point.y + anchor.y) / 2 }))],
  };
}

// Shared by the Pixi battlefield, overview markers and logical-area tooling.
// Coordinates are normalized so visual assets can evolve without invalidating rules.
export const BATTLE_ARENA_ZONES: BattleArenaZone[] = BATTLE_CONFIG.areas.map((area) => {
  const radius = area.id === 'S01' ? 0.045 : 0.075;
  const anchor = AREA_ANCHORS[area.id];
  return { id: area.id, label: area.name, anchor, radius, color: area.danger >= 4 ? 0xd45c5c : area.danger >= 3 ? 0xd99a43 : 0x52bca7, ...zoneShape(anchor, radius) };
});

export function battleAreaSpawnPoints(areaId: string, mapWidth: number, mapHeight: number) {
  return (BATTLE_ARENA_ZONES.find((zone) => zone.id === areaId)?.spawnPoints ?? []).map((point) => ({
    x: Math.round(point.x * (mapWidth - 2)) + 1,
    y: Math.round(point.y * (mapHeight - 2)) + 1,
  }));
}

export const BATTLE_ARENA_ART = '/ai-town/assets/battle/arena-live-map.png';
