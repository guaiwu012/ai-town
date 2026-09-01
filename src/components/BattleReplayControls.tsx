import type { BattleState } from '../../convex/aiTown/battleRoyale';

export default function BattleReplayControls({
  battle,
  active,
  speed,
  currentTime,
  onToggle,
  onSpeed,
  onJump,
}: {
  battle?: BattleState;
  active: boolean;
  speed: number;
  currentTime?: number;
  onToggle: () => void;
  onSpeed: (speed: number) => void;
  onJump: (time: number) => void;
}) {
  if (!battle) return null;
  const events = [...(battle.feed ?? [])]
    .filter((event) => !currentTime || event.ts <= currentTime)
    .filter((event) => ['eliminate', 'attack', 'areaStory', 'globalStory', 'intervention', 'truth', 'betrayal'].includes(event.kind))
    .slice(0, 5);
  const actions = [...(battle.actionLog ?? [])]
    .filter((entry) => !currentTime || entry.ts <= currentTime)
    .filter((entry) => entry.action !== 'worldTick')
    .slice(-4)
    .reverse();
  return <section className="replay-controls pointer-events-auto">
    <div className="replay-header"><span>回放控制</span><small>种子 {battle.seed ?? '旧局'}</small></div>
    <div className="replay-actions">
      <button className="live-hud-button" onClick={onToggle}>{active ? '暂停回放' : '开始回放'}</button>
      {[1, 2, 4].map((value) => <button key={value} className={`live-hud-button ${speed === value ? 'is-active' : ''}`} onClick={() => onSpeed(value)}>{value}×</button>)}
    </div>
    <div className="replay-checkpoints">{active ? `正在播放 ${formatReplayTime(currentTime, battle.started)}` : '已暂停'} · 检查点 {(battle.replayCheckpoints ?? []).filter((checkpoint) => checkpoint.frame).length}/{(battle.replayCheckpoints ?? []).length} · 行动 {(battle.actionLog ?? []).length}</div>
    <div className="replay-events">
      {events.length ? events.map((event) => <button key={event.id} onClick={() => onJump(event.ts)}>{event.text}</button>) : <span>等待关键事件</span>}
    </div>
    <div className="replay-events replay-actions-log">
      {actions.map((entry) => <button key={entry.id} onClick={() => onJump(entry.ts)}>{entry.source === 'model' ? '模型' : '规则'} · {actionName(entry.action)}{entry.targetAreaId ? ` → ${entry.targetAreaId}` : entry.targetPlayerId ? ` → ${entry.targetPlayerId}` : ''} · {entry.accepted ? '已执行' : `拒绝：${entry.reason ?? '未知原因'}`}</button>)}
    </div>
  </section>;
}

function formatReplayTime(time: number | undefined, started: number | undefined) {
  if (!time || !started) return '准备中';
  const elapsed = Math.max(0, Math.floor((time - started) / 1000));
  return `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
}

function actionName(action: string) {
  return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查', intervention: '主办方干预', audience: '观众结算', fallback: '规则回退' } as Record<string, string>)[action] ?? action;
}
