import snapshot from './referenceTables.generated.json';

type Cell = string | number | boolean | null;
type Sheet = { address: string | null; values: Cell[][] };
type Workbook = { source: string; sheets: Record<string, Sheet> };

const workbooks = snapshot.workbooks as unknown as Record<string, Workbook>;

function sheet(workbook: string, name: string) {
  const value = workbooks[workbook]?.sheets[name];
  if (!value) throw new Error(`Missing reference sheet ${workbook}/${name}`);
  return value.values;
}

function records(workbook: string, name: string, headerRow = 0) {
  const values = sheet(workbook, name);
  const headers = values[headerRow].map((value) => String(value ?? '').trim());
  return values.slice(headerRow + 1)
    .filter((row) => row.some((value) => value !== null && value !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}

export const REFERENCE_SOURCE = {
  repository: snapshot.sourceRepository,
  commit: snapshot.sourceCommit,
  generatedAt: snapshot.generatedAt,
};

export const REFERENCE_GLOBAL_CONFIG = Object.fromEntries(
  records('globalConfig', '01_全局配置').map((row) => [String(row.config_key), row.value]),
) as Record<string, Cell>;

export function referenceNumber(key: string) {
  const value = REFERENCE_GLOBAL_CONFIG[key];
  if (typeof value !== 'number') throw new Error(`Reference config ${key} is not numeric`);
  return value;
}

export function referenceString(key: string) {
  const value = REFERENCE_GLOBAL_CONFIG[key];
  if (typeof value !== 'string') throw new Error(`Reference config ${key} is not text`);
  return value;
}

export const REFERENCE_CHARACTERS = records('characters', '01_人物人设', 2).map((row) => ({
  id: String(row['角色ID']), codename: String(row['节目代号']), name: String(row['显示名']),
  gender: String(row['性别观感']), ageBand: String(row['年龄段']), publicRole: String(row['公开身份']),
  oneLiner: String(row['一句话人设']), tags: String(row['性格标签']).split(',').map((tag) => tag.trim()),
  lookNote: String(row['外观备注']), voiceTone: String(row['说话口吻']),
  strength: Number(row['体力']), mind: Number(row['脑力']), psyche: Number(row['心理']), social: Number(row['社交']),
  aggro: String(row['攻击倾向']), coop: String(row['合作倾向']), risk: String(row['冒险倾向']),
  stressThreshold: Number(row['崩坏阈值']), startLoadout: String(row['开局倾向']),
  relationHook: String(row['关系钩子']), dramaHook: String(row['节目效果点']), publicBio: String(row['公开简介']),
  hiddenTruth: String(row['隐藏真相(待全部大改）']), secretFlag: row['可藏秘密'] === '是',
  priority: String(row['制作优先级']), status: String(row['状态']), note: String(row['备注']),
}));

export const REFERENCE_RUNTIME_CHARACTERS = records('characterRuntime', '01_开局运行时').map((row) => ({
  characterId: String(row.char_id), hpMax: Number(row.hp_max), staminaMax: Number(row.stamina_max),
  satietyMax: Number(row.satiety_max), satietyInitial: Number(row.satiety_cur), zoneTime: Number(row.zone_time_cur),
  zoneTimeMax: Number(row.zone_time_max), inventorySlots: Number(row.inventory_slots), heat: Number(row.heat_score),
  heatMultiplier: Number(row.heat_multiplier), alive: Boolean(row.alive), heatReason: String(row.heat_reason),
}));

export type ReferenceItem = {
  id: string; name: string; category: string; subCategory: string; rarity: string; effectDescription: string;
  effectKey: string; effectValue: number; effectValue2: number; durationSeconds: number; consumable: boolean;
  stackable: boolean; slotSize: number; searchWeight: number; primaryAreaId: string; characterExclusive: boolean;
  exclusiveCharacterId?: string; globalRare: boolean; spawnRule: string;
};

export const REFERENCE_ITEMS: ReferenceItem[] = records('items', '01_物品主表').map((row) => ({
  id: String(row.item_id), name: String(row.name), category: String(row.category), subCategory: String(row.sub_category),
  rarity: String(row.rarity), effectDescription: String(row.effect_desc), effectKey: String(row.effect_key),
  effectValue: Number(row.effect_value ?? 0), effectValue2: Number(row.effect_value_2 ?? 0),
  durationSeconds: Number(row.duration_sec ?? 0), consumable: Boolean(row.is_consumable), stackable: Boolean(row.stackable),
  slotSize: Number(row.slot_size ?? 1), searchWeight: Number(row.search_weight ?? 1), primaryAreaId: String(row.primary_area_id),
  characterExclusive: Boolean(row.is_char_exclusive),
  ...(row.exclusive_char_id ? { exclusiveCharacterId: String(row.exclusive_char_id) } : {}),
  globalRare: Boolean(row.is_global_rare), spawnRule: String(row.spawn_rule),
}));
export const REFERENCE_ITEM_BY_NAME = Object.fromEntries(REFERENCE_ITEMS.map((item) => [item.name, item]));

export const REFERENCE_AREAS = records('areas', 'Table 1').map((row) => ({
  key: String(row.field_key), name: String(row['区域名称']), owner: String(row['对应角色']).split(' ')[0],
  theme: String(row['主题']), danger: Number(String(row['危险度']).replace(/\D/g, '')),
  entryRequirement: String(row['准入条件']), environmentEffect: String(row['环境效果']), specialMechanic: String(row['特殊机制']),
}));

export const REFERENCE_RELATION_SEEDS = records('relationships', '01_固定种子');
export const REFERENCE_RELATION_TYPES = records('relationships', '02_类型权重');
export const REFERENCE_RELATION_PARAMS = Object.fromEntries(records('relationships', '03_生成参数').map((row) => [String(row.param_key), row.value]));
export const REFERENCE_RELATION_CHANGES = records('relationships', '04_强度变化');

export const REFERENCE_ADJACENCY = records('adjacency', '01_边列表');
export const REFERENCE_CHARACTER_STORIES = records('characterAreas', 'Table 2');
export const REFERENCE_AREA_STORIES = records('stories', 'Table 1');
export const REFERENCE_GLOBAL_STORIES = records('stories', 'Table 2');

export const REFERENCE_INTERVENTIONS = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5']
  .flatMap((name) => records('interventions', name));

export const REFERENCE_SCORE_EVENTS = [...records('scores', '01_加分事件'), ...records('scores', '02_扣分事件')];
export const REFERENCE_COMBOS = records('scores', '03_连击');
export const REFERENCE_RATINGS = records('scores', '04_通关评级');
export const REFERENCE_HIDDEN_MISSIONS = records('scores', '05_隐藏任务');

export const REFERENCE_LOG_CATEGORIES = records('logs', 'Table 1');
export const REFERENCE_GLOBAL_LOG_TEMPLATES = records('logs', 'Table 2');
export const REFERENCE_MAP_LOG_TEMPLATES = records('logs', 'Table 3');
export const REFERENCE_CHARACTER_LOG_TEMPLATES = records('logs', 'Table 4');

export const REFERENCE_PLAYER_FIELDS = records('playerState', '01_字段与开局值');
export const REFERENCE_PHASES = records('playerState', '02_阶段枚举');
export const REFERENCE_PLAYER_DERIVED_RULES = records('playerState', '03_派生规则');

export const REFERENCE_ZONE_TABLES = Object.fromEntries(
  Object.keys(workbooks.zoneRules.sheets).map((name) => [name, records('zoneRules', name)]),
);

export const REFERENCE_ART_ASSETS = records('art', '02_总清单');

export const REFERENCE_TABLE_COUNTS = {
  workbooks: Object.keys(workbooks).length,
  sheets: Object.values(workbooks).reduce((sum, workbook) => sum + Object.keys(workbook.sheets).length, 0),
  characters: REFERENCE_CHARACTERS.length,
  items: REFERENCE_ITEMS.length,
  interventions: REFERENCE_INTERVENTIONS.length,
  areaStories: REFERENCE_AREA_STORIES.length,
  artAssets: REFERENCE_ART_ASSETS.length,
};

export { snapshot as REFERENCE_TABLE_SNAPSHOT };
