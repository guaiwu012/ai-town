import { POPULARITY_PROGRESSION } from '../../data/battleRoyaleConfig';
import type { ServerGame } from '../hooks/serverGame';
import type { ReactNode } from 'react';

export default function BattleMatchReport({
  game,
  pending,
  error,
  onOverview,
  onRestart,
}: {
  game: ServerGame;
  pending: boolean;
  error?: string;
  onOverview: () => void;
  onRestart: () => void;
}) {
  const battle = game.world.battle!;
  const players = [...game.world.players.values()].filter((player) => player.battle);
  const survivors = players.filter((player) => !player.battle?.eliminated);
  const winnerNames = survivors.map((player) => game.playerDescriptions.get(player.id)?.name ?? player.id);
  const completedIds = new Set(battle.completedMissionIds ?? []);
  const hiddenMissions = battle.hiddenMissions ?? [];
  const completedHidden = hiddenMissions.filter((mission) => completedIds.has(mission.id) || mission.status === '已完成');
  const truthClues = battle.truthClues ?? [];
  const organizerIntel = battle.organizerIntel ?? [];
  const supportSuccesses = (battle.supportOrders ?? []).filter((order) => order.status === 'success').length;
  const supportFinishers = (battle.supportChains ?? []).reduce((sum, chain) => sum + chain.completed, 0);
  const popularity = battle.settlementPopularity ?? battle.popularity ?? 0;
  const rating = battle.settlementRating ?? battle.popularityRating ?? 'C';
  const heatScore = Math.min(60, Math.round((popularity / POPULARITY_PROGRESSION.sHeat) * 60));
  const missionScore = Math.min(20, (battle.mainMissionDone ? 10 : 0) + completedHidden.length * 5);
  const intelScore = Math.min(20, truthClues.length * 5 + organizerIntel.length * 2);
  const finalScore = Math.min(100, heatScore + missionScore + intelScore);

  return (
    <div className="match-report-overlay" role="dialog" aria-modal="true" aria-labelledby="match-report-title">
      <section className="match-report-panel">
        <header className="match-report-header">
          <div><small>MATCH REPORT · FINAL</small><h2 id="match-report-title">本局直播战报</h2><p>{winnerNames.length ? `${winnerNames.join('、')} 存活至直播结束` : '本局没有幸存者'}</p></div>
          <div className={`match-report-grade is-${rating.toLowerCase()}`}><strong>{rating}</strong><span>{finalScore} 分</span></div>
        </header>

        <div className="match-report-stats">
          <ReportStat label="最终热度" value={String(popularity)} note={`热度评分 ${heatScore}/60`} />
          <ReportStat label="主办方干预" value={`${battle.interventionSpentTotal ?? 0} 点`} note={`累计获取 ${battle.interventionEarnedTotal ?? 0} 点`} />
          <ReportStat label="目标完成" value={`${Number(Boolean(battle.mainMissionDone)) + completedHidden.length}`} note={`目标评分 ${missionScore}/20`} />
          <ReportStat label="情报评分" value={`${intelScore}/20`} note={`${truthClues.length} 条真相线索`} />
        </div>

        <div className="match-report-columns">
          <ReportSection title="目标达成">
            <ReportLine complete={Boolean(battle.mainMissionDone)} title="主线：达到 S 级直播热度" detail={battle.mainMissionDone ? '已完成' : `最终为 ${rating} 级`} />
            {hiddenMissions.map((mission) => <ReportLine key={mission.id} complete={completedIds.has(mission.id) || mission.status === '已完成'} title={mission.title} detail={mission.description} />)}
          </ReportSection>
          <ReportSection title="获取的信息">
            {truthClues.map((clue) => <ReportLine key={`truth-${clue}`} complete title="真相线索" detail={clue} />)}
            {organizerIntel.map((intel) => <ReportLine key={`intel-${intel}`} complete title="关系情报" detail={intel} />)}
            {!truthClues.length && !organizerIntel.length && <p className="match-report-empty">本局未取得关键情报。</p>}
          </ReportSection>
        </div>

        <div className="match-report-summary">
          <span>应援任务成功 <b>{supportSuccesses}</b> 次</span>
          <span>释放阵营终结技 <b>{supportFinishers}</b> 次</span>
          <span>最终称号 <b>{battle.settlementReward ?? '见习导演'}</b></span>
        </div>
        {error && <div className="match-report-error">{error}</div>}
        <footer className="match-report-actions">
          <button className="live-hud-button" onClick={onOverview}>查看战略总览</button>
          <button className="live-hud-button live-hud-primary" disabled={pending} onClick={onRestart}>{pending ? '正在重置…' : '重新开局'}</button>
        </footer>
      </section>
    </div>
  );
}

function ReportStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h3>{title}</h3><div>{children}</div></section>;
}

function ReportLine({ complete, title, detail }: { complete: boolean; title: string; detail: string }) {
  return <article className={complete ? 'is-complete' : ''}><i>{complete ? '✓' : '—'}</i><div><strong>{title}</strong><p>{detail}</p></div></article>;
}
