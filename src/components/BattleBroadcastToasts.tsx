import { useEffect, useState } from 'react';
import type { BattleEvent } from '../../convex/aiTown/battleRoyale';
import BattleEventIcon from './BattleEventIcon';

type BattleBroadcastToastsProps = {
  feed?: BattleEvent[];
};

export default function BattleBroadcastToasts({ feed = [] }: BattleBroadcastToastsProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const event = feed.find((candidate) => IMPORTANT_KINDS.has(candidate.kind) && now - candidate.ts < 6500);
  if (!event) {
    return null;
  }
  return (
    <div className="battle-toast-stack pointer-events-none absolute left-1/2 z-20 flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center">
        <div key={event.id} className="arena-toast w-full px-4 py-2 transition">
          <div className="flex items-center gap-3">
            <BattleEventIcon kind={event.kind} />
            <span className="arena-feed-tag shrink-0">
              {displayEventKind(event.kind)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm leading-tight">{displayEventText(event.text)}</span>
          </div>
        </div>
    </div>
  );
}

const IMPORTANT_KINDS = new Set(['eliminate', 'winner', 'zone', 'intervention', 'truth', 'betrayal', 'globalStory']);

function displayEventKind(kind: string) {
  return ({ system: '系统', attack: '战斗', eliminate: '淘汰', zone: '禁区', loot: '搜索', buy: '交易', trade: '交易', dialogue: '交谈', heal: '治疗', move: '移动', ally: '结盟', alliance: '结盟', tip: '打赏', winner: '胜利' } as Record<string, string>)[kind] ?? kind;
}

function displayEventText(text: string) {
  return text
    .replace('Battle royale lobby opened. Agents are dropping into AI Town.', '大逃杀大厅已开启，AI 正在进入战场。')
    .replace('Match restarted. Everyone is back in the arena.', '比赛已重启，所有 AI 返回战场。')
    .replace(' is the last agent standing.', ' 成为最后的幸存者。')
    .replace('daylight', '白昼').replace('nightfall', '夜幕降临')
    .replace(' reached the arena.', ' 抵达战场。')
    .replace(' is now a permanent red zone. Agents must rotate.', ' 已成为永久危险区，AI 必须转移。')
    .replace(' patched up with a medkit.', ' 使用医疗包恢复了状态。')
    .replace(' retreated to reset the fight.', ' 暂时撤退，重新调整战斗。')
    .replace(' found a medkit.', ' 搜索到医疗包。')
    .replace(' found a ', ' 搜索到 ')
    .replace(' bought a ', ' 购买了 ')
    .replace(' bought armor plating.', ' 购买了装甲板。');
}
