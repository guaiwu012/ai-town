import { REFERENCE_SCORE_EVENTS, REFERENCE_COMBOS, REFERENCE_LOG_CATEGORIES, REFERENCE_GLOBAL_LOG_TEMPLATES, REFERENCE_MAP_LOG_TEMPLATES, REFERENCE_CHARACTER_LOG_TEMPLATES } from './referenceRuntime';

// These additions resolve gaps in the source design; they are not Excel values.
export const SUPPLEMENTAL_RULES = {
  pain: { durationMs: 15000, movementPenalty: 0.2, damagePenalty: 0.1 },
  fatigue: { durationMs: 15000, staminaLoss: 15 },
  smokeMs: 8000,
  intelRefreshMs: 5000,
  stunMs: 2000,
  criticalChance: 0.2,
  stunChance: 0.2,
  shotHitChance: 0.6,
  eliteMonster: { hp: 80, retaliation: 12, zoneReward: 7 },
  fastMeleeCooldownMultiplier: 0.75,
  ratingRewards: { S: '真相导演', A: '金牌导演', B: '新锐导演', C: '见习导演' } as Record<string, string>,
  manufacturerLog: '制造者日志：主办方是观测协议委员会。比赛用于检验被赋予记忆的人工人格是否会在生存压力下自发合作。N-00 是保留原始记忆的对照样本；委员会隐藏关系档案，以操纵冲突。公开日志将终止这一轮秘密实验。',
};

export const SCORE_EVENTS = Object.fromEntries(REFERENCE_SCORE_EVENTS.map(row => [String(row.event_id), {
  id: String(row.event_id), name: String(row.event_name), base: Number(row.base_score),
  heat: row.heat_multiplier_applies === true, anchor: String(row.heat_anchor), combo: row.is_combo_eligible === true,
}]));

export type ScoreEntry = { ts: number; base: number; credited: number };
// Reprice all eligible events in the live window at the highest earned tier.
// Previously credited amounts are subtracted, so earlier events receive their
// missing combo bonus without being paid twice.
export function scoreAward(now: number, base: number, heat: number, comboEligible: boolean, history: ScoreEntry[]) {
  const maxWindow = Math.max(...REFERENCE_COMBOS.map(row => Number(row.window_sec) * 1000));
  const entries = history.filter(row => row.ts <= now && now - row.ts <= maxWindow).map(row => ({ ...row }));
  const actual = Math.round((base > 0 ? base * (1 + heat / 500) : base) * 100) / 100;
  if (!comboEligible || base <= 0) return { gained: actual, entries, multiplier: 1 };
  entries.push({ ts: now, base: actual, credited: 0 });
  let multiplier = 1;
  for (const tier of REFERENCE_COMBOS) {
    const eligible = entries.filter(row => now - row.ts <= Number(tier.window_sec) * 1000);
    if (eligible.length < Number(tier.min_events)) continue;
    multiplier = Math.max(multiplier, Number(tier.multiplier));
  }
  let gained = 0;
  for (const entry of entries) {
    const applicable = REFERENCE_COMBOS.filter(tier => now - entry.ts <= Number(tier.window_sec) * 1000 && entries.filter(row => now - row.ts <= Number(tier.window_sec) * 1000).length >= Number(tier.min_events));
    const factor = Math.max(1, ...applicable.map(tier => Number(tier.multiplier)));
    const amount = Math.max(entry.credited, entry.base * factor);
    gained += amount - entry.credited;
    entry.credited = amount;
  }
  return { gained: Math.round(gained * 100) / 100, entries, multiplier };
}

export type LogChannel = 'global' | 'map' | 'character';
const templates = {
  global: REFERENCE_GLOBAL_LOG_TEMPLATES,
  map: REFERENCE_MAP_LOG_TEMPLATES,
  character: REFERENCE_CHARACTER_LOG_TEMPLATES,
};
const aliases: Record<string, string> = { chareliminatedcombat: 'char_eliminated', reltriggerprivate: 'rel_trigger', charfindclue: 'mission_hint' };
export function referenceLog(type: string, vars: Record<string, string>, fallback: string, privateOnly = false) {
  privateOnly ||= type === 'reltriggerprivate';
  const category = REFERENCE_LOG_CATEGORIES.find(row => row.event_type === (aliases[type] ?? type));
  const render = (channel: LogChannel) => {
    const row = templates[channel].find(row => row.event_type === type) ?? templates[channel].find(row => row.event_type === aliases[type]);
    const template = String(row?.['模板'] ?? fallback);
    if ([...template.matchAll(/\{([^}]+)\}/g)].some(match => vars[match[1]] === undefined)) return fallback;
    // Missing variables must not leak raw placeholder syntax into the UI.
    return template.replace(/\{([^}]+)\}/g, (_, key: string) => vars[key] ?? '未知');
  };
  const enabled = (key: string) => category ? category[key] !== null && category[key] !== '' : true;
  return {
    eventType: type,
    globalText: !privateOnly && enabled('全局日志') ? render('global') : undefined,
    mapText: !privateOnly && enabled('地图日志') ? render('map') : undefined,
    characterText: enabled('角色日志') || privateOnly ? render('character') : undefined,
  };
}

export const ITEM_VISUALS: Record<string, { color: number; shape: 'cross' | 'ring' | 'rays' | 'smoke'; label: string }> = {
  hp: { color: 0x54ed99, shape: 'cross', label: '恢复' },
  stamina: { color: 0x6bd8ff, shape: 'rays', label: '耐力' },
  satiety: { color: 0xffc86a, shape: 'ring', label: '饱食' },
  'satiety+stamina': { color: 0xffc86a, shape: 'rays', label: '补给' },
  aoe_damage: { color: 0xff7b3b, shape: 'rays', label: '爆炸' },
  escape_smoke: { color: 0xb4bdcf, shape: 'smoke', label: '烟幕' },
};
export function itemVisual(key: string) {
  return ITEM_VISUALS[key] ?? (/reveal|clue|lore|plot|truth|radar|scout|watch|eavesdrop|comm/.test(key)
    ? { color: 0xbb9aff, shape: 'ring' as const, label: '情报' }
    : { color: 0x71cfff, shape: 'rays' as const, label: '强化' });
}
