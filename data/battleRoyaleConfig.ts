// Data-driven battle configuration adapted from the reference design tables.
// Keep runtime code dependent on these ids instead of display names.

export type RelationType = 'family' | 'ex' | 'rival' | 'mentor' | 'friend' | 'stranger';

export const BATTLE_CONFIG = {
  match: {
    agentCount: 12,
    maxInventorySlots: 6,
    initialInterventionPoints: 15,
    maxInterventionPoints: 30,
    heatRewardStep: 50,
    searchCooldownMs: 12000,
    dayMs: 900000,
    nightMs: 600000,
    battleTickMs: 2500,
    actionCooldownMs: 6500,
    attackRange: 3.2,
    dangerRange: 4.8,
    maxFeed: 24,
  },
  characters: [
    { id: 'C01', codename: 'Lighthouse', name: 'Alex', strength: 5, heat: 85, stressThreshold: 75, areaId: 'A01' },
    { id: 'C02', codename: 'Firework', name: 'Lucky', strength: 2, heat: 110, stressThreshold: 45, areaId: 'A02' },
    { id: 'C03', codename: 'Ruler', name: 'Bob', strength: 2, heat: 65, stressThreshold: 80, areaId: 'A03' },
    { id: 'C04', codename: 'Thorn', name: 'Stella', strength: 5, heat: 95, stressThreshold: 40, areaId: 'A04' },
    { id: 'C05', codename: 'Sugar', name: 'Kurt', strength: 2, heat: 75, stressThreshold: 35, areaId: 'A05' },
    { id: 'C06', codename: 'Frost', name: 'Alice', strength: 2, heat: 70, stressThreshold: 85, areaId: 'A06' },
    { id: 'C07', codename: 'Echo', name: 'Pete', strength: 3, heat: 80, stressThreshold: 55, areaId: 'A07' },
    { id: 'C08', codename: 'Ticker', name: 'Kira', strength: 3, heat: 72, stressThreshold: 60, areaId: 'A08' },
    { id: 'C09', codename: 'Edge', name: 'Mira', strength: 4, heat: 88, stressThreshold: 70, areaId: 'A09' },
    { id: 'C10', codename: 'Spirit Owl', name: 'Juno', strength: 3, heat: 60, stressThreshold: 95, areaId: 'A10' },
    { id: 'C11', codename: 'Old Debt', name: 'Nico', strength: 2, heat: 68, stressThreshold: 65, areaId: 'A11' },
    { id: 'C12', codename: 'Nameless', name: 'Nora', strength: 4, heat: 50, stressThreshold: 90, areaId: 'A12' },
  ],
  areas: [
    { id: 'A01', key: 'bastion_ruins', name: 'Bastion Ruins', danger: 3, owner: 'C01', buff: 'armor_search_up' },
    { id: 'A02', key: 'broadcast_tower', name: 'Broadcast Tower', danger: 2, owner: 'C02', buff: 'information_search_up' },
    { id: 'A03', key: 'archive_library', name: 'Archive Library', danger: 2, owner: 'C03', buff: 'clue_search_up' },
    { id: 'A04', key: 'fighting_pit', name: 'Fighting Pit', danger: 4, owner: 'C04', buff: 'melee_damage_up' },
    { id: 'A05', key: 'academy_ruins', name: 'Academy Ruins', danger: 2, owner: 'C05', buff: 'social_search_up' },
    { id: 'A06', key: 'field_hospital', name: 'Field Hospital', danger: 2, owner: 'C06', buff: 'medkit_search_up' },
    { id: 'A07', key: 'training_ground', name: 'Training Ground', danger: 2, owner: 'C07', buff: 'move_speed_up' },
    { id: 'A08', key: 'shadow_market', name: 'Shadow Market', danger: 3, owner: 'C08', buff: 'trade_success_up' },
    { id: 'A09', key: 'armory', name: 'Armory', danger: 5, owner: 'C09', buff: 'weapon_search_up' },
    { id: 'A10', key: 'deep_forest', name: 'Deep Forest', danger: 3, owner: 'C10', buff: 'stealth_up' },
    { id: 'A11', key: 'court_ruins', name: 'Court Ruins', danger: 1, owner: 'C11', buff: 'negotiation_up' },
    { id: 'A12', key: 'observatory_ruins', name: 'Observatory Ruins', danger: 2, owner: 'C12', buff: 'vision_up' },
    { id: 'S01', key: 'truth_chamber', name: 'Truth Chamber', danger: 5, owner: 'C12', buff: 'truth_story', special: true },
  ],
  adjacency: [
    ['A01', 'A06'], ['A01', 'A09'], ['A01', 'A10'],
    ['A02', 'A03'], ['A02', 'A05'], ['A02', 'A12'],
    ['A03', 'A05'], ['A03', 'A08'], ['A04', 'A07'],
    ['A04', 'A08'], ['A05', 'A11'], ['A06', 'A07'],
    ['A06', 'A10'], ['A07', 'A11'], ['A08', 'A09'],
    ['A08', 'A11'], ['A12', 'S01'],
  ],
  relationships: [
    { id: 'REL_SEED_01', a: 'C01', b: 'C05', type: 'family' as RelationType, strength: 85, hidden: false, mutable: true, triggerWeight: 90 },
    { id: 'REL_SEED_02', a: 'C02', b: 'C07', type: 'ex' as RelationType, strength: 55, hidden: false, mutable: true, triggerWeight: 80 },
    { id: 'REL_SEED_03', a: 'C04', b: 'C09', type: 'rival' as RelationType, strength: 75, hidden: false, mutable: true, triggerWeight: 95 },
    { id: 'REL_SEED_04', a: 'C03', b: 'C12', type: 'mentor' as RelationType, strength: 70, hidden: true, mutable: true, triggerWeight: 85 },
  ],
  runtime: {
    satietyStart: 80,
    zoneTimeStart: 30,
    zoneTimeMax: 40,
    staminaBase: 60,
    staminaPerStrength: 10,
    hpBase: 100,
    hpPerStrength: 20,
    searchStaminaCost: 12,
    attackStaminaCost: 6,
    moveStaminaCost: 8,
  },
  weapons: {
    Fists: { power: 8, range: 1.4, cost: 0 },
    Pistol: { power: 20, range: 3.2, cost: 80 },
    Shotgun: { power: 28, range: 2.6, cost: 140 },
    Rifle: { power: 35, range: 4.2, cost: 200 },
    Sniper: { power: 48, range: 5.4, cost: 300 },
  },
  areaItems: {
    A01: ['ration', 'warm_clothes', 'armor_plate', 'tactical_knife', 'military_tag'],
    A02: ['canned_coffee', 'recorder', 'signal_jammer', 'hidden_receiver', 'broadcast_tape'],
    A03: ['supplement', 'cracker', 'intel_map', 'encrypted_archive', 'strategy_notes'],
    A04: ['adrenaline', 'knuckle_duster', 'iron_chain', 'fight_bandage', 'bloodied_sheath'],
    A05: ['lunch_box', 'walkie_talkie', 'smoke_bomb', 'student_file'],
    A06: ['medkit', 'painkiller', 'scalpel', 'protective_suit', 'medical_terminal'],
    A07: ['sports_drink', 'protein_bar', 'shot_put', 'running_shoes', 'medal'],
    A08: ['smuggled_food', 'master_key', 'fake_id', 'ledger_fragment', 'debt_note'],
    A09: ['water_purifier', 'assault_rifle', 'pistol', 'frag_grenade', 'weapon_manifest'],
    A10: ['wild_fruit', 'herbs', 'wood_spear', 'camouflage_cloak', 'bark_symbol'],
    A11: ['tea_supply', 'evidence_bag', 'gavel', 'verdict_copy', 'case_file'],
    A12: ['power_pack', 'terminal_key', 'portable_radar', 'monitor_fragment', 'blank_id'],
    S01: ['truth_core', 'maker_log'],
  } as Record<string, string[]>,
  zone: {
    warningMs: 30000,
    redZoneDamagePerSecond: 1,
    earlyIntervalMs: 180000,
    midIntervalMs: 120000,
    lateIntervalMs: 90000,
  },
} as const;

