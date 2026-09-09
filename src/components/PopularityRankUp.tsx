import { useEffect, useRef, useState } from 'react';

type PopularityRank = 'C' | 'B' | 'A' | 'S';

type PopularityRankUpProps = {
  popularity: number;
  rank: string;
};

const RANK_ORDER: PopularityRank[] = ['C', 'B', 'A', 'S'];
const RANK_COPY: Record<PopularityRank, { eyebrow: string; title: string; detail: string }> = {
  C: { eyebrow: 'LIVE SIGNAL ONLINE', title: '直播已开场', detail: '制造高光，积累直播热度' },
  B: { eyebrow: 'POPULARITY RISING', title: '进入热门推荐', detail: '直播间观众正在快速涌入' },
  A: { eyebrow: 'TRENDING NOW', title: '登上全站热榜', detail: '整座岛都在注视这场比赛' },
  S: { eyebrow: 'PHENOMENON LIVE', title: '现象级直播达成', detail: '主办方最高评级已解锁' },
};

export default function PopularityRankUp({ popularity, rank }: PopularityRankUpProps) {
  const currentRank = isPopularityRank(rank) ? rank : 'C';
  const previousRankRef = useRef<PopularityRank>();
  const clearTimerRef = useRef<number>();
  const [activeRank, setActiveRank] = useState<PopularityRank>();

  useEffect(() => {
    const previousRank = previousRankRef.current;
    previousRankRef.current = currentRank;
    if (!previousRank || RANK_ORDER.indexOf(currentRank) <= RANK_ORDER.indexOf(previousRank)) return;

    window.clearTimeout(clearTimerRef.current);
    setActiveRank(currentRank);
    clearTimerRef.current = window.setTimeout(() => setActiveRank(undefined), 3200);
    return () => window.clearTimeout(clearTimerRef.current);
  }, [currentRank]);

  if (!activeRank) return null;
  const copy = RANK_COPY[activeRank];

  return (
    <div className={`popularity-rank-up is-${activeRank.toLowerCase()}`} role="status" aria-live="assertive">
      <div className="popularity-rank-burst" aria-hidden="true"><i /><i /><i /></div>
      <div className="popularity-rank-copy">
        <small>{copy.eyebrow}</small>
        <div className="popularity-rank-letter">{activeRank}</div>
        <h2>{copy.title}</h2>
        <p>{copy.detail}</p>
        <strong>当前热度 {Math.floor(popularity)}</strong>
      </div>
      <div className="popularity-rank-scan" aria-hidden="true" />
    </div>
  );
}

function isPopularityRank(rank: string): rank is PopularityRank {
  return RANK_ORDER.includes(rank as PopularityRank);
}
