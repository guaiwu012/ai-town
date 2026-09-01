import { ServerGame } from '../hooks/serverGame';
import { GameId } from '../../convex/aiTown/ids';
import BattleVitalBattery from './BattleVitalBattery';
import { useEffect, useState } from 'react';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';

type LiveBattleHudProps = {
  game: ServerGame;
  focusPlayerId?: GameId<'players'>;
  cameraMode: 'auto' | 'locked';
  directorCaption: string;
  onOpenOverview: () => void;
  onOpenDetails: () => void;
  onOpenMine: () => void;
  onResumeDirector: () => void;
  onRestart: () => void;
  onToggleReplay: () => void;
  replayActive: boolean;
};

export default function LiveBattleHud({
  game,
  focusPlayerId,
  cameraMode,
  directorCaption,
  onOpenOverview,
  onOpenDetails,
  onOpenMine,
  onResumeDirector,
  onRestart,
  onToggleReplay,
  replayActive,
}: LiveBattleHudProps) {
  const battle = game.world.battle;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const focus = focusPlayerId ? game.world.players.get(focusPlayerId) : undefined;
  const name = focus ? game.playerDescriptions.get(focus.id)?.name ?? focus.id : '等待导播目标';
  const stats = focus?.battle;
  const alive = [...game.world.players.values()].filter((player) => player.battle && !player.battle.eliminated).length;

  return (
    <div className="live-hud pointer-events-none absolute inset-0 z-10">
      <div className="live-hud-top pointer-events-auto">
        <div className="live-brand"><b className="live-badge">LIVE</b> AI 大逃杀 <span>直播跟随</span></div>
        <div className="live-match-meta">第 {battle?.day ?? 1} 天 · {battle?.timeOfDay === 'night' ? '夜间' : '白天'} · {alive} 人存活</div>
        <div className="live-top-actions">
          <button className="live-hud-button" onClick={onOpenOverview}>战略总览</button>
          <button className={`live-hud-button ${replayActive ? 'is-active' : ''}`} onClick={onToggleReplay}>{replayActive ? '回放中' : '回放'}</button>
          <button className="live-hud-button live-hud-danger" onClick={onRestart}>新开一局</button>
        </div>
      </div>

      <section className="live-tactical-strip pointer-events-auto">
        <div className="live-pulse"><i />直播态势</div>
        <div><small>热度</small><strong>{battle?.popularity ?? 0}</strong></div>
        <div><small>禁区收缩</small><strong>{formatCountdown(Math.max(0, Math.ceil(((battle?.zoneClosesAt ?? now) - now) / 1000)))}</strong></div>
        <div><small>封锁区域</small><strong className={(battle?.areaLocks ?? []).some((lock) => lock.until > now) ? 'is-alert' : ''}>{(battle?.areaLocks ?? []).filter((lock) => lock.until > now).length}</strong></div>
        <div><small>镜头区域</small><strong>{areaName(stats?.areaId)}</strong></div>
      </section>

      <div className="live-hud-bottom pointer-events-auto">
        <section className="focus-card">
          <div className="focus-card-identity"><Portrait characterId={stats?.characterId} /><div><div className="focus-card-kicker">{cameraMode === 'auto' ? directorCaption : '手动锁定 · 选手跟拍'}</div><div className="focus-card-title">{name}</div></div></div>
          {stats && <div className="focus-card-stats flex items-center gap-2"><BattleVitalBattery value={stats.hp} max={stats.maxHp} /><span>{Math.ceil(stats.hp)}/{stats.maxHp} · {displayWeapon(stats.weapon)} · {stats.areaId ?? 'A01'} · {stats.kills} 击杀</span></div>}
          {focus?.activity && focus.activity.until > now && <div className="focus-card-action">{focus.activity.emoji === 'MOVE' && focus.speed <= 0 ? `${name} 正在观察路线` : focus.activity.description}</div>}
          <div className="focus-card-actions">
            <button className="live-hud-button" onClick={onOpenDetails}>角色详情</button>
            {cameraMode === 'locked' && <button className="live-hud-button" onClick={onResumeDirector}>恢复自动导播</button>}
          </div>
        </section>
        <section className="live-control-cluster">
          <div className="live-point-readout">干预点 <strong>{battle?.interventionPoints ?? 0}</strong>/{battle?.interventionPointsMax ?? 30}</div>
          <button className="live-hud-button live-hud-primary" onClick={onOpenMine}>扫雷赚取干预点</button>
        </section>
      </div>
    </div>
  );
}

function displayWeapon(weapon: string) {
  return ({ Fists: '拳头', Pistol: '手枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪' } as Record<string, string>)[weapon] ?? weapon;
}

function formatCountdown(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function areaName(areaId?: string) {
  return BATTLE_CONFIG.areas.find((area) => area.id === areaId)?.name ?? areaId ?? '--';
}

function Portrait({ characterId }: { characterId?: string }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  const col = index % 4;
  const row = Math.floor(index / 4);
  return <span className="contestant-portrait" style={{ backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%` }} />;
}