export type BattleCharacterProfile = (typeof BATTLE_CONFIG.characters)[number];

export function profileForIndex(index: number) {
  return BATTLE_CONFIG.characters[index % BATTLE_CONFIG.characters.length];
}

export function profileForCharacterId(characterId: string) {
  return BATTLE_CONFIG.characters.find((profile) => profile.id === characterId) ?? BATTLE_CONFIG.characters[0];
}

export function validateBattleConfig() {
  const characterIds = new Set(BATTLE_CONFIG.characters.map((profile) => profile.id));
  const areaIds = new Set(BATTLE_CONFIG.areas.map((area) => area.id));
  if (characterIds.size !== BATTLE_CONFIG.match.agentCount) {
    throw new Error(`Battle config expects ${BATTLE_CONFIG.match.agentCount} unique characters.`);
  }
  if (areaIds.size !== 13 || !areaIds.has('S01')) {
    throw new Error('Battle config must contain 12 normal areas and S01.');
  }
  for (const [a, b] of BATTLE_CONFIG.adjacency) {
    if (!areaIds.has(a) || !areaIds.has(b) || a >= b) {
      throw new Error(`Invalid adjacency edge: ${a}-${b}`);
    }
  }
  for (const relation of BATTLE_CONFIG.relationships) {
    if (!characterIds.has(relation.a) || !characterIds.has(relation.b) || relation.a >= relation.b) {
      throw new Error(`Invalid relationship edge: ${relation.a}-${relation.b}`);
    }
  }
  for (const area of BATTLE_CONFIG.areas) {
    if (!BATTLE_CONFIG.areaItems[area.id]) {
      throw new Error(`Missing item pool for ${area.id}`);
    }
  }
}

validateBattleConfig();
