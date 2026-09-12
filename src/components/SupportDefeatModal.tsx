import { useEffect, useRef } from 'react';
import { POPULARITY_PROGRESSION, popularityRatingFor } from '../../data/battleRoyaleConfig';
import type { GameId } from '../../convex/aiTown/ids';
import type { ServerGame } from '../hooks/serverGame';

export default function SupportDefeatModal({
  characterId,
  characterName,
  game,
  playerId,
  pending,
  error,
  onRestart,
  onContinue,
}: {
  characterId: string;
  characterName: string;
  game: ServerGame;
  playerId: GameId<'players'>;
  pending: boolean;
  error?: string;
  onRestart: () => void;
  onContinue: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => continueRef.current?.focus(), []);
  const battle = game.world.battle!;
  const stats = game.world.players.get(playerId)?.battle;
  const completedIds = new Set(battle.completedMissionIds ?? []);
  const completedMissions = (battle.hiddenMissions ?? []).filter(
    (mission) => completedIds.has(mission.id) || mission.status === '已完成',
  );
  const information = [
    ...(battle.truthClues ?? []).map((detail) => ({ label: '真相线索', detail })),
    ...(battle.organizerIntel ?? []).map((detail) => ({ label: '关系情报', detail })),
  ];
  const popularity = battle.popularity ?? 0;
  const rating = popularityRatingFor(popularity, battle.interventionSpentTotal ?? 0);
  const heatScore = Math.min(60, Math.round((popularity / POPULARITY_PROGRESSION.sHeat) * 60));
  const missionScore = Math.min(20, (battle.mainMissionDone ? 10 : 0) + completedMissions.length * 5);
  const intelScore = Math.min(20, (battle.truthClues?.length ?? 0) * 5 + (battle.organizerIntel?.length ?? 0) * 2);
  const score = Math.min(100, heatScore + missionScore + intelScore);

  return <div className="support-defeat-overlay pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="support-defeat-title">
    <section className="support-defeat-panel">
      <div className="support-defeat-signal"><i /> SUPPORT SIGNAL LOST</div>
      <Portrait characterId={characterId} />
      <div className="support-defeat-kicker">本局应援失败</div>
      <h2 id="support-defeat-title">{characterName} 已被淘汰</h2>
      <p>本局应援目标已经离场。以下为离场时战报，你可以继续观看最终胜者，或重新开局。</p>
      <div className="support-defeat-report" aria-label="应援失败战报">
        <div className="support-defeat-stats">
          <ReportStat label="角色战绩" value={`${stats?.kills ?? 0} 击杀`} detail={`存活至第 ${battle.day ?? 1} 天`} />
          <ReportStat label="当前热度" value={`${Math.round(popularity)} · ${rating}级`} detail={`热度评分 ${heatScore}/60`} />
          <ReportStat label="阶段评分" value={`${score} 分`} detail={`情报评分 ${intelScore}/20`} />
        </div>
        <div className="support-defeat-report-columns">
          <section>
            <h3>已达成目标</h3>
            {battle.mainMissionDone && <div><strong>主线目标</strong><span>达到 S 级直播热度</span></div>}
            {completedMissions.map((mission) => <div key={mission.id}><strong>{mission.title}</strong><span>{mission.description}</span></div>)}
            {!battle.mainMissionDone && !completedMissions.length && <em>暂未完成目标</em>}
          </section>
          <section>
            <h3>已获取信息</h3>
            {information.slice(0, 4).map((item, index) => <div key={`${item.label}-${index}`}><strong>{item.label}</strong><span>{item.detail}</span></div>)}
            {!information.length && <em>暂未取得关键情报</em>}
          </section>
        </div>
      </div>
      {error && <div className="support-defeat-error" role="alert">{error}</div>}
      <div className="support-defeat-actions">
        <button ref={continueRef} className="live-hud-button" disabled={pending} onClick={onContinue}>继续观看</button>
        <button className="live-hud-button live-hud-danger" disabled={pending} onClick={onRestart}>{pending ? '正在重新开局…' : '重新开局'}</button>
      </div>
    </section>
  </div>;
}

function ReportStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}

function Portrait({ characterId }: { characterId: string }) {
  const index = Math.max(0, Number(characterId.slice(1)) - 1);
  const col = index % 4;
  const row = Math.floor(index / 4);
  return <span className="contestant-portrait support-defeat-portrait" aria-hidden="true" style={{ backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%` }} />;
}
