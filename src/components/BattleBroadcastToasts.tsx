import type { BattleEvent } from '../../convex/aiTown/battleRoyale';

type BattleBroadcastToastsProps = {
  feed?: BattleEvent[];
};

const eventStyles: Record<string, string> = {
  attack: 'border-red-300 bg-red-950/82 text-red-50',
  eliminate: 'border-red-400 bg-red-900/90 text-white',
  winner: 'border-amber-200 bg-amber-500/92 text-brown-900',
  tip: 'border-emerald-200 bg-emerald-500/90 text-brown-900',
  alliance: 'border-sky-200 bg-sky-600/88 text-white',
  loot: 'border-amber-300 bg-brown-900/86 text-amber-50',
  move: 'border-clay-100 bg-clay-700/86 text-white',
  heal: 'border-emerald-200 bg-emerald-700/88 text-white',
  buy: 'border-purple-200 bg-purple-700/88 text-white',
  system: 'border-brown-200 bg-brown-900/86 text-brown-50',
};

export default function BattleBroadcastToasts({ feed = [] }: BattleBroadcastToastsProps) {
  const visibleFeed = feed.slice(0, 4);
  if (visibleFeed.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2">
      {visibleFeed.map((event, index) => (
        <div
          key={event.id}
          className={`w-full border px-4 py-2 shadow-2xl backdrop-blur-sm transition ${
            eventStyles[event.kind] ?? eventStyles.system
          } ${index === 0 ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-78'}`}
        >
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-80">
              Public Feed
            </span>
            <span className="min-w-0 flex-1 truncate text-sm leading-tight">{event.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
