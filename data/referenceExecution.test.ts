import { referenceLog, scoreAward, SCORE_EVENTS, itemVisual } from './referenceExecution';
import { REFERENCE_LOG_CATEGORIES, REFERENCE_GLOBAL_LOG_TEMPLATES, REFERENCE_MAP_LOG_TEMPLATES, REFERENCE_CHARACTER_LOG_TEMPLATES, REFERENCE_ITEMS } from './referenceRuntime';

describe('source scoring formulas and log channels', () => {
  test('preserves the reference 30.5 kill and 110 truth examples', () => {
    expect(scoreAward(1000, SCORE_EVENTS.SCR_P02.base, 110, true, []).gained).toBe(30.5);
    expect(scoreAward(1000, SCORE_EVENTS.SCR_P12.base, 50, false, []).gained).toBe(110);
  });
  test.each(Object.values(SCORE_EVENTS).map(rule => [rule.id, rule]))('%s executes its exact base, heat and combo flags', (_, rule) => {
    const scored = scoreAward(1000, rule.base, 50, rule.combo, []);
    expect(scored.gained).toBe(rule.base > 0 && rule.heat ? Math.round(rule.base * 1.1 * 100) / 100 : rule.base);
    expect(scored.entries).toHaveLength(rule.combo && rule.base > 0 ? 1 : 0);
  });
  test('reprices a combo window without stacking tiers or paying an event twice', () => {
    let history: ReturnType<typeof scoreAward>['entries'] = [];
    let total = 0;
    for (let i = 0; i < 5; i++) { const result = scoreAward(i * 1000, 10, 0, true, history); total += result.gained; history = result.entries; }
    expect(total).toBe(100);
    expect(scoreAward(70000, 10, 0, true, history).gained).toBe(10);
  });
  test('truth and deductions neither count toward combos nor receive their multiplier', () => {
    const history = [0, 1000, 2000].map(ts => ({ ts, base: 10, credited: 15 }));
    expect(scoreAward(3000, 100, 50, false, history).gained).toBeCloseTo(110);
    expect(scoreAward(3000, -5, 0, false, history).gained).toBe(-5);
    expect(scoreAward(3000, -5, 0, false, history).entries).toHaveLength(3);
  });
  test.each(REFERENCE_LOG_CATEGORIES.map(row => [String(row.event_type), row]))('%s obeys every declared channel column', (type, row) => {
    const result = referenceLog(type, {}, 'fallback');
    const source = row as Record<string, unknown>;
    expect(result.globalText !== undefined).toBe(source['全局日志'] !== null);
    expect(result.mapText !== undefined).toBe(source['地图日志'] !== null);
    expect(result.characterText !== undefined).toBe(source['角色日志'] !== null);
  });
  for (const [channel, rows] of [['globalText', REFERENCE_GLOBAL_LOG_TEMPLATES], ['mapText', REFERENCE_MAP_LOG_TEMPLATES], ['characterText', REFERENCE_CHARACTER_LOG_TEMPLATES]] as const) {
    test.each(rows.map(row => [String(row.event_type), String(row['模板'])]))(`${channel} %s renders the source template`, (type, template) => {
      const vars = Object.fromEntries([...template.matchAll(/\{([^}]+)\}/g)].map(match => [match[1], `值:${match[1]}`]));
      expect(referenceLog(type, vars, 'fallback')[channel]).toBe(template.replace(/\{([^}]+)\}/g, (_, key) => vars[key]));
    });
  }
  test('private intel never enters global or map feeds', () => {
    expect(referenceLog('gm_intervene', { 操作描述: '秘密消息' }, '秘密消息', true)).toMatchObject({ globalText: undefined, mapText: undefined, characterText: '秘密消息' });
  });
  test.each(REFERENCE_ITEMS.map(item => [item.id, item.effectKey]))('%s has a deterministic effect presentation', (_, key) => {
    expect(itemVisual(key).label).toBeTruthy();
    expect(itemVisual(key).color).toBeGreaterThan(0);
  });
});
