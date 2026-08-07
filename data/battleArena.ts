import { BATTLE_CONFIG, AREA_ANCHORS } from './battleRoyaleConfig';

export type BattleArenaZone = {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  radius: number;
  color: number;
};

// Shared by the Pixi battlefield, overview markers and logical-area tooling.
// Coordinates are normalized so visual assets can evolve without invalidating rules.
export const BATTLE_ARENA_ZONES: BattleArenaZone[] = BATTLE_CONFIG.areas.map((area) => ({
  id: area.id,
  label: area.name,
  anchor: AREA_ANCHORS[area.id],
  radius: area.id === 'S01' ? 0.045 : 0.075,
  color: area.danger >= 4 ? 0xd45c5c : area.danger >= 3 ? 0xd99a43 : 0x52bca7,
}));

export const BATTLE_ARENA_ART = '/ai-town/assets/battle/arena-live-map.png';
