import type { BattleState } from '../../convex/aiTown/battleRoyale';

export default function BattleReplayControls({
  battle,
  active,
  speed,
  onToggle,
  onSpeed,
  onJump,
}: {
  battle?: BattleState;
  active: boolean;
  speed: number;
  onToggle: () => void;
  onSpeed: (speed: number) => void;
  onJump: (time: number) => void;
}) {
  if (!battle) return null;
  const events = [...(battle.feed ?? [])].filter((event) => ['eliminate', 'attack', 'areaStory', 'globalStory', 'intervention', 'truth', 'betrayal'].includes(event.kind)).slice(0, 5);
  return <section className="replay-controls pointer-events-auto">
    <div className="replay-header"><span>回放控制</span><small>种子 {battle.seed ?? '旧局'}</small></div>
    <div className="replay-actions">
      <button className="live-hud-button" onClick={onToggle}>{active ? '暂停回放' : '开始回放'}</button>
      {[1, 2, 4].map((value) => <button key={value} className={`live-hud-button ${speed === value ? 'is-active' : ''}`} onClick={() => onSpeed(value)}>{value}×</button>)}
    </div>
    <div className="replay-checkpoints">检查点 {(battle.replayCheckpoints ?? []).length} · 行动 {(battle.actionLog ?? []).length}</div>
    <div className="replay-events">
      {events.length ? events.map((event) => <button key={event.id} onClick={() => onJump(event.ts)}>{event.text}</button>) : <span>等待关键事件</span>}
    </div>
  </section>;
}
